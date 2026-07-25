'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentTraceItem, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import { ProgressShimmer } from './ProgressShimmer';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

interface TraceRowProps {
  item: AgentTraceItem;
  index?: number;
}

export const TraceRow: React.FC<TraceRowProps> = ({ item, index = 0 }) => {
  const [showDetails, setShowDetails] = useState(false);
  const meta = AGENT_REGISTRY[item.agent];

  const renderStatusIcon = () => {
    switch (item.status) {
      case 'queued':
        return <Circle size={11} color="rgba(26,26,24,0.3)" />;
      case 'running':
        return (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: meta?.color || '#4f46e5',
              boxShadow: `0 0 0 3px ${meta?.color || '#4f46e5'}25`,
              flexShrink: 0,
            }}
          />
        );
      case 'done':
        return <CheckCircle2 size={11} color="#16a34a" />;
      case 'error':
        return <AlertCircle size={11} color="#dc2626" />;
      default:
        return <Circle size={11} color="rgba(26,26,24,0.3)" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.18,
        delay: index * 0.04,
        ease: [0.23, 1, 0.32, 1],
      }}
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        borderLeft: `2px solid ${meta?.color || 'rgba(0,0,0,0.1)'}`,
        background: '#f9f9f8',
        marginBottom: 3,
      }}
    >
      {/* Row header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 10px',
      }}>
        {renderStatusIcon()}
        <AgentAvatar agent={item.agent} size={18} showName={true} />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.status === 'running' && (
            <span className="dot-bounce" style={{ color: meta?.color || '#4f46e5' }}>
              <span /><span /><span />
            </span>
          )}
          {item.duration_ms !== undefined && item.duration_ms > 0 && (
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'rgba(26,26,24,0.35)',
            }}>
              {item.duration_ms < 1000
                ? `${item.duration_ms}ms`
                : `${(item.duration_ms / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {item.summary && (
        <div style={{
          padding: '0 10px 6px 28px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'rgba(26,26,24,0.45)',
          lineHeight: 1.5,
        }}>
          {item.summary}
        </div>
      )}

      {/* Progress */}
      {item.status === 'running' && (
        <div style={{ padding: '0 10px 6px 28px' }}>
          <ProgressShimmer color={meta?.color || '#4f46e5'} progress={item.progress} />
        </div>
      )}

      {/* Details toggle */}
      {item.details && (
        <div style={{ padding: '0 10px 6px 28px' }}>
          <button
            onClick={() => setShowDetails((p) => !p)}
            className="pressable"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 11,
              color: 'rgba(26,26,24,0.4)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showDetails
              ? <ChevronDown size={11} />
              : <ChevronRight size={11} />}
            Show details
          </button>
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                style={{ overflow: 'hidden', marginTop: 6 }}
              >
                <pre style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: '#f0f0ef',
                  border: '1px solid rgba(0,0,0,0.06)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'rgba(26,26,24,0.55)',
                  overflowX: 'auto',
                  maxHeight: 140,
                  margin: 0,
                }}>
                  {typeof item.details === 'string'
                    ? item.details
                    : JSON.stringify(item.details, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
