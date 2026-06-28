
import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phone: string;
  role: 'PATIENT' | 'DOCTOR' | 'HOSPITAL';
  hospitalName?: string;
  otp?: string;
  otpExpires?: Date;
  lastLogin?: Date;
  lastLogout?: Date;
  isOnline?: boolean;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'HOSPITAL'], default: 'PATIENT' },
  hospitalName: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  lastLogin: { type: Date },
  lastLogout: { type: Date },
  isOnline: { type: Boolean, default: false }
});

const User = model<IUser>('User', userSchema);
export default User;
