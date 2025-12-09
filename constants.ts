// In development, the Vite proxy in `vite.config.ts` handles forwarding `/api` requests
// to the backend server. In production, the frontend and backend are served from the
// same origin. Therefore, a relative path (`''`) works for both environments.
export const API_BASE_URL = '';

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
