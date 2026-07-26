'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MainWorkspace } from '@/components/chat/MainWorkspace';
import { ContextPanel } from '@/components/panels/ContextPanel';
import { SegmentDetailPanel } from '@/components/panels/SegmentDetailPanel';
import { ChatMessage, AgentTraceItem, AgentName, AgentStatus, ChartSpec, SegmentSummary, AGENT_REGISTRY, ChatSession } from '@/lib/types';
import { streamChatQuery } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';

const STORAGE_SESSIONS_KEY = 'segwise_chat_sessions_v1';
const STORAGE_CURRENT_ID_KEY = 'segwise_current_session_id';

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 'session-default',
    title: 'HNW Wealth Retention & Product Recommendations',
    updatedAt: 'Just now',
    messages: [],
    chartSpecs: [],
  },
];

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);

  // Sessions and Active Session State
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState<string>('session-default');

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
    saanvi: 'queued',
    aanav: 'queued',
    myra: 'queued',
  });
  const [chartSpecs, setChartSpecs] = useState<ChartSpec[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<SegmentSummary | null>(null);

  // Derive the active segment filter from the most recent message that has segmentData.
  // Used to filter the Data tab in ContextPanel to only show relevant customers.
  const activeSegmentFilter = React.useMemo<string | undefined>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.segmentData && msg.segmentData.length > 0) {
        // Use the segment with the most customers as the primary filter
        const sorted = [...msg.segmentData].sort(
          (a, b) => (b.customer_count ?? b.count ?? 0) - (a.customer_count ?? a.count ?? 0)
        );
        const seg = sorted[0];
        return (seg.id || seg.name)?.toLowerCase();
      }
    }
    return undefined;
  }, [messages]);

  // True once at least one completed (non-streaming) agent response exists.
  // Gates the customer data fetch — Data tab stays empty until the agents have run.
  const hasAgentOutput = React.useMemo(
    () => messages.some((m) => m.sender !== 'user' && !m.isStreaming && m.content),
    [messages]
  );

  const isInitialMount = useRef(true);

  // 1. Load Sessions from localStorage on Mount
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(STORAGE_SESSIONS_KEY);
      const storedId = localStorage.getItem(STORAGE_CURRENT_ID_KEY);

      if (storedSessions) {
        const parsed: ChatSession[] = JSON.parse(storedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const activeId = storedId && parsed.some((s) => s.id === storedId) ? storedId : parsed[0].id;
          setCurrentSessionId(activeId);
          const activeSession = parsed.find((s) => s.id === activeId);
          if (activeSession) {
            setMessages(activeSession.messages || []);
            setChartSpecs(activeSession.chartSpecs || []);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[LocalStorage Load Error]', err);
    }
  }, []);

  // 2. Persist Messages & Session Updates to LocalStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!currentSessionId) return;

    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === currentSessionId) {
          let title = s.title;
          const firstUserMsg = messages.find((m) => m.sender === 'user');
          if (firstUserMsg && (title === 'New Analysis Session' || title === 'HNW Wealth Retention & Product Recommendations' || !title)) {
            title = firstUserMsg.content.length > 36 ? `${firstUserMsg.content.slice(0, 36)}…` : firstUserMsg.content;
          }

          return {
            ...s,
            title,
            updatedAt: 'Just now',
            messages,
            chartSpecs,
          };
        }
        return s;
      });

      try {
        localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(updated));
        localStorage.setItem(STORAGE_CURRENT_ID_KEY, currentSessionId);
      } catch (err) {
        console.warn('[LocalStorage Save Error]', err);
      }
      return updated;
    });
  }, [messages, chartSpecs, currentSessionId]);

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

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'myra',
      attribution: `✦ Myra · ${myraModel.split('/').pop() || myraModel}`,
      content: '',
      traceItems: [],
      timestamp,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setActiveAgent('advait');
    setLiveStatusText('Deploying multi-agent network...');

    // Reset agent states
    setAgentStates({
      advait: 'queued',
      vihaan: 'queued',
      kabir: 'queued',
      ishaan: 'queued',
      saanvi: 'queued',
      aanav: 'queued',
      myra: 'queued',
    });

    // 3. Initiate SSE Chat Stream
    let currentTraceItems: AgentTraceItem[] = [];
    let currentTextContent = '';
    let currentSegmentData: SegmentSummary[] | undefined;
    let currentSuggestions: string[] | undefined;
    let currentClarification: any = undefined;

    // Helper: push a message update
    const pushUpdate = (overrides: Partial<ChatMessage> = {}) => {
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

              // Remove deploy placeholder row once real agents start
              currentTraceItems = currentTraceItems.filter(
                (t) => !t.id.startsWith('trace-deploy-')
              );

              // Dynamic live cyan status text
              const liveMsgs: Record<string, string> = {
                advait: 'Advait is analysing intent and building an execution plan...',
                vihaan: 'Vihaan is querying the database to resolve columns...',
                kabir: 'Kabir is computing SHAP explainability scores...',
                ishaan: 'Ishaan is running the customer segmentation engine...',
                saanvi: 'Saanvi is generating personalized product recommendations...',
                aanav: 'Aanav is compiling executive PDF report sections...',
                myra: 'Myra is synthesizing the final report and insights...',
              };
              const agentSummaries: Record<string, string> = {
                advait: 'Calculating intent score from user prompt — planning agent pipeline',
                vihaan: 'Inspecting bank_sqlite.db schema via column_resolver tool',
                kabir: 'Running shap_explainer tool — computing feature importance scores',
                ishaan: 'Running segmentation_clustering tool on customer profiles',
                saanvi: 'Running product_recommendations tool — mapping cross-sell offers',
                aanav: 'Compiling executive PDF report structure',
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

              // force immediate DOM paint so user sees each agent start live
              setActiveAgent(agent);
              setLiveStatusText(liveMsg);
              setAgentStates((prev) => ({ ...prev, [agent]: 'running' }));
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
              setAgentStates((prev) => ({ ...prev, [agent]: 'done' }));
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
                saanvi: 'done',
                aanav: 'done',
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

  const handleSelectSession = (targetId: string) => {
    if (targetId === currentSessionId) return;

    // Save current session state before switching
    setSessions((prev) => {
      const saved = prev.map((s) => (s.id === currentSessionId ? { ...s, messages, chartSpecs } : s));
      try {
        localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(saved));
      } catch {}
      return saved;
    });

    setCurrentSessionId(targetId);
    try {
      localStorage.setItem(STORAGE_CURRENT_ID_KEY, targetId);
    } catch {}

    const targetSession = sessions.find((s) => s.id === targetId);
    if (targetSession) {
      setMessages(targetSession.messages || []);
      setChartSpecs(targetSession.chartSpecs || []);
    } else {
      setMessages([]);
      setChartSpecs([]);
    }

    setIsMobileSidebarOpen(false);
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Analysis Session',
      updatedAt: 'Just now',
      messages: [],
      chartSpecs: [],
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newId);
    setMessages([]);
    setChartSpecs([]);
    setIsMobileSidebarOpen(false);

    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(updatedSessions));
      localStorage.setItem(STORAGE_CURRENT_ID_KEY, newId);
    } catch {}

    showToast.info('New Session Started', 'Workspace ready for new prompt');
  };

  const handleDeleteSession = (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const remaining = sessions.filter((s) => s.id !== targetId);
    const nextSessions = remaining.length > 0 ? remaining : [
      {
        id: `session-${Date.now()}`,
        title: 'New Analysis Session',
        updatedAt: 'Just now',
        messages: [],
        chartSpecs: [],
      }
    ];

    setSessions(nextSessions);

    if (currentSessionId === targetId) {
      const nextActive = nextSessions[0];
      setCurrentSessionId(nextActive.id);
      setMessages(nextActive.messages || []);
      setChartSpecs(nextActive.chartSpecs || []);
    }

    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(nextSessions));
    } catch {}

    showToast.info('Session Deleted', 'Removed chat history');
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
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
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
        selectedAdvaitModel={advaitModel}
        selectedMyraModel={myraModel}
        onSelectAdvaitModel={setAdvaitModel}
        onSelectMyraModel={setMyraModel}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onToggleSidebar={handleToggleSidebar}
        onToggleContextPanel={() => setIsContextPanelOpen((prev) => !prev)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        onSendMessage={handleSendMessage}
        onSelectSegment={(seg) => setSelectedSegment(seg)}
        onRespondHitl={(res) => handleSendMessage(`Selected clarification option: ${res}`)}
      />

      {/* Right Column: Context Panel (360px) */}
      <ContextPanel
        key={currentSessionId}
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
        chartSpecs={chartSpecs}
        sessionId={currentSessionId}
        activeSegmentFilter={activeSegmentFilter}
        hasAgentOutput={hasAgentOutput}
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
