'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface ThinkingPanelProps {
  thinkingText: string;
  isThinking: boolean;
  totalTokens?: number;
  agentName?: string;
}

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({
  thinkingText,
  isThinking,
  totalTokens = 0,
  agentName = 'Thinking Model',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isThinking);

  React.useEffect(() => {
    setIsExpanded(isThinking);
  }, [isThinking]);

  if (!thinkingText && !isThinking) return null;

  const estimatedTokens = totalTokens || Math.ceil(thinkingText.length / 4);

  return (
    <div
      className="my-2 rounded-lg overflow-hidden text-xs"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 pressable transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-2 font-mono">
          <Brain
            className="w-3.5 h-3.5"
            style={{
              color: isThinking ? 'var(--accent)' : 'var(--text-tertiary)',
              animation: isThinking ? 'pulse-ring 1.5s ease infinite' : 'none',
            }}
          />
          <span>
            {isThinking
              ? `${agentName} reasoning`
              : `Reasoning (${estimatedTokens} tokens)`}
          </span>
          {isThinking && (
            <span className="dot-bounce" style={{ color: 'var(--accent)' }}>
              <span /><span /><span />
            </span>
          )}
        </div>
        <span style={{ color: 'var(--text-tertiary)' }}>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            {isThinking && !thinkingText ? (
              /* Shimmer skeleton while no content yet */
              <div
                className="p-3 space-y-1.5 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                {[80, 60, 90, 50].map((w, i) => (
                  <div
                    key={i}
                    className="h-2.5 rounded-full relative overflow-hidden"
                    style={{ width: `${w}%`, background: 'var(--surface-3)' }}
                  >
                    <div
                      className="absolute inset-y-0 w-1/2 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, var(--border-hover) 50%, transparent 100%)',
                        animation: `shimmer-sweep 1.6s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="p-3 border-t font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface)',
                }}
              >
                {thinkingText}
                {isThinking && (
                  <span
                    className="inline-block w-1.5 h-3 ml-1 rounded-sm"
                    style={{ background: 'var(--accent)', animation: 'blink-caret 800ms ease-in-out infinite' }}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
