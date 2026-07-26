'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentTraceItem, AgentName, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import { TraceRow } from './TraceRow';
import { ChevronDown } from 'lucide-react';

interface TraceStreamProps {
  traceItems: AgentTraceItem[];
  isComplete?: boolean;
  liveStatusText?: string;
}

// The canonical ordered pipeline — always shown in full
const PIPELINE: AgentName[] = ['advait', 'vihaan', 'ishaan', 'kabir', 'saanvi', 'aanav', 'myra'];

// Derive status for each agent from the current traceItems array
function getAgentStatus(agent: AgentName, traceItems: AgentTraceItem[]): 'queued' | 'running' | 'done' | 'error' {
  const rows = traceItems.filter((t) => t.agent === agent && !t.toolName);
  if (rows.length === 0) return 'queued';
  // The last non-tool row for this agent determines its status
  const last = rows[rows.length - 1];
  return last.status as 'queued' | 'running' | 'done' | 'error';
}

// Get the most descriptive summary for an agent
function getAgentSummary(agent: AgentName, traceItems: AgentTraceItem[]): string | null {
  // Prefer the most recent running tool row
  const toolRows = traceItems.filter((t) => t.agent === agent && Boolean(t.toolName));
  const runningTool = [...toolRows].reverse().find((t) => t.status === 'running');
  if (runningTool) return runningTool.summary || runningTool.toolName || null;

  // Fall back to agent-level summary
  const agentRows = traceItems.filter((t) => t.agent === agent && !t.toolName);
  if (agentRows.length === 0) return null;
  return agentRows[agentRows.length - 1].summary || null;
}

export const TraceStream: React.FC<TraceStreamProps> = ({
  traceItems,
  isComplete = false,
  liveStatusText,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!traceItems || traceItems.length === 0) return null;

  // ── WHILE STREAMING: full 7-agent pipeline grid ───────────────────────────
  if (!isComplete) {
    const doneCount = PIPELINE.filter(
      (a) => getAgentStatus(a, traceItems) === 'done'
    ).length;
    const totalActive = PIPELINE.filter(
      (a) => getAgentStatus(a, traceItems) !== 'queued'
    ).length;

    return (
      <div style={{ width: '100%', margin: '4px 0 12px 0' }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 10, paddingBottom: 8,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          {/* Live pulse dot */}
          <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(14,165,233,0.35)',
              animation: 'liveRingPulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
            }} />
            <span style={{ position: 'absolute', inset: 1.5, borderRadius: '50%', background: '#0ea5e9' }} />
          </span>

          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: '#0ea5e9',
          }}>
            Agent Pipeline Live
          </span>

          <span style={{
            marginLeft: 'auto', fontSize: 10,
            fontFamily: 'var(--font-mono)', color: 'rgba(26,26,24,0.35)',
          }}>
            {doneCount} / {PIPELINE.length} done
          </span>
        </div>

        {/* ── Agent rows ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {PIPELINE.map((agent, idx) => {
            const meta = AGENT_REGISTRY[agent];
            const status = getAgentStatus(agent, traceItems);
            const summary = getAgentSummary(agent, traceItems);
            const isRunning = status === 'running';
            const isDone = status === 'done';
            const isQueued = status === 'queued';

            return (
              <motion.div
                key={agent}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.03, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: isRunning
                    ? `${meta.color}0D`
                    : isDone ? 'rgba(22,163,74,0.04)'
                    : '#fafaf9',
                  border: isRunning
                    ? `1px solid ${meta.color}25`
                    : isDone ? '1px solid rgba(22,163,74,0.12)'
                    : '1px solid rgba(0,0,0,0.04)',
                  transition: 'background 300ms ease, border-color 300ms ease',
                  opacity: isQueued ? 0.45 : 1,
                }}
              >
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  <AgentAvatar agent={agent} size={20} showName={false} />
                </div>

                {/* Name + role + summary */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: isRunning ? meta.color : isDone ? '#16a34a' : 'rgba(26,26,24,0.4)',
                      transition: 'color 250ms ease',
                    }}>
                      {meta.displayName}
                    </span>
                    <span style={{
                      fontSize: 9.5, fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: 'rgba(26,26,24,0.22)',
                    }}>
                      {meta.role}
                    </span>
                  </div>

                  {/* Action line */}
                  {(isRunning || isDone) && summary && (
                    <div style={{
                      fontSize: 11, marginTop: 1,
                      color: isRunning ? '#0ea5e9' : 'rgba(26,26,24,0.32)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: isRunning ? 'var(--font-mono)' : 'inherit',
                      transition: 'color 250ms ease',
                    }}>
                      {summary}
                    </div>
                  )}

                  {isQueued && (
                    <div style={{ fontSize: 10.5, marginTop: 1, color: 'rgba(26,26,24,0.22)' }}>
                      Waiting in queue…
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                <div style={{ flexShrink: 0 }}>
                  {isRunning && (
                    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                      <span style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: `${meta.color}33`,
                        animation: 'liveRingPulse 1.2s cubic-bezier(0.4,0,0.6,1) infinite',
                      }} />
                      <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: meta.color }} />
                    </span>
                  )}
                  {isDone && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 14, height: 14, borderRadius: '50%',
                      background: 'rgba(22,163,74,0.15)',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'block' }} />
                    </span>
                  )}
                  {isQueued && (
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      border: '1.5px solid rgba(0,0,0,0.12)',
                      display: 'inline-block',
                    }} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Live ticker ── */}
        <AnimatePresence mode="wait">
          {liveStatusText && (
            <motion.div
              key={liveStatusText}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              style={{
                marginTop: 10, paddingTop: 8,
                borderTop: '1px solid rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#0ea5e9', flexShrink: 0,
                boxShadow: '0 0 5px rgba(14,165,233,0.5)',
              }} />
              <span style={{
                fontSize: 10.5, color: '#0ea5e9',
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {liveStatusText}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes liveRingPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(2); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // ── AFTER COMPLETION: collapse into pill ──────────────────────────────────
  const uniqueAgents = Array.from(
    new Set(traceItems.filter((t) => !t.toolName).map((t) => t.agent))
  );
  const visibleAvatars = uniqueAgents.slice(0, 4);
  const remainingCount = uniqueAgents.length > 4 ? uniqueAgents.length - 4 : 0;

  return (
    <div style={{ width: '100%', marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="pressable"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '5px 12px 5px 6px', borderRadius: 20,
          background: '#f4f4f2', border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer', userSelect: 'none', transition: 'all 150ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {visibleAvatars.map((agentKey, idx) => (
            <div
              key={agentKey}
              style={{
                marginLeft: idx === 0 ? 0 : -6,
                border: '2px solid #f4f4f2',
                borderRadius: '50%', zIndex: 10 - idx, lineHeight: 0,
              }}
            >
              <AgentAvatar agent={agentKey as AgentName} size={18} showName={false} />
            </div>
          ))}
          {remainingCount > 0 && (
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-mono)',
              fontWeight: 600, color: 'rgba(26,26,24,0.5)', marginLeft: 4,
            }}>
              +{remainingCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(26,26,24,0.6)', fontSize: 12, fontWeight: 500 }}>
          <span>{isExpanded ? 'Hide chain of thoughts' : 'View entire chain of thoughts'}</span>
          <ChevronDown size={13} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            style={{ overflow: 'hidden', marginTop: 10 }}
          >
            <div style={{ padding: '8px 12px', borderRadius: 12, background: '#f9f9f8', border: '1px solid rgba(0,0,0,0.06)' }}>
              {traceItems.map((item, i) => (
                <TraceRow key={item.id} item={item} index={i} isLast={i === traceItems.length - 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
