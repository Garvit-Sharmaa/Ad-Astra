import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phone: string;
  otp?: string;
  otpExpires?: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  otp: { type: String },
  otpExpires: { type: Date },
});

const User = model<IUser>('User', userSchema);
export default User;