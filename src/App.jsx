import { useState, useRef, useEffect, useCallback } from 'react';
import { Stethoscope, Plus, Info, Menu, X, Sparkles, Key, ShieldCheck, Trash2, FileText, ExternalLink } from 'lucide-react';
import { Background } from './components/Background';
import { Badge } from './components/Badge';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { EncryptionPanel } from './components/EncryptionPanel';
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
  const [encPanelOpen, setEncPanelOpen] = useState(true);
  const [paperPanelOpen, setPaperPanelOpen] = useState(false);

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

  const { isLoading, error, inferenceTime, sendMessage, stopInference, setError, encryptionRecords, clearAllEncryptionRecords, clearEncryptionRecordsByConv } = useChat(
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

  const handleDeleteConv = (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    clearEncryptionRecordsByConv(id);
    if (activeId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setActiveId(remaining[0]?.id || null);
    }
  };

  const handleClearAll = () => {
    setConversations([]);
    setActiveId(null);
    clearAllEncryptionRecords();
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
            <div className="sidebar-header-actions">
              {conversations.length > 0 && (
                <button
                  className="icon-btn clear-all-btn"
                  onClick={handleClearAll}
                  title="Clear all conversations"
                >
                  <Trash2 size={15} />
                  <span>Clear all</span>
                </button>
              )}
              <button className="icon-btn" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
            </div>
          </div>
          <div className="conversations-list">
            {conversations.length === 0 && (
              <p className="conv-empty">No conversations yet.</p>
            )}
            {conversations.map(c => (
              <div
                key={c.id}
                className={`conv-item ${c.id === activeId ? 'active' : ''}`}
                onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
              >
                <span className="conv-title">{c.title}</span>
                <button
                  className="icon-btn conv-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteConv(c.id); }}
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
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
                <h1 className="logo-text">Hypo<span>Crypt</span></h1>
              </div>
            </div>
            <Badge />
            <div className="header-actions">
              <div className="paper-toggle-wrapper">
                <button
                  className={`icon-btn paper-toggle-btn ${paperPanelOpen ? 'active' : ''}`}
                  onClick={() => setPaperPanelOpen(v => !v)}
                  title={paperPanelOpen ? 'Hide Paper Abstract' : 'Show Paper Abstract'}
                >
                  <FileText size={20} />
                </button>
                {paperPanelOpen && (
                  <div className="paper-dropdown">
                    <div className="paper-dropdown-header">
                      <h3>STEALTH</h3>
                      <button className="icon-btn" onClick={() => setPaperPanelOpen(false)}><X size={14} /></button>
                    </div>
                    <p className="paper-full-title">
                      Secure Transformer for Encrypted Alignment of Latent Text Embeddings via Semantic Isomorphism Enforcement (SIE) Loss Function
                    </p>
                    <div className="paper-abstract-scroll">
                      <p className="paper-abstract">
                        The pervasive use of large language models (LLMs) on sensitive data presents a critical privacy challenge, as traditional encryption renders data unusable for inference. We introduce STEALTH, a 120M secure transformer framework designed to process encrypted text while preserving its semantic utility under an authorized-key threat model (no decryption or side-channel access). The core innovation of STEALTH is the Semantic Isomorphism Enforcement (SIE) loss function, a loss that trains the model to learn a topology-preserving mapping between encrypted text embeddings and their original plaintext latent space. This encourages preservation of semantic relationships and topological structure in the encrypted domain. Using retrieval-based reconstruction from a domain-aligned plaintext corpus, STEALTH achieves near-perfect semantic retrieval (BLEU score of 1.0 under full-corpus coverage in our experiments) and enables accurate privacy-preserving clustering on encrypted embeddings. We evaluate STEALTH across 44 datasets spanning general language understanding, healthcare, finance, legal, e-commerce, programming, content analysis, reading comprehension, and corporate communication domains with 16 encryption schemes (704 experimental conditions), establishing a comprehensive benchmark for privacy-preserving NLP on encrypted text. Performance depends on domain alignment between encrypted inputs and the indexed plaintext corpus. Our results demonstrate that, with well-aligned domain indexes and retrieval support, models can perform effective NLP on encrypted data without direct decryption.
                      </p>
                    </div>
                    <a
                      className="paper-link"
                      href="https://openreview.net/forum?id=73PV17dVCM"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} />
                      View on OpenReview
                    </a>
                  </div>
                )}
              </div>
              <button
                className={`icon-btn enc-toggle-btn ${encPanelOpen ? 'active' : ''}`}
                onClick={() => setEncPanelOpen(v => !v)}
                title={encPanelOpen ? 'Hide Encryption Panel' : 'Show Encryption Panel'}
              >
                <ShieldCheck size={20} />
                {encryptionRecords.length > 0 && (
                  <span className="enc-toggle-count">{encryptionRecords.length}</span>
                )}
              </button>
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
                  HypoCrypt is a specialized medical assistant. Describe your symptoms or ask a
                  medical question — your query is refined by HypoCrypt.
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
                Powered by HypoCrypt. For informational purposes only — always consult a qualified healthcare professional.
              </span>
            </div>
          </footer>
        </div>

        {/* Encryption Panel */}
        <div className={`enc-panel-wrapper ${encPanelOpen ? 'open' : ''}`}>
          <EncryptionPanel records={encryptionRecords} />
        </div>
      </div>
    </>
  );
}
