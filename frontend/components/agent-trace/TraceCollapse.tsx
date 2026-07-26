'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { AgentTraceItem, AgentName } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
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
  // Default to collapsed when complete (matching user's Image 3), expanded while streaming
  const [isExpanded, setIsExpanded] = useState<boolean>(!isComplete);

  React.useEffect(() => {
    if (isComplete) setIsExpanded(false);
  }, [isComplete]);

  if (!traceItems || traceItems.length === 0) return null;

  // Extract unique agents that participated
  const uniqueAgents = Array.from(new Set(traceItems.map((t) => t.agent)));
  const visibleAvatars = uniqueAgents.slice(0, 3);
  const remainingCount = uniqueAgents.length > 3 ? uniqueAgents.length - 3 : 0;

  return (
    <div style={{ width: '100%', marginBottom: 12 }}>
      {/* Pill Toggle Button matching user's Image 3 */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="pressable"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '5px 12px 5px 6px',
          borderRadius: 20,
          background: '#f4f4f2',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 150ms ease',
        }}
      >
        {/* Left: Overlapping Agent Avatars + (+N badge) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {visibleAvatars.map((agentKey, idx) => (
              <div
                key={agentKey}
                style={{
                  marginLeft: idx === 0 ? 0 : -6,
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                  zIndex: 10 - idx,
                  lineHeight: 0,
                }}
              >
                <AgentAvatar agent={agentKey as AgentName} size={18} showName={false} />
              </div>
            ))}
          </div>

          {remainingCount > 0 && (
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: 'rgba(26,26,24,0.6)',
                marginLeft: 2,
              }}
            >
              +{remainingCount}
            </span>
          )}
        </div>

        {/* Right: "View entire chain of thoughts ∨" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(26,26,24,0.6)', fontSize: 12, fontWeight: 500 }}>
          <span>{isExpanded ? 'Hide chain of thoughts' : 'View entire chain of thoughts'}</span>
          <ChevronDown
            size={13}
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 180ms ease',
            }}
          />
        </div>
      </button>

      {/* Expanded Trace Stream Steps */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: 'hidden', marginTop: 10 }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 12,
                background: '#f9f9f8',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {traceItems.map((item, i) => (
                <TraceRow
                  key={item.id}
                  item={item}
                  index={i}
                  isLast={i === traceItems.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
