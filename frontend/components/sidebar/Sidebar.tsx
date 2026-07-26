'use client';

import React, { useState } from 'react';
import { Plus, MessageSquare, CheckCircle2, X, Sparkles, Brain, PanelLeftClose, PanelLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSwitcher } from '@/components/model-switcher/ModelSwitcher';
import { ChatSession } from '@/lib/types';

interface SidebarProps {
  isOpen?: boolean;
  onToggleSidebar?: () => void;
  sessions?: ChatSession[];
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
  onDeleteSession?: (id: string, e: React.MouseEvent) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  selectedAdvaitModel?: string;
  selectedMyraModel?: string;
  onSelectAdvaitModel?: (modelId: string) => void;
  onSelectMyraModel?: (modelId: string) => void;
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
}

const S = {
  bg:        '#FDFDFC',
  surface:   '#ffffff',
  surface2:  '#f5f5f3',
  surface3:  '#ebebea',
  border:    'rgba(0,0,0,0.07)',
  borderHov: 'rgba(0,0,0,0.14)',
  textPri:   '#1a1a18',
  textSec:   'rgba(26,26,24,0.58)',
  textTer:   'rgba(26,26,24,0.36)',
  accent:    '#1a1a18',
  accentDim: 'rgba(26,26,24,0.05)',
  success:   '#1a1a18',
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onToggleSidebar,
  sessions = [],
  currentSessionId = 'session-default',
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isMobileOpen = false,
  onCloseMobile,
  selectedAdvaitModel = 'google/gemini-3.1-flash-lite',
  selectedMyraModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct',
  onSelectAdvaitModel = () => {},
  onSelectMyraModel = () => {},
  apiKey = '',
  onApiKeyChange = () => {},
}) => {

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
            }}
            className="lg:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? 240 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: S.surface,
          borderRight: isOpen ? `1px solid ${S.border}` : 'none',
          position: 'relative',
          zIndex: 50,
          userSelect: 'none',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Brand Header */}
        <div style={{
          height: 52,
          padding: '0 12px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${S.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img src="/segwise_logo.png" alt="Segwise" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                fontSize: 13,
                color: S.textPri,
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                Segwise
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="pressable"
                title="Collapse Sidebar (⌘B)"
                style={{
                  padding: 5,
                  borderRadius: 6,
                  color: S.textSec,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>
        </div>

        {/* New Session */}
        <div style={{ padding: '10px 12px 6px' }}>
          <button
            onClick={onNewSession}
            className="pressable"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${S.border}`,
              background: S.surface2,
              color: S.textSec,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} color={S.accent} />
            New Session
          </button>
        </div>



        {/* Sessions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
          <div style={{
            padding: '6px 8px',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: S.textTer,
          }}>
            Recent
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sessions.map((session) => {
              const isActive = currentSessionId === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession?.(session.id)}
                  className="group pressable"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: isActive ? `1px solid rgba(26,26,24,0.15)` : '1px solid transparent',
                    background: isActive ? S.accentDim : 'transparent',
                    color: isActive ? S.textPri : S.textSec,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    position: 'relative',
                  }}
                >
                  <MessageSquare
                    size={13}
                    style={{ flexShrink: 0, color: isActive ? S.accent : S.textTer }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 500 : 400,
                      lineHeight: 1.3,
                    }}>
                      {session.title || 'Untitled Session'}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: S.textTer,
                      fontFamily: 'var(--font-mono)',
                      marginTop: 1,
                    }}>
                      {session.updatedAt || 'Just now'}
                    </div>
                  </div>

                  {onDeleteSession && (
                    <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      title="Delete Session"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-3 text-text-tertiary hover:text-red-500"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>


      </motion.aside>
    </>
  );
};
