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

  React.useEffect(() => {
    if (isComplete) setIsExpanded(false);
  }, [isComplete]);

  if (!traceItems || traceItems.length === 0) return null;

  const agentCount = new Set(traceItems.map((t) => t.agent)).size;
  const computedMs = totalDurationMs || traceItems.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0);
  const formattedDuration = computedMs < 1000
    ? `${computedMs}ms`
    : `${(computedMs / 1000).toFixed(1)}s`;

  return (
    <div style={{
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.07)',
      background: '#f9f9f8',
      marginBottom: 12,
    }}>
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className="pressable"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Sparkles size={12} color="#4f46e5" />
        <span style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'rgba(26,26,24,0.5)',
          flex: 1,
        }}>
          {agentCount} {agentCount === 1 ? 'agent' : 'agents'} · {formattedDuration}
        </span>
        <span style={{ color: 'rgba(26,26,24,0.35)' }}>
          {isExpanded
            ? <ChevronDown size={13} />
            : <ChevronRight size={13} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '6px 8px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              background: '#fdfdfc',
            }}>
              {traceItems.map((item, i) => (
                <TraceRow key={item.id} item={item} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
