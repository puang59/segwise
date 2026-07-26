'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentTraceItem, AGENT_REGISTRY, AgentName } from '@/lib/types';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TraceRowProps {
  item: AgentTraceItem;
  index?: number;
  isLast?: boolean;
}

/** Highlight agent names in cyan */
const renderHighlightedSummary = (summaryText: string) => {
  const agentNames = ['Atlas', 'Scout', 'Compass', 'Forge', 'Prism', 'Mosaic', 'Loom'];
  const regex = new RegExp(`\\b(${agentNames.join('|')})\\b`, 'gi');
  const parts = summaryText.split(regex);

  return parts.map((part, i) => {
    const isAgentName = agentNames.some((name) => name.toLowerCase() === part.toLowerCase());
    if (isAgentName) {
      return (
        <span key={i} style={{ color: '#0ea5e9', fontWeight: 600 }}>
          {part}
        </span>
      );
    }
    return part;
  });
};

/** Pulsing ring for running agent rows */
const PulsingRing = () => (
  <span style={{ position: 'relative', display: 'inline-flex', width: 12, height: 12, flexShrink: 0 }}>
    {/* Outer pulse ring */}
    <span
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: 'rgba(14,165,233,0.25)',
        animation: 'traceRingPulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
      }}
    />
    {/* Inner solid dot */}
    <span
      style={{
        position: 'absolute',
        inset: 2,
        borderRadius: '50%',
        background: '#0ea5e9',
        boxShadow: '0 0 6px rgba(14,165,233,0.6)',
      }}
    />
  </span>
);

/** Done circle — hollow grey */
const DoneCircle = () => (
  <span
    style={{
      width: 12,
      height: 12,
      borderRadius: '50%',
      border: '1.5px solid rgba(26,26,24,0.3)',
      background: '#ffffff',
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

/** Tool running — small spinner dot */
const ToolRunningDot = () => (
  <span
    style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: '#0ea5e9',
      display: 'inline-block',
      flexShrink: 0,
      animation: 'traceRingPulse 1s ease-in-out infinite',
      opacity: 0.85,
    }}
  />
);

/** Tool done — small filled dot */
const ToolDoneDot = () => (
  <span
    style={{
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'rgba(22,163,74,0.6)',
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

export const TraceRow: React.FC<TraceRowProps> = ({ item, index = 0, isLast = false }) => {
  const [showDetails, setShowDetails] = useState(false);
  const meta = AGENT_REGISTRY[item.agent];
  const isTool = Boolean(item.toolName);

  const renderStatusNode = () => {
    if (isTool) {
      if (item.status === 'running') return <ToolRunningDot />;
      if (item.status === 'done') return <ToolDoneDot />;
      if (item.status === 'error') return <AlertCircle size={10} color="#dc2626" />;
      return <ToolRunningDot />;
    }
    switch (item.status) {
      case 'running':
        return <PulsingRing />;
      case 'done':
        return <DoneCircle />;
      case 'error':
        return <AlertCircle size={13} color="#dc2626" />;
      default:
        return <DoneCircle />;
    }
  };

  // Tool rows are indented and styled differently
  if (isTool) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, delay: index * 0.03, ease: [0.23, 1, 0.32, 1] }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          paddingLeft: 38,
          marginBottom: isLast ? 4 : 8,
        }}
      >
        {/* Vertical line connecting from parent to this tool row */}
        <div
          style={{
            position: 'absolute',
            left: 5,
            top: 0,
            bottom: isLast ? 'calc(100% - 9px)' : -8,
            width: 0,
            borderLeft: '1.5px dotted rgba(26,26,24,0.3)',
            zIndex: 1,
          }}
        />
        {/* Horizontal branch elbow to the tool dot */}
        <div
          style={{
            position: 'absolute',
            left: 6,
            top: 9,
            width: 22,
            borderTop: '1.5px dotted rgba(26,26,24,0.3)',
            zIndex: 1,
          }}
        />

        {/* Tool dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginTop: 5 }}>
          {renderStatusNode()}
        </div>

        {/* Tool text */}
        <span
          style={{
            fontSize: 11.5,
            color: item.status === 'done' ? 'rgba(26,26,24,0.4)' : 'rgba(14,165,233,0.85)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.01em',
            lineHeight: 1.55,
          }}
        >
          {item.summary || item.toolName}
        </span>

        {item.duration_ms !== undefined && item.duration_ms > 0 && (
          <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.25)', fontFamily: 'var(--font-mono)', marginLeft: 2, whiteSpace: 'nowrap', marginTop: 1 }}>
            {item.duration_ms < 1000 ? `${item.duration_ms}ms` : `${(item.duration_ms / 1000).toFixed(1)}s`}
          </span>
        )}
      </motion.div>
    );
  }

  // Agent-level rows (the main timeline)
  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes traceRingPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 24,
          marginBottom: isLast ? 8 : 14,
        }}
      >
        {/* Node Icon on Left Timeline */}
        <div style={{ position: 'absolute', left: 0, top: 3, zIndex: 2 }}>
          {renderStatusNode()}
        </div>

        {/* Vertical Dotted Line */}
        {!isLast && (
          <div
            style={{
              position: 'absolute',
              left: 5,
              top: 17,
              bottom: -14,
              width: 0,
              borderLeft: '1.5px dotted rgba(26,26,24,0.3)',
              zIndex: 1,
            }}
          />
        )}

        {/* Step Content Line */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, lineHeight: 1.5 }}>
          <span style={{ fontSize: 13, color: 'rgba(26,26,24,0.55)', letterSpacing: '-0.01em' }}>
            {renderHighlightedSummary(item.summary || `${item.role} processing...`)}
          </span>

          {item.duration_ms !== undefined && item.duration_ms > 0 && (
            <span style={{ fontSize: 10.5, color: 'rgba(26,26,24,0.3)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
              ({item.duration_ms < 1000 ? `${item.duration_ms}ms` : `${(item.duration_ms / 1000).toFixed(1)}s`})
            </span>
          )}
        </div>

        {/* Expandable Technical Details */}
        {item.details && (
          <div style={{ marginTop: 4 }}>
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
              {showDetails ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Show details
            </button>
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  style={{ overflow: 'hidden', marginTop: 4 }}
                >
                  <pre
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: '#f5f5f3',
                      border: '1px solid rgba(0,0,0,0.06)',
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'rgba(26,26,24,0.6)',
                      overflowX: 'auto',
                      maxHeight: 140,
                      margin: 0,
                    }}
                  >
                    {typeof item.details === 'string' ? item.details : JSON.stringify(item.details, null, 2)}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </>
  );
};
