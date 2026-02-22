import { useRef, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';

export const ChatInput = ({ input, setInput, onSend, onStop, isLoading }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="chat-input-wrapper">
            <div className={`input-container ${isLoading ? 'loading' : ''}`}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about medical symptoms, conditions..."
                    className="chat-textarea"
                    rows={1}
                    disabled={isLoading}
                />
                <div className="input-actions">
                    {isLoading ? (
                        <button className="icon-btn stop-btn" onClick={onStop} title="Stop Generation">
                            <Square size={16} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            className="icon-btn send-btn"
                            onClick={onSend}
                            disabled={!input.trim()}
                            title="Send Message"
                        >
                            <Send size={18} />
                        </button>
                    )}
                </div>
            </div>
            {isLoading && (
                <div className="loading-bar">
                    <div className="loading-progress"></div>
                </div>
            )}
        </div>
    );
};
