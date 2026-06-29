
/**
 * @file components/constants.ts
 * @description Re-export shim — all constants live in the root constants.ts.
 * This file exists for backward compatibility only. Do NOT add new constants here.
 * Import directly from '../constants' (root) in all new code.
 */

// Re-export the canonical URL under both names for full backward compatibility.
export { BACKEND_URL, LANGUAGES } from '../constants';

// API_BASE_URL is an alias for BACKEND_URL — kept for any legacy imports.
export { BACKEND_URL as API_BASE_URL } from '../constants';
