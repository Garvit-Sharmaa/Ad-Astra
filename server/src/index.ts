
/**
 * @module Server
 * @description
 * Robust backend for Ad Astra. Handles medical triage via Gemini AI and syncs appointments.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { GoogleGenAI, Type } from '@google/genai';
import helmet from 'helmet';
import twilio from 'twilio';

import connectDB from './db.js';
import User from './models/User.js';
import Hospital from './models/Hospital.js';
import Booking from './models/Booking.js';
import Feedback from './models/Feedback.js';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const JWT_SECRET = process.env.JWT_SECRET || "a-fallback-secret-key";

<<<<<<< HEAD
const cleanEnvVar = (val: string | undefined) => val?.trim().replace(/^["']|["']$/g, '').replace(/;$/, '') || '';
=======
    if (dotenvResult.error) {
        // In production (Render), .env might not exist as we use dashboard variables. 
        // We log a warning instead of crashing if the file is missing but variables exist.
        if (!process.env.MONGO_URI) {
             throw dotenvResult.error;
        }
    }
} catch (error) {
    console.log("ℹ️ .env file not found or failed to load. Assuming environment variables are set in the cloud provider.");
}
console.log("▶️ [2/5] Environment setup complete.");
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab

const TWILIO_SID = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
const TWILIO_AUTH = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);
const TWILIO_SERVICE_SID = cleanEnvVar(process.env.TWILIO_VERIFY_SERVICE_SID);
const MY_VERIFIED_NUMBER = cleanEnvVar(process.env.MY_TWILIO_NUMBER);

<<<<<<< HEAD
const twilioClient = TWILIO_SID && TWILIO_AUTH ? twilio(TWILIO_SID, TWILIO_AUTH) : null;

// --- MOCK DATABASE SEEDING ---
const seedPresentationData = async () => {
    // Delhi Hospital Accounts
    await User.findOneAndUpdate({ phone: '9999888877' }, { name: 'Dr. Rohan Mehra', role: 'DOCTOR', hospitalName: 'District General Hospital, Delhi' }, { upsert: true });
    await User.findOneAndUpdate({ phone: '9999888866' }, { name: 'Dr. Priya Sharma', role: 'DOCTOR', hospitalName: 'District General Hospital, Delhi' }, { upsert: true });
    await User.findOneAndUpdate({ phone: '7777666655' }, { name: 'Delhi Hospital Admin', role: 'HOSPITAL', hospitalName: 'District General Hospital, Delhi' }, { upsert: true });
    
    // Gurgaon Hospital Accounts
    await User.findOneAndUpdate({ phone: '8888777711' }, { name: 'Dr. Vikram Singh', role: 'DOCTOR', hospitalName: 'Community Health Center, Gurgaon' }, { upsert: true });
    await User.findOneAndUpdate({ phone: '7777111122' }, { name: 'Gurgaon CHC Admin', role: 'HOSPITAL', hospitalName: 'Community Health Center, Gurgaon' }, { upsert: true });
=======
// --- PRE-FLIGHT CHECKS ---
if (!process.env.MONGO_URI) {
  console.error("\u{1F6AB} FATAL ERROR: MONGO_URI is not defined. The server cannot start without a database connection string.");
  process.exit(1);
}
if (!process.env.API_KEY) {
  console.error("\u{1F6AB} FATAL ERROR: API_KEY is not defined. The server cannot connect to the AI service.");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn("\u{26A0}\u{FE0F} WARNING: JWT_SECRET is not defined. Using a default, insecure secret. This is not safe for production.");
}

interface IHistoryPart {
  text: string;
}
interface IHistory {
  role: 'user' | 'model';
  parts: IHistoryPart[];
}
export interface IChatSession extends mongoose.Document {
  userPhone: string;
  language: string;
  history: IHistory[];
}
const historyPartSchema = new mongoose.Schema<IHistoryPart>({ text: { type: String, required: true } }, { _id: false });
const historySchema = new mongoose.Schema<IHistory>({ role: { type: String, required: true, enum: ['user', 'model'] }, parts: [historyPartSchema] }, { _id: false });
const chatSessionSchema = new mongoose.Schema<IChatSession>({
  userPhone: { type: String, required: true, unique: true, index: true },
  language: { type: String, required: true },
  history: [historySchema],
}, { timestamps: true });
const ChatSession = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);

// Declare custom property on Express Request globally
declare global {
  namespace Express {
    interface Request {
      user?: { phone: string; isGuest?: boolean; };
    }
  }
}

// In-memory cache for the multi-step analysis process
const analysisCache = new Map<string, { description: string, cleanupTimer: ReturnType<typeof setTimeout> }>();


const startServer = async () => {
    console.log("▶️ [4/5] Initializing server...");
    try {
        await connectDB();
        console.log("✅ [5/5] Database connection successful. Starting Express app...");

        const app = express();

        // Use 'any' cast to bypass strict typing issues with some helmet versions in TS
        app.use(helmet() as any);
        
        const isProduction = process.env.NODE_ENV === 'production';
        
        // --- TWILIO CONFIGURATION ---
        // Only enable Real SMS if ALL keys are present. 
        // This ensures the app defaults to "Mock OTP" (Free) mode even in production 
        // if the user hasn't set up a paid Twilio account yet.
        const useTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
        
        if (isProduction && !useTwilio) {
            console.log("ℹ️  Running in Production but without Twilio keys. OTPs will be mocked (FREE MODE). Check server logs/console for OTPs.");
        }

        // --- CORS CONFIGURATION (SECURITY) ---
        // 1. In Development: Allow localhost.
        // 2. In Production (Render): Strictly allow ONLY the Vercel Frontend URL.
        const allowedOrigins = [
            'http://localhost:5173', 
            'http://localhost:3000', 
            process.env.FRONTEND_URL // You MUST set this in Render Dashboard (e.g. https://ad-astra.vercel.app)
        ].filter(Boolean);

        app.use(cors({
          origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests) - Optional: set to false for stricter security
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              console.warn(`⚠️ CORS Blocked request from unauthorized origin: ${origin}`);
              callback(new Error('Not allowed by CORS'));
            }
          },
          credentials: true
        }) as any);

        const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
        app.use('/api/', apiLimiter as any);
        
        const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: 'Too many login attempts from this IP, please try again after 15 minutes' });
        app.use('/api/auth/', authLimiter as any);
        
        app.use(express.json({ limit: '10mb' }) as any);

        const PORT = process.env.PORT || 3005;
        const API_KEY = process.env.API_KEY!;
        const JWT_SECRET = process.env.JWT_SECRET || "a-fallback-secret-key-for-jwt";
        
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const twilioClient = useTwilio ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

        const authMiddleware = (req: any, res: any, next: NextFunction) => {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
          const token = authHeader.split(' ')[1];
          try {
            req.user = jwt.verify(token, JWT_SECRET) as { phone: string; isGuest?: boolean };
            next();
          } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
          }
        };
        
        app.get('/', (req: any, res: any) => res.send('Ad Astra Backend is Running!'));
        app.get('/api/health', (req: any, res: any) => res.status(200).send('Ad Astra API is running!'));
        app.post('/api/auth/guest', async (req: any, res: any) => {
            try {
                const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                const token = jwt.sign({ phone: guestId, isGuest: true }, JWT_SECRET, { expiresIn: '24h' });
                res.json({ token, user: { name: 'Guest', phone: '', isGuest: true } });
            } catch (error) {
                console.error("Error in /api/auth/guest:", error);
                res.status(500).json({ message: "An internal server error occurred." });
            }
        });
        app.post('/api/auth/send-otp', async (req: any, res: any) => {
            try {
                const { name, phone } = req.body;
                if (!name || !/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Invalid name or phone number" });
                
                const user = await User.findOneAndUpdate({ phone }, { name }, { upsert: true, new: true, setDefaultsOnInsert: true });

                if (useTwilio && twilioClient) {
                    await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verifications.create({ to: `+91${phone}`, channel: 'sms' });
                    res.status(200).json({ message: "OTP sent successfully" });
                } else {
                    // Development/Free Mode: generate a mock OTP, save it, and send it back.
                    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    user.otp = mockOtp;
                    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5-minute expiry
                    await user.save();
                    res.status(200).json({ message: "OTP sent successfully (DEV MODE)", otp: mockOtp });
                }

            } catch (error: any) {
                console.error("Error in /api/auth/send-otp:", error);
                if (error.code === 60200) return res.status(400).json({ message: "The provided phone number is not valid." });
                res.status(500).json({ message: "An internal server error occurred while sending OTP." });
            }
        });
        app.post('/api/auth/verify-otp', async (req: any, res: any) => {
            try {
                const { phone, otp } = req.body;
                
                if (useTwilio && twilioClient) {
                    const verification_check = await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verificationChecks.create({ to: `+91${phone}`, code: otp });
                    if (verification_check.status !== 'approved') return res.status(400).json({ message: "Invalid or expired OTP." });
                } else {
                    // Development/Free Mode: check against the saved mock OTP
                    const user = await User.findOne({ phone });
                    if (!user || user.otp !== otp) {
                        return res.status(400).json({ message: "Invalid OTP." });
                    }
                    if (!user.otpExpires || user.otpExpires < new Date()) {
                        return res.status(400).json({ message: "Expired OTP." });
                    }
                    // Clear the OTP after successful verification
                    user.otp = undefined;
                    user.otpExpires = undefined;
                    await user.save();
                }

                const userDoc = await User.findOne({ phone });
                if (!userDoc) return res.status(404).json({ message: "User not found." });
                
                const token = jwt.sign({ phone: userDoc.phone }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ token, user: { name: userDoc.name, phone: userDoc.phone } });

            } catch (error: any) {
                console.error("Error in /api/auth/verify-otp:", error);
                 if (error.code === 20404) return res.status(400).json({ message: "Verification failed. The OTP may have expired." });
                res.status(500).json({ message: "An internal server error occurred." });
            }
        });

        app.put('/api/profile', authMiddleware, async (req: any, res: any) => {
            try {
                if (req.user?.isGuest) {
                    return res.status(403).json({ message: "Guests cannot update profiles." });
                }
                const { name, phone } = req.body;
                if (!name || !/^\d{10}$/.test(phone)) {
                    return res.status(400).json({ message: "Valid name and 10-digit phone number are required." });
                }
        
                const currentUserPhone = req.user!.phone;
                const user = await User.findOne({ phone: currentUserPhone });
        
                if (!user) {
                    return res.status(404).json({ message: "User not found." });
                }
        
                let newToken: string | undefined = undefined;
        
                // Handle phone number change
                if (phone !== currentUserPhone) {
                    // Check if new phone number is already taken
                    const existingUser = await User.findOne({ phone });
                    if (existingUser) {
                        return res.status(409).json({ message: "This phone number is already in use." });
                    }
                    // In a real app, you'd trigger re-verification here.
                    // For this prototype, we'll update the phone number and associated data.
                    user.phone = phone;
        
                    // Also update phone number in chat sessions and bookings
                    await ChatSession.updateOne({ userPhone: currentUserPhone }, { userPhone: phone });
                    await Booking.updateMany({ userPhone: currentUserPhone }, { userPhone: phone });
                    
                    // Issue a new token with the new phone number
                    newToken = jwt.sign({ phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
                }
        
                user.name = name;
                await user.save();
        
                res.json({
                    user: { name: user.name, phone: user.phone },
                    token: newToken,
                });
        
            } catch (error) {
                console.error("Error updating profile:", error);
                res.status(500).json({ message: "Failed to update profile." });
            }
        });

        // Helper to handle AI Errors (Rate limits etc.)
        const handleAIError = (error: any, res: any, context: string) => {
            console.error(`Gemini Error in ${context}:`, error);
            
            // Check specifically for Rate Limits (429)
            const isRateLimit = error.status === 429 || 
                                (error.error && error.error.code === 429) ||
                                (error.message && (error.message.includes('429') || error.message.includes('quota')));

            if (isRateLimit) {
                return res.status(429).json({ 
                    message: "AI Service Busy: Rate limit reached. Please wait a moment and try again." 
                });
            }

            res.status(500).json({ message: error.message || "Failed to process AI request." });
        };

        // --- NEW ENDPOINT: STEP 1 of online analysis ---
        app.post('/api/ai/describe-skin-image', authMiddleware, async (req: any, res: any) => {
            try {
                const { base64ImageData, mimeType } = req.body;
                if (!base64ImageData || !mimeType) {
                    return res.status(400).json({ message: "Invalid image data provided." });
                }

                const singleImagePrompt = "Analyze this image of a skin condition. Describe what you see in objective, clinical terms. Focus on color, texture, shape, and visible features. Do not diagnose or offer advice. Simply describe the visual information.";

                const imagePart = { inlineData: { data: base64ImageData, mimeType: mimeType } };
                const textPart = { text: singleImagePrompt };
                const descriptionResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
                const descriptionText = descriptionResponse.text;

                if (!descriptionText) {
                    throw new Error("The AI could not analyze the provided image.");
                }
                
                const analysisId = crypto.randomUUID();
                
                const cleanupTimer = setTimeout(() => {
                    analysisCache.delete(analysisId);
                    console.log(`Cleaned up expired analysis cache for ID: ${analysisId}`);
                }, 15 * 60 * 1000); // 15-minute expiry

                analysisCache.set(analysisId, { description: descriptionText, cleanupTimer });
                res.json({ analysisId });

            } catch (error: any) {
                handleAIError(error, res, "/api/ai/describe-skin-image");
            }
        });

        // --- NEW ENDPOINT: STEP 2 of online analysis ---
        app.post('/api/ai/get-skin-conclusion', authMiddleware, async (req: any, res: any) => {
            try {
                const { analysisId, mcqAnswers, language } = req.body;

                const cached = analysisCache.get(analysisId);
                if (!cached) {
                    return res.status(404).json({ message: "Analysis session not found or expired. Please start over." });
                }
                
                clearTimeout(cached.cleanupTimer);
                const imageDescription = cached.description;
                
                let additionalInfo = "The user did not provide any additional context.";
                if (mcqAnswers && Object.keys(mcqAnswers).length > 0) {
                    additionalInfo = "The user provided these answers:\n" + Object.entries(mcqAnswers).map(([q, a]) => `- ${q}: ${a}`).join("\n");
                }
                
                const analysisPrompt = `You are an AI health assistant providing a preliminary analysis. Your response MUST be ONLY four lines in the '${language}' language, using these exact labels:
CONCLUSION: [MILD or SERIOUS]
EXPLANATION: [Your analysis in one paragraph, based on the description and user answers.]
SELF_CARE_TIPS: [List of 2-3 simple, safe self-care tips, each starting with '* '. If SERIOUS, write NONE.]
DOCTOR_SUGGESTION: [The type of specialist to see (e.g., 'Dermatologist'). If MILD, write NONE.]

**Provided Information:**
1. **Image Description:**\n${imageDescription}
2. **User's Answers:** ${additionalInfo}`;

                const analysisResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: analysisPrompt });
                const responseText = analysisResponse.text;
                if (!responseText) throw new Error("AI model returned an empty response during the final analysis.");

                const lines = responseText.trim().split('\n');
                const result: any = {};
                lines.forEach(line => {
                    if (line.startsWith('CONCLUSION:')) {
                        const value = line.substring('CONCLUSION:'.length).trim().toUpperCase();
                        if (value === 'MILD' || value === 'SERIOUS') result.conclusion = value;
                    } else if (line.startsWith('EXPLANATION:')) result.explanation = line.substring('EXPLANATION:'.length).trim();
                    else if (line.startsWith('SELF_CARE_TIPS:')) {
                        const tipsString = line.substring('SELF_CARE_TIPS:'.length).trim();
                        if (tipsString.toUpperCase() !== 'NONE' && tipsString) result.selfCareTips = tipsString.split('* ').map(tip => tip.trim()).filter(Boolean);
                    } else if (line.startsWith('DOCTOR_SUGGESTION:')) {
                        const suggestion = line.substring('DOCTOR_SUGGESTION:'.length).trim();
                        if (suggestion.toUpperCase() !== 'NONE' && suggestion) result.doctorSuggestion = suggestion;
                    }
                });

                if (!result.conclusion || !result.explanation) throw new Error("Received an unparsable response from the AI.");

                analysisCache.delete(analysisId); // Cleanup
                res.json({
                    conclusion: result.conclusion,
                    explanation: result.explanation,
                    selfCareTips: result.selfCareTips || [],
                    doctorSuggestion: result.doctorSuggestion || ''
                });

            } catch (error: any) {
                handleAIError(error, res, "/api/ai/get-skin-conclusion");
            }
        });

        // --- CONSOLIDATED ENDPOINT for offline queue processing ---
        app.post('/api/ai/analyze-skin', authMiddleware, async (req: any, res: any) => {
            try {
                const { base64ImageData, mimeType, language, mcqAnswers } = req.body;
                if (!base64ImageData || !mimeType) {
                    return res.status(400).json({ message: "Invalid image data provided." });
                }

                // Internal Step 1: Get Description
                const singleImagePrompt = "Analyze this image of a skin condition. Describe what you see in objective, clinical terms. Focus on color, texture, shape, and visible features. Do not diagnose or offer advice. Simply describe the visual information.";
                const imagePart = { inlineData: { data: base64ImageData, mimeType: mimeType } };
                const textPart = { text: singleImagePrompt };
                const descriptionResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [imagePart, textPart] } });
                const descriptionText = descriptionResponse.text;

                if (!descriptionText) throw new Error("The AI could not analyze the provided image.");

                // Internal Step 2: Get Conclusion
                let additionalInfo = "The user did not provide any additional context.";
                if (mcqAnswers && Object.keys(mcqAnswers).length > 0) {
                    additionalInfo = "The user provided these answers:\n" + Object.entries(mcqAnswers).map(([q, a]) => `- ${q}: ${a}`).join("\n");
                }
                const analysisPrompt = `You are an AI health assistant. Your response MUST be ONLY four lines in the '${language}' language, using these exact labels:
CONCLUSION: [MILD or SERIOUS]
EXPLANATION: [Your analysis in one paragraph.]
SELF_CARE_TIPS: [List of 2-3 simple tips, each starting with '* '. If SERIOUS, write NONE.]
DOCTOR_SUGGESTION: [Specialist to see. If MILD, write NONE.]

**Provided Information:**
1. **Image Description:**\n${descriptionText}
2. **User's Answers:** ${additionalInfo}`;
                const analysisResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: analysisPrompt });
                const responseText = analysisResponse.text;
                if (!responseText) throw new Error("AI model returned an empty response.");

                const lines = responseText.trim().split('\n');
                const result: any = {};
                lines.forEach(line => {
                    if (line.startsWith('CONCLUSION:')) {
                        const value = line.substring('CONCLUSION:'.length).trim().toUpperCase();
                        if (value === 'MILD' || value === 'SERIOUS') result.conclusion = value;
                    } else if (line.startsWith('EXPLANATION:')) result.explanation = line.substring('EXPLANATION:'.length).trim();
                    else if (line.startsWith('SELF_CARE_TIPS:')) {
                        const tipsString = line.substring('SELF_CARE_TIPS:'.length).trim();
                        if (tipsString.toUpperCase() !== 'NONE' && tipsString) result.selfCareTips = tipsString.split('* ').map(tip => tip.trim()).filter(Boolean);
                    } else if (line.startsWith('DOCTOR_SUGGESTION:')) {
                        const suggestion = line.substring('DOCTOR_SUGGESTION:'.length).trim();
                        if (suggestion.toUpperCase() !== 'NONE' && suggestion) result.doctorSuggestion = suggestion;
                    }
                });

                if (!result.conclusion || !result.explanation) throw new Error("Received an unparsable AI response.");
                
                res.json({
                    conclusion: result.conclusion,
                    explanation: result.explanation,
                    selfCareTips: result.selfCareTips || [],
                    doctorSuggestion: result.doctorSuggestion || ''
                });

            } catch (error: any) {
                handleAIError(error, res, "/api/ai/analyze-skin");
            }
        });
        
        app.post('/api/ai/chat', authMiddleware, async (req: any, res: any) => {
          try {
            const { message, language } = req.body;
            const phone = req.user!.phone;

            const systemInstruction = `You are a compassionate AI health assistant. Your role is to guide the user through a series of simple questions to understand their health concerns. You are not a doctor and must not provide a definitive diagnosis.
              **Crucial Guidelines:**
              *   **Language:** All communication MUST be in simple, easy-to-understand ${language}.
              *   **Format:** Your response MUST ALWAYS be a single, valid JSON object and nothing else. Do not add markdown formatting.
              **JSON Response Formats:**
              1.  **For asking a follow-up question:**
                  { "text": "Your single, clear question...", "suggestions": ["Short reply 1", "Short reply 2", "Not sure"] }
              2.  **For the FINAL triage result (after asking at least 3-4 questions):**
                  { "triageResult": { "conclusion": "MILD" or "SERIOUS", "explanation": "A simple explanation.", "selfCareTips": ["Tip 1", "Tip 2"], "doctorSuggestion": "e.g., 'Please see a General Physician.'" } }`;

            let session = await ChatSession.findOne({ userPhone: phone });
            
            // If session doesn't exist OR language changed, reset session
            if (!session || session.language !== language) {
                session = await ChatSession.findOneAndUpdate(
                    { userPhone: phone },
                    { language, history: [] },
                    { upsert: true, new: true }
                );
            }

            if (!session) {
                return res.status(500).json({ message: "Could not create or find chat session." });
            }

            // --- DEEP HISTORY SANITIZATION ---
            // 1. Filter out completely empty messages (no text)
            let validHistory = session.history.filter(h => h.parts.some(p => p.text && p.text.trim().length > 0));

            // 2. Convert to SDK format
            let cleanHistory = validHistory.map(h => ({
                role: h.role,
                parts: h.parts.map(p => ({ text: p.text }))
            }));

            // 3. Ensure history starts with 'user'. If it starts with 'model', remove the first item.
            // Gemini API throws 400 if history starts with 'model'.
            if (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
                 console.warn(`[Chat Sanitizer] History for ${phone} started with model. Removing first item.`);
                 cleanHistory.shift();
            }
            
            // 4. Ensure alternating roles (User -> Model -> User -> Model).
            // If we find two users or two models in a row, we must fix it.
            // Strategy: Keep the *latest* message of a sequence and drop the previous ones to maintain context flow.
            const sanitizedHistory: typeof cleanHistory = [];
            if (cleanHistory.length > 0) {
                sanitizedHistory.push(cleanHistory[0]);
                for (let i = 1; i < cleanHistory.length; i++) {
                    const current = cleanHistory[i];
                    const prev = sanitizedHistory[sanitizedHistory.length - 1];
                    if (current.role === prev.role) {
                        // Collision! E.g. User -> User.
                        // We replace the previous one with the current one (assuming newer is more relevant)
                        // OR we insert a dummy model message. Inserting dummy is risky for context.
                        // Let's drop the previous one.
                        console.warn(`[Chat Sanitizer] Found duplicate role ${current.role} at index ${i}. Dropping previous.`);
                        sanitizedHistory.pop();
                        sanitizedHistory.push(current);
                    } else {
                        sanitizedHistory.push(current);
                    }
                }
            }
            cleanHistory = sanitizedHistory;

            // 5. Ensure the history ends with 'model'.
            // Because we are about to send a NEW 'user' message. 
            // If the last message in history is 'user', then we'd have User -> User (fail).
            if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
                console.warn(`[Chat Sanitizer] History for ${phone} ended with user. Removing last item to allow new user message.`);
                cleanHistory.pop();
            }

            const chat = ai.chats.create({ 
                model: 'gemini-2.5-flash', 
                config: { 
                    systemInstruction,
                    responseMimeType: 'application/json' 
                }, 
                history: cleanHistory 
            });
            
            // Add user message to DB *before* sending, so if it fails, we at least recorded intent
            // (But we might need to clean it up next time if it fails!)
            session.history.push({ role: 'user', parts: [{ text: message }] });
            await session.save();

            const response = await chat.sendMessage({ message });
            let responseText = response.text;
            
            if (!responseText) {
                // If API returns empty, we must revert the user message in DB to prevent "User -> User" next time
                session.history.pop(); 
                await session.save();
                throw new Error("Chat service returned an empty response.");
            }
            
            session.history.push({ role: 'model', parts: [{ text: responseText }] });
            await session.save();

            // Clean Markdown fences before parsing JSON
            responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

            try {
                res.json(JSON.parse(responseText));
            } catch (e) {
                console.error("Failed to parse JSON from AI response:", e, "Response was:", responseText);
                // Fallback: send text as-is
                res.json({ text: responseText, suggestions: [] });
            }
          } catch (error: any) {
            handleAIError(error, res, "/api/ai/chat");
          }
        });
        
        app.get('/api/hospitals', async (req: any, res: any) => {
            try {
                let hospitals = await Hospital.find();
                if (hospitals.length === 0) {
                    console.log('No hospitals in DB, seeding from db.json...');
                    try {
                        const fileContent = fs.readFileSync(path.join(__dirname, '..', 'db.json'), 'utf-8');
                        await Hospital.insertMany(JSON.parse(fileContent).hospitals);
                        hospitals = await Hospital.find();
                    } catch (seedError) { console.error('Could not seed hospitals:', seedError); }
                }
                res.json(hospitals);
            } catch (error) {
                console.error("Error in /api/hospitals:", error);
                res.status(500).json({ message: "An internal server error occurred." });
            }
        });
        app.get('/api/bookings', authMiddleware, async (req: any, res: any) => {
            try {
                if (req.user?.isGuest) return res.json([]);
                const bookings = await Booking.find({ userPhone: req.user?.phone }).sort({ _id: -1 });
                res.json(bookings);
            } catch (error) {
                console.error("Error fetching bookings:", error);
                res.status(500).json({ message: "Failed to fetch appointment history." });
            }
        });
        app.post('/api/bookings', authMiddleware, async (req: any, res: any) => {
            try {
                if (req.user?.isGuest) return res.status(403).json({ message: "Guests cannot make bookings." });
                const savedBooking = await new Booking({ ...req.body, userPhone: req.user!.phone }).save();
                res.status(201).json(savedBooking);
            } catch (error) {
                console.error("Error creating booking:", error);
                res.status(500).json({ message: "Failed to save your booking." });
            }
        });
        app.delete('/api/bookings/:token', authMiddleware, async (req: any, res: any) => {
            try {
                if (req.user?.isGuest) return res.status(403).json({ message: "Guests cannot cancel bookings." });
                const { token } = req.params;
                const result = await Booking.deleteOne({ token: token, userPhone: req.user!.phone });
                if (result.deletedCount === 0) return res.status(404).json({ message: "Booking not found." });
                res.status(200).json({ message: "Booking cancelled successfully." });
            } catch (error) {
                console.error("Error deleting booking:", error);
                res.status(500).json({ message: "Failed to cancel your booking." });
            }
        });
        app.post('/api/feedback', authMiddleware, async (req: any, res: any) => {
            try {
                if (req.user?.isGuest) return res.status(403).json({ message: "Guests cannot submit feedback." });
                const { feedback } = req.body;
                if(!feedback) return res.status(400).json({ message: 'Feedback is required.' });
                await new Feedback({ userPhone: req.user!.phone, feedback }).save();
                res.status(201).json({ message: 'Feedback received' });
            } catch (error) {
                console.error("Error saving feedback:", error);
                res.status(500).json({ message: "Failed to save feedback." });
            }
        });

        if (isProduction) {
            // In a split deployment (Backend on Render, Frontend on Vercel), 
            // the backend likely won't be serving static files.
            // However, we keep this logic in case you decide to deploy monolithically.
            const frontendBuildPath = path.join(__dirname, '..', '..', 'dist');
            if (fs.existsSync(frontendBuildPath)) {
                app.use(express.static(frontendBuildPath) as any);
                app.get('*', (req: any, res: any) => {
                    res.sendFile(path.join(frontendBuildPath, 'index.html'));
                });
            }
        }

        app.listen(PORT, () => console.log(`\u{1F680} Server listening on http://localhost:${PORT} in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode.`));

    } catch (error) {
        // This block ensures that even if a non-Error object is thrown (like the one causing
        // the 'Object: null prototype' crash), the server will log it gracefully and exit,
        // rather than crashing with an unhelpful message.
        if (error instanceof Error) {
            console.error("❌ Fatal error during server startup:", error.message);
            // Optionally log stack in dev for more details
            if (process.env.NODE_ENV !== 'production' && error.stack) {
                console.error(error.stack);
            }
        } else {
            console.error("❌ Fatal error during server startup: An unknown or non-Error object was thrown.");
            console.error("Thrown object:", error);
        }
        process.exit(1);
    }
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
};

interface UserPayload {
    phone: string;
    name: string;
    role: 'PATIENT' | 'DOCTOR' | 'HOSPITAL';
    hospitalName?: string;
    isGuest?: boolean;
}

const startServer = async () => {
    try {
        await connectDB();
        await seedPresentationData();

        const app = express();
        
        app.use(helmet() as any);
        app.use(cors({ origin: '*' }));
        app.use(express.json({ limit: '50mb' }) as any);

        // --- AUTH MIDDLEWARE ---
        const authMiddleware = (req: any, res: any, next: NextFunction) => {
          const authHeader = req.headers.authorization;
          if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized: Missing Token' });
          try {
            req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as UserPayload;
            next();
          } catch (error) {
            return res.status(401).json({ message: 'Unauthorized: Invalid Token' });
          }
        };

        // --- AUTH ROUTES ---
        app.post('/api/auth/request-otp', async (req: any, res: any) => {
            const { phone } = req.body;
            try {
                if (phone === MY_VERIFIED_NUMBER && twilioClient && TWILIO_SERVICE_SID) {
                    await twilioClient.verify.v2.services(TWILIO_SERVICE_SID)
                        .verifications.create({ to: `+91${phone}`, channel: 'sms' });
                    return res.json({ message: "Real OTP sent via Twilio." });
                }
                console.log(`[MOCK OTP] For ${phone}, use code 123456`);
                return res.json({ message: "Mock OTP generated (Presentation Mode)." });
            } catch (err) {
                res.status(500).json({ message: "Could not send OTP." });
            }
        });

        app.post('/api/auth/login-patient', async (req: any, res: any) => {
            const { phone, otp, name } = req.body;
            try {
                let verified = (phone === MY_VERIFIED_NUMBER && twilioClient) ? false : (otp === '123456');
                if (phone === MY_VERIFIED_NUMBER && twilioClient && TWILIO_SERVICE_SID) {
                    const check = await twilioClient.verify.v2.services(TWILIO_SERVICE_SID).verificationChecks.create({ to: `+91${phone}`, code: otp });
                    verified = check.status === 'approved';
                }
                if (!verified) return res.status(401).json({ message: "Invalid OTP code." });
                
                const user = await User.findOneAndUpdate(
                    { phone }, 
                    { name: name || 'Patient ' + phone.slice(-4), role: 'PATIENT', lastLogin: new Date(), isOnline: true }, 
                    { upsert: true, new: true }
                );
                
                const token = jwt.sign({ phone: user.phone, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ token, user: { name: user.name, phone: user.phone, role: user.role } });
            } catch (err) {
                res.status(500).json({ message: "Authentication failed." });
            }
        });

        app.post('/api/auth/login-staff', async (req: any, res: any) => {
            const { email, password, role } = req.body;
            const credentialsMap: Record<string, { phone: string, pass: string }> = {
                'rohan@delhi.gh': { phone: '9999888877', pass: 'doc123' },
                'priya@delhi.gh': { phone: '9999888866', pass: 'doc123' },
                'admin@delhi.gh': { phone: '7777666655', pass: 'admin123' },
                'vikram@gurgaon.chc': { phone: '8888777711', pass: 'doc123' },
                'admin@gurgaon.chc': { phone: '7777111122', pass: 'admin123' }
            };

            const creds = credentialsMap[email];
            if (creds && creds.pass === password) {
                const user = await User.findOneAndUpdate(
                    { phone: creds.phone }, 
                    { lastLogin: new Date(), isOnline: true }, 
                    { new: true }
                );
                if (!user) return res.status(404).json({ message: "Account setup error." });
                const token = jwt.sign({ phone: user.phone, name: user.name, role: user.role, hospitalName: user.hospitalName }, JWT_SECRET, { expiresIn: '7d' });
                return res.json({ token, user: { name: user.name, phone: user.phone, role: user.role, hospitalName: user.hospitalName } });
            }
            res.status(401).json({ message: "Invalid ID or Password." });
        });

        app.post('/api/auth/guest', async (req: any, res: any) => {
            const guestPhone = "GUEST_" + Math.random().toString(36).substring(7);
            const token = jwt.sign({ phone: guestPhone, name: 'Guest Explorer', role: 'PATIENT', isGuest: true }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, user: { name: 'Guest Explorer', phone: guestPhone, role: 'PATIENT', isGuest: true } });
        });

        app.post('/api/auth/logout', authMiddleware, async (req: any, res: any) => {
            await User.findOneAndUpdate({ phone: req.user.phone }, { lastLogout: new Date(), isOnline: false });
            res.json({ message: "Logged out" });
        });

        // --- PROFILE ROUTES ---
        app.put('/api/profile', authMiddleware, async (req: any, res: any) => {
            const { name, phone } = req.body;

            // Input validation
            if (!name || typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ message: 'Name cannot be empty.' });
            }
            if (!phone || !/^\d{10}$/.test(phone.trim())) {
                return res.status(400).json({ message: 'A valid 10-digit phone number is required.' });
            }

            try {
                const updatedUser = await User.findOneAndUpdate(
                    { phone: req.user.phone },
                    { name: name.trim(), phone: phone.trim() },
                    { new: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ message: 'User account not found.' });
                }

                // Re-issue a fresh JWT so the client token reflects the updated name immediately.
                const newToken = jwt.sign(
                    { phone: updatedUser.phone, name: updatedUser.name, role: updatedUser.role, hospitalName: updatedUser.hospitalName },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                return res.json({
                    user: { name: updatedUser.name, phone: updatedUser.phone, role: updatedUser.role },
                    token: newToken
                });
            } catch (err) {
                console.error('Profile update error:', err);
                return res.status(500).json({ message: 'Failed to update profile.' });
            }
        });

        // --- AI ROUTES ---
        app.post('/api/ai/describe-skin-image', authMiddleware, async (req: any, res: any) => {
            const { base64ImageData, mimeType } = req.body;
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: {
                        parts: [
                            { inlineData: { data: base64ImageData, mimeType } },
                            { text: "Act as a clinical dermatologist. Closely examine this image. Identify: 1. Primary lesions, 2. Secondary markers, 3. Distribution. Provide a detailed medical description for a doctor's review." }
                        ]
                    }
                });
                res.json({ description: response.text || "Inconclusive visual evidence." });
            } catch (err) {
                res.status(500).json({ message: "Vision analysis failed." });
            }
        });

        app.post('/api/ai/get-skin-conclusion', authMiddleware, async (req: any, res: any) => {
            const { visualDescription, mcqAnswers, language } = req.body;
            try {
                const prompt = `Act as a triage expert for an Indian Hospital. Visual: "${visualDescription}". Context: ${JSON.stringify(mcqAnswers)}. Language: ${language}. Output JSON with: likelyCondition, conclusion (MILD/SERIOUS), explanation (100+ words), selfCareTips (array), doctorSuggestion.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                likelyCondition: { type: Type.STRING },
                                conclusion: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                selfCareTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                                doctorSuggestion: { type: Type.STRING }
                            },
                            required: ["likelyCondition", "conclusion", "explanation", "doctorSuggestion"]
                        }
                    }
                });
                res.json(JSON.parse(response.text!));
            } catch (err) {
                res.status(500).json({ message: "Triage processing error." });
            }
        });

        app.post('/api/ai/chat', authMiddleware, async (req: any, res: any) => {
            const { message, language } = req.body;
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: message,
                    config: {
                        systemInstruction: `You are a medical triage assistant helping an Indian patient. Language: ${language}. Current message: "${message}". 
                        
                        RULES:
                        1. Be concise and compassionate.
                        2. Ask ONE follow-up question at a time.
                        3. If you have enough info to suggest a condition, populate 'triageResult'.
                        4. 'suggestions' should be short 2-3 word buttons for the user.`,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING, description: "The message to show to the user." },
                                suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Quick reply buttons." },
                                triageResult: {
                                    type: Type.OBJECT,
                                    properties: {
                                        likelyCondition: { type: Type.STRING },
                                        conclusion: { type: Type.STRING, description: "MILD or SERIOUS" },
                                        explanation: { type: Type.STRING },
                                        selfCareTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        doctorSuggestion: { type: Type.STRING }
                                    }
                                }
                            },
                            required: ["text"]
                        }
                    }
                });
                res.json(JSON.parse(response.text!));
            } catch (err) {
                console.error("AI Chat Error:", err);
                res.status(500).json({ message: "Chat AI failed to process request." });
            }
        });

        // --- BOOKING & DATA ROUTES ---
        app.get('/api/bookings', authMiddleware, async (req: any, res: any) => {
            const { role, phone, name, hospitalName } = req.user;
            let filter: any = {};
            if (role === 'PATIENT') filter = { userPhone: phone };
            else if (role === 'DOCTOR') filter = { hospital: hospitalName, doctorName: name };
            else if (role === 'HOSPITAL') filter = { hospital: hospitalName };
            const bookings = await Booking.find(filter).sort({ _id: -1 });
            res.json(bookings);
        });

        app.patch('/api/bookings/:token', authMiddleware, async (req: any, res: any) => {
            const { token } = req.params;
            const { status, notes } = req.body;
            try {
                const booking = await Booking.findOneAndUpdate(
                    { token }, 
                    { status, notes }, 
                    { new: true }
                );
                if (!booking) return res.status(404).json({ message: "Booking not found." });
                res.json(booking);
            } catch (err) {
                res.status(500).json({ message: "Failed to update status." });
            }
        });

        app.post('/api/bookings', authMiddleware, async (req: any, res: any) => {
            const booking = await new Booking({ ...req.body, userPhone: req.user.phone, status: 'PENDING' }).save();
            res.status(201).json(booking);
        });

        // Soft-delete: sets status to CANCELLED rather than destroying the record.
        // Security gate: patients may only cancel their own bookings.
        app.delete('/api/bookings/:token', authMiddleware, async (req: any, res: any) => {
            const { token } = req.params;
            try {
                const booking = await Booking.findOne({ token });
                if (!booking) {
                    return res.status(404).json({ message: 'Booking not found.' });
                }
                // Ownership check: only the patient who created this booking can cancel it.
                if (req.user.role === 'PATIENT' && booking.userPhone !== req.user.phone) {
                    return res.status(403).json({ message: 'You are not authorised to cancel this booking.' });
                }
                booking.status = 'CANCELLED';
                await booking.save();
                res.json({ message: 'Booking cancelled successfully.', booking });
            } catch (err) {
                console.error('Cancel booking error:', err);
                res.status(500).json({ message: 'Failed to cancel booking.' });
            }
        });

        app.get('/api/hospital/doctors', authMiddleware, async (req: any, res: any) => {
            const { hospitalName } = req.user;
            const doctors = await User.find({ hospitalName, role: 'DOCTOR' }).select('name lastLogin lastLogout isOnline');
            res.json(doctors);
        });

        app.get('/api/feedback', authMiddleware, async (req: any, res: any) => {
            const feedbacks = await Feedback.find().sort({ createdAt: -1 });
            res.json(feedbacks);
        });

        app.post('/api/feedback', authMiddleware, async (req: any, res: any) => {
            await new Feedback({ userPhone: req.user.phone, feedback: req.body.feedback }).save();
            res.status(201).json({ message: 'ok' });
        });

        app.get('/api/hospitals', async (req, res) => res.json(await Hospital.find()));

        const PORT = process.env.PORT || 3005;
        app.listen(PORT, () => console.log(`🚀 Ad Astra Sync Server LIVE on ${PORT}`));
    } catch (error) { console.error(error); }
};
startServer();
