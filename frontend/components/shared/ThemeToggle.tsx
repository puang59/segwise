'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  showLabel = false,
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06]', className)} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'pressable flex items-center justify-center gap-2 p-2 rounded-lg transition-colors border text-xs font-medium',
        isDark
          ? 'bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary border-white/[0.06]'
          : 'bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary border-black/[0.08]',
        className
      )}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle theme mode"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
      )}
      {showLabel && (
        <span className="capitalize text-xs">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      )}
    </button>
  );
};
