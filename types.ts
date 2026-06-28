

export enum View {
  Language,
  Login,
  Home,
  Skin,
  Symptoms,
  Result,
  Booking,
  Confirmation,
  History,
  Profile,
  Feedback,
  Dashboard,
}

export type UserRole = 'PATIENT' | 'DOCTOR' | 'HOSPITAL';

export type TriageResultData = {
  conclusion: 'MILD' | 'SERIOUS';
  likelyCondition?: string; // New field for Disease Name: XYZ
  explanation: string;
  selfCareTips?: string[];
  doctorSuggestion?: string;
};

export type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
};

export type ChatResponse = {
  text?: string;
  suggestions?: string[];
  triageResult?: TriageResultData;
};

// Fix: Updated BookingDetails to include missing fields used in Dashboard
export type BookingDetails = {
  id?: string;
  hospital: string;
  date: string;
  time: string;
  token: string;
  patientName: string;
  relationship?: string;
  doctorName?: string;
  yourName?: string;
  phone?: string;
  // Added 'IN_PROGRESS' to status enum to match backend and clinical workflow
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  triageSummary?: string; // AI summary for doctor review
  // Added notes field for clinical observations
  notes?: string;
};

export type User = {
  name: string;
  phone: string;
  isGuest?: boolean;
  role: UserRole;
  specialty?: string; // For Doctors
  hospitalName?: string; // For Hospital Admins/Doctors
};

export type QueuedAnalysisRequest = {
  id: string;
  payload: {
    base64ImageData: string;
    mimeType: string;
    language: string;
    mcqAnswers?: Record<string, string>;
  };
  timestamp: number;
};
