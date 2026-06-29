
import { Schema, model, Document } from 'mongoose';

export interface IBooking extends Document {
  hospital: string;
  date: string;
  time: string;
  token: string;
  patientName: string;
  relationship?: string;
  doctorName?: string;
  yourName?: string;
  phone: string; 
  userPhone: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  triageSummary?: string;
  rescheduledAt?: string; // ISO timestamp of the last reschedule action
}

const bookingSchema = new Schema<IBooking>({
  hospital: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  patientName: { type: String, required: true },
  relationship: { type: String },
  doctorName: { type: String },
  yourName: { type: String, required: true },
  phone: { type: String, required: true },
  userPhone: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], 
    default: 'PENDING' 
  },
  notes: { type: String, default: '' },
  triageSummary: { type: String },
  rescheduledAt: { type: String }, // ISO timestamp written by PATCH /reschedule
});

const Booking = model<IBooking>('Booking', bookingSchema);
export default Booking;
