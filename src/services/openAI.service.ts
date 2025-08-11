import { Service } from "typedi";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ITranscriptDocument } from "../models/entities/transcript.entity";
import { ICriterionDocument } from "../models/entities/criterion.entity";
import { ICriteriaScore } from "../models/types/review.type";
import { IReviewConfigDocument } from "../models/entities/review.config.entity";

interface OpenAIResponse {
  results: {
    criterion: string;
    score: number;
    comment?: string;
    quote?: string;
    feedback?: string;
  }[];
  overall_score?: number;
  overall_feedback?: string;
  sentimentScore?: number;
  sentimentLabel?: "negative" | "neutral" | "positive";
  sentimentAnalysis?: string;
}

@Service()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  private cleanAIResponse(content: string): string {
    if (content.startsWith("```json") && content.endsWith("```")) {
      return content.substring(6, content.length - 3).trim();
    }
    if (content.startsWith("```") && content.endsWith("```")) {
      return content.substring(3, content.length - 3).trim();
    }
    return content;
  }

  private createSentimentPrompt(transcript: ITranscriptDocument): string {
    return `
    Analyze the customer sentiment in the following conversation.
    If the transcript has insufficient content (less than 50 words), return a JSON object with:
    - "error": "Insufficient content for sentiment analysis"
    - "minWordsRequired": 50
    - "actualWordCount": ${transcript.content.split(/\s+/).length}

    Otherwise, analyze sentiment and return:
    - "sentimentScore": number (0-10, 10=most positive)
    - "sentimentLabel": "positive", "neutral", or "negative"
    - "sentimentAnalysis": string (detailed analysis)

    Transcript: ${transcript.content}

    STRICT RULES:
    - Output must be valid JSON without markdown
    - Start with { and end with }
    - No additional text outside the JSON object
  `;
  }

  async createSentimentAnalysis(transcript: ITranscriptDocument): Promise<{
    sentimentScore: number;
    sentimentLabel: "negative" | "neutral" | "positive";
    sentimentAnalysis: string;
  }> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are an expert at analyzing customer sentiment in conversations.",
      },
      {
        role: "user",
        content: this.createSentimentPrompt(transcript),
      },
    ];

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content in response");

    return JSON.parse(content);
  }

  private createPrompt(
    transcript: ITranscriptDocument,
    criteria: ICriterionDocument[],
    type: "performance" | "both"
  ): string {
    const wordCount = transcript.content.split(/\s+/).length;

    return `
    Analyze the following conversation transcript:
    ${transcript.content}

    WORD COUNT: ${wordCount}

    If word count < 50, return JSON with:
    - "error": "Insufficient content for analysis"
    - "minWordsRequired": 50
    - "actualWordCount": ${wordCount}

    Otherwise, evaluate:
    ${
      type === "both"
        ? "1. Agent performance AND customer sentiment"
        : "Agent performance"
    }

    CRITERIA:
    ${criteria.map((c) => `- ${c.title}: ${c.description}`).join("\n")}

    OUTPUT FORMAT (JSON only):
    {
      "results": [
        {
          "criterion": "Criterion Name",
          "score": 1-10,
          "comment": "...",
          "quote": "...",
          "feedback": "..."
        }
      ],
      "overall_score": 0-10,
      "overall_feedback": "...",
      ${
        type === "both"
          ? `
      "sentimentScore": 0-10,
      "sentimentLabel": "negative/neutral/positive",
      "sentimentAnalysis": "..."`
          : ""
      }
    }

    STRICT RULES:
    - Output must be pure JSON without markdown
    - Start with { and end with }
    - No additional text outside the JSON
    - Include all fields exactly as specified
  `;
  }

  private parseAIResponse(aiResponseStr: string): {
    overallScore: number;
    overallFeedback: string;
    criteriaScores: ICriteriaScore[];
    sentimentScore: number;
    sentimentLabel: "negative" | "neutral" | "positive";
    sentimentAnalysis: string;
  } {
    try {
      const cleaned = this.cleanAIResponse(aiResponseStr);
      const data: OpenAIResponse = JSON.parse(cleaned);
      return {
        overallScore: data.overall_score ?? 0,
        overallFeedback: data.overall_feedback ?? "",
        criteriaScores: data.results.map((r) => ({
          criterionName: r.criterion,
          score: r.score,
          comment: r.comment,
          quote: r.quote,
          feedback: r.feedback,
        })),
        sentimentScore: data.sentimentScore ?? 0,
        sentimentLabel: data.sentimentLabel ?? "neutral",
        sentimentAnalysis: data.sentimentAnalysis ?? "",
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Original content:", aiResponseStr);
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  /**
   * Sends a chat completion request to OpenAI and returns the response.
   * @param messages - Array of chat messages with roles and content.
   * @param model - Optional model name, default to gpt-4o-mini or your preferred.
   */
  async createChatCompletion(
    reviewConfig: IReviewConfigDocument,
    transcript: ITranscriptDocument,
    criteria: ICriterionDocument[],
    type: "performance" | "both"
  ): Promise<{
    overallScore: number;
    overallFeedback: string;
    criteriaScores: ICriteriaScore[];
    sentimentScore?: number;
    sentimentLabel?: "negative" | "neutral" | "positive";
    sentimentAnalysis?: string;
  }> {
    try {
      const model = reviewConfig.modelSettings?.model ?? "gpt-4o-mini";
      const temperature = reviewConfig.modelSettings?.temperature ?? 0.1;
      const maxTokens = reviewConfig.modelSettings?.maxTokens ?? 1000;

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are a helpful assistant performing a ${type} review.`,
        },
        {
          role: "user",
          content: this.createPrompt(transcript, criteria, type),
        },
      ];

      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI response does not contain message content");
      }

      const parsed = this.parseAIResponse(content);
      return parsed;
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }
}
