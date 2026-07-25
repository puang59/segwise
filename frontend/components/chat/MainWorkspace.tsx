'use client';

import React from 'react';
import { Menu, PanelRight } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ModelBadge } from '@/components/model-switcher/ModelBadge';
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
    <main className="flex-1 flex flex-col h-screen min-w-0 bg-bg relative overflow-hidden">
      {/* Top Navigation Header Bar */}
      <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-text-primary truncate flex items-center gap-2">
              <span>Customer Segmentation & Personalization Workspace</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
              <span className="font-mono text-accent">bank_sqlite.db</span>
              <span>•</span>
              <span>7-Agent Handoff Chain</span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Active Model Badge in Header */}
          <ModelBadge
            modelName={selectedMyraModel.split('/').pop() || selectedMyraModel}
            onClick={onOpenModelSwitcher}
          />

          {/* Theme Toggle Button */}
          <ThemeToggle className="w-8 h-8 p-1.5" />

          {/* Agent Chain Badges Preview */}
          <div className="hidden xl:flex items-center gap-1 bg-surface-2 px-2.5 py-1 rounded-full border border-border text-[10px] font-mono text-text-secondary">
            <span className="text-[#6366f1]">Advait</span> →
            <span className="text-[#0ea5e9]">Vihaan</span> →
            <span className="text-[#a78bfa]">Kabir</span> →
            <span className="text-[#f97316]">Ishaan</span> →
            <span className="text-[#22c55e]">Aadhya</span> →
            <span className="text-[#f59e0b]">Saanvi</span> →
            <span className="text-[#ec4899]">Myra</span>
          </div>

          <button
            onClick={onToggleContextPanel}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors relative"
            title="Toggle Context Panel"
          >
            <PanelRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Window Container */}
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
