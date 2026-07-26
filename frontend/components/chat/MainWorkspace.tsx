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
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  messages,
  isStreaming = false,
  activeAgent = 'advait',
  liveStatusText = '',
  agentStates,
  isSidebarOpen = true,
  selectedMyraModel = 'Gemini 3.1 Pro',
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
      {/* Header with Sidebar Toggle & Agent Live Network Status */}
      <header style={{
        height: 52,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 30,
        background: 'rgba(253,253,252,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Left: Sidebar Toggle Button & Workspace Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={onToggleSidebar}
            className="pressable"
            style={{
              padding: 6,
              borderRadius: 7,
              background: 'none',
              border: 'none',
              color: 'rgba(26,26,24,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isSidebarOpen ? 'Hide Left Sidebar (⌘B)' : 'Show Left Sidebar (⌘B)'}
          >
            <PanelLeft size={18} />
          </button>
          
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1a1a18',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              Customer Segmentation Workspace
            </div>
            <div style={{
              fontSize: 11,
              color: 'rgba(26,26,24,0.38)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontFamily: 'var(--font-mono)',
            }}>
              bank_sqlite.db
            </div>
          </div>
        </div>

        {/* Right: Agent Live Bar & Context Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
              padding: 6,
              borderRadius: 7,
              background: 'none',
              border: 'none',
              color: 'rgba(26,26,24,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Toggle Context Panel"
          >
            <PanelRight size={17} />
          </button>
        </div>
      </header>

      {/* Chat */}
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        activeAgent={activeAgent}
        liveStatusText={liveStatusText}
        onSendMessage={onSendMessage}
        onSelectSegment={onSelectSegment}
        onRespondHitl={onRespondHitl}
      />
    </main>
  );
};
