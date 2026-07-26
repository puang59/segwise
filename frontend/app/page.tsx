'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MainWorkspace } from '@/components/chat/MainWorkspace';
import { ContextPanel } from '@/components/panels/ContextPanel';
import { SegmentDetailPanel } from '@/components/panels/SegmentDetailPanel';
import { ChatMessage, AgentTraceItem, AgentName, AgentStatus, ChartSpec, SegmentSummary, AGENT_REGISTRY } from '@/lib/types';
import { streamChatQuery } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  // Model Selection State
  const [advaitModel, setAdvaitModel] = useState('google/gemini-3.1-flash-lite');
  const [myraModel, setMyraModel] = useState('meta-llama/Meta-Llama-3.1-70B-Instruct');
  const [apiKey, setApiKey] = useState('');

  // Active Session Data & SSE Streaming State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentName>('advait');
  const [liveStatusText, setLiveStatusText] = useState<string>('');
  const [agentStates, setAgentStates] = useState<Record<AgentName, AgentStatus>>({
    advait: 'queued',
    vihaan: 'queued',
    kabir: 'queued',
    ishaan: 'queued',
    aadhya: 'queued',
    saanvi: 'queued',
    myra: 'queued',
  });
  const [chartSpecs, setChartSpecs] = useState<ChartSpec[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<SegmentSummary | null>(null);

  // Keyboard shortcut listener for Cmd+B / Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = async (queryText: string) => {
    const userMsgId = `msg-user-${Date.now()}`;
    const assistantMsgId = `msg-myra-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append User Message
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      content: queryText,
      timestamp,
    };

    // 2. Seed the trace with the "Deploying Agents..." row
    const deployTraceItem: AgentTraceItem = {
      id: `trace-deploy-${Date.now()}`,
      agent: 'advait',
      role: 'Orchestrator',
      status: 'running',
      summary: 'Deploying Agents ...',
      toolName: undefined,
    };

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'myra',
      attribution: `✦ Myra · ${myraModel.split('/').pop() || myraModel}`,
      content: '',
      traceItems: [deployTraceItem],
      timestamp,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setActiveAgent('advait');
    setLiveStatusText('Deploying agents and analysing your query...');

    // Reset agent states
    setAgentStates({
      advait: 'queued',
      vihaan: 'queued',
      kabir: 'queued',
      ishaan: 'queued',
      aadhya: 'queued',
      saanvi: 'queued',
      myra: 'queued',
    });

    // 3. Initiate SSE Chat Stream
    let currentTraceItems: AgentTraceItem[] = [deployTraceItem];
    let currentTextContent = '';
    let currentSegmentData: SegmentSummary[] | undefined;
    let currentSuggestions: string[] | undefined;
    let currentClarification: any = undefined;

    // Helper: push a message update — uses flushSync so every event is immediately painted
    const pushUpdate = (overrides: Partial<ChatMessage> = {}) => {
      flushSync(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: currentTextContent,
                  traceItems: [...currentTraceItems],
                  segmentData: currentSegmentData,
                  suggestions: currentSuggestions,
                  clarification: currentClarification,
                  isStreaming: true,
                  ...overrides,
                }
              : msg
          )
        );
      });
    };

    await streamChatQuery(
      queryText,
      currentSessionId,
      advaitModel,
      myraModel,
      apiKey,
      {
        onEvent: (event) => {
          switch (event.type) {

            // ── AGENT LIFECYCLE ──────────────────────────────────────────────
            case 'agent_start': {
              const agent = event.data.agent as AgentName;

              // Mark deploy row as done, now show this agent running
              currentTraceItems = currentTraceItems.map((t) =>
                t.id.startsWith('trace-deploy-') ? { ...t, status: 'done', summary: 'Agents deployed successfully' } : t
              );

              // Dynamic live cyan status text
              const liveMsgs: Record<string, string> = {
                advait: 'Advait is analysing intent and building an execution plan...',
                vihaan: 'Vihaan is querying the database to resolve columns...',
                kabir: 'Kabir is engineering composite behavioral features...',
                ishaan: 'Ishaan is running the customer segmentation engine...',
                aadhya: 'Aadhya is computing SHAP explainability scores...',
                saanvi: 'Saanvi is generating personalized product recommendations...',
                myra: 'Myra is synthesizing the final report and insights...',
              };
              const agentSummaries: Record<string, string> = {
                advait: 'Calculating intent score from user prompt — planning agent pipeline',
                vihaan: 'Inspecting bank_sqlite.db schema via column_resolver tool',
                kabir: 'Running compute_features tool — building behavioral feature vectors',
                ishaan: 'Running segmentation_clustering tool on customer profiles',
                aadhya: 'Running shap_explainer tool — computing feature importance scores',
                saanvi: 'Running product_recommendations tool — mapping cross-sell offers',
                myra: 'Synthesizing executive narrative and segment markdown report',
              };

              const liveMsg = liveMsgs[agent] || `${AGENT_REGISTRY[agent]?.displayName || agent} is processing...`;
              const summaryMsg = agentSummaries[agent] || `${AGENT_REGISTRY[agent]?.role || agent} working...`;

              // Append a new trace row for this agent if not already there
              const exists = currentTraceItems.find((t) => t.agent === agent && !t.toolName);
              if (!exists) {
                currentTraceItems = [
                  ...currentTraceItems,
                  {
                    id: `trace-${agent}-${Date.now()}`,
                    agent,
                    role: event.data.role || AGENT_REGISTRY[agent]?.role || 'Agent',
                    status: 'running',
                    summary: summaryMsg,
                  },
                ];
              } else {
                currentTraceItems = currentTraceItems.map((t) =>
                  t.agent === agent && !t.toolName ? { ...t, status: 'running', summary: summaryMsg } : t
                );
              }

              // flushSync: force immediate DOM paint so user sees each agent start live
              flushSync(() => {
                setActiveAgent(agent);
                setLiveStatusText(liveMsg);
                setAgentStates((prev) => ({ ...prev, [agent]: 'running' }));
              });
              break;
            }

            case 'agent_complete': {
              const agent = event.data.agent as AgentName;
              currentTraceItems = currentTraceItems.map((t) =>
                t.agent === agent && !t.toolName
                  ? {
                      ...t,
                      status: 'done',
                      duration_ms: event.data.duration_ms,
                      summary: event.data.summary || t.summary,
                    }
                  : t
              );
              flushSync(() => {
                setAgentStates((prev) => ({ ...prev, [agent]: 'done' }));
              });
              break;
            }

            // ── TOOL LIFECYCLE ───────────────────────────────────────────────
            case 'tool_start': {
              const agent = event.data.agent as AgentName;
              const tool = event.data.tool;

              // Human-readable tool descriptions
              const toolDescriptions: Record<string, string> = {
                advait_intent_extractor: 'intent_extractor — parsing natural language query into a structured QueryPlan',
                column_resolver: 'column_resolver — running PRAGMA table_info on bank_sqlite.db to map columns',
                compute_features: 'compute_features — aggregating max_monthly_balance, txn_frequency, avg_txn_amount',
                segmentation_clustering: 'segmentation_clustering — applying rule-based / K-Means clustering on customer profiles',
                shap_explainer: 'shap_explainer — computing SHAP feature importance values per segment',
                product_recommendations: 'product_recommendations — mapping cross-sell/up-sell offers per segment',
              };

              const toolLiveText: Record<string, string> = {
                advait_intent_extractor: `Advait → intent_extractor running on "${queryText.slice(0, 40)}${queryText.length > 40 ? '...' : ''}"`,
                column_resolver: 'Vihaan → column_resolver querying bank_sqlite.db schema...',
                compute_features: 'Kabir → compute_features building behavioral feature vectors...',
                segmentation_clustering: 'Ishaan → segmentation_clustering clustering customer profiles...',
                shap_explainer: 'Aadhya → shap_explainer computing SHAP importance scores...',
                product_recommendations: 'Saanvi → product_recommendations generating banking product offers...',
              };

              setLiveStatusText(toolLiveText[tool] || `${AGENT_REGISTRY[agent]?.displayName} → ${tool} running...`);

              // Append a tool sub-row
              currentTraceItems = [
                ...currentTraceItems,
                {
                  id: `trace-tool-${tool}-${Date.now()}`,
                  agent,
                  role: 'Tool',
                  status: 'running',
                  summary: `→ ${toolDescriptions[tool] || tool}`,
                  toolName: tool,
                },
              ];
              break;
            }

            case 'tool_complete': {
              const tool = event.data.tool;
              const agent = event.data.agent as AgentName;

              const toolCompleteSummaries: Record<string, string> = {
                advait_intent_extractor: 'intent_extractor ✓ — QueryPlan extracted and agent pipeline determined',
                column_resolver: 'column_resolver ✓ — resolved schema columns from bank_sqlite.db',
                compute_features: 'compute_features ✓ — behavioral features computed and written to state',
                segmentation_clustering: 'segmentation_clustering ✓ — customers clustered into segments',
                shap_explainer: 'shap_explainer ✓ — SHAP values computed for all feature dimensions',
                product_recommendations: 'product_recommendations ✓ — personalized product offers mapped per segment',
              };

              currentTraceItems = currentTraceItems.map((t) =>
                t.toolName === tool && t.agent === agent && t.status === 'running'
                  ? {
                      ...t,
                      status: 'done',
                      summary: `→ ${toolCompleteSummaries[tool] || `${tool} completed`}`,
                    }
                  : t
              );
              break;
            }

            case 'tool_error': {
              const tool = (event.data as any).tool;
              const agent = (event.data as any).agent as AgentName;
              currentTraceItems = currentTraceItems.map((t) =>
                t.toolName === tool && t.agent === agent
                  ? { ...t, status: 'error', summary: `→ ${tool} failed: ${(event.data as any).error}` }
                  : t
              );
              break;
            }

            case 'tool_progress': {
              const agent = (event.data as any).agent as AgentName;
              if ((event.data as any).message) {
                setLiveStatusText((event.data as any).message);
              }
              // Update the matching running tool row's summary
              currentTraceItems = currentTraceItems.map((t) =>
                t.agent === agent && t.status === 'running' && t.toolName
                  ? { ...t, progress: (event.data as any).progress, summary: `→ ${(event.data as any).message || t.summary}` }
                  : t
              );
              break;
            }

            // ── DATA EVENTS ──────────────────────────────────────────────────
            case 'intent_detected': {
              const intent = event.data.intent || 'segmentation';
              const method = (event.data as any).segmentation_method || 'rule';
              const plan = (event.data as any).agent_plan || [];
              setLiveStatusText(`Advait detected intent: ${intent} (${method}-based) — handing off to ${plan[0] || 'Vihaan'}`);
              currentTraceItems = currentTraceItems.map((t) =>
                t.agent === 'advait' && !t.toolName
                  ? {
                      ...t,
                      summary: `Intent detected: "${intent}" (${method}-based segmentation) → pipeline: ${plan.join(' → ')}`,
                    }
                  : t
              );
              break;
            }

            case 'columns_resolved': {
              const count = event.data.row_count || 0;
              const cols = (event.data.columns || []).length;
              setLiveStatusText(`Vihaan resolved ${cols} columns across ${count.toLocaleString()} records`);
              currentTraceItems = currentTraceItems.map((t) =>
                t.agent === 'vihaan' && !t.toolName
                  ? {
                      ...t,
                      summary: `Resolved ${cols} database columns across ${count.toLocaleString()} customer records`,
                    }
                  : t
              );
              break;
            }

            case 'clarification': {
              currentClarification = {
                question: event.data.question,
                options: event.data.options,
                asking_agent: event.data.asking_agent,
              };
              break;
            }

            case 'text_chunk': {
              currentTextContent += event.data.content;
              break;
            }

            case 'structured_output': {
              if (event.data.kind === 'table' && Array.isArray(event.data.payload)) {
                currentSegmentData = event.data.payload;
              } else if (event.data.kind === 'chart') {
                const newSpec = event.data.payload as ChartSpec;
                setChartSpecs((prev) => [...prev, newSpec]);
              }
              break;
            }

            case 'suggestions': {
              currentSuggestions = event.data.chips;
              break;
            }

            case 'done': {
              setIsStreaming(false);
              setLiveStatusText('');
              // Reset agent states to done on completion
              setAgentStates({
                advait: 'done',
                vihaan: 'done',
                kabir: 'done',
                ishaan: 'done',
                aadhya: 'done',
                saanvi: 'done',
                myra: 'done',
              });
              // Final message update — set isStreaming false
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        content: currentTextContent || 'Analysis completed successfully.',
                        traceItems: [...currentTraceItems],
                        segmentData: currentSegmentData,
                        suggestions: currentSuggestions,
                        clarification: currentClarification,
                        isStreaming: false,
                      }
                    : msg
                )
              );
              return; // Skip the pushUpdate below
            }
          }

          // Push a live update for every event (keep isStreaming:true)
          pushUpdate();
        },
        onError: (err) => {
          setIsStreaming(false);
          setLiveStatusText('');
          showToast.error('Streaming error', err.message);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
            )
          );
        },
        onComplete: () => {
          setIsStreaming(false);
          setLiveStatusText('');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: currentTextContent || 'Analysis completed successfully.',
                    traceItems: [...currentTraceItems],
                    segmentData: currentSegmentData,
                    suggestions: currentSuggestions,
                    clarification: currentClarification,
                    isStreaming: false,
                  }
                : msg
            )
          );
        },
      }
    );
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setChartSpecs([]);
    setIsMobileSidebarOpen(false);
    showToast.info('New Session Started', 'Cleared session messages');
  };

  const handleExportCsv = (segmentName?: string) => {
    showToast.success(
      'Export Started',
      `Downloading customer CSV${segmentName ? ` for segment: ${segmentName}` : ''}`
    );
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#FDFDFC', color: '#1a1a18' }}>
      {/* Left Column: Sidebar (240px toggleable) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        selectedAdvaitModel={advaitModel}
        selectedMyraModel={myraModel}
        onSelectAdvaitModel={setAdvaitModel}
        onSelectMyraModel={setMyraModel}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      {/* Center Column: Main Workspace (flex-1) */}
      <MainWorkspace
        messages={messages}
        isStreaming={isStreaming}
        activeAgent={activeAgent}
        liveStatusText={liveStatusText}
        agentStates={agentStates}
        isSidebarOpen={isSidebarOpen}
        selectedMyraModel={myraModel}
        onToggleSidebar={handleToggleSidebar}
        onToggleContextPanel={() => setIsContextPanelOpen((prev) => !prev)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onSendMessage={handleSendMessage}
        onSelectSegment={(seg) => setSelectedSegment(seg)}
        onRespondHitl={(res) => handleSendMessage(`Selected clarification option: ${res}`)}
      />

      {/* Right Column: Context Panel (360px) */}
      <ContextPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        chartSpecs={chartSpecs}
        onExportCsv={() => handleExportCsv()}
      />

      {/* Segment Detail Slide-Over Drawer */}
      {selectedSegment && (
        <SegmentDetailPanel
          segment={selectedSegment}
          onClose={() => setSelectedSegment(null)}
          onExportSegmentCsv={(name) => handleExportCsv(name)}
        />
      )}
    </div>
  );
}
