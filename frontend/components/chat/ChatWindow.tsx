'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage, AgentName, SegmentSummary } from '@/lib/types';
import { MessageBlock } from './MessageBlock';
import { InputBar } from './InputBar';
import { Sparkles, Layers, ShieldCheck, Zap } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  activeAgent?: AgentName;
  onSendMessage: (query: string) => void;
  onSelectSegment?: (segment: SegmentSummary) => void;
  onRespondHitl?: (response: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming = false,
  activeAgent = 'advait',
  onSendMessage,
  onSelectSegment,
  onRespondHitl,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [presetInput, setPresetInput] = React.useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSelectPreset = (query: string) => {
    onSendMessage(query);
  };

  const handleSelectSuggestion = (chipText: string) => {
    onSendMessage(chipText);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg relative">
      {/* Scrollable Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
        {messages.length === 0 ? (
          /* Welcome Banner & Presets */
          <div className="max-w-2xl mx-auto my-auto py-12 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>

            <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">
              Segwise Banking Copilot
            </h2>
            <p className="text-sm text-text-secondary max-w-md mb-8 leading-relaxed">
              Multi-agent analytical engine for automated customer segmentation, feature engineering, and personalized recommendations.
            </p>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <button
                onClick={() =>
                  handleSelectPreset(
                    'Segment retail customers into priority, regular, and dormant tiers based on balance and transaction frequency.'
                  )
                }
                className="p-4 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors pressable group"
              >
                <div className="flex items-center gap-2 font-medium text-xs text-text-primary mb-1">
                  <Layers className="w-4 h-4 text-[#f97316]" />
                  <span>Rule-Based & K-Means Segmentation</span>
                </div>
                <p className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                  Segment 800k+ accounts into Priority, Regular, and Dormant groups.
                </p>
              </button>

              <button
                onClick={() =>
                  handleSelectPreset(
                    'Analyze churn risk across customer segments and highlight key warning indicators.'
                  )
                }
                className="p-4 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors pressable group"
              >
                <div className="flex items-center gap-2 font-medium text-xs text-text-primary mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                  <span>Churn Risk Breakdown</span>
                </div>
                <p className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                  Identify dormant account transitions and risk signals using Aadhya.
                </p>
              </button>

              <button
                onClick={() =>
                  handleSelectPreset(
                    'Which regular customers can be transitioned into priority tier accounts?'
                  )
                }
                className="p-4 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors pressable group"
              >
                <div className="flex items-center gap-2 font-medium text-xs text-text-primary mb-1">
                  <Zap className="w-4 h-4 text-[#f59e0b]" />
                  <span>Product Recommendations</span>
                </div>
                <p className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                  Get Saanvi recommendation strategies for high-potential candidates.
                </p>
              </button>

              <button
                onClick={() =>
                  handleSelectPreset(
                    'Explain SHAP feature importance for priority digital banking customers.'
                  )
                }
                className="p-4 rounded-xl border border-border bg-surface hover:bg-surface-2 transition-colors pressable group"
              >
                <div className="flex items-center gap-2 font-medium text-xs text-text-primary mb-1">
                  <Sparkles className="w-4 h-4 text-[#a78bfa]" />
                  <span>Kabir Feature Radar</span>
                </div>
                <p className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
                  View Kabir feature importance distribution and radar visualization.
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Render Active Session Messages */
          messages.map((msg) => (
            <MessageBlock
              key={msg.id}
              message={msg}
              onSelectSegment={onSelectSegment}
              onRespondHitl={onRespondHitl}
              onSelectSuggestion={handleSelectSuggestion}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar Fixed Bottom Container */}
      <div className="p-4 md:px-8 border-t border-border bg-bg/80 backdrop-blur-md">
        <InputBar
          activeAgent={activeAgent}
          isStreaming={isStreaming}
          onSendMessage={onSendMessage}
          presetText={presetInput}
        />
      </div>
    </div>
  );
};
