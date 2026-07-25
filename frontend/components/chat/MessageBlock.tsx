'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, SegmentSummary, AgentName } from '@/lib/types';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';
import { TraceStream } from '@/components/agent-trace/TraceStream';
import { SegmentTable } from './SegmentTable';
import { HitlCard } from './HitlCard';
import { FollowUpChips } from './FollowUpChips';

interface MessageBlockProps {
  message: ChatMessage;
  onSelectSegment?: (segment: SegmentSummary) => void;
  onRespondHitl?: (response: string) => void;
  onSelectSuggestion?: (chipText: string) => void;
}

function formatMarkdownTables(content: string): string {
  if (!content) return '';
  // 1. Convert compressed table rows '||' or '| |' or '|  |' into newlines '\n|'
  let formatted = content.replace(/\|\s*\|\s*/g, '|\n|');
  // 2. Ensure table headers starting after text get a preceding newline
  formatted = formatted.replace(/([^\n])\s*(\|(?:(?:\s*:?-+:?\s*)\|)+)/g, '$1\n$2');
  return formatted;
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', margin: '10px 0' }}
      >
        <div style={{
          fontSize: 11,
          color: 'rgba(26,26,24,0.35)',
          marginBottom: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <span style={{ fontWeight: 500 }}>You</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{message.timestamp}</span>
        </div>
        <div style={{
          maxWidth: '75%',
          padding: '9px 14px',
          borderRadius: '14px 14px 3px 14px',
          background: '#f0f0ef',
          fontSize: 13.5,
          color: '#1a1a18',
          lineHeight: 1.55,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}>
          {message.content}
        </div>
      </motion.div>
    );
  }

  // Parse clean agent name (default to 'myra')
  const agentName: AgentName = message.sender === 'advait' ? 'advait' : 'myra';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      style={{ margin: '16px 0' }}
    >
      {/* Clean Agent Header — DiceBear avatar + Agent Name (no model names) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        padding: '0 2px',
      }}>
        <AgentAvatar agent={agentName} size={22} showName={true} />
        <span style={{ fontSize: 11, color: 'rgba(26,26,24,0.35)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
          {message.timestamp}
        </span>
      </div>

      {/* Content card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)',
      }}>
        {/* Trace */}
        {message.traceItems && message.traceItems.length > 0 && (
          <TraceStream
            traceItems={message.traceItems}
            isComplete={!message.isStreaming}
          />
        )}

        {/* HITL */}
        {message.clarification && (
          <HitlCard
            question={message.clarification.question}
            options={message.clarification.options}
            askingAgent={message.clarification.asking_agent}
            onRespond={(ans) => onRespondHitl?.(ans)}
          />
        )}

        {/* Streaming waiting state */}
        {message.isStreaming && !message.content && !message.traceItems?.length && (
          <div style={{ display: 'flex', gap: 6, padding: '6px 0', alignItems: 'center' }}>
            <span
              className="dot-bounce"
              style={{ color: '#4f46e5' }}
            >
              <span /><span /><span />
            </span>
            <span style={{ fontSize: 12, color: 'rgba(26,26,24,0.4)' }}>Thinking…</span>
          </div>
        )}

        {/* Markdown content */}
        {message.content && (
          <div className={`prose-chat${message.isStreaming ? ' streaming-cursor' : ''}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="w-full my-3.5 overflow-x-auto rounded-xl border border-border/80 bg-surface shadow-xs">
                    <table className="w-full text-left text-xs border-collapse divide-y divide-border/60">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-surface-2 border-b border-border text-text-tertiary uppercase text-[10px] font-semibold tracking-wider">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-3.5 py-2.5 font-medium border-b border-border/60 text-text-primary whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3.5 py-2.5 border-b border-border/40 text-text-secondary font-mono text-[11.5px] leading-relaxed">
                    {children}
                  </td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-surface-2/60 transition-colors">{children}</tr>
                ),
              }}
            >
              {formatMarkdownTables(message.content)}
            </ReactMarkdown>
          </div>
        )}


        {/* Segment Table */}
        {message.segmentData && message.segmentData.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <SegmentTable segments={message.segmentData} onSelectSegment={onSelectSegment} />
          </div>
        )}

        {/* Follow-up chips */}
        {message.suggestions && message.suggestions.length > 0 && (
          <FollowUpChips
            chips={message.suggestions}
            onSelectChip={(chip) => onSelectSuggestion?.(chip)}
          />
        )}
      </div>
    </motion.div>
  );
};
