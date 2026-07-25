'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentTraceItem, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import { ProgressShimmer } from './ProgressShimmer';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, AlertCircle, Circle } from 'lucide-react';

interface TraceRowProps {
  item: AgentTraceItem;
}

export const TraceRow: React.FC<TraceRowProps> = ({ item }) => {
  const [showDetails, setShowDetails] = useState(false);
  const meta = AGENT_REGISTRY[item.agent];

  const renderStatusIcon = () => {
    switch (item.status) {
      case 'queued':
        return <Circle className="w-3.5 h-3.5 text-text-tertiary" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />;
      case 'done':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-error" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-text-tertiary" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors my-1 text-xs"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: meta?.color || 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {renderStatusIcon()}
          <AgentAvatar agent={item.agent} />
          <span className="text-text-secondary font-medium">{item.role}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          {item.status === 'running' && (
            <span className="text-accent animate-pulse font-mono">running...</span>
          )}
          {item.duration_ms !== undefined && item.duration_ms > 0 && (
            <span className="font-mono">{item.duration_ms < 1000 ? `${item.duration_ms}ms` : `${(item.duration_ms / 1000).toFixed(1)}s`}</span>
          )}
        </div>
      </div>

      {item.summary && (
        <div className="mt-1.5 pl-6 text-text-secondary font-mono text-[11px] leading-relaxed">
          {item.summary}
        </div>
      )}

      {item.status === 'running' && (
        <div className="mt-1.5 pl-6">
          <ProgressShimmer color={meta?.color || 'var(--accent)'} progress={item.progress} />
        </div>
      )}

      {item.details && (
        <div className="mt-1.5 pl-6">
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary transition-colors pressable"
          >
            {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>Show details</span>
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden mt-1.5"
              >
                <pre className="p-2 rounded bg-bg border border-border text-[10px] font-mono text-text-secondary overflow-x-auto max-h-40">
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
