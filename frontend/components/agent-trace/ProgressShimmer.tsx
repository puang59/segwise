'use client';

import React from 'react';

interface ProgressShimmerProps {
  color?: string;
  progress?: number;
}

export const ProgressShimmer: React.FC<ProgressShimmerProps> = ({
  color = 'var(--accent)',
  progress,
}) => {
  return (
    <div className="relative w-full h-1 bg-surface-3 rounded-full overflow-hidden my-1">
      {typeof progress === 'number' && progress > 0 ? (
        <div
          className="h-full transition-all duration-200 ease-out rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: color,
          }}
        />
      ) : (
        <div
          className="absolute inset-y-0 w-1/3 rounded-full animate-[shimmer_1.5s_infinite]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          }}
        />
      )}
    </div>
  );
};
