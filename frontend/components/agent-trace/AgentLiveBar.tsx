'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentName, AGENT_REGISTRY, AgentStatus } from '@/lib/types';
import { AgentAvatar } from './AgentAvatar';
import { Bot, CheckCircle2, Loader2, Sparkles, ChevronDown, Activity } from 'lucide-react';

interface AgentStateInfo {
  agent: AgentName;
  status: AgentStatus;
  activity: string;
}

interface AgentLiveBarProps {
  activeAgent?: AgentName;
  isStreaming?: boolean;
  liveStatusText?: string;
  agentStates?: Record<AgentName, AgentStatus>;
}

export const AgentLiveBar: React.FC<AgentLiveBarProps> = ({
  activeAgent = 'advait',
  isStreaming = false,
  liveStatusText = '',
  agentStates,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaultAgents: AgentName[] = ['advait', 'vihaan', 'kabir', 'ishaan', 'saanvi', 'aanav', 'myra'];

  const getStatusForAgent = (agent: AgentName): { status: AgentStatus; text: string } => {
    // When not streaming, show idle state
    if (!isStreaming && !agentStates) {
      return { status: 'done', text: 'Ready' };
    }

    // Use the real agentStates map from SSE events if available
    if (agentStates) {
      const s = agentStates[agent];
      if (s === 'running') {
        return {
          status: 'running',
          text: agent === activeAgent
            ? (liveStatusText || `${AGENT_REGISTRY[agent]?.displayName} processing...`)
            : 'Processing...',
        };
      }
      if (s === 'done') return { status: 'done', text: 'Completed' };
      if (s === 'error') return { status: 'error', text: 'Error occurred' };
      // queued
      return { status: 'queued', text: isStreaming ? 'Waiting in queue' : 'Ready' };
    }

    // Fallback: derive from activeAgent
    if (!isStreaming) return { status: 'done', text: 'Ready' };
    if (agent === activeAgent) {
      return { status: 'running', text: liveStatusText || `${AGENT_REGISTRY[agent]?.displayName} processing...` };
    }
    return { status: 'queued', text: 'Waiting in queue' };
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="pressable"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 20,
          background: isStreaming ? 'rgba(14,165,233,0.1)' : 'rgba(0,0,0,0.04)',
          border: isStreaming ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        title="View live status of all 7 Agents"
      >
        <span style={{ fontSize: 11, fontWeight: 500, color: '#1a1a18' }}>
          {isStreaming ? 'Agent Status' : 'Agent Status'}
        </span>
        <ChevronDown
          size={12}
          color="rgba(26,26,24,0.5)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
      </button>

      {/* Popover / Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 310,
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              padding: 12,
              zIndex: 100,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#0ea5e9" />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>
                  Live Agent Network Status
                </span>
              </div>
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: isStreaming ? '#0ea5e9' : '#16a34a',
                background: isStreaming ? 'rgba(14,165,233,0.1)' : 'rgba(22,163,74,0.1)',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                {isStreaming ? 'STREAMING' : 'IDLE'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defaultAgents.map((agentKey) => {
                const meta = AGENT_REGISTRY[agentKey];
                const { status, text } = getStatusForAgent(agentKey);

                return (
                  <div
                    key={agentKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: status === 'running' ? `${meta.color}0D` : '#f9f9f8',
                      border: status === 'running' ? `1px solid ${meta.color}30` : '1px solid transparent',
                    }}
                  >
                    <AgentAvatar agent={agentKey} size={22} showName={false} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                          {meta.displayName}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.4)', fontFamily: 'var(--font-mono)' }}>
                          {meta.role}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 10.5,
                        color: status === 'running' ? '#0ea5e9' : 'rgba(26,26,24,0.5)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 1,
                      }}>
                        {text}
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div>
                      {status === 'running' ? (
                        <Loader2 size={12} color="#0ea5e9" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : status === 'done' ? (
                        <CheckCircle2 size={12} color="#16a34a" />
                      ) : (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'block' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
