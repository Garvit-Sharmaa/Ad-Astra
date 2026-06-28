<<<<<<< HEAD
=======

>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
import { TriageResultData, ChatResponse, QueuedAnalysisRequest, User } from '../types';
import { BACKEND_URL } from '../constants';

const ANALYSIS_QUEUE_KEY = 'analysisQueue';
const ANALYSIS_RESULTS_KEY = 'analysisResults';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('healthAppToken');
<<<<<<< HEAD
=======
    const fullUrl = `${BACKEND_URL}${endpoint}`;
    
    console.log(`[API REQUEST] ${options.method || 'GET'} -> ${fullUrl}`);

>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let response: Response;
    try {
<<<<<<< HEAD
        response = await fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
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
=======
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
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
    return await apiFetch('/api/ai/describe-skin-image', {
        method: 'POST',
        body: JSON.stringify({ base64ImageData, mimeType })
    });
}

/**
<<<<<<< HEAD
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
=======
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
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
}

export async function updateUserProfile(updatedUser: { name: string; phone: string }): Promise<{ user: User, token?: string }> {
    return await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(updatedUser)
    });
}

<<<<<<< HEAD
// --- OFFLINE QUEUE LOGIC ---

/**
 * Adds a skin analysis request to the offline queue in localStorage.
 */
export async function queueAnalysisRequest(payload: { base64ImageData: string; mimeType: string; language: string; mcqAnswers: Record<string, string> }) {
    console.log("Queuing analysis request for offline processing.");
=======
// --- OFFLINE SYNC LOGIC ---

export async function queueAnalysisRequest(payload: { base64ImageData: string; mimeType: string; language: string; mcqAnswers: Record<string, string> }) {
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
    const queue = JSON.parse(localStorage.getItem(ANALYSIS_QUEUE_KEY) || '[]') as QueuedAnalysisRequest[];
    const newRequest: QueuedAnalysisRequest = {
        id: `req_${Date.now()}`,
        payload,
        timestamp: Date.now()
    };
    queue.push(newRequest);
    localStorage.setItem(ANALYSIS_QUEUE_KEY, JSON.stringify(queue));
}

<<<<<<< HEAD
/**
 * Processes any queued analysis requests when the app comes back online.
 */
=======
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
export async function processAnalysisQueue() {
    let queue = JSON.parse(localStorage.getItem(ANALYSIS_QUEUE_KEY) || '[]') as QueuedAnalysisRequest[];
    if (queue.length === 0) return;

<<<<<<< HEAD
    console.log(`Processing ${queue.length} items from the offline analysis queue.`);
    
=======
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
    const results = JSON.parse(localStorage.getItem(ANALYSIS_RESULTS_KEY) || '[]') as TriageResultData[];

    for (const request of queue) {
        try {
<<<<<<< HEAD
            // The `apiFetch` function calls the single-step endpoint on the server, which is designed for this queue.
=======
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
            const result = await apiFetch('/api/ai/analyze-skin', {
                method: 'POST',
                body: JSON.stringify(request.payload),
            });
            results.push(result);
<<<<<<< HEAD
            // Remove successfully processed request from the queue
            queue = queue.filter(r => r.id !== request.id);
        } catch (error) {
            console.error(`Failed to process queued request ${request.id}:`, error);
            // Optionally, implement retry logic or move to a "failed" queue here.
            // For now, we'll leave it in the queue to be retried next time.
=======
            queue = queue.filter(r => r.id !== request.id);
        } catch (error) {
            console.error(`Offline request ${request.id} failed:`, error);
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
        }
    }

    localStorage.setItem(ANALYSIS_RESULTS_KEY, JSON.stringify(results));
    localStorage.setItem(ANALYSIS_QUEUE_KEY, JSON.stringify(queue));
<<<<<<< HEAD

    // Notify the app that the queue has been processed so UI can update.
    window.dispatchEvent(new CustomEvent('queueProcessed'));
}
=======
    window.dispatchEvent(new CustomEvent('queueProcessed'));
}
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab
