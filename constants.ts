
// ---------------------------------------------------------------------------
// 🚀 FORCE REMOTE CONNECTION
// We are hardcoding this to ensure the APK absolutely connects to Ngrok.
// ---------------------------------------------------------------------------

// RENAMED VARIABLE TO BREAK CACHE
export const BACKEND_URL = 'https://furlable-june-geniculately.ngrok-free.dev';

// NOTE: If you want to switch back to local development later, uncomment this:
// const LOCAL_IP = '127.0.0.1'; 
// export const BACKEND_URL = `http://${LOCAL_IP}:3005`;

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
