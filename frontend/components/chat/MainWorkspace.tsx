'use client';

import React from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { ChatMessage, AgentName, AgentStatus, SegmentSummary } from '@/lib/types';
import { AgentLiveBar } from '@/components/agent-trace/AgentLiveBar';

interface MainWorkspaceProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  activeAgent?: AgentName;
  liveStatusText?: string;
  agentStates?: Record<AgentName, AgentStatus>;
  isSidebarOpen?: boolean;
  selectedMyraModel?: string;
  onToggleSidebar?: () => void;
  onToggleContextPanel?: () => void;
  onOpenMobileSidebar?: () => void;
  onSendMessage: (query: string) => void;
  onSelectSegment?: (segment: SegmentSummary) => void;
  onRespondHitl?: (response: string) => void;
  selectedAdvaitModel?: string;
  onSelectAdvaitModel?: (model: string) => void;
  onSelectMyraModel?: (model: string) => void;
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  messages,
  isStreaming = false,
  activeAgent = 'advait',
  liveStatusText = '',
  agentStates,
  isSidebarOpen = true,
  selectedMyraModel = 'Gemini 3.1 Pro',
  selectedAdvaitModel,
  onSelectAdvaitModel,
  onSelectMyraModel,
  apiKey,
  onApiKeyChange,
  onToggleSidebar,
  onToggleContextPanel,
  onOpenMobileSidebar,
  onSendMessage,
  onSelectSegment,
  onRespondHitl,
}) => {
  return (
    <main style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      minWidth: 0,
      background: '#FDFDFC',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Floating Controls Overlay (Replaces solid Top Bar) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        {/* Left: Sidebar Toggle Button */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={onToggleSidebar}
            className="pressable"
            style={{
              padding: 8,
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              color: 'rgba(26,26,24,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            title={isSidebarOpen ? 'Hide Left Sidebar (⌘B)' : 'Show Left Sidebar (⌘B)'}
          >
            <PanelLeft size={16} />
          </button>
        </div>

        {/* Right: Agent Live Bar & Context Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          <AgentLiveBar
            activeAgent={activeAgent}
            isStreaming={isStreaming}
            liveStatusText={liveStatusText}
            agentStates={agentStates}
          />

          <button
            onClick={onToggleContextPanel}
            className="pressable"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.08)',
              color: 'rgba(26,26,24,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            title="Toggle Context Panel"
          >
            <PanelRight size={14} />
            <span>Stats</span>
          </button>
        </div>
      </div>

      {/* Chat */}
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        activeAgent={activeAgent}
        liveStatusText={liveStatusText}
        agentStates={agentStates}
        onSendMessage={onSendMessage}
        onSelectSegment={onSelectSegment}
        onRespondHitl={onRespondHitl}
        selectedAdvaitModel={selectedAdvaitModel}
        selectedMyraModel={selectedMyraModel}
        onSelectAdvaitModel={onSelectAdvaitModel}
        onSelectMyraModel={onSelectMyraModel}
        apiKey={apiKey}
        onApiKeyChange={onApiKeyChange}
      />
    </main>
  );
};
