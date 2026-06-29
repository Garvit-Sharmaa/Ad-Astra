/**
 * @file services/geminiService.ts
 * @description Re-export shim — all AI service logic lives in AIService.ts.
 * This file exists for backward compatibility with all component imports.
 * Do NOT add new logic here. Import from './AIService' in all new code.
 */
export {
    startSkinAnalysis,
    getSkinAnalysisConclusion,
    handleSymptomChat,
    updateUserProfile,
    queueAnalysisRequest,
    processAnalysisQueue,
} from './AIService';
