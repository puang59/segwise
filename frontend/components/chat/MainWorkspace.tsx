'use client';

import React, { useState } from 'react';
import { 
  Menu, 
  PanelRight, 
  Send, 
  Sparkles, 
  ArrowUpRight, 
  Bot, 
  Terminal, 
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface MainWorkspaceProps {
  onToggleSidebar?: () => void;
  onToggleContextPanel?: () => void;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  onToggleSidebar,
  onToggleContextPanel,
}) => {
  const [inputQuery, setInputQuery] = useState('');

  const suggestions = [
    'Segment high-balance customers using K-Means clustering',
    'Calculate SHAP feature importance for wealth retention',
    'Generate product cross-sell recommendations for Cluster 0',
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputQuery(suggestion);
  };

  return (
    <main className="flex-1 flex flex-col h-screen min-w-0 bg-bg relative overflow-hidden">
      {/* Top Header Bar */}
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
              <span className="font-mono text-indigo-400">bank_sqlite.db</span>
              <span>•</span>
              <span>7-Agent Handoff Chain</span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <ThemeToggle className="w-8 h-8 p-1.5" />

          {/* Agent Chain Badges Preview */}
          <div className="hidden md:flex items-center gap-1 bg-surface-2 px-2 py-1 rounded-full border border-border text-[10px] font-mono text-text-secondary">
            <span className="text-indigo-400">Advait</span> →
            <span className="text-sky-400">Vihaan</span> →
            <span className="text-violet-400">Kabir</span> →
            <span className="text-orange-400">Ishaan</span> →
            <span className="text-emerald-400">Aadhya</span> →
            <span className="text-amber-400">Saanvi</span> →
            <span className="text-pink-400">Myra</span>
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

      {/* Main Messages & Trace Viewport */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Welcome Banner / Empty State */}
        <div className="max-w-2xl mx-auto py-8 text-center space-y-4 entering">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Segwise Banking Analytics Copilot</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto leading-relaxed">
              Ask natural language queries over 50,000 retail customer profiles in bank_sqlite.db. The 7-agent sequential handoff chain parses intent, engineers features, clusters segments, and ranks recommendations.
            </p>
          </div>

          {/* Preset Suggestion Chips */}
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="pressable text-left px-3 py-2 bg-surface hover:bg-surface-2 text-text-secondary hover:text-text-primary border border-border hover:border-indigo-500/30 rounded-lg text-xs transition-all flex items-center gap-2 group"
              >
                <span>{suggestion}</span>
                <ArrowUpRight className="w-3 h-3 text-text-tertiary group-hover:text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Demo Message Item with Agent Trace Stream Card */}
        <div className="max-w-3xl mx-auto space-y-3 entering">
          <div className="flex items-center gap-2 text-xs font-mono text-text-tertiary">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Agent Chain Execution</span>
            <span className="text-emerald-500">● Live SSE</span>
          </div>

          {/* Trace Box */}
          <div className="p-4 bg-surface rounded-xl border border-border space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs border-b border-border pb-2">
              <span className="font-mono text-indigo-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Advait (Intent Extractor)
              </span>
              <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Intent Verified
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Query analyzed: <code className="text-indigo-400 font-mono bg-surface-2 px-1.5 py-0.5 rounded border border-border">Segment high-balance customers into 4 clusters and rank products</code>. Delegated feature calculation to Kabir & clustering to Ishaan.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Bottom Input Bar Container */}
      <div className="p-4 border-t border-border bg-bg/90 backdrop-blur-md shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="relative bg-surface border border-border focus-within:border-indigo-500/50 rounded-xl p-2 transition-all shadow-lg">
            <textarea
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Segwise to analyze customer segments, run clustering, or compute recommendations..."
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-xs resize-none focus:outline-none px-2 pt-1 h-14"
            />
            
            <div className="flex items-center justify-between pt-2 border-t border-border px-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[10px] font-mono flex items-center gap-1">
                  Advait: Gemini 3.1 Flash Lite
                </span>
                <span className="px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded text-[10px] font-mono flex items-center gap-1">
                  Myra: Gemini 3.1 Pro
                </span>
              </div>

              <button
                disabled={!inputQuery.trim()}
                className={cn(
                  'pressable p-2 rounded-lg transition-all flex items-center justify-center',
                  inputQuery.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    : 'bg-surface-2 text-text-tertiary cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
