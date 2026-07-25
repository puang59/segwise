'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface ModelBadgeProps {
  modelName: string;
  provider?: string;
  onClick?: () => void;
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({
  modelName,
  provider = 'DeepInfra',
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface-2 hover:bg-surface-3 transition-colors pressable text-xs font-mono text-text-secondary"
    >
      <Sparkles className="w-3 h-3 text-[#ec4899]" />
      <span>✦ Myra · {modelName}</span>
      {provider && (
        <span className="text-[10px] text-text-tertiary font-normal">
          · {provider}
        </span>
      )}
    </button>
  );
};
