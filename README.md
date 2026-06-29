# Ad Astra — AI-Driven Clinical Triage & Facility Management Platform

<div align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success" alt="Status" />
  <img src="https://img.shields.io/badge/Architecture-Offline--First%20PWA-blue" alt="Architecture" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green" alt="Backend" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blueviolet" alt="Frontend" />
  <img src="https://img.shields.io/badge/AI-Google%20Gemini%202.0-orange" alt="AI Engine" />
</div>

## 📌 Executive Summary

**Ad Astra** is a production-grade, full-stack medical triage application engineered to bridge the healthcare accessibility gap in low-resource and low-connectivity environments. 

Rather than a simple symptom-checker, Ad Astra operates as a **Clinical Triage Pipeline**. It leverages Google's Gemini 2.0 Flash vision and language models to analyze visual (dermatological) and conversational (symptom-based) data. The system categorizes case severity, offers immediate first-aid/self-care guidance, and integrates directly into a localized hospital queue management system for both patients and medical staff.

**Core Directives:**
1. **Resilience:** Offline-first architecture ensures users can log symptoms without an active internet connection. Data syncs automatically upon reconnection.
2. **Accessibility:** Full i18n support across 9 regional languages with dynamic routing.
3. **Security:** Hardened backend with rate-limiting, JWT-based RBAC (Patient, Doctor, Hospital Admin), and strict CORS constraints.

---

## 🏗️ System Architecture

Ad Astra follows a decoupled, client-server architecture with an asynchronous AI processing queue.

```mermaid
graph TD
    Client[React PWA] -->|REST API / JWT Auth| Server[Express.js Node Backend]
    Server -->|Mongoose ODM| DB[(MongoDB Atlas)]
    Server <-->|Prompt Eng. & Vision API| Gemini[Google Gemini 2.0 API]
    
    subgraph Client [Frontend (Offline-First)]
        UI[UI Components]
        State[Local State]
        Storage[LocalStorage / Queue]
        UI <--> State
        State <--> Storage
    end
    
    subgraph Backend [Server (Stateless)]
        Auth[Auth & Rate Limiting]
        Controllers[API Controllers]
        AI[AI Orchestration]
        Auth --> Controllers
        Controllers --> AI
    end
```

---

## 🚀 Key Features

### 1. Multi-Modal AI Triage
- **Vision-Based Dermatological Analysis:** A two-pass AI pipeline. Pass 1 extracts raw clinical visual markers from uploaded images. Pass 2 cross-references these markers with user-reported MCQ answers to formulate a clinical conclusion (MILD/SERIOUS).
- **Conversational Symptom Checker:** Multi-turn conversational AI constrained by system prompts to act as a triage nurse, not a diagnostic oracle.

### 2. Offline-First Resilience
- Network interruptions are seamlessly handled. If a user submits a triage request offline, it is serialized and stored in an optimistic queue.
- Upon detecting the `window.online` event, the queue flushes, processes the AI request in the background, and alerts the user via a global toast notification.

### 3. Role-Based Clinical Workspaces
- **Patients:** View history, reschedule appointments, and view AI triage summaries.
- **Doctors:** Access a real-time clinical workbench to review incoming patient queues and read AI-generated triage summaries before the patient enters the room.
- **Hospital Admins:** Access a real-time analytics dashboard tracking facility load, doctor efficiency, case severity distribution, and patient feedback sentiment.

### 4. Localization (i18n)
- Natively supports English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, and Malayalam.
- AI system prompts are dynamically injected with the user's selected language to ensure responses match the UI language.

---

## 💻 Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (Custom Design System, Glassmorphism)
- **State Management:** React Hooks + LocalStorage for persistence
- **i18n:** `react-i18next`

### Backend
- **Runtime:** Node.js + Express.js
- **Database:** MongoDB (Atlas) via Mongoose
- **Authentication:** JWT (JSON Web Tokens) with OTP validation
- **Security:** `helmet`, `express-rate-limit`, strict CORS configuration

### Infrastructure & AI
- **LLM/VLM:** `@google/genai` (Gemini 2.0 Flash)
- **SMS/Auth:** Twilio (Configurable)

---

## 📂 Project Structure

This repository is organized into a monorepo structure.

*   `./` : The React frontend application. (See [FRONTEND_README.md](./FRONTEND_README.md) for UI architecture).
*   `./server` : The Express.js backend. (See [server/README.md](./server/README.md) for API and AI pipeline details).

---

## 🛠️ Quick Start Guide

Detailed runbooks are available in the respective sub-READMEs, but here is the quick-start sequence:

### 1. Environment Setup
You will need a MongoDB URI and a Google Gemini API Key.

**Backend (`server/.env`):**
```ini
PORT=3005
MONGO_URI=mongodb+srv://...
API_KEY=your_gemini_key
JWT_SECRET=super_secure_random_string
```

### 2. Bootstrapping
```bash
# Start Backend
cd server
npm install
npm run dev

# Start Frontend (in a new terminal)
cd ..
npm install
npm run dev
```

---
*Developed with a focus on non-destructive evolution, scalability, and robust error handling.*
