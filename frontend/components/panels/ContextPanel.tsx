'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Table,
  FileText,
  X,
  Download,
  ExternalLink,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ChartSpec, CustomerRecord } from '@/lib/types';
import { ChartCard } from './ChartCard';
import { generatePdfReport, fetchCustomers } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';

interface ContextPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  chartSpecs?: ChartSpec[];
  onExportCsv?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen = true,
  onClose,
  chartSpecs = [],
  onExportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'data' | 'report'>('charts');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  React.useEffect(() => {
    fetchCustomers().then((records) => {
      setCustomers(records);
    });
  }, []);

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    showToast.info('Generating PDF Report', 'Building executive 9-section report...');

    try {
      const res = await generatePdfReport('current-session');
      setIsGeneratingPdf(false);
      if (res.success) {
        setPdfGenerated(true);
        showToast.success('PDF Generated', 'Report ready for download');
        if (res.download_url) {
          window.open(res.download_url, '_blank');
        }
      } else {
        showToast.error('PDF Generation Failed', 'Could not compile report.');
      }
    } catch (e) {
      setIsGeneratingPdf(false);
      showToast.error('Export Error', 'Server returned error during PDF compilation.');
    }
  };

  const sampleChartSpecs: ChartSpec[] = [
    {
      id: 'default-cluster-chart',
      type: 'bar',
      title: 'Segment Population Share',
      produced_by: 'ishaan',
      categoryKey: 'name',
      dataKeys: ['percentage'],
      data: [
        { name: 'Priority', percentage: 18 },
        { name: 'Regular', percentage: 58 },
        { name: 'Dormant', percentage: 24 },
      ],
    },
    {
      id: 'default-shap-chart',
      type: 'bar',
      title: 'Kabir Feature Importance',
      produced_by: 'kabir',
      categoryKey: 'feature',
      dataKeys: ['importance'],
      data: [
        { feature: 'Avg Balance', importance: 0.42 },
        { feature: 'Txn Freq', importance: 0.28 },
        { feature: 'Credit Score', importance: 0.18 },
        { feature: 'Digital Active', importance: 0.12 },
      ],
    },
  ];

  const activeCharts = chartSpecs.length > 0 ? chartSpecs : sampleChartSpecs;

  return (
    <>
      {/* Mobile/Tablet Overlay Backdrop (<1024px) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
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
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-xs'
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
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-xs'
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
                  ? 'bg-accent/15 text-accent border border-accent/30 shadow-xs'
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
                  <BarChart3 className="w-3.5 h-3.5 text-accent" />
                  Agent Output Charts
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">
                  {activeCharts.length} cards
                </span>
              </div>

              {activeCharts.map((spec) => (
                <ChartCard key={spec.id} chartSpec={spec} />
              ))}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4 entering">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-accent" />
                  Customer Records Explorer
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">
                  Vihaan Output
                </span>
              </div>

              <div className="bg-surface-2 rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-border bg-bg/60 text-text-tertiary font-mono">
                        <th className="p-2 font-normal">Customer</th>
                        <th className="p-2 font-normal">Segment</th>
                        <th className="p-2 font-normal text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text-secondary">
                      {customers.map((c) => (
                        <tr key={c.customer_id} className="hover:bg-surface-3 transition-colors">
                          <td className="p-2 font-mono text-accent">
                            <div>{c.full_name || c.customer_id}</div>
                            <div className="text-[9px] text-text-tertiary">{c.customer_id}</div>
                          </td>
                          <td className="p-2 text-text-secondary text-[10px]">{c.segment}</td>
                          <td className="p-2 font-mono text-right text-emerald-400 font-medium">
                            ₹{c.avg_balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
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
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  Executive PDF Report
                </h3>
                <span className="text-[10px] text-text-tertiary font-mono">9 Sections</span>
              </div>

              <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-text-primary">
                    Banking Analytics Executive Summary
                  </h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Includes segmentation profiles, Saanvi cross-sell strategies, retention opportunities, and SHAP explainability.
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex flex-col gap-2">
                  <button
                    onClick={handleGeneratePdf}
                    disabled={isGeneratingPdf}
                    className="pressable w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Compiling PDF Report...</span>
                      </>
                    ) : pdfGenerated ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Download PDF Again</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Generate Executive PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={onExportCsv}
                    className="pressable w-full flex items-center justify-center gap-2 py-2 px-3 bg-surface-3 hover:bg-surface text-text-secondary hover:text-text-primary border border-border rounded-lg text-xs font-medium transition-colors"
                  >
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
