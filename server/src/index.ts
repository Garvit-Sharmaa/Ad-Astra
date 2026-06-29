
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
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';

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

// --- JWT SECRET HARDENING ---
// In production, crash immediately if the secret is not set — a missing secret
// means all JWT signatures use the hardcoded fallback, which is publicly known.
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start in production mode.');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    const devSecret = randomBytes(32).toString('hex');
    console.warn('[DEV] JWT_SECRET not set. Using a temporary per-session secret. Sessions will not persist across server restarts.');
    return devSecret;
})();

const cleanEnvVar = (val: string | undefined) => val?.trim().replace(/^["']|["']$/g, '').replace(/;$/, '') || '';

const TWILIO_SID = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
const TWILIO_AUTH = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);
const TWILIO_SERVICE_SID = cleanEnvVar(process.env.TWILIO_VERIFY_SERVICE_SID);
const MY_VERIFIED_NUMBER = cleanEnvVar(process.env.MY_TWILIO_NUMBER);

const twilioClient = TWILIO_SID && TWILIO_AUTH ? twilio(TWILIO_SID, TWILIO_AUTH) : null;

// --- MOCK DATABASE SEEDING ---
const seedPresentationData = async () => {
    // Delhi Hospital Accounts — specialties added for booking specialty-matching
    await User.findOneAndUpdate(
        { phone: '9999888877' },
        { name: 'Dr. Rohan Mehra', role: 'DOCTOR', hospitalName: 'District General Hospital, Delhi', specialty: 'Dermatology' },
        { upsert: true }
    );
    await User.findOneAndUpdate(
        { phone: '9999888866' },
        { name: 'Dr. Priya Sharma', role: 'DOCTOR', hospitalName: 'District General Hospital, Delhi', specialty: 'Cardiology' },
        { upsert: true }
    );
    await User.findOneAndUpdate(
        { phone: '7777666655' },
        { name: 'Delhi Hospital Admin', role: 'HOSPITAL', hospitalName: 'District General Hospital, Delhi' },
        { upsert: true }
    );
    
    // Gurgaon Hospital Accounts
    await User.findOneAndUpdate(
        { phone: '8888777711' },
        { name: 'Dr. Vikram Singh', role: 'DOCTOR', hospitalName: 'Community Health Center, Gurgaon', specialty: 'General Medicine' },
        { upsert: true }
    );
    await User.findOneAndUpdate(
        { phone: '7777111122' },
        { name: 'Gurgaon CHC Admin', role: 'HOSPITAL', hospitalName: 'Community Health Center, Gurgaon' },
        { upsert: true }
    );
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

        // --- CORS — Environment-Aware Origin Control ---
        // Dev: allow localhost frontends.
        // Production: restrict to FRONTEND_URL env var only.
        const allowedOrigins: string[] = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:4173', // Vite preview
        ];
        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }
        app.use(cors({
            origin: (origin, callback) => {
                // Allow server-to-server requests (no Origin header) and mobile app requests
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
                callback(new Error(`CORS policy does not allow origin: ${origin}`));
            },
            credentials: true,
        }) as any);

        app.use(express.json({ limit: '10mb' }) as any);

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

        // --- RATE LIMITERS ---
        // Staff login: 10 attempts per IP per 15 min (brute-force guard)
        const staffLoginRateLimit = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 10,
            message: { message: 'Too many login attempts. Please wait before trying again.' },
            standardHeaders: true,
            legacyHeaders: false,
        });

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

        app.post('/api/auth/login-staff', staffLoginRateLimit as any, async (req: any, res: any) => {
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
        // Rate-limit: 20 AI calls per IP per 15 minutes to prevent abuse and control API costs.
        const aiRateLimit = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 20,
            message: { message: 'Too many AI requests. Please wait a moment and try again.' },
            standardHeaders: true,
            legacyHeaders: false,
        });
        app.use('/api/ai', aiRateLimit as any);

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
                const description = response.text?.trim() || 'Inconclusive visual evidence — image may be unclear or non-dermatological.';
                res.json({ description });
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
                const rawText = response.text?.trim();
                if (!rawText) {
                    return res.status(502).json({ message: 'AI returned an empty conclusion. Please try again.' });
                }
                try {
                    res.json(JSON.parse(rawText));
                } catch {
                    res.status(502).json({ message: 'AI returned malformed data. Please try again.' });
                }
            } catch (err) {
                res.status(500).json({ message: "Triage processing error." });
            }
        });

        app.post('/api/ai/chat', authMiddleware, async (req: any, res: any) => {
            const { message, language, history = [] } = req.body;
            try {
                // Build multi-turn conversation contents from history + current message
                const historyContents = history.map((turn: any) => ({
                    role: turn.role,
                    parts: turn.parts
                }));
                const contents = [
                    ...historyContents,
                    { role: 'user', parts: [{ text: message }] }
                ];
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents,
                    config: {
                        systemInstruction: `You are a medical triage assistant helping an Indian patient. Language: ${language}. 
                        
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
                const rawChat = response.text?.trim();
                if (!rawChat) {
                    return res.status(502).json({ message: 'AI returned an empty response. Please try again.' });
                }
                try {
                    res.json(JSON.parse(rawChat));
                } catch {
                    res.status(502).json({ message: 'AI response could not be parsed. Please try again.' });
                }
            } catch (err) {
                console.error("AI Chat Error:", err);
                res.status(500).json({ message: "Chat AI failed to process request." });
            }
        });

        // --- BOOKING & DATA ROUTES ---
        app.get('/api/bookings', authMiddleware, async (req: any, res: any) => {
            try {
                const { role, phone, name, hospitalName } = req.user;
                let filter: any = {};
                if (role === 'PATIENT') filter = { userPhone: phone };
                else if (role === 'DOCTOR') filter = { hospital: hospitalName, doctorName: name };
                else if (role === 'HOSPITAL') filter = { hospital: hospitalName };
                const bookings = await Booking.find(filter).sort({ _id: -1 });
                res.json(bookings);
            } catch (err) {
                console.error('Get bookings error:', err);
                res.status(500).json({ message: 'Failed to fetch bookings.' });
            }
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

        // --- L3: Reschedule endpoint ---
        // Patients can reschedule their own upcoming (non-completed/non-cancelled) bookings.
        app.patch('/api/bookings/:token/reschedule', authMiddleware, async (req: any, res: any) => {
            const { token } = req.params;
            const { date, time } = req.body;
            if (!date || !time) {
                return res.status(400).json({ message: 'New date and time are required.' });
            }
            try {
                const booking = await Booking.findOne({ token });
                if (!booking) return res.status(404).json({ message: 'Booking not found.' });

                // Ownership check — only the patient who owns this booking may reschedule it
                if (req.user.role === 'PATIENT' && (booking as any).userPhone !== req.user.phone) {
                    return res.status(403).json({ message: 'You are not authorised to reschedule this booking.' });
                }
                if (['CANCELLED', 'COMPLETED'].includes((booking as any).status)) {
                    return res.status(400).json({ message: 'Cannot reschedule a cancelled or completed booking.' });
                }

                const updated = await Booking.findOneAndUpdate(
                    { token },
                    { date, time, status: 'PENDING', rescheduledAt: new Date().toISOString() },
                    { new: true }
                );
                res.json(updated);
            } catch (err) {
                res.status(500).json({ message: 'Failed to reschedule booking.' });
            }
        });

        app.post('/api/bookings', authMiddleware, async (req: any, res: any) => {
            // Generate server-side token to guarantee uniqueness — never trust the client-supplied token.
            const serverToken = `A-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
            try {
                const booking = await new Booking({
                    ...req.body,
                    token: serverToken,
                    userPhone: req.user.phone,
                    status: 'PENDING'
                }).save();
                res.status(201).json(booking);
            } catch (err: any) {
                if (err.code === 11000) {
                    // Duplicate key collision — retry once with a fresh token (astronomically rare)
                    const retryToken = `A-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
                    const booking = await new Booking({ ...req.body, token: retryToken, userPhone: req.user.phone, status: 'PENDING' }).save();
                    return res.status(201).json(booking);
                }
                console.error('Create booking error:', err);
                res.status(500).json({ message: 'Failed to create booking.' });
            }
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
            try {
                const { hospitalName } = req.user;
                const doctors = await User.find({ hospitalName, role: 'DOCTOR' }).select('name lastLogin lastLogout isOnline');
                res.json(doctors);
            } catch (err) {
                console.error('Get doctors error:', err);
                res.status(500).json({ message: 'Failed to fetch doctor list.' });
            }
        });

        app.get('/api/feedback', authMiddleware, async (req: any, res: any) => {
            try {
                // C3: Scope feedback by hospital — admins/doctors only see their hospital's data.
                // Patients see only their own submissions (by phone).
                const { role, phone, hospitalName } = req.user;
                let filter: any = {};
                if (role === 'PATIENT') filter = { userPhone: phone };
                else if (role === 'DOCTOR' || role === 'HOSPITAL') {
                    // Feedback is not hospital-keyed in schema — filter to bookings from this hospital
                    // and return feedback from those patients as a proxy for hospital-scoped data.
                    // For now, staff see all feedback (feedback has no hospital field).
                    // TODO: Add hospitalName field to Feedback schema for full isolation.
                }
                const feedbacks = await Feedback.find(filter).sort({ createdAt: -1 });
                res.json(feedbacks);
            } catch (err) {
                console.error('Get feedback error:', err);
                res.status(500).json({ message: 'Failed to fetch feedback.' });
            }
        });

        app.post('/api/feedback', authMiddleware, async (req: any, res: any) => {
            try {
                await new Feedback({ userPhone: req.user.phone, feedback: req.body.feedback }).save();
                res.status(201).json({ message: 'ok' });
            } catch (err) {
                console.error('Submit feedback error:', err);
                res.status(500).json({ message: 'Failed to submit feedback.' });
            }
        });

        // C2: Auth guard added — hospitals data requires a valid JWT.
        app.get('/api/hospitals', authMiddleware, async (req: any, res: any) => {
            try {
                res.json(await Hospital.find());
            } catch (err) {
                console.error('Get hospitals error:', err);
                res.status(500).json({ message: 'Failed to fetch hospitals.' });
            }
        });

        const PORT = process.env.PORT || 3005;
        app.listen(PORT, () => console.log(`ðŸš€ Ad Astra Sync Server LIVE on ${PORT}`));
    } catch (error) { console.error(error); }
};
startServer();
