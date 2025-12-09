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
}

export type TriageResultData = {
  conclusion: 'MILD' | 'SERIOUS';
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

export type BookingDetails = {
  hospital: string;
  date: string;
  time: string;
  token: string;
  patientName: string; // The name of the person the appointment is for
  relationship?: string; // If the booking is for someone else
  doctorName?: string;
  yourName?: string;
  phone?: string;
};

export type User = {
  name: string;
  phone: string;
  isGuest?: boolean;
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