
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

const cleanEnvVar = (val: string | undefined) => val?.trim().replace(/^["']|["']$/g, '').replace(/;$/, '') || '';

const TWILIO_SID = cleanEnvVar(process.env.TWILIO_ACCOUNT_SID);
const TWILIO_AUTH = cleanEnvVar(process.env.TWILIO_AUTH_TOKEN);
const TWILIO_SERVICE_SID = cleanEnvVar(process.env.TWILIO_VERIFY_SERVICE_SID);
const MY_VERIFIED_NUMBER = cleanEnvVar(process.env.MY_TWILIO_NUMBER);

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
