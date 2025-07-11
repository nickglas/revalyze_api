import { Service } from "typedi";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { IReviewConfig } from "../models/review.config.model";
import { ITranscript } from "../models/transcript.model";
import { ICriteriaScore, IReview } from "../models/review.model";
import { ICriterion } from "../models/criterion.model";

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

  private createPrompt = (
    transcript: ITranscript,
    criteria: ICriterion[]
  ): string => {
    const criteriaList = criteria
      .map(
        (c) => `{ "criterion": "${c.title}", "description": "${c.description}"}`
      )
      .join(",\n");

    return `
      Use the following transcript:
      ${transcript.content}

      Transcript ID: ${transcript.id}

      Clean and format the transcript using only the criteria below — do not add or infer any new ones.

      Use the weights to guide how strictly each criterion is evaluated. Higher-weighted criteria should be graded more strictly and considered more important in feedback.

      CRITERIA: ${criteria.map((c) => c.title).join(", ")}

      Criteria details: [${criteriaList}]

      Include the full configuration object as provided in the input under the key "configuration", exactly as found in the original input. This should be embedded as an object within the output JSON.

      Output Format:

      Return a single valid JSON object, containing:

      - "results" — an array of objects, each including:
        - "criterion" (must match one of the titles)
        - "score" (1–10)
        - "comment"
        - "quote"
        - "feedback"
      - "overall_score" — number between 0 and 10, computed as the weighted average of the individual scores
      - "overall_feedback" — paragraph summarizing overall agent performance, highlighting strengths and suggesting specific areas for improvement

      ### Example Output:

      {
        "results": [
          {
            "criterion": "Empathy",
            "score": 8,
            "comment": "Agent showed understanding",
            "quote": "I completely understand how frustrating that must be.",
            "feedback": "You did well acknowledging the customer's frustration. For an even higher score, try adding reassurance or proactive follow-up, like offering immediate solutions."
          }
        ],
        "overall_score": 7.9,
        "overall_feedback": "The agent demonstrated strong empathy and clarity in communication, which helped the customer feel heard and informed. However, there were missed opportunities for proactive support and deeper personalization. Focus on using the customer's name more often, anticipating concerns, and giving detailed explanations of next steps to improve overall customer experience."
      }

      STRICT RULES:
        - Do not add any extra criteria.
        - Output must be a single, clean JSON object.
        - Do not wrap or escape the JSON.
        - The output must start with { and end with }.
        `;
  };

  private parseAIResponse = (
    aiResponseStr: string
  ): {
    overallScore: number;
    overallFeedback: string;
    criteriaScores: ICriteriaScore[];
  } => {
    const data: OpenAIResponse = JSON.parse(aiResponseStr);

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
    };
  };

  /**
   * Sends a chat completion request to OpenAI and returns the response.
   * @param messages - Array of chat messages with roles and content.
   * @param model - Optional model name, default to gpt-4o-mini or your preferred.
   */
  async createChatCompletion(
    reviewConfig: IReviewConfig,
    transcript: ITranscript,
    criteria: ICriterion[]
  ): Promise<{
    overallScore: number;
    overallFeedback: string;
    criteriaScores: ICriteriaScore[];
  }> {
    try {
      const model = reviewConfig.modelSettings?.model ?? "gpt-4o-mini";
      const temperature = reviewConfig.modelSettings?.temperature ?? 0.7;
      const maxTokens = reviewConfig.modelSettings?.maxTokens ?? 1000;

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are a helpful assistant performing a review based on the following configuration: ${reviewConfig.name}.`,
        },
        {
          role: "user",
          content: this.createPrompt(transcript, criteria),
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
