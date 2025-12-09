import { Schema, model, Document } from 'mongoose';

interface IDoctor {
    name: string;
    specialty: string;
}

export interface IHospital extends Document {
    name: string;
    city: string;
    lat: number;
    lon: number;
    doctors: IDoctor[];
}

const doctorSchema = new Schema<IDoctor>({
    name: { type: String, required: true },
    specialty: { type: String, required: true }
}, { _id: false });

const hospitalSchema = new Schema<IHospital>({
    name: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    doctors: [doctorSchema]
});

const Hospital = model<IHospital>('Hospital', hospitalSchema);
export default Hospital;
