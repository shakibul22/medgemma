const MEDGEMMA_BASE_URL = '/medgemma-api';

/**
 * MedGemma Chat API Service
 *
 * Sends the user's raw message directly to the Kaggle MedGemma endpoint
 * and streams the response back to the UI.
 */
export const chatApi = {
    /**
     * Streams the user's raw message to the MedGemma endpoint.
     * Returns the new session ID received from the response headers.
     */
    async sendMessage({ message, sessionId, signal, onChunk }) {
        const payload = { text: message };
        if (sessionId) payload.session_id = sessionId;

        const resp = await fetch(`${MEDGEMMA_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal,
        });

        if (!resp.ok) {
            throw new Error(`MedGemma endpoint error: ${resp.status} ${resp.statusText}`);
        }

        const newSessionId = resp.headers.get('X-Session-Id') || sessionId;

        // Stream the response
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (signal?.aborted) throw new Error('AbortError');

            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            if (onChunk) onChunk(accumulated);
        }

        return { text: accumulated, newSessionId };
    },
};
