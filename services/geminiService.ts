
import { TriageResultData, ChatResponse, QueuedAnalysisRequest, User } from '../types';
import { BACKEND_URL } from '../constants';

const ANALYSIS_QUEUE_KEY = 'analysisQueue';
const ANALYSIS_RESULTS_KEY = 'analysisResults';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('healthAppToken');
    const fullUrl = `${BACKEND_URL}${endpoint}`;
    
    console.log(`[API REQUEST] ${options.method || 'GET'} -> ${fullUrl}`);

    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let response: Response;
    try {
        response = await fetch(fullUrl, { ...options, headers });
    } catch (networkError) {
        console.error("Network Link Failed:", networkError);
        throw new Error("Cannot reach server. You might be offline.");
    }

    if (!response.ok) {
        let errorMessage = `Server responded with ${response.status}`;
        try {
            const errorJson = await response.json();
            errorMessage = errorJson.message || errorMessage;
        } catch (e) {
            if (response.status === 404) errorMessage = "Requested feature is not yet available on this server version.";
            if (response.status === 413) errorMessage = "The photo file is too large. Please resize it.";
        }
        throw new Error(errorMessage);
    }
    
    return await response.json();
}

/**
 * Step 1: Upload image and get a clinical visual description.
 */
export async function startSkinAnalysis(base64ImageData: string, mimeType: string): Promise<{ description: string }> {
    return await apiFetch('/api/ai/describe-skin-image', {
        method: 'POST',
        body: JSON.stringify({ base64ImageData, mimeType })
    });
}

/**
 * Step 2: Combine visual description and symptoms for triage.
 */
export async function getSkinAnalysisConclusion(visualDescription: string, mcqAnswers: Record<string, string>, language: string): Promise<TriageResultData> {
    return await apiFetch('/api/ai/get-skin-conclusion', {
        method: 'POST',
        body: JSON.stringify({ visualDescription, mcqAnswers, language })
    });
}

export async function handleSymptomChat(message: string, language: string): Promise<ChatResponse> {
    return await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, language })
    });
}

export async function updateUserProfile(updatedUser: { name: string; phone: string }): Promise<{ user: User, token?: string }> {
    return await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(updatedUser)
    });
}

// --- OFFLINE SYNC LOGIC ---

export async function queueAnalysisRequest(payload: { base64ImageData: string; mimeType: string; language: string; mcqAnswers: Record<string, string> }) {
    const queue = JSON.parse(localStorage.getItem(ANALYSIS_QUEUE_KEY) || '[]') as QueuedAnalysisRequest[];
    const newRequest: QueuedAnalysisRequest = {
        id: `req_${Date.now()}`,
        payload,
        timestamp: Date.now()
    };
    queue.push(newRequest);
    localStorage.setItem(ANALYSIS_QUEUE_KEY, JSON.stringify(queue));
}

export async function processAnalysisQueue() {
    let queue = JSON.parse(localStorage.getItem(ANALYSIS_QUEUE_KEY) || '[]') as QueuedAnalysisRequest[];
    if (queue.length === 0) return;

    const results = JSON.parse(localStorage.getItem(ANALYSIS_RESULTS_KEY) || '[]') as TriageResultData[];

    for (const request of queue) {
        try {
            const result = await apiFetch('/api/ai/analyze-skin', {
                method: 'POST',
                body: JSON.stringify(request.payload),
            });
            results.push(result);
            queue = queue.filter(r => r.id !== request.id);
        } catch (error) {
            console.error(`Offline request ${request.id} failed:`, error);
        }
    }

    localStorage.setItem(ANALYSIS_RESULTS_KEY, JSON.stringify(results));
    localStorage.setItem(ANALYSIS_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('queueProcessed'));
}
