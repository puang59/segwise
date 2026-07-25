'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface FollowUpChipsProps {
  chips: string[];
  onSelectChip: (chipText: string) => void;
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ chips, onSelectChip }) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize: 11, color: 'rgba(26,26,24,0.35)', margin: '0 0 8px', fontWeight: 400 }}>
        Suggested next steps
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
        {chips.map((chip, i) => (
          <motion.button
            key={chip}
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => onSelectChip(chip)}
            className="pressable"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 99,
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#f9f9f8',
              fontSize: 12,
              color: 'rgba(26,26,24,0.6)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 150ms cubic-bezier(0.23,1,0.32,1)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = '#4f46e5';
              el.style.color = '#4f46e5';
              el.style.background = 'rgba(79,70,229,0.05)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'rgba(0,0,0,0.08)';
              el.style.color = 'rgba(26,26,24,0.6)';
              el.style.background = '#f9f9f8';
            }}
          >
            {chip}
            <ArrowRight size={11} style={{ opacity: 0.5 }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
};
