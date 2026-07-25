'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Cpu, 
  CheckCircle2, 
  X, 
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface SidebarProps {
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSessionId = 'session-default',
  onSelectSession,
  onNewSession,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [sessions] = useState([
    { id: 'session-default', title: 'HNW Wealth Retention & Product Recommendations', date: 'Just now' },
    { id: 'session-2', title: 'Young Professional Credit Card Propensity', date: '2 hours ago' },
    { id: 'session-3', title: 'Mortgage Churn Risk Analysis', date: 'Yesterday' },
  ]);

  const [advaitModel] = useState('Gemini 3.1 Flash Lite');
  const [myraModel] = useState('Gemini 3.1 Pro');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'w-[240px] flex-shrink-0 flex flex-col bg-surface border-r border-border h-screen select-none transition-transform duration-300 ease-out-custom z-50',
          'fixed lg:relative inset-y-0 left-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Branding & Logo Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-semibold text-sm text-text-primary tracking-tight flex items-center gap-1.5">
                Segwise
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  v2.0
                </span>
              </h1>
              <p className="text-[11px] text-text-tertiary">Banking Analytics Copilot</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="w-7 h-7 p-1" />
            {onCloseMobile && (
              <button 
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* New Session Action */}
        <div className="p-3">
          <button
            onClick={onNewSession}
            className="w-full pressable flex items-center justify-center gap-2 py-2 px-3 bg-surface-2 hover:bg-surface-3 text-text-primary border border-border rounded-md text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Analysis Session</span>
          </button>
        </div>

        {/* Model Switcher Status Card */}
        <div className="px-3 py-2">
          <div className="p-2.5 bg-surface-2 rounded-lg border border-border">
            <div className="flex items-center justify-between text-[11px] text-text-tertiary mb-1.5">
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                <Cpu className="w-3 h-3 text-indigo-400" /> Active Models
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between py-0.5 text-text-secondary">
                <span className="text-text-tertiary">Advait (Intent):</span>
                <span className="font-mono text-[10px] text-indigo-400 truncate max-w-[110px]">{advaitModel}</span>
              </div>
              <div className="flex items-center justify-between py-0.5 text-text-secondary">
                <span className="text-text-tertiary">Myra (Synth):</span>
                <span className="font-mono text-[10px] text-pink-400 truncate max-w-[110px]">{myraModel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono text-text-tertiary uppercase tracking-wider">
            Recent Sessions
          </div>
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession?.(session.id)}
              className={cn(
                'w-full text-left p-2 rounded-md transition-all flex items-start gap-2 text-xs group relative',
                currentSessionId === session.id
                  ? 'bg-indigo-500/10 text-text-primary border border-indigo-500/20 font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              )}
            >
              <MessageSquare className={cn(
                'w-3.5 h-3.5 mt-0.5 shrink-0',
                currentSessionId === session.id ? 'text-indigo-400' : 'text-text-tertiary group-hover:text-text-secondary'
              )} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs leading-snug">{session.title}</p>
                <span className="text-[10px] text-text-tertiary font-mono">{session.date}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer Backend Connection Status */}
        <div className="p-3 border-t border-border bg-bg/50 text-[11px] text-text-tertiary flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="font-mono text-[10px] text-text-secondary">FastAPI Online</span>
          </div>
          <span className="font-mono text-[10px] text-text-tertiary">:8000</span>
        </div>
      </aside>
    </>
  );
};
