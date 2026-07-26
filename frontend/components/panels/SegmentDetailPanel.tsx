'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SegmentSummary } from '@/lib/types';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';
import { X, Download, Sparkles, TrendingUp, ShieldAlert, Award } from 'lucide-react';

interface SegmentDetailPanelProps {
  segment: SegmentSummary | null;
  onClose: () => void;
  onExportSegmentCsv?: (segmentName: string) => void;
}

export const SegmentDetailPanel: React.FC<SegmentDetailPanelProps> = ({
  segment,
  onClose,
  onExportSegmentCsv,
}) => {
  if (!segment) return null;

  const keyAttributes = segment.key_attributes || [
    { trait: 'Average Balance', score: 88 },
    { trait: 'Transaction Frequency', score: 75 },
    { trait: 'Digital Banking Adoption', score: 92 },
    { trait: 'Credit Score Rating', score: 84 },
    { trait: 'Product Penetration', score: 68 },
  ];

  const recommendations = segment.recommendations || [
    'Premium Wealth Management Savings Plan (7.2% APY)',
    'Zero-Forex Travel Signature Credit Card',
    'Automated Systematic Investment Plan (SIP)',
  ];

  const candidateTransitions = segment.candidate_transitions || [
    { target: 'Priority Tier Upgrade', potential_count: 14250, uplift: '+₹42,000 avg balance' },
    { target: 'Digital Engagement Plan', potential_count: 28900, uplift: '+4.5 txns/mo' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Slide-over Drawer (x: 40->0, opacity: 0->1, 280ms cubic-bezier(0.32, 0.72, 0, 1)) */}
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="relative w-full max-w-lg h-full bg-surface-2 border-l border-border shadow-2xl flex flex-col z-10 overflow-y-auto"
        >
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-surface-2/90 backdrop-blur-md z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-text-primary">
                {segment.name}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors pressable"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-6">
            {/* Persona Title & Tagline */}
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                  {segment.persona || 'Digital High-Value Customer'}
                </span>
                <AgentAvatar agent="loom" />
              </div>
              <p className="text-xs text-text-secondary italic">
                "{segment.tagline || 'Frequent transaction activity, high balance stability, high digital engagement.'}"
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl border border-border bg-surface text-center">
                <div className="text-[10px] text-text-tertiary uppercase">Base Share</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {segment.percentage}%
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-surface text-center">
                <div className="text-[10px] text-text-tertiary uppercase">Avg Balance</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  ₹{(segment.avg_balance / 1000).toFixed(0)}k
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-surface text-center">
                <div className="text-[10px] text-text-tertiary uppercase">Txn Frequency</div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {segment.txn_freq}/mo
                </div>
              </div>
            </div>

            {/* Forge's Feature Importance Breakdown */}
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  Attribute Profile
                </span>
                <AgentAvatar agent="forge" />
              </div>
              <div className="space-y-2.5">
                {keyAttributes.map((attr) => (
                  <div key={attr.trait} className="space-y-1 text-xs">
                    <div className="flex justify-between text-text-secondary font-medium">
                      <span>{attr.trait}</span>
                      <span className="font-mono text-text-tertiary">{attr.score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#a78bfa] rounded-full"
                        style={{ width: `${attr.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compass's Recommendations */}
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  Compass's Recommended Products
                </span>
                <AgentAvatar agent="compass" />
              </div>
              <ul className="space-y-2 text-xs text-text-secondary">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#f59e0b] font-bold">✓</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Candidate Transition Opportunities */}
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  Candidate Transitions
                </span>
                <AgentAvatar agent="mosaic" />
              </div>
              <div className="space-y-2 text-xs">
                {candidateTransitions.map((trans, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-border bg-surface-2 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-text-primary">{trans.target}</div>
                      <div className="text-[10px] text-text-tertiary">
                        {trans.potential_count.toLocaleString()} eligible customers
                      </div>
                    </div>
                    <span className="text-xs font-mono font-medium text-emerald-400">
                      {trans.uplift}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-border mt-auto bg-surface-2 sticky bottom-0">
            <button
              onClick={() => onExportSegmentCsv?.(segment.name)}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium text-xs flex items-center justify-center gap-2 pressable shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Export Segment Customers CSV</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
