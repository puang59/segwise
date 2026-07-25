'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { AgentTraceItem } from '@/lib/types';
import { TraceRow } from './TraceRow';

interface TraceCollapseProps {
  traceItems: AgentTraceItem[];
  totalDurationMs?: number;
  isComplete?: boolean;
}

export const TraceCollapse: React.FC<TraceCollapseProps> = ({
  traceItems,
  totalDurationMs,
  isComplete = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(!isComplete);

  // Auto-collapse when query finishes
  React.useEffect(() => {
    if (isComplete) {
      setIsExpanded(false);
    }
  }, [isComplete]);

  if (!traceItems || traceItems.length === 0) return null;

  const agentCount = new Set(traceItems.map((t) => t.agent)).size;
  const computedDurationMs =
    totalDurationMs ||
    traceItems.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0);
  const formattedDuration =
    computedDurationMs < 1000
      ? `${computedDurationMs}ms`
      : `${(computedDurationMs / 1000).toFixed(1)}s`;

  return (
    <div className="my-2 rounded-lg border border-border bg-surface-2 overflow-hidden">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-text-secondary hover:bg-surface-3 transition-colors pressable"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>
            Reasoning ({agentCount} {agentCount === 1 ? 'agent' : 'agents'}, {formattedDuration})
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
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden p-2 border-t border-border bg-bg/50"
          >
            {traceItems.map((item) => (
              <TraceRow key={item.id} item={item} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
