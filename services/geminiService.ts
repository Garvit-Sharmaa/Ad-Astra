import { TriageResultData, ChatResponse, QueuedAnalysisRequest, User } from '../types';
import { API_BASE_URL } from '../constants';

const ANALYSIS_QUEUE_KEY = 'analysisQueue';
const ANALYSIS_RESULTS_KEY = 'analysisResults';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('healthAppToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    } catch (networkError) {
        console.error("Network error in apiFetch:", networkError);
        throw new Error("Unable to connect to the server. Please check your internet connection and try again.");
    }

    if (!response.ok) {
        let errorData = { message: `The server responded with an error (Status: ${response.status}).` };
        try {
            const jsonData = await response.json();
            if (jsonData.message) {
                errorData.message = jsonData.message;
            }
        } catch (e) {
            console.error("Could not parse error response JSON.", e);
        }
        throw new Error(errorData.message);
    }
    
    try {
        return await response.json();
    } catch (e) {
        console.error("Failed to parse successful response JSON.", e);
        throw new Error("Received an invalid response from the server.");
    }
}

/**
 * Starts the two-step skin analysis process for online users.
 * @returns An object containing the unique analysisId for the session.
 */
export async function startSkinAnalysis(base64ImageData: string, mimeType: string): Promise<{ analysisId: string }> {
    return await apiFetch('/api/ai/describe-skin-image', {
        method: 'POST',
        body: JSON.stringify({ base64ImageData, mimeType })
    });
}

/**
 * Gets the final conclusion for a started skin analysis session.
 * @returns The TriageResultData object with the AI's conclusion.
 */
export async function getSkinAnalysisConclusion(analysisId: string, mcqAnswers: Record<string, string>, language: string): Promise<TriageResultData> {
    return await apiFetch('/api/ai/get-skin-conclusion', {
        method: 'POST',
        body: JSON.stringify({ analysisId, mcqAnswers, language })
    });
}


export async function handleSymptomChat(message: string, language: string): Promise<ChatResponse> {
   try {
        const result = await apiFetch('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message, language })
        });
        return result as ChatResponse;
    } catch (error) {
        console.error("Error in symptom chat:", error);
        throw error;
    }
}

export async function updateUserProfile(updatedUser: { name: string; phone: string }): Promise<{ user: User, token?: string }> {
    return await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(updatedUser)
    });
}

// --- OFFLINE QUEUE LOGIC ---

/**
 * Adds a skin analysis request to the offline queue in localStorage.
 */
export async function queueAnalysisRequest(payload: { base64ImageData: string; mimeType: string; language: string; mcqAnswers: Record<string, string> }) {
    console.log("Queuing analysis request for offline processing.");
    const queue = JSON.parse(localStorage.getItem(ANALYSIS_QUEUE_KEY) || '[]') as QueuedAnalysisRequest[];
    const newRequest: QueuedAnalysisRequest = {
        id: `req_${Date.now()}`,
        payload,
        timestamp: Date.now()
    };
    queue.push(newRequest);
    localStorage.setItem(ANALYSIS_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Processes any queued analysis requests when the app comes back online.
 */
export async function processAnalysisQueue() {
    let queue = JSON.parse(localStorage.getItem(ANALYSIS_QUEUE_KEY) || '[]') as QueuedAnalysisRequest[];
    if (queue.length === 0) return;

    console.log(`Processing ${queue.length} items from the offline analysis queue.`);
    
    const results = JSON.parse(localStorage.getItem(ANALYSIS_RESULTS_KEY) || '[]') as TriageResultData[];

    for (const request of queue) {
        try {
            // The `apiFetch` function calls the single-step endpoint on the server, which is designed for this queue.
            const result = await apiFetch('/api/ai/analyze-skin', {
                method: 'POST',
                body: JSON.stringify(request.payload),
            });
            results.push(result);
            // Remove successfully processed request from the queue
            queue = queue.filter(r => r.id !== request.id);
        } catch (error) {
            console.error(`Failed to process queued request ${request.id}:`, error);
            // Optionally, implement retry logic or move to a "failed" queue here.
            // For now, we'll leave it in the queue to be retried next time.
        }
    }

    localStorage.setItem(ANALYSIS_RESULTS_KEY, JSON.stringify(results));
    localStorage.setItem(ANALYSIS_QUEUE_KEY, JSON.stringify(queue));

    // Notify the app that the queue has been processed so UI can update.
    window.dispatchEvent(new CustomEvent('queueProcessed'));
}