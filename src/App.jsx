import { useState, useRef, useEffect, useCallback } from 'react';
import { Stethoscope, Plus, Info, Menu, X, Sparkles, Key } from 'lucide-react';
import { Background } from './components/Background';
import { Badge } from './components/Badge';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';
import './App.css';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('mg_api_key') || '');
  const [conversations, setConversations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mg_convs') || '[]') } catch { return [] }
  });
  const [activeId, setActiveId] = useState(() => {
    const saved = localStorage.getItem('mg_convs');
    const list = saved ? JSON.parse(saved) : [];
    return list[0]?.id || null;
  });
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);

  // persist
  useEffect(() => {
    localStorage.setItem('mg_convs', JSON.stringify(conversations));
  }, [conversations]);
  useEffect(() => {
    localStorage.setItem('mg_api_key', apiKey);
  }, [apiKey]);

  const updateMessages = useCallback((convId, updater) => {
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, messages: updater(c.messages) } : c)
    );
  }, []);

  const updateTitle = useCallback((convId, title) => {
    setConversations(prev =>
      prev.map(c => c.id === convId && c.title === 'New conversation' ? { ...c, title } : c)
    );
  }, []);

  const updateSession = useCallback((convId, sessionId) => {
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, medgemmaSessionId: sessionId } : c)
    );
  }, []);

  const { isLoading, error, inferenceTime, sendMessage, stopInference, setError } = useChat(
    apiKey,
    conversations,
    updateMessages,
    updateTitle,
    updateSession
  );

  const activeConv = conversations.find(c => c.id === activeId) || null;
  const messages = activeConv?.messages || [];

  // scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewChat = () => {
    const id = generateId();
    const newConv = { id, title: 'New conversation', messages: [], createdAt: Date.now() };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleSend = () => {
    if (!activeId) {
      const id = generateId();
      const newConv = { id, title: 'New conversation', messages: [], createdAt: Date.now() };
      setConversations(prev => [newConv, ...prev]);
      setActiveId(id);
      sendMessage(id, input);
    } else {
      sendMessage(activeId, input);
    }
    setInput('');
  };

  return (
    <>
      <Background />
      <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Chats</h2>
            <button className="icon-btn" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
          <div className="conversations-list">
            {conversations.map(c => (
              <div
                key={c.id}
                className={`conv-item ${c.id === activeId ? 'active' : ''}`}
                onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
              >
                {c.title}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="api-key-config">
              <label><Key size={12} /> API Key Source</label>
              <div className="api-key-status">
                {import.meta.env.VITE_GEMINI_API_KEY ? (
                  <span className="source-badge env">Loaded from .env</span>
                ) : (
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API Key..."
                    className="key-input"
                  />
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="app-container">
          <header className="app-header">
            <div className="header-left">
              <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div className="logo-section">
                <Stethoscope size={24} color="var(--accent-primary)" />
                <h1 className="logo-text">Med<span>Gemma</span></h1>
              </div>
            </div>
            <Badge />
            <div className="header-actions">
              <button className="icon-btn" onClick={handleNewChat} title="New Chat">
                <Plus size={20} />
              </button>
            </div>
          </header>

          <main className="chat-window">
            {messages.length === 0 ? (
              <div className="welcome-container">
                <div className="welcome-hero">
                  <Sparkles size={32} />
                </div>
                <h2 className="welcome-title">How can I assist you today?</h2>
                <p className="welcome-subtitle">
                  MedGemma is a specialized medical assistant. Describe your symptoms or ask a
                  medical question — your query is refined by  by MedGemma.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLast={idx === messages.length - 1}
                    isStreaming={isLoading}
                  />
                ))}
                <div ref={bottomRef} />
              </>
            )}

            {isLoading && inferenceTime === 0 && (
              <div className="inference-info">
                <i>Processing medical-grade encryption...</i>
              </div>
            )}
            {inferenceTime > 0 && (
              <div className="inference-info">
                Inference time: {inferenceTime}ms
              </div>
            )}
            {error && (
              <div className="error-message" style={{ color: '#f85149', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
                {error}
                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '5px' }}><X size={12} /></button>
              </div>
            )}
          </main>

          <footer className="input-section">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              onStop={stopInference}
              isLoading={isLoading}
            />
            <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Info size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Powered by  MedGemma. For informational purposes only — always consult a qualified healthcare professional.
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
