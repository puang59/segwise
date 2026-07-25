'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MainWorkspace } from '@/components/chat/MainWorkspace';
import { ContextPanel } from '@/components/panels/ContextPanel';

export default function Home() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('session-default');

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setIsMobileSidebarOpen(false);
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
      />

      {/* Center Column: Main Workspace (flex-1) */}
      <MainWorkspace
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onToggleContextPanel={() => setIsContextPanelOpen((prev) => !prev)}
      />

      {/* Right Column: Context Panel (360px) */}
      <ContextPanel
        isOpen={isContextPanelOpen}
        onClose={() => setIsContextPanelOpen(false)}
      />
    </div>
  );
}
