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
  phone: string; // Phone number of the user who booked
  userPhone: string;
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
  userPhone: { type: String, required: true, index: true }, // The phone number from the JWT for linking
});

const Booking = model<IBooking>('Booking', bookingSchema);
export default Booking;
