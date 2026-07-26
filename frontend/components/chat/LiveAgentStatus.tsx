'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentName, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';

interface LiveAgentStatusProps {
  activeAgent?: AgentName;
  isStreaming?: boolean;
  statusText?: string;
}

export const LiveAgentStatus: React.FC<LiveAgentStatusProps> = ({
  activeAgent = 'advait',
  isStreaming = false,
  statusText,
}) => {
  if (!isStreaming && !statusText) return null;

  const meta = AGENT_REGISTRY[activeAgent] || AGENT_REGISTRY['advait'];

  // Format default live status string matching the user screenshot if no specific statusText given
  let displayText = statusText;
  if (!displayText) {
    switch (activeAgent) {
      case 'advait':
        displayText = 'Advait is trying to understand the intent ....';
        break;
      case 'vihaan':
        displayText = 'Vihaan is querying the database to resolve columns...';
        break;
      case 'saanvi':
        displayText = 'Saanvi is calculating segment centroids and propensity models...';
        break;
      case 'kabir':
        displayText = 'Kabir is resolving SHAP feature importance matrix...';
        break;
      case 'aadhya':
        displayText = 'Aadhya is identifying dormant transition churn risks...';
        break;
      case 'myra':
        displayText = 'Myra is synthesizing recommendations for priority accounts...';
        break;
      default:
        displayText = `${meta.displayName} is processing your request...`;
    }
  }

  // Highlight agent name in text if present
  const renderFormattedText = (text: string) => {
    const nameMatch = text.match(/^(Advait|Vihaan|Saanvi|Kabir|Aadhya|Myra|Ishaan)/i);
    if (nameMatch) {
      const name = nameMatch[0];
      const rest = text.slice(name.length);
      return (
        <>
          <span style={{ fontWeight: 600, color: '#0ea5e9' }}>{name}</span>
          {rest}
        </>
      );
    }
    return text;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 6px 10px 4px',
          color: '#0ea5e9', // Sky blue / Cyan color matching screenshot
          fontSize: 13.5,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          userSelect: 'none',
        }}
      >
        <AgentAvatar agent={activeAgent} size={24} showName={false} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {renderFormattedText(displayText)}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};
