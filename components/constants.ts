
/**
 * @file components/constants.ts
 * @description Re-export shim — all constants live in the root constants.ts.
 * This file exists for backward compatibility only. Do NOT add new constants here.
 * Import directly from '../constants' (root) in all new code.
 */
<<<<<<< HEAD
=======
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
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab

// Re-export the canonical URL under both names for full backward compatibility.
export { BACKEND_URL, LANGUAGES } from '../constants';

// API_BASE_URL is an alias for BACKEND_URL — kept for any legacy imports.
export { BACKEND_URL as API_BASE_URL } from '../constants';
