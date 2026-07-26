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
import { ChartSpec, CustomerRecord } from '@/lib/types';
import { ChartCard } from './ChartCard';
import { generatePdfReport, fetchCustomers } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';

interface ContextPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  chartSpecs?: ChartSpec[];
  sessionId?: string;
  onExportCsv?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen = true,
  onClose,
  chartSpecs = [],
  sessionId = 'session-default',
  onExportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'data' | 'report'>('charts');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  React.useEffect(() => {
    setIsLoadingCustomers(true);
    fetchCustomers().then((records) => {
      setCustomers(records);
      setIsLoadingCustomers(false);
    }).catch(() => {
      setIsLoadingCustomers(false);
    });
  }, [sessionId]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
        onClick={onClose}
      />

      <aside
        style={{
          width: 360,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#ffffff',
          borderLeft: '1px solid rgba(0,0,0,0.07)',
          position: 'relative',
          zIndex: 50,
          userSelect: 'none',
        }}
      >
        {/* Header & Tabs */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          gap: 8,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#f5f5f3',
            padding: 3,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.06)',
            flex: 1,
          }}>
            <button
              onClick={() => setActiveTab('charts')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                border: 'none',
                background: activeTab === 'charts' ? '#ffffff' : 'transparent',
                color: activeTab === 'charts' ? '#4f46e5' : 'rgba(26,26,24,0.5)',
                boxShadow: activeTab === 'charts' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={13} />
              <span>Charts</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                border: 'none',
                background: activeTab === 'data' ? '#ffffff' : 'transparent',
                color: activeTab === 'data' ? '#4f46e5' : 'rgba(26,26,24,0.5)',
                boxShadow: activeTab === 'data' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              <Table size={13} />
              <span>Data</span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                border: 'none',
                background: activeTab === 'report' ? '#ffffff' : 'transparent',
                color: activeTab === 'report' ? '#4f46e5' : 'rgba(26,26,24,0.5)',
                boxShadow: activeTab === 'report' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              <FileText size={13} />
              <span>Report</span>
            </button>
          </div>

          {/* Close Panel Button (Works on Desktop & Mobile) */}
          {onClose && (
            <button
              onClick={onClose}
              className="pressable"
              style={{
                padding: 5,
                borderRadius: 6,
                background: 'none',
                border: 'none',
                color: 'rgba(26,26,24,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close panel"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Tab Contents Viewport */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {activeTab === 'charts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <h3 style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(26,26,24,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: 0,
                  flex: 1,
                }}>
                  <BarChart3 size={13} color="#4f46e5" />
                  Agent Output Charts
                </h3>
                <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.3)', fontFamily: 'var(--font-mono)' }}>
                  {activeCharts.length} cards
                </span>
              </div>

              {activeCharts.map((spec) => (
                <ChartCard key={spec.id} chartSpec={spec} />
              ))}
            </div>
          )}

          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <h3 style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(26,26,24,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: 0,
                  flex: 1,
                }}>
                  <Table size={13} color="#4f46e5" />
                  Customer Records Explorer
                </h3>
                <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.3)', fontFamily: 'var(--font-mono)' }}>
                  Vihaan Output
                </span>
              </div>

              <div style={{
                background: '#f9f9f8',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.07)',
                overflow: 'hidden',
              }}>
                {isLoadingCustomers ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(26,26,24,0.4)', fontSize: 12 }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 8 }} />
                    <div>Loading customer records...</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#f5f5f3', color: 'rgba(26,26,24,0.4)', fontFamily: 'var(--font-mono)' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 400 }}>Customer</th>
                          <th style={{ padding: '8px 10px', fontWeight: 400 }}>Segment</th>
                          <th style={{ padding: '8px 10px', fontWeight: 400, textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: 'rgba(26,26,24,0.6)' }}>
                        {customers.map((c) => (
                          <tr key={c.customer_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                              <div>{c.full_name || c.customer_id}</div>
                              <div style={{ fontSize: 9, color: 'rgba(26,26,24,0.35)' }}>{c.customer_id}</div>
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: 10 }}>{c.segment}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#16a34a', fontWeight: 500 }}>
                              ₹{c.avg_balance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <h3 style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'rgba(26,26,24,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  margin: 0,
                  flex: 1,
                }}>
                  <FileText size={13} color="#4f46e5" />
                  Executive PDF Report
                </h3>
                <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.3)', fontFamily: 'var(--font-mono)' }}>9 Sections</span>
              </div>

              <div style={{
                padding: 14,
                background: '#f9f9f8',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a18', margin: '0 0 4px' }}>
                    Banking Analytics Executive Summary
                  </h4>
                  <p style={{ fontSize: 11, color: 'rgba(26,26,24,0.55)', margin: 0, lineHeight: 1.5 }}>
                    Includes segmentation profiles, Saanvi cross-sell strategies, retention opportunities, and SHAP explainability.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    onClick={handleGeneratePdf}
                    disabled={isGeneratingPdf}
                    className="pressable"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
                      opacity: isGeneratingPdf ? 0.6 : 1,
                    }}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Compiling PDF Report...</span>
                      </>
                    ) : pdfGenerated ? (
                      <>
                        <Check size={13} color="#ffffff" />
                        <span>Download PDF Again</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        <span>Generate Executive PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={onExportCsv}
                    className="pressable"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      background: '#ffffff',
                      color: 'rgba(26,26,24,0.6)',
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.08)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={13} />
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
