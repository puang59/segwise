'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MainWorkspace } from '@/components/chat/MainWorkspace';
import { ContextPanel } from '@/components/panels/ContextPanel';
import { SegmentDetailPanel } from '@/components/panels/SegmentDetailPanel';
import { ChatMessage, AgentTraceItem, AgentName, ChartSpec, SegmentSummary } from '@/lib/types';
import { streamChatQuery } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';

export default function Home() {
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
  const [chartSpecs, setChartSpecs] = useState<ChartSpec[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<SegmentSummary | null>(null);

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

    // 2. Prepare Assistant Placeholder Message
    const initialTraceItem: AgentTraceItem = {
      id: `trace-advait-${Date.now()}`,
      agent: 'advait',
      role: 'Intent Extractor',
      status: 'running',
      summary: 'Analyzing query intent & planning agent handoff...',
    };

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'myra',
      attribution: `✦ Myra · ${myraModel.split('/').pop() || myraModel}`,
      content: '',
      traceItems: [initialTraceItem],
      timestamp,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setActiveAgent('advait');

    // 3. Initiate SSE Chat Stream
    let currentTraceItems: AgentTraceItem[] = [initialTraceItem];
    let currentTextContent = '';
    let currentSegmentData: SegmentSummary[] | undefined;
    let currentSuggestions: string[] | undefined;
    let currentClarification: any = undefined;

    await streamChatQuery(
      queryText,
      currentSessionId,
      advaitModel,
      myraModel,
      apiKey,
      {
        onEvent: (event) => {
          switch (event.type) {
            case 'agent_start': {
              setActiveAgent(event.data.agent);
              const exists = currentTraceItems.find((t) => t.agent === event.data.agent);
              if (!exists) {
                currentTraceItems = [
                  ...currentTraceItems,
                  {
                    id: `trace-${event.data.agent}-${Date.now()}`,
                    agent: event.data.agent,
                    role: event.data.role,
                    status: 'running',
                    summary: `${event.data.role} processing...`,
                  },
                ];
              } else {
                currentTraceItems = currentTraceItems.map((t) =>
                  t.agent === event.data.agent ? { ...t, status: 'running' } : t
                );
              }
              break;
            }
            case 'agent_complete': {
              currentTraceItems = currentTraceItems.map((t) =>
                t.agent === event.data.agent
                  ? {
                      ...t,
                      status: 'done',
                      duration_ms: event.data.duration_ms,
                      summary: event.data.summary,
                    }
                  : t
              );
              break;
            }
            case 'tool_progress': {
              currentTraceItems = currentTraceItems.map((t) =>
                t.agent === event.data.agent
                  ? { ...t, progress: event.data.progress, summary: event.data.message }
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
              break;
            }
          }

          // Update Assistant Message State
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: currentTextContent || 'Analysis completed successfully.',
                    traceItems: currentTraceItems,
                    segmentData: currentSegmentData,
                    suggestions: currentSuggestions,
                    clarification: currentClarification,
                    isStreaming: false,
                  }
                : msg
            )
          );
        },
        onError: (err) => {
          setIsStreaming(false);
          showToast.error('Streaming error', err.message);
        },
        onComplete: () => {
          setIsStreaming(false);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text-primary">
      {/* Left Column: Sidebar (240px) */}
      <Sidebar
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
        selectedMyraModel={myraModel}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onToggleContextPanel={() => setIsContextPanelOpen((prev) => !prev)}
        onOpenModelSwitcher={() => setIsMobileSidebarOpen(true)}
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
