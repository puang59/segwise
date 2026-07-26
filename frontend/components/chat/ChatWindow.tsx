'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage, AgentName, AgentStatus, SegmentSummary } from '@/lib/types';
import { MessageBlock } from './MessageBlock';
import { InputBar } from './InputBar';
import { Brain, Layers, ShieldCheck, Zap, Sparkles } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  activeAgent?: AgentName;
  liveStatusText?: string;
  agentStates?: Record<AgentName, AgentStatus>;
  onSendMessage: (query: string) => void;
  onSelectSegment?: (segment: SegmentSummary) => void;
  onRespondHitl?: (response: string) => void;
}

const PRESETS = [
  {
    Icon: Layers,
    color: '#c2410c',
    title: 'Rule-Based & K-Means Segmentation',
    desc: 'Segment 800k+ accounts into Priority, Regular, and Dormant groups.',
    query: 'Segment retail customers into priority, regular, and dormant tiers based on balance and transaction frequency.',
  },
  {
    Icon: ShieldCheck,
    color: '#15803d',
    title: 'Churn Risk Breakdown',
    desc: 'Identify dormant account transitions and risk signals using Aadhya.',
    query: 'Analyze churn risk across customer segments and highlight key warning indicators.',
  },
  {
    Icon: Zap,
    color: '#92400e',
    title: 'Product Recommendations',
    desc: 'Get Saanvi recommendation strategies for high-potential customers.',
    query: 'Which regular customers can be transitioned into priority tier accounts?',
  },
  {
    Icon: Sparkles,
    color: '#7c3aed',
    title: 'Kabir Feature Radar',
    desc: 'View SHAP feature importance and Kabir radar visualization.',
    query: 'Explain SHAP feature importance for priority digital banking customers.',
  },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming = false,
  activeAgent = 'advait',
  liveStatusText = '',
  agentStates,
  onSendMessage,
  onSelectSegment,
  onRespondHitl,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSelectSuggestion = (chip: string) => onSendMessage(chip);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 0, // flex child needs explicit 0 height to shrink correctly
      minHeight: 0,
      overflow: 'hidden',
      background: '#FDFDFC',
    }}>
      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {messages.length === 0 ? (
          /* Welcome State */
          <div style={{
            maxWidth: 560,
            margin: '48px auto 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(79,70,229,0.07)',
                border: '1px solid rgba(79,70,229,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Brain size={20} color="#4f46e5" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#1a1a18',
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
                lineHeight: 1.25,
              }}
            >
              Segwise Copilot
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              style={{
                fontSize: 13,
                color: 'rgba(26,26,24,0.55)',
                lineHeight: 1.65,
                margin: '0 0 32px',
                maxWidth: 380,
              }}
            >
              Multi-agent analytical engine for customer segmentation, feature engineering, and personalized recommendations.
            </motion.p>

            {/* Preset Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              width: '100%',
              textAlign: 'left',
            }}>
              {PRESETS.map((preset, i) => (
                <motion.button
                  key={preset.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.18 + i * 0.055,
                    duration: 0.26,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  onClick={() => onSendMessage(preset.query)}
                  className="pressable"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.07)',
                    background: '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 150ms cubic-bezier(0.23,1,0.32,1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <preset.Icon size={14} color={preset.color} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>
                      {preset.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(26,26,24,0.45)', margin: 0, lineHeight: 1.5 }}>
                    {preset.desc}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBlock
              key={msg.id}
              message={msg}
              liveStatusText={msg.isStreaming ? liveStatusText : undefined}
              onSelectSegment={onSelectSegment}
              onRespondHitl={onRespondHitl}
              onSelectSuggestion={handleSelectSuggestion}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — frosted glass bottom */}
      <div style={{
        padding: '12px 32px 16px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(253,253,252,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        <InputBar
          activeAgent={activeAgent}
          isStreaming={isStreaming}
          liveStatusText={liveStatusText}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
};
