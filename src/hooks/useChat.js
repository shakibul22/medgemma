import { chatApi } from '../api/chatApi';
import { encryptionApi } from '../api/encryptionApi';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook to manage MedGemma Chat state and operations.
 *
 * Flow:
 *  1. User message → Kaggle MedGemma endpoint (streamed directly)
 *  2. Session ID is persisted per conversation for multi-turn memory.
 *  3. In parallel: user text → HF encryption API → encryption log entry
 */
export const useChat = (conversations, updateMessages, updateTitle, updateSession) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [inferenceTime, setInferenceTime] = useState(0);
    const [encryptionRecords, setEncryptionRecords] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mg_enc_records') || '[]'); } catch { return []; }
    });

    // Persist encryption records
    useEffect(() => {
        localStorage.setItem('mg_enc_records', JSON.stringify(encryptionRecords));
    }, [encryptionRecords]);

    const abortControllerRef = useRef(null);
    const msgCountRef = useRef(0);

    const sendMessage = useCallback(async (activeId, text) => {
        if (!text.trim() || isLoading) return;

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

        // Get the persisted MedGemma session ID for multi-turn memory
        const activeConv = conversations.find(c => c.id === activeId);
        const sessionId = activeConv?.medgemmaSessionId || null;

        // --- Encryption: fire-and-forget in parallel ---
        const encId = crypto.randomUUID();
        msgCountRef.current += 1;
        const msgIndex = msgCountRef.current;

        setEncryptionRecords(prev => [
            ...prev,
            { id: encId, convId: activeId, index: msgIndex, loading: true, error: null, data: null },
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
                message: text,
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
    }, [conversations, isLoading, updateMessages, updateTitle, updateSession]);

    const stopInference = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    const clearAllEncryptionRecords = useCallback(() => {
        setEncryptionRecords([]);
    }, []);

    const clearEncryptionRecordsByConv = useCallback((convId) => {
        setEncryptionRecords(prev => prev.filter(r => r.convId !== convId));
    }, []);

    return {
        isLoading,
        error,
        inferenceTime,
        sendMessage,
        stopInference,
        setError,
        encryptionRecords,
        clearAllEncryptionRecords,
        clearEncryptionRecordsByConv,
    };
};
