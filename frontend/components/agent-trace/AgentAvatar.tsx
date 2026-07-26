'use client';

import React from 'react';
import { AgentName, AGENT_REGISTRY } from '@/lib/types';

interface AgentAvatarProps {
  agent: AgentName;
  size?: number;
  showName?: boolean;
  showRole?: boolean;
  className?: string;
}

/**
 * Renders a DiceBear Shape Grid avatar for each agent using the HTTP API.
 */
export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  size = 22,
  showName = true,
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

  const avatarUrl = `https://api.dicebear.com/10.x/shape-grid/svg?seed=${encodeURIComponent(meta.displayName)}&shapeColor=${meta.color.replace('#', '')}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{ verticalAlign: 'middle' }}
    >
      {/* DiceBear avatar image */}
      <span
        className="shrink-0 rounded-full overflow-hidden inline-flex items-center justify-center"
        style={{
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <img
          src={avatarUrl}
          alt={meta.displayName}
          width={size}
          height={size}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </span>
      {showName && (
        <span
          className="font-medium text-xs"
          style={{ color: meta.color }}
        >
          {meta.displayName}
        </span>
      )}

      {showRole && (
        <span className="text-[10px] font-normal" style={{ color: 'var(--text-tertiary)' }}>
          ({meta.role})
        </span>
      )}
    </span>
  );
};
