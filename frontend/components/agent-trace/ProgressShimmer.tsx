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
    <div
      className="relative w-full h-0.5 rounded-full overflow-hidden my-1"
      style={{ background: 'var(--surface-3)' }}
    >
      {typeof progress === 'number' && progress > 0 ? (
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: color,
            transition: 'width 200ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        />
      ) : (
        // Shimmer sweep — uses shimmer-sweep keyframe from globals.css
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `${color}30` }}
        >
          <div
            className="absolute inset-y-0 w-1/2 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
              animation: 'shimmer-sweep 1.6s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
};
