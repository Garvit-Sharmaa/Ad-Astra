import { Schema, model, Document } from 'mongoose';

export interface IFeedback extends Document {
  userPhone: string;
  feedback: string;
}

const feedbackSchema = new Schema<IFeedback>({
  userPhone: { type: String, required: true },
  feedback: { type: String, required: true },
}, { timestamps: true });

const Feedback = model<IFeedback>('Feedback', feedbackSchema);
export default Feedback;
