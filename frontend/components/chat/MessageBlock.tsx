'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, SegmentSummary } from '@/lib/types';
import { TraceStream } from '@/components/agent-trace/TraceStream';
import { SegmentTable } from './SegmentTable';
import { HitlCard } from './HitlCard';
import { FollowUpChips } from './FollowUpChips';
import { User, Sparkles } from 'lucide-react';

interface MessageBlockProps {
  message: ChatMessage;
  onSelectSegment?: (segment: SegmentSummary) => void;
  onRespondHitl?: (response: string) => void;
  onSelectSuggestion?: (chipText: string) => void;
}

export const MessageBlock: React.FC<MessageBlockProps> = ({
  message,
  onSelectSegment,
  onRespondHitl,
  onSelectSuggestion,
}) => {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className="w-full my-4 flex flex-col items-end"
      >
        <div className="flex items-center gap-2 mb-1 text-[11px] text-text-tertiary">
          <span>You</span>
          <span>·</span>
          <span>{message.timestamp}</span>
        </div>
        <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-surface-2 border border-border text-sm text-text-primary shadow-sm font-normal">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      className="w-full my-6 p-5 rounded-2xl border border-border bg-surface shadow-sm"
    >
      {/* Attribution Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ec4899]" />
          <span className="font-semibold text-text-primary">
            {message.attribution || '✦ Myra · Llama 3.1 70B'}
          </span>
        </div>
        <span className="text-text-tertiary font-mono text-[11px]">
          {message.timestamp}
        </span>
      </div>

      {/* Trace Stream (Chain-of-Thought & Reasoning) */}
      {message.traceItems && message.traceItems.length > 0 && (
        <TraceStream
          traceItems={message.traceItems}
          isComplete={!message.isStreaming}
        />
      )}

      {/* Human-In-The-Loop Clarification Card */}
      {message.clarification && (
        <HitlCard
          question={message.clarification.question}
          options={message.clarification.options}
          askingAgent={message.clarification.asking_agent}
          onRespond={(ans) => onRespondHitl?.(ans)}
        />
      )}

      {/* Main Markdown Content Output */}
      {message.content && (
        <div className="prose prose-invert max-w-none text-sm text-text-primary leading-relaxed space-y-2 select-text">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}

      {/* Interactive Segment Data Table */}
      {message.segmentData && message.segmentData.length > 0 && (
        <SegmentTable
          segments={message.segmentData}
          onSelectSegment={onSelectSegment}
        />
      )}

      {/* Follow-up Suggestion Chips */}
      {message.suggestions && message.suggestions.length > 0 && (
        <FollowUpChips
          chips={message.suggestions}
          onSelectChip={(chip) => onSelectSuggestion?.(chip)}
        />
      )}
    </motion.div>
  );
};
