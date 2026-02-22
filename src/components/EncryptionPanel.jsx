import { ShieldCheck, ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

const EncryptionRecord = ({ record, index }) => {
    const [expanded, setExpanded] = useState(index === 0);

    return (
        <div className="enc-record">
            <button
                className="enc-record-header"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="enc-record-title">
                    <ShieldCheck size={12} />
                    <span>Message #{record.index}</span>
                </div>
                <div className="enc-record-meta">
                    {record.loading && <span className="enc-badge loading">encrypting…</span>}
                    {record.error && <span className="enc-badge error">error</span>}
                    {!record.loading && !record.error && <span className="enc-badge ok">secured</span>}
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
            </button>

            {expanded && (
                <div className="enc-record-body">
                    {record.loading && (
                        <div className="enc-placeholder">
                            <div className="enc-spinner" />
                            <span>Processing encryption…</span>
                        </div>
                    )}
                    {record.error && (
                        <div className="enc-error-msg">{record.error}</div>
                    )}
                    {!record.loading && !record.error && record.data && (
                        <>
                            <div className="enc-field">
                                <div className="enc-field-label"><Unlock size={10} /> Original</div>
                                <div className="enc-field-value plain">{record.data.original_text}</div>
                            </div>
                            <div className="enc-field">
                                <div className="enc-field-label"><Lock size={10} /> Encrypted</div>
                                <div className="enc-field-value mono">{record.data.encrypted_text}</div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export const EncryptionPanel = ({ records }) => {
    return (
        <aside className="enc-panel">
            <div className="enc-panel-header">
                <ShieldCheck size={16} color="var(--accent-primary)" />
                <span>Encryption Log</span>
                <span className="enc-panel-count">{records.length}</span>
            </div>
            <div className="enc-panel-body">
                {records.length === 0 ? (
                    <div className="enc-empty">
                        <Lock size={28} opacity={0.3} />
                        <p>Encryption records will appear here as you send messages.</p>
                    </div>
                ) : (
                    [...records].reverse().map((rec, i) => (
                        <EncryptionRecord key={rec.id} record={rec} index={i} />
                    ))
                )}
            </div>
        </aside>
    );
};
