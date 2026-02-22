import { GoogleGenerativeAI } from '@google/generative-ai';

const MEDGEMMA_BASE_URL = '/medgemma-api';

/**
 * MedGemma Chat API Service
 *
 * Two-phase pipeline:
 *  1. Gemini rewrites the user's input into a clean English medical query.
 *  2. The reformulated query is streamed to the Kaggle MedGemma endpoint.
 */
export const chatApi = {
    /**
     * Phase 1: Ask Gemini to reformulate the user's message into a clear medical query.
     */
    async reformulateWithGemini({ apiKey, message, history }) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemma-3-27b-it' });

        // Build a short history (last 4 turns max) for context
        const formattedHistory = history.slice(-4).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history: formattedHistory });

        // Embed the instruction directly in the message (gemma-3-27b-it does not support systemInstruction)
        const prompt =
            `Rewrite the following message as a clear, concise English medical query suitable for a clinical AI system. ` +
            `Output ONLY the reformulated query — no extra commentary, no greetings, no explanations.\n\n` +
            `Message: "${message}"`;

        const result = await chat.sendMessage(prompt);
        return result.response.text().trim();
    },

    /**
     * Phase 2: Forward the reformulated query to the MedGemma endpoint and stream the response.
     * Returns the medgemma session id received from the response headers.
     */
    async queryMedGemma({ reformulatedQuery, sessionId, signal, onChunk }) {
        const payload = { text: reformulatedQuery };
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

    /**
     * Main entry point called by useChat.
     * Runs the two-phase pipeline and returns the new MedGemma session ID.
     */
    async sendMessage({ apiKey, message, history, sessionId, signal, onChunk }) {
        // Phase 1 — Gemini reformulation
        const reformulatedQuery = await chatApi.reformulateWithGemini({ apiKey, message, history });
        console.log('[MedGemma] Reformulated query:', reformulatedQuery);

        // Phase 2 — MedGemma inference
        const { text, newSessionId } = await chatApi.queryMedGemma({
            reformulatedQuery,
            sessionId,
            signal,
            onChunk,
        });

        return { text, newSessionId };
    },
};
