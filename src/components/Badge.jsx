import { ShieldCheck } from 'lucide-react';

export const Badge = () => {
    return (
        <div className="security-badge">
            <ShieldCheck size={14} className="badge-icon" />
            <span>End-to-End Encrypted</span>
        </div>
    );
};
