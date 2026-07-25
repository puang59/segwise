'use client';

import React, { useState } from 'react';
import { AgentName, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';
import { Send, Loader2 } from 'lucide-react';

interface InputBarProps {
  activeAgent?: AgentName;
  isStreaming?: boolean;
  onSendMessage: (text: string) => void;
  presetText?: string;
}

export const InputBar: React.FC<InputBarProps> = ({
  activeAgent = 'advait',
  isStreaming = false,
  onSendMessage,
  presetText = '',
}) => {
  const [text, setText] = useState(presetText);
  const [focused, setFocused] = useState(false);

  React.useEffect(() => {
    if (presetText) setText(presetText);
  }, [presetText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    onSendMessage(text.trim());
    setText('');
  };

  const meta = AGENT_REGISTRY[activeAgent] || AGENT_REGISTRY['advait'];
  const hasText = text.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 12,
        background: '#ffffff',
        border: focused
          ? `1.5px solid ${meta.color}55`
          : '1.5px solid rgba(0,0,0,0.08)',
        boxShadow: focused
          ? `0 0 0 3px ${meta.color}10, 0 2px 8px rgba(0,0,0,0.06)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'border-color 150ms cubic-bezier(0.23,1,0.32,1), box-shadow 150ms cubic-bezier(0.23,1,0.32,1)',
      }}
    >
      {/* Agent pill — uses DiceBear avatar instead of text symbol */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px 3px 5px',
          borderRadius: 8,
          background: `${meta.color}0D`,
          border: `1px solid ${meta.color}20`,
          flexShrink: 0,
        }}
      >
        {isStreaming ? (
          <span className="dot-bounce" style={{ color: meta.color }}>
            <span /><span /><span />
          </span>
        ) : (
          <AgentAvatar agent={activeAgent} size={18} showName={false} />
        )}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: meta.color,
          letterSpacing: '-0.01em',
        }}>
          {meta.displayName}
        </span>
      </div>

      {/* Input */}
      <input
        type="text"
        disabled={isStreaming}
        placeholder="Ask about segments, balances, or recommendations…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontSize: 13.5,
          color: '#1a1a18',
          caretColor: '#4f46e5',
          padding: '2px 0',
          opacity: isStreaming ? 0.5 : 1,
          cursor: isStreaming ? 'not-allowed' : 'text',
        }}
      />

      {/* Send button */}
      <button
        type="submit"
        disabled={!hasText || isStreaming}
        className="pressable"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: hasText && !isStreaming ? 'pointer' : 'not-allowed',
          background: hasText && !isStreaming ? '#4f46e5' : '#f0f0ef',
          color: hasText && !isStreaming ? '#ffffff' : 'rgba(26,26,24,0.3)',
          transition: 'background 150ms cubic-bezier(0.23,1,0.32,1), color 150ms cubic-bezier(0.23,1,0.32,1)',
          opacity: isStreaming ? 0.4 : 1,
        }}
      >
        {isStreaming ? (
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Send size={14} />
        )}
      </button>
    </form>
  );
};
