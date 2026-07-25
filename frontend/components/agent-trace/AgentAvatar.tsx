'use client';

import React from 'react';
import { AgentName, AGENT_REGISTRY } from '@/lib/types';

interface AgentAvatarProps {
  agent: AgentName;
  showRole?: boolean;
  className?: string;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  showRole = false,
  className = '',
}) => {
  const meta = AGENT_REGISTRY[agent] || {
    name: agent,
    displayName: agent,
    color: 'var(--text-secondary)',
    icon: '●',
    role: 'Agent',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium text-xs rounded-full px-2 py-0.5 transition-colors ${className}`}
      style={{
        color: meta.color,
        backgroundColor: `${meta.color}15`,
        border: `1px solid ${meta.color}30`,
      }}
    >
      <span className="text-[11px] select-none">{meta.icon}</span>
      <span>{meta.displayName}</span>
      {showRole && (
        <span className="text-[10px] opacity-70 font-normal ml-0.5">
          ({meta.role})
        </span>
      )}
    </span>
  );
};
