'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FollowUpChipsProps {
  chips: string[];
  onSelectChip: (chipText: string) => void;
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({
  chips,
  onSelectChip,
}) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="w-full my-3">
      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary mb-2 font-mono">
        <Sparkles className="w-3 h-3 text-accent" />
        <span>Suggested next</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {chips.map((chip, i) => (
          <motion.button
            key={chip}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.03,
              duration: 0.18,
              ease: [0.23, 1, 0.32, 1],
            }}
            onClick={() => onSelectChip(chip)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-2 hover:border-accent/40 text-xs text-text-secondary hover:text-text-primary whitespace-nowrap transition-colors pressable shrink-0"
          >
            <span>{chip}</span>
            <ArrowRight className="w-3 h-3 text-text-tertiary" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};
