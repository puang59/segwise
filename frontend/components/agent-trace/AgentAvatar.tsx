'use client';

import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import { AgentName, AGENT_REGISTRY } from '@/lib/types';

interface AgentAvatarProps {
  agent: AgentName;
  size?: number;
  showName?: boolean;
  showRole?: boolean;
  className?: string;
}

/**
 * Renders a client-side Data URI DiceBear Lorelei avatar for each agent,
 * matching exact data:image/svg+xml format and eliminating network requests.
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

  // Generate Data URI client-side without external network dependency
  const avatarDataUri = useMemo(() => {
    try {
      const avatar = createAvatar(lorelei, {
        seed: meta.displayName,
      });
      return avatar.toDataUri();
    } catch {
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="${encodeURIComponent(meta.color)}"/></svg>`;
    }
  }, [meta.displayName, meta.color]);

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
          background: `${meta.color}14`,
          border: `1px solid ${meta.color}28`,
          flexShrink: 0,
        }}
      >
        <img
          src={avatarDataUri}
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
