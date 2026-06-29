# Ad Astra — Frontend Architecture & UI

This directory contains the React/Vite frontend for the Ad Astra platform. It is designed as a highly responsive, offline-capable Progressive Web Application (PWA) with a focus on accessibility and premium UI/UX.

## 🎨 Design System & Aesthetics

The application utilizes a custom, modern design language built entirely with Tailwind CSS utility classes.
- **Theme:** Dynamic Light/Dark mode via `localStorage` and CSS variables (`.dark` class on root).
- **Glassmorphism:** Extensive use of semi-transparent backgrounds, backdrop blurs, and subtle borders to create depth.
- **Micro-interactions:** Elements utilize `hover:scale`, `active:scale`, and custom CSS keyframes (`animate-fade-in`, `animate-slide-up`) to make the interface feel alive and responsive.
- **Responsive:** Fluid layouts utilizing CSS Grid and Flexbox, fully optimized for both mobile devices and desktop clinical workstations.

## 🏗️ Core Technical Decisions

### 1. Offline-First Resilience (Optimistic Queuing)
Healthcare apps must work in low-connectivity areas. 
- **The Queue:** If a user submits a skin analysis or symptom check while offline, the payload is serialized and stored in `localStorage` (`queuedAnalyses`).
- **The Recovery:** An event listener on `window.online` monitors network status. Upon reconnection, the `processAnalysisQueue()` service automatically flushes the queue, processes the requests against the backend in the background, and notifies the user via a global toast banner.

### 2. State Management & Navigation
- We opted for lightweight, prop-drilled state combined with top-level controller logic in `App.tsx` rather than introducing a heavy dependency like Redux.
- Navigation is handled via a strict State Machine (`currentView`), ensuring users cannot bypass required flows (e.g., forcing language selection before login).

### 3. Internationalization (i18n)
- Built on `react-i18next`.
- Supports 9 languages.
- Translation dictionaries are strictly typed and loaded synchronously to prevent UI layout shifts or "flash of un-translated text".

## 🧩 Key Components

- **`Home.tsx`**: Dynamic dashboard that morphs based on the authenticated user's role (Patient vs. Clinical Staff).
- **`SkinDetector.tsx`**: Interfaces with the device camera/file system. Handles client-side image compression (canvas-based) to ensure payload sizes stay well under the backend's 10MB limit before hitting the network.
- **`SymptomChecker.tsx`**: A WhatsApp-style chat interface handling multi-turn AI conversations, rendering structured suggestions and triage results dynamically.
- **`Dashboard.tsx`**: The Hospital Admin workbench. Computes complex real-time analytics (queue flow, doctor workload, triage severity ratios) entirely client-side using derived state from the `/api/bookings` endpoint, minimizing redundant network calls.

## 🚀 Running Locally

1. Install dependencies: `npm install`
2. Create a `.env.local` (optional): `VITE_BACKEND_URL=http://localhost:3005`
3. Start the dev server: `npm run dev`
