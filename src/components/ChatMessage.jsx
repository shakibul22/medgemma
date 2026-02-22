import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Stethoscope, User, Clock, ShieldCheck } from 'lucide-react';

const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
        <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            className="code-block"
            {...props}
        >
            {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
    ) : (
        <code className={className} {...props}>
            {children}
        </code>
    );
};

export const ChatMessage = ({ message, isLast, isStreaming }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
            <div className="message-header">
                <div className="message-sender">
                    {isUser ? <User size={14} /> : <Stethoscope size={14} />}
                    <span>{isUser ? 'Patient' : 'MedGemma'}</span>
                </div>
                {message.isEncrypted && (
                    <div className="message-encryption-tag">
                        <ShieldCheck size={10} />
                        <span>Encrypted</span>
                    </div>
                )}
            </div>

            <div className="message-body">
                {isUser ? (
                    <p>{message.content}</p>
                ) : (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{ code: CodeBlock }}
                    >
                        {message.content || (isStreaming && isLast ? '▍' : '')}
                    </ReactMarkdown>
                )}
            </div>

            {!isUser && message.content && (
                <div className="message-footer">
                    <Clock size={10} />
                    <span>Inference complete</span>
                </div>
            )}
        </div>
    );
};
