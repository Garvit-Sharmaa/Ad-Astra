# Ad Astra — Backend Architecture & API

This directory contains the Express.js backend for the Ad Astra platform. It is engineered to be a stateless, secure, and robust orchestration layer between the client, the database, and the Google Gemini AI engine.

## 🏗️ Core Architecture Concepts

### 1. Security & Hardening First
- **Strict CORS:** Configured via the `FRONTEND_URL` environment variable. Unrecognized origins are blocked outright.
- **Rate Limiting:** Aggressive rate limiting on critical endpoints.
  - `/api/auth/login-staff`: 10 requests / 15 minutes to prevent credential brute-forcing.
  - `/api/ai/*`: 20 requests / 15 minutes to prevent API budget exhaustion and abuse.
- **JWT Lifecycles:** Stateless sessions. The server refuses to boot in production if `JWT_SECRET` is undefined, preventing fallback to easily guessable development keys.
- **Payload Constraints:** JSON payload limits strictly enforced (10MB for image data) to prevent memory exhaustion attacks.

### 2. The AI Triage Pipeline (Prompt Engineering)
We do not blindly proxy user input to the LLM. We utilize a multi-step orchestration process to ensure clinical safety and determinism.

**Dermatological Vision Pipeline:**
To prevent the model from jumping to conclusions, we force a two-pass logical flow:
1.  **Pass 1 (Objective Observation):** `POST /api/ai/describe-skin-image`
    - **Prompt:** "Act as a clinical dermatologist. Closely examine this image. Identify: 1. Primary lesions, 2. Secondary markers, 3. Distribution."
    - **Output:** A purely objective clinical description.
2.  **Pass 2 (Triage Synthesis):** `POST /api/ai/get-skin-conclusion`
    - **Prompt:** Takes the output from Pass 1, combines it with structured MCQ answers, and forces the model to output strict JSON conforming to the `TriageResultData` schema.

**Symptom Chat Pipeline:**
- Stateful on the client, stateless on the server. The client passes the conversational history.
- The system prompt explicitly restricts the AI from providing definitive diagnoses and mandates concise, actionable triage guidance.

### 3. Role-Based Access Control (RBAC)
The `authMiddleware` validates JWTs and injects the `UserPayload` into the request.
- **PATIENT:** Can only query and mutate their own data (enforced via `userPhone` matching).
- **DOCTOR:** Scoped to view bookings and patient data routed to their specific `hospitalName` and `doctorName`.
- **HOSPITAL:** Administrative view, scoped to aggregate data across their specific `hospitalName`.

## 🛣️ Key API Routes

### Authentication (`/api/auth`)
- `POST /request-otp`: Initiates Twilio flow (falls back to mock mode in dev).
- `POST /login-patient`: Validates OTP and provisions a `PATIENT` JWT.
- `POST /login-staff`: Validates email/password for clinical staff. Rate-limited.

### AI Orchestration (`/api/ai`)
- `POST /describe-skin-image`: Pass 1 of the vision pipeline.
- `POST /get-skin-conclusion`: Pass 2 of the vision pipeline.
- `POST /chat`: Multi-turn conversational triage.

### Clinical Data (`/api/bookings`, `/api/feedback`)
- `GET /bookings`: Dynamically scoped based on JWT role.
- `POST /bookings`: Creates an appointment, mapping the AI triage summary to the clinical record.
- `PATCH /bookings/:token/reschedule`: Reschedules an appointment. Validates ownership and current status (cannot reschedule CANCELLED/COMPLETED).

## 🚀 Running in Production

To run this backend in a production environment (e.g., Render, Railway, AWS):

1. Set `NODE_ENV=production`.
2. Ensure `JWT_SECRET` is set to a secure, high-entropy string (the server will crash on boot if missing).
3. Set `FRONTEND_URL` to your exact frontend domain (e.g., `https://ad-astra.vercel.app`) to lock down CORS.
4. Execute via `npm start` (or compile via `tsc` and run the output `dist/index.js`).
