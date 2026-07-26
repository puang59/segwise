'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart3,
  Table,
  FileText,
  X,
  Download,
  ExternalLink,
  Loader2,
  Check,
  ScanSearch,
  Filter,
} from 'lucide-react';
import { ChartSpec, CustomerRecord } from '@/lib/types';
import { ChartCard } from './ChartCard';
import { generatePdfReport, fetchCustomers, exportCustomersCsv } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';

interface ContextPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  chartSpecs?: ChartSpec[];
  sessionId?: string;
  activeSegmentFilter?: string;
  hasAgentOutput?: boolean;
  onExportCsv?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  isOpen = true,
  onClose,
  chartSpecs = [],
  sessionId = 'session-default',
  activeSegmentFilter,
  hasAgentOutput = false,
  onExportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'data' | 'report'>('charts');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  // Local override: null = use activeSegmentFilter from parent, undefined = show all
  const [segmentOverride, setSegmentOverride] = useState<string | null | undefined>(null);

  const [panelWidth, setPanelWidth] = useState(540);
  const isDragging = useRef(false);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    mouseDownEvent.stopPropagation();
    isDragging.current = true;
    const startWidth = panelWidth;
    const startX = mouseDownEvent.clientX;

    const doDrag = (mouseMoveEvent: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = startX - mouseMoveEvent.clientX;
        const newWidth = Math.min(Math.max(startWidth + deltaX, 540), 900);
        setPanelWidth(newWidth);
      }
    };

    const stopDrag = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  // The resolved filter: if user cleared it (segmentOverride === undefined) show all;
  // if they haven't touched it, fall back to whatever the parent derived.
  const resolvedFilter =
    segmentOverride === null ? activeSegmentFilter : segmentOverride;

  // Reset PDF + segment override when session changes
  useEffect(() => {
    setPdfGenerated(false);
    setSegmentOverride(null); // re-sync with parent on session switch
  }, [sessionId]);

  // Re-fetch when the resolved filter changes — but ONLY after the agents have produced output.
  // On an empty chat, skip the fetch entirely and show the waiting empty state.
  useEffect(() => {
    if (!hasAgentOutput) {
      setCustomers([]);
      setIsLoadingCustomers(false);
      return;
    }
    setIsLoadingCustomers(true);
    fetchCustomers(resolvedFilter || undefined, sessionId).then((records) => {
      setCustomers(records);
      setIsLoadingCustomers(false);
    }).catch(() => {
      setIsLoadingCustomers(false);
    });
  }, [resolvedFilter, hasAgentOutput]);

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    showToast.info('Generating Report', 'Building executive 9-section report...');

    try {
      await generatePdfReport(sessionId);
      setPdfGenerated(true);
      showToast.success('Report Downloaded', 'Check your downloads folder.');
    } catch (e: any) {
      showToast.error('Export Failed', e?.message || 'Server error during report compilation.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Only real agent-produced charts — no hardcoded fallbacks
  const activeCharts = chartSpecs;

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
          width: panelWidth,
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
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          style={{
            position: 'absolute',
            left: -3,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 60,
          }}
        />
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
                color: activeTab === 'charts' ? '#1a1a18' : 'rgba(26,26,24,0.5)',
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
                color: activeTab === 'data' ? '#1a1a18' : 'rgba(26,26,24,0.5)',
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
                color: activeTab === 'report' ? '#1a1a18' : 'rgba(26,26,24,0.5)',
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
                  <BarChart3 size={13} color="#1a1a18" />
                  Agent Output Charts
                </h3>
                {activeCharts.length > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.3)', fontFamily: 'var(--font-mono)' }}>
                    {activeCharts.length} {activeCharts.length === 1 ? 'card' : 'cards'}
                  </span>
                )}
              </div>

              {activeCharts.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '40px 20px',
                  background: '#f9f9f8',
                  borderRadius: 10,
                  border: '1px dashed rgba(0,0,0,0.1)',
                  textAlign: 'center',
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(26,26,24,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <ScanSearch size={17} color="rgba(26,26,24,0.5)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,26,24,0.5)', marginBottom: 4 }}>
                      No charts yet
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(26,26,24,0.35)', lineHeight: 1.5 }}>
                      Ask a question to trigger the agent pipeline. Mosaic and Forge will generate segmentation and SHAP charts here.
                    </div>
                  </div>
                </div>
              ) : (
                activeCharts.map((spec) => (
                  <ChartCard key={spec.id} chartSpec={spec} />
                ))
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
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
                  <Table size={13} color="#1a1a18" />
                  Customer Records Explorer
                </h3>
                {resolvedFilter ? (
                  <button
                    onClick={() => setSegmentOverride(undefined)}
                    title="Clear segment filter — show all customers"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '2px 6px',
                      borderRadius: 5,
                      border: '1px solid rgba(79,70,229,0.25)',
                      background: 'rgba(26,26,24,0.05)',
                      color: '#4f46e5',
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Filter size={9} />
                    {resolvedFilter}
                    <X size={9} />
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.3)', fontFamily: 'var(--font-mono)' }}>
                    All customers
                  </span>
                )}
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
                ) : !hasAgentOutput ? (
                  /* ── State 1: No query sent yet ─────────────────────────── */
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 10, padding: '40px 20px', textAlign: 'center',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(26,26,24,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ScanSearch size={17} color="rgba(26,26,24,0.45)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,26,24,0.45)', marginBottom: 4 }}>
                        Waiting for your query
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(26,26,24,0.32)', lineHeight: 1.55 }}>
                        Ask a question in the chat. Scout will resolve the relevant customer records and display them here.
                      </div>
                    </div>
                  </div>
                ) : customers.length === 0 ? (
                  /* ── State 2: Query ran but no results / backend offline ── */
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 10, padding: '40px 20px', textAlign: 'center',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(26,26,24,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Table size={17} color="rgba(26,26,24,0.5)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,26,24,0.5)', marginBottom: 4 }}>
                        No records found
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(26,26,24,0.35)', lineHeight: 1.5 }}>
                        {resolvedFilter
                          ? `No customers matched the "${resolvedFilter}" segment filter.`
                          : 'The backend returned no customer records. Check that the server is running.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#f5f5f3', color: 'rgba(26,26,24,0.4)', fontFamily: 'var(--font-mono)' }}>
                          <th style={{ padding: '8px 10px', fontWeight: 400 }}>Customer</th>
                          <th style={{ padding: '8px 10px', fontWeight: 400 }}>Segment</th>
                          <th style={{ padding: '8px 10px', fontWeight: 400, textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '8px 10px', fontWeight: 400, textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: 'rgba(26,26,24,0.6)' }}>
                        {customers.map((c) => (
                          <tr key={c.customer_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: '#1a1a18' }}>
                              <div>{c.full_name || c.customer_id}</div>
                              <div style={{ fontSize: 9, color: 'rgba(26,26,24,0.35)' }}>{c.customer_id}</div>
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: 10 }}>{c.segment}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {c.is_high_risk === 1 ? (
                                <span style={{ padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                                  High Risk
                                </span>
                              ) : (
                                <span style={{ padding: '2px 6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                                  Safe
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#1a1a18', fontWeight: 500 }}>
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
                  <FileText size={13} color="#1a1a18" />
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
                    Includes segmentation profiles, Compass cross-sell strategies, retention opportunities, and SHAP explainability.
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
                      background: '#1a1a18',
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
                    onClick={async () => {
                      try {
                        showToast.info('Exporting CSV', 'Preparing customer segment data...');
                        await exportCustomersCsv({ segmentId: resolvedFilter || undefined, sessionId });
                        showToast.success('CSV Downloaded', 'Check your downloads folder.');
                      } catch (e: any) {
                        showToast.error('Export Failed', e?.message || 'Could not export CSV.');
                      }
                    }}
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
