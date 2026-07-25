'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  Table, 
  FileText, 
  X, 
  Download, 
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ContextPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'data' | 'report'>('charts');

  return (
    <>
      {/* Mobile/Tablet Overlay Backdrop (<1024px) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-[360px] flex-shrink-0 flex flex-col bg-surface border-l border-border h-screen select-none transition-transform duration-300 ease-drawer z-50',
          'fixed lg:relative inset-y-0 right-0',
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header & Tabs */}
        <div className="p-3 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border w-full max-w-[280px]">
            <button
              onClick={() => setActiveTab('charts')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium transition-all',
                activeTab === 'charts'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Charts</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium transition-all',
                activeTab === 'data'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Data</span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-xs font-medium transition-all',
                activeTab === 'report'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Contents Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'charts' && (
            <div className="space-y-4 entering">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  Segment Distribution
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">bank_sqlite.db</span>
              </div>

              {/* Chart Card Placeholder */}
              <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">K-Means Cluster Breakdown</span>
                  <span className="text-[10px] font-mono text-emerald-500">k = 4</span>
                </div>
                <div className="h-36 bg-bg rounded border border-border p-3 flex flex-col justify-end space-y-2">
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[10px] text-text-secondary mb-0.5">
                        <span>Cluster 0: High-Value Savers</span>
                        <span className="font-mono">32.4%</span>
                      </div>
                      <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full w-[32.4%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-text-secondary mb-0.5">
                        <span>Cluster 1: Credit Active Professionals</span>
                        <span className="font-mono">28.1%</span>
                      </div>
                      <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full w-[28.1%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-text-secondary mb-0.5">
                        <span>Cluster 2: Digital Native Borrowers</span>
                        <span className="font-mono">24.5%</span>
                      </div>
                      <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[24.5%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-text-secondary mb-0.5">
                        <span>Cluster 3: Conservative Low-Balance</span>
                        <span className="font-mono">15.0%</span>
                      </div>
                      <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 rounded-full w-[15.0%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Feature Importance Card */}
              <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">SHAP Global Importance</span>
                  <span className="text-[10px] font-mono text-text-tertiary">Aadhya Agent</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-[11px]">avg_monthly_balance</span>
                    <span className="font-mono text-[10px] text-emerald-500">+0.42 SHAP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-[11px]">credit_score</span>
                    <span className="font-mono text-[10px] text-emerald-500">+0.28 SHAP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-[11px]">investment_portfolio_val</span>
                    <span className="font-mono text-[10px] text-emerald-500">+0.19 SHAP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4 entering">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-indigo-400" />
                  Customer Explorer Preview
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">Top 5 Records</span>
              </div>

              <div className="bg-surface-2 rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-border bg-bg/60 text-text-tertiary font-mono">
                        <th className="p-2 font-normal">ID</th>
                        <th className="p-2 font-normal">Segment</th>
                        <th className="p-2 font-normal text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2 font-mono text-indigo-400">CUST-10482</td>
                        <td className="p-2 text-text-secondary">High-Value Savers</td>
                        <td className="p-2 font-mono text-right text-emerald-500">$142,500</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-indigo-400">CUST-29814</td>
                        <td className="p-2 text-text-secondary">Credit Active</td>
                        <td className="p-2 font-mono text-right text-emerald-500">$84,200</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-indigo-400">CUST-33109</td>
                        <td className="p-2 text-text-secondary">High-Value Savers</td>
                        <td className="p-2 font-mono text-right text-emerald-500">$215,900</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-indigo-400">CUST-41005</td>
                        <td className="p-2 text-text-secondary">Digital Native</td>
                        <td className="p-2 font-mono text-right text-emerald-500">$38,400</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-indigo-400">CUST-52941</td>
                        <td className="p-2 text-text-secondary">Credit Active</td>
                        <td className="p-2 font-mono text-right text-emerald-500">$92,100</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4 entering">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Executive PDF Report
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">9 Sections</span>
              </div>

              <div className="p-4 bg-surface-2 rounded-lg border border-border space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-text-primary">Banking Analytics Executive Summary</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Includes segmentation profiles, Saanvi cross-sell strategies, retention opportunities, and SHAP explainability.
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex flex-col gap-2">
                  <button className="pressable w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors shadow-sm">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Executive PDF</span>
                  </button>
                  <button className="pressable w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-3 hover:bg-surface text-text-secondary hover:text-text-primary border border-border rounded-md text-xs font-medium transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Export Segment Data CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
