'use client';

import React from 'react';
import { SegmentSummary } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

interface SegmentTableProps {
  segments: SegmentSummary[];
  onSelectSegment?: (segment: SegmentSummary) => void;
}

export const SegmentTable: React.FC<SegmentTableProps> = ({
  segments,
  onSelectSegment,
}) => {
  if (!segments || segments.length === 0) return null;

  return (
    <div className="w-full my-4 rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-surface-2 border-b border-border flex items-center justify-between text-xs">
        <span className="font-semibold text-text-primary uppercase tracking-wider text-[11px]">
          Customer Segment Breakdown
        </span>
        <span className="text-[11px] text-text-tertiary">
          {segments.length} segments identified
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-3/50 border-b border-border text-text-tertiary uppercase text-[10px]">
            <tr>
              <th className="px-4 py-2 font-medium">Segment</th>
              <th className="px-4 py-2 font-medium text-right">Share</th>
              <th className="px-4 py-2 font-medium text-right">Customers</th>
              <th className="px-4 py-2 font-medium text-right">Avg Balance</th>
              <th className="px-4 py-2 font-medium text-right">Txn / Mo</th>
              <th className="px-4 py-2 font-medium text-center font-mono">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-text-secondary">
            {segments.map((seg, idx) => {
              const defaultColors = ['#22c55e', '#6366f1', '#f97316', '#f59e0b', '#ec4899'];
              const dotColor = seg.status_color || defaultColors[idx % defaultColors.length];

              return (
                <tr
                  key={seg.name}
                  onClick={() => onSelectSegment?.(seg)}
                  className="hover:bg-surface-2 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span>{seg.name}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {seg.percentage}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {(seg.customer_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-primary">
                    ₹{seg.avg_balance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {seg.txn_freq}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 rounded hover:bg-surface-3 text-text-tertiary group-hover:text-accent transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
