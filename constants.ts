
// ---------------------------------------------------------------------------
// 🔧 ENVIRONMENT-AWARE BACKEND URL
// Reads from Vite env var in production/staging, falls back to local server.
//
// How to configure:
//   - Local dev:      Set VITE_BACKEND_URL in .env.local (or leave unset for localhost)
//   - Ngrok tunnel:   VITE_BACKEND_URL=https://your-tunnel.ngrok-free.app
//   - Vercel deploy:  Set VITE_BACKEND_URL in Vercel dashboard environment variables
//   - Render deploy:  Set VITE_BACKEND_URL in Render dashboard environment variables
// ---------------------------------------------------------------------------

export const BACKEND_URL: string =
  (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:3005';

export const LANGUAGES = [
  { code: 'en', name: 'English', icon: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी', icon: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', icon: '🇧🇩' },
  { code: 'ta', name: 'தமிழ்', icon: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', icon: '🇮🇳' },
  { code: 'mr', name: 'मराठी', icon: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', icon: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', icon: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', icon: '🇮🇳' },
];
