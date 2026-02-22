import { chatApi } from '../api/chatApi';
import { encryptionApi } from '../api/encryptionApi';
import { useCallback, useRef, useState } from 'react';

/**
 * Hook to manage MedGemma Chat state and operations.
 *
 * Flow:
 *  1. User message → Gemini reformulation
 *  2. Reformulated query → Kaggle MedGemma endpoint (streamed)
 *  3. Session ID is persisted per conversation for multi-turn memory.
 *  4. In parallel: user text → HF encryption API → encryption log entry
 */
export const useChat = (apiKey, conversations, updateMessages, updateTitle, updateSession) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [encryptionRecords, setEncryptionRecords] = useState([]);

    const abortControllerRef = useRef(null);
    const msgCountRef = useRef(0);

    const sendMessage = useCallback(async (activeId, text) => {
        if (!text.trim() || isLoading) return;
        if (!apiKey && !import.meta.env.VITE_GEMINI_API_KEY) {
            setError('Gemini API key is required for query reformulation.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setInferenceTime(0);

        const startTime = performance.now();
        abortControllerRef.current = new AbortController();

        // Add user message to UI immediately
        const userMsg = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now(),
        };
        updateMessages(activeId, msgs => [...msgs, userMsg]);
        updateTitle(activeId, text.length > 40 ? text.slice(0, 40) + '...' : text);

        // Placeholder for the AI response (streaming target)
        const aiMsgId = crypto.randomUUID();
        updateMessages(activeId, msgs => [
            ...msgs,
            { id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now() },
        ]);

        // Get current conversation history (before the two new messages) and session ID
        const activeConv = conversations.find(c => c.id === activeId);
        const history = activeConv ? activeConv.messages : [];
        const sessionId = activeConv?.medgemmaSessionId || null;

        // --- Encryption: fire-and-forget in parallel ---
        const encId = crypto.randomUUID();
        msgCountRef.current += 1;
        const msgIndex = msgCountRef.current;

        setEncryptionRecords(prev => [
            ...prev,
            { id: encId, index: msgIndex, loading: true, error: null, data: null },
        ]);

        encryptionApi.processText(text)
            .then(data => {
                setEncryptionRecords(prev =>
                    prev.map(r => r.id === encId ? { ...r, loading: false, data } : r)
                );
            })
            .catch(err => {
                setEncryptionRecords(prev =>
                    prev.map(r => r.id === encId ? { ...r, loading: false, error: err.message } : r)
                );
            });
        // --- End encryption ---

        try {
            const { newSessionId } = await chatApi.sendMessage({
                apiKey: apiKey || import.meta.env.VITE_GEMINI_API_KEY,
                message: text,
                history,
                sessionId,
                signal: abortControllerRef.current.signal,
                onChunk: (accumulated) => {
                    updateMessages(activeId, msgs =>
                        msgs.map(m => m.id === aiMsgId ? { ...m, content: accumulated } : m)
                    );
                },
            });

            // Persist the MedGemma session ID on the conversation
            if (newSessionId) {
                updateSession(activeId, newSessionId);
            }

            const endTime = performance.now();
            setInferenceTime(Math.round(endTime - startTime));

        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'AbortError' || err.message === 'Request cancelled') {
                console.log('Inference stopped by user');
                // Remove empty AI placeholder on cancel
                updateMessages(activeId, msgs => msgs.filter(m => m.id !== aiMsgId));
            } else {
                setError(err.message || 'An error occurred during inference.');
                console.error(err);
                updateMessages(activeId, msgs => msgs.filter(m => m.id !== aiMsgId));
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [apiKey, conversations, isLoading, updateMessages, updateTitle, updateSession]);

    const stopInference = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return {
        isLoading,
        error,
        inferenceTime,
        sendMessage,
        stopInference,
        setError,
        encryptionRecords,
    };
};
