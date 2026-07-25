'use client';

import React from 'react';
import { AgentTraceItem } from '@/lib/types';
import { TraceCollapse } from './TraceCollapse';
import { TraceRow } from './TraceRow';
import { ThinkingPanel } from './ThinkingPanel';

interface TraceStreamProps {
  traceItems: AgentTraceItem[];
  thinkingText?: string;
  isThinking?: boolean;
  isComplete?: boolean;
  totalDurationMs?: number;
}

export const TraceStream: React.FC<TraceStreamProps> = ({
  traceItems,
  thinkingText = '',
  isThinking = false,
  isComplete = false,
  totalDurationMs,
}) => {
  if (traceItems.length === 0 && !thinkingText && !isThinking) return null;

  return (
    <div className="w-full my-3">
      {/* Monospace Reasoning panel for thinking models */}
      {(thinkingText || isThinking) && (
        <ThinkingPanel
          thinkingText={thinkingText}
          isThinking={isThinking}
          agentName="Advait (Reasoning)"
        />
      )}

      {/* Agent Trace Stream */}
      {isComplete ? (
        <TraceCollapse
          traceItems={traceItems}
          isComplete={isComplete}
          totalDurationMs={totalDurationMs}
        />
      ) : (
        <div className="flex flex-col gap-0.5 my-2">
          {traceItems.map((item, i) => (
            <TraceRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

    </div>
  );
};
