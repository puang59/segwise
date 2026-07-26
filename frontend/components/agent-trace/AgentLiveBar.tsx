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
  activeAgent = 'atlas',
  isStreaming = false,
  liveStatusText = '',
  agentStates,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const defaultAgents: AgentName[] = ['atlas', 'scout', 'forge', 'mosaic', 'compass', 'quill', 'loom'];

  return (
    <div ref={modalRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="pressable"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 20,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.14)',
          color: '#333331',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 150ms ease',
        }}
        title="View information about all 7 Agents"
      >
        <span style={{ fontSize: 11, fontWeight: 500 }}>
          About Agent 
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
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18' }}>
                  Agent Network Info
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defaultAgents.map((agentKey) => {
                const meta = AGENT_REGISTRY[agentKey];

                return (
                  <div
                    key={agentKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: '#f9f9f8',
                      border: '1px solid transparent',
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
                        fontSize: 10,
                        color: 'rgba(26,26,24,0.5)',
                        marginTop: 3,
                        lineHeight: 1.3
                      }}>
                        {meta.description}
                      </div>
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
