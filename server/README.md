# Ad Astra - Backend API

This is the server-side application for **Ad Astra**. It acts as the bridge between the React frontend, the Database (MongoDB), and the AI models (Google Gemini).

We built this backend to keep our API keys secure and to handle business logic like session management and appointment bookings away from the client-side.

##  Architecture at a Glance

*   **Runtime:** Node.js with Express.
*   **Database:** MongoDB Atlas (Cloud). We use `Mongoose` for schema modeling.
*   **AI Engine:** Google Gemini (`gemini-2.5-flash`). The backend constructs the system prompts to ensure the AI behaves like a medical assistant, not a generic chatbot.
*   **Auth:** JWT (JSON Web Tokens) for session handling.
*   **SMS/OTP:**
    *   **Production:** Twilio API (for real SMS).
    *   **Development:** A built-in "Mock Mode" that logs the OTP to the console so you don't waste money on SMS credits during testing.

---

##  Quick Start

### 1. Prerequisites
You need **Node.js** installed. You also need a **MongoDB Atlas** URI (free tier works fine) and a **Google Gemini API Key**.

### 2. Install Dependencies
Navigate to the `server` folder and install the packages:

```bash
cd server
npm install
```

### 3. Setup Environment Variables
Create a file named `.env` inside the `server/` folder. Copy and paste this:

```ini
PORT=3002
MONGO_URI=your_mongodb_connection_string_here
API_KEY=your_google_gemini_api_key_here
JWT_SECRET=any_random_secret_string

# Optional: Only needed if you want REAL SMS.
# If you leave these blank, the app defaults to "Mock Mode" (logs OTP to console).
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

### 4. Run it
```bash
npm run dev
```
The server will start on `http://localhost:3005`.

---

##  How the AI Logic Works

We don't just pass the user's message to Gemini. We wrap it in a **System Instruction**.

1.  **Skin Analysis:**
    *   **Step 1:** The user uploads an image. We send it to Gemini with a prompt to "Describe this image clinically."
    *   **Step 2:** We take that description and feed it back into Gemini with the user's MCQ answers to ask for a "Conclusion" (Mild vs Serious).
    *   *Why two steps?* It prevents the AI from hallucinating a diagnosis without first grounding itself in what it actually "sees."

2.  **Symptom Chat:**
    *   We inject a persona: "You are a compassionate health assistant... do not provide a definitive diagnosis."
    *   We force the output to be JSON so the frontend can render specific UI elements (like follow-up buttons or triage cards).

---

##  API Routes

### Auth
*   `POST /api/auth/send-otp`: Takes a phone number. If Twilio keys are missing, it generates a random 6-digit code and logs it to the terminal.
*   `POST /api/auth/verify-otp`: Exchanges that code for a JWT.
*   `POST /api/auth/guest`: Generates a temporary guest token for quick testing.

### AI
*   `POST /api/ai/describe-skin-image`: Step 1 of the vision pipeline.
*   `POST /api/ai/get-skin-conclusion`: Step 2 of the vision pipeline.
*   `POST /api/ai/chat`: General symptom checker.

### Core
*   `GET /api/hospitals`: Fetches list of hospitals (auto-seeded from `db.json` if the DB is empty).
*   `POST /api/bookings`: Saves an appointment.

---

## Common Issues & Fixes

**1. "MongoNetworkError" or "ReplicaSetNoPrimary"**
*   **What it means:** Your computer's IP address isn't allowed to talk to MongoDB Atlas.
*   **Fix:** Go to Atlas Dashboard -> Network Access -> Add IP Address -> **"Allow Access from Anywhere"** (for dev) or "Add Current IP".

**2. "429 Too Many Requests" from AI**
*   **What it means:** You hit the free quota limit for the Gemini API (usually 15 requests/minute).
*   **Fix:** Wait a minute. The backend sends a specific error message to the frontend so the user knows to wait.

**3. "Payload Too Large"**
*   **What it means:** The image you tried to upload is huge.
*   **Fix:** The server is configured to accept up to 10MB (`express.json({ limit: '10mb' })`). If you need more, change that line in `index.ts`.

---

##  Developer Notes

*   **Seeding Data:** If you connect to a fresh database, the server will automatically insert dummy hospitals from `db.json` on the first run. You don't need to manually import anything.
*   **Offline Queue:** There's a special endpoint `/api/ai/analyze-skin` designed for the "Offline Mode." It combines the two-step AI process into one call so it can be processed in the background when the user reconnects.
