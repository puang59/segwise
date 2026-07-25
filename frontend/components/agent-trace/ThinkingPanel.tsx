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

  // Automatically update collapse state when thinking completes
  React.useEffect(() => {
    if (!isThinking) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isThinking]);

  if (!thinkingText && !isThinking) return null;

  const estimatedTokens = totalTokens || Math.ceil(thinkingText.length / 4);

  return (
    <div className="my-2 rounded-md border border-border bg-surface-2 overflow-hidden text-xs">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-3 transition-colors pressable text-text-secondary"
      >
        <div className="flex items-center gap-2 font-mono">
          <Brain className={`w-3.5 h-3.5 ${isThinking ? 'animate-pulse text-accent' : 'text-text-tertiary'}`} />
          <span>
            {isThinking
              ? `${agentName} reasoning...`
              : `Reasoning (${estimatedTokens} tokens)`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-surface border-t border-border font-mono text-[11px] leading-relaxed text-text-secondary max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
              {thinkingText}
              {isThinking && (
                <span className="inline-block w-1.5 h-3 ml-1 bg-accent animate-pulse" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
