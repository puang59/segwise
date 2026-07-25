'use client';

import React, { useState } from 'react';
import { AgentName, AGENT_REGISTRY } from '@/lib/types';
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

  React.useEffect(() => {
    if (presetText) {
      setText(presetText);
    }
  }, [presetText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    onSendMessage(text.trim());
    setText('');
  };

  const currentAgentMeta = AGENT_REGISTRY[activeAgent] || AGENT_REGISTRY['advait'];

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full relative flex items-center gap-2 p-2 rounded-2xl border border-border bg-surface-2 shadow-lg transition-colors focus-within:border-accent/50"
    >
      {/* Dynamic Active Agent Indicator Pill */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 transition-all duration-120"
        style={{
          color: currentAgentMeta.color,
          backgroundColor: `${currentAgentMeta.color}18`,
          border: `1px solid ${currentAgentMeta.color}35`,
        }}
      >
        <span className={isStreaming ? 'animate-spin' : ''}>
          {isStreaming ? '⟳' : currentAgentMeta.icon}
        </span>
        <span className="text-[11px] uppercase tracking-wider">
          {currentAgentMeta.displayName}
        </span>
      </div>

      {/* Query Input Field */}
      <input
        type="text"
        disabled={isStreaming}
        placeholder="Ask anything about customer segments, balances, or recommendations..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 bg-transparent border-none text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed py-1.5"
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={!text.trim() || isStreaming}
        className="p-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed pressable transition-opacity shrink-0 flex items-center justify-center"
      >
        {isStreaming ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </form>
  );
};
