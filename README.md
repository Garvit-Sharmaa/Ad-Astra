<div align="center">
</div>

Ad Astra – AI-Based Medical Triage Web App

Ad Astra is a full-stack health assistance web application that helps users quickly understand their health condition using AI. It allows users to analyze symptoms, detect skin conditions from images, check medical urgency, and even book doctor appointments.

This project is built as a real-world prototype, not just a college demo. It focuses on clean architecture, security, performance, offline support, and practical usability.

⚠️ Disclaimer:
This application is for educational and informational purposes only. It does not replace professional medical advice, diagnosis, or treatment.



What This App Can Do

Analyze user symptoms using AI

Detect possible skin diseases from images

Classify the case as Mild or Serious

Suggest medical guidance based on severity

Allow users to book doctor appointments

Store complete health history

Work in offline mode with automatic sync

Support multiple languages

Secure login with OTP and Guest Mode

Collect user feedback


Why I Built This Project(SIH Project)

The idea behind Ad Astra was to create a basic AI-powered medical triage system that can be useful in areas where:

Doctors are not easily available

Internet connectivity is unstable

People need quick health guidance before visiting a hospital

This project also helped me learn how AI, backend security, databases, authentication, and frontend UI work together in a real production-style application.


Tech Stack Used-->

Frontend-

React with TypeScript

Vite for fast development

i18next for multi-language support

LocalStorage for offline data

Lazy loading for better performance

Backend-

Node.js with Express

MongoDB with Mongoose

JWT-based authentication

OTP system (Twilio supported)

API rate limiting and security headers

AI Integration-

Google Gemini API/ OpenAI API/

Used for:

Symptom analysis

Skin disease detection

Health-related responses

How the App Works

User logs in using:

Guest mode OR

Phone number + OTP

User enters symptoms or uploads a skin image

Backend sends a structured prompt to the AI

AI returns:

Possible condition

Severity level

Basic medical advice

User can:

View result

Book doctor appointment

Save the report

If internet is not available:

The request is saved locally

It automatically syncs when internet returns


Ad-Astra/
│
├── src/                     # Frontend source code
│   ├── components/          # UI components
│   ├── services/            # API & AI calls
│   ├── types.ts             # TypeScript types
│   ├── constants.ts         # App constants
│   ├── i18n.ts              # Language config
│   └── App.tsx              # Main app controller
│
├── server/                  # Backend code
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── index.ts         # Express server
│   │   └── db.ts            # DB connection
│
├── cypress/                 # Testing
└── README.md


Authentication System --->

Guest login for quick access

OTP login using phone number

JWT tokens for secure sessions

Automatic logout when token expires

Offline Support (Important Feature) --->

Even if the internet is not available:

Users can still submit symptom analysis

The data is saved locally

Once the internet is back, everything syncs automatically

This makes the app usable in low-network areas, which is very important for real-world healthcare use.

Security Features-->

Secure HTTP headers using Helmet

API rate limiting to prevent abuse

JWT authentication

All secrets stored in environment variables

Input validation

CORS protection


How to Run This Project on Your System--->

Clone the Repository-
git clone https://github.com/Garvit-Sharmaa/Ad-Astra.git
cd Ad-Astra

Frontend Setup-
npm install
npm run dev

Create a .env file in the root folder:
VITE_API_BASE_URL=http://localhost:3005


Backend Setup-
cd server
npm install
npm run dev

Create server/.env:
MONGO_URI=your_mongodb_connection
API_KEY=your_gemini_api_key
JWT_SECRET=your_secret_key

# Optional (for OTP)
TWILIO_SID=
TWILIO_AUTH=
TWILIO_PHONE=


Future Plans-->

Support for multiple AI models (not just one)

Live doctor consultation

Hospital location with maps

Health reminders

Admin dashboard for doctors

Wearable device data integration



Developer

Garvit Sharma
GitHub: https://github.com/Garvit-Sharmaa





