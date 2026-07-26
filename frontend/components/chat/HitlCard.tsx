'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, HelpCircle } from 'lucide-react';

interface HitlCardProps {
  question: string;
  options: string[];
  askingAgent?: string;
  onRespond: (response: string) => void;
}

export const HitlCard: React.FC<HitlCardProps> = ({
  question,
  options,
  askingAgent = 'Atlas',
  onRespond,
}) => {
  const [customResponse, setCustomResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectOption = (opt: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      onRespond(opt);
    }, 150);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customResponse.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onRespond(customResponse.trim());
    }, 150);
  };

  return (
    <AnimatePresence>
      {!isSubmitting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="w-full my-4 p-4 rounded-xl border border-indigo-500/30 bg-surface-2 shadow-lg"
          style={{
            boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 font-medium text-xs text-[#6366f1]">
            <span className="text-base leading-none">◆</span>
            <span className="font-semibold">{askingAgent} needs input</span>
            <HelpCircle className="w-3.5 h-3.5 ml-auto opacity-70" />
          </div>

          {/* Question */}
          <p className="text-sm font-medium text-text-primary mb-3 leading-relaxed">
            {question}
          </p>

          {/* Option Buttons */}
          {options && options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelectOption(opt)}
                  className="p-2.5 rounded-lg border border-border bg-surface hover:bg-indigo-500/10 hover:border-indigo-500/50 text-left text-xs text-text-primary font-medium transition-colors pressable"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Custom text response input */}
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder="Or describe your own definition..."
              value={customResponse}
              onChange={(e) => setCustomResponse(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!customResponse.trim()}
              className="px-3 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed pressable"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
