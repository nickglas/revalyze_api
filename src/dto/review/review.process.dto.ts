import { ICriterion } from "../../models/criterion.model";
import { IReview } from "../../models/review.model";
import { ITranscript } from "../../models/transcript.model";

export default interface ReviewProcessInfo {
  review: Partial<IReview>;
  transcript: ITranscript;
  critertia: Partial<ICriterion[]>;
}
