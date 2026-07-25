'use client';

import React from 'react';
import { Menu, PanelRight } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { ChatMessage, AgentName, SegmentSummary } from '@/lib/types';

interface MainWorkspaceProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  activeAgent?: AgentName;
  selectedMyraModel?: string;
  onToggleSidebar?: () => void;
  onToggleContextPanel?: () => void;
  onOpenModelSwitcher?: () => void;
  onSendMessage: (query: string) => void;
  onSelectSegment?: (segment: SegmentSummary) => void;
  onRespondHitl?: (response: string) => void;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  messages,
  isStreaming = false,
  activeAgent = 'advait',
  selectedMyraModel = 'Gemini 3.1 Pro',
  onToggleSidebar,
  onToggleContextPanel,
  onOpenModelSwitcher,
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
      {/* Header — clean & minimal without model names or agent flow clutter */}
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
        {/* Left: Workspace Title & DB Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={onToggleSidebar}
            className="lg:hidden pressable"
            style={{
              padding: 6,
              borderRadius: 7,
              background: 'none',
              border: 'none',
              color: 'rgba(26,26,24,0.5)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <Menu size={17} />
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

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
        onSendMessage={onSendMessage}
        onSelectSegment={onSelectSegment}
        onRespondHitl={onRespondHitl}
      />
    </main>
  );
};
