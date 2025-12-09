// In development, the Vite server is on a different port than the backend.
// This dynamically constructs the backend URL based on the hostname used to access the frontend.
const isDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname.includes('googleusercontent.com') || // For AI Studio
  (window.location.port && Number(window.location.port) > 1024);

/**
 * Constructs the correct development API URL.
 * - For proxied environments (like Google AI Studio), it replaces the port in the hostname.
 * - For standard localhost, it appends the port.
 */
const getDevelopmentApiUrl = () => {
    // For Google AI Studio and similar proxied environments
    if (window.location.hostname.includes('googleusercontent.com')) {
        // The hostname format is typically <port>-<unique-id>.googleusercontent.com
        // We need to replace the frontend port (e.g., 5173) with the backend port (3002)
        const currentHostname = window.location.hostname;
        const backendHostname = currentHostname.replace(/^\d+/, '3005');
        return `${window.location.protocol}//${backendHostname}`;
    }
    
    // For standard localhost development
    return `${window.location.protocol}//${window.location.hostname}:3002`;
};

const developmentApiUrl = getDevelopmentApiUrl();
const productionApiUrl = '';

export const API_BASE_URL = isDevelopment ? developmentApiUrl : productionApiUrl;

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