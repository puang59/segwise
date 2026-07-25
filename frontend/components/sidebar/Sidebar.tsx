'use client';

import React, { useState } from 'react';
import { Plus, MessageSquare, CheckCircle2, X, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSwitcher } from '@/components/model-switcher/ModelSwitcher';

interface SidebarProps {
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
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
  accent:    '#4f46e5',
  accentDim: 'rgba(79,70,229,0.07)',
  success:   '#16a34a',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentSessionId = 'session-default',
  onSelectSession,
  onNewSession,
  isMobileOpen = false,
  onCloseMobile,
  selectedAdvaitModel = 'google/gemini-3.1-flash-lite',
  selectedMyraModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct',
  onSelectAdvaitModel = () => {},
  onSelectMyraModel = () => {},
  apiKey = '',
  onApiKeyChange = () => {},
}) => {
  const [sessions] = useState([
    { id: 'session-default', title: 'HNW Wealth Retention & Product Recommendations', date: 'Just now' },
    { id: 'session-2', title: 'Young Professional Credit Card Propensity', date: '2h ago' },
    { id: 'session-3', title: 'Mortgage Churn Risk Analysis', date: 'Yesterday' },
  ]);

  const sidebarStyle: React.CSSProperties = {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: S.surface,
    borderRight: `1px solid ${S.border}`,
    position: 'relative',
    zIndex: 50,
    userSelect: 'none',
  };

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
              display: 'none', // hidden on desktop
            }}
            className="lg:block"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside style={sidebarStyle}>
        {/* Brand Header */}
        <div style={{
          height: 52,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${S.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: S.accentDim,
              border: `1px solid ${S.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Brain size={13} color={S.accent} />
            </div>
            <div>
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
                <span style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: S.accentDim,
                  color: S.accent,
                  border: `1px solid rgba(79,70,229,0.2)`,
                  fontFamily: 'var(--font-mono)',
                }}>v2</span>
              </div>
              <div style={{ fontSize: 11, color: S.textTer }}>Banking Analytics</div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden pressable"
            style={{ padding: 4, borderRadius: 6, color: S.textSec, background: 'none', border: 'none' }}
          >
            <X size={15} />
          </button>
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

        {/* Model Switcher */}
        <div style={{ padding: '0 12px 8px' }}>
          <ModelSwitcher
            selectedAdvaitModel={selectedAdvaitModel}
            selectedMyraModel={selectedMyraModel}
            onSelectAdvaitModel={onSelectAdvaitModel}
            onSelectMyraModel={onSelectMyraModel}
            apiKey={apiKey}
            onApiKeyChange={onApiKeyChange}
          />
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
                <button
                  key={session.id}
                  onClick={() => onSelectSession?.(session.id)}
                  className="pressable"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: isActive ? `1px solid rgba(79,70,229,0.2)` : '1px solid transparent',
                    background: isActive ? S.accentDim : 'transparent',
                    color: isActive ? S.textPri : S.textSec,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <MessageSquare
                    size={13}
                    style={{ marginTop: 1, flexShrink: 0, color: isActive ? S.accent : S.textTer }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: isActive ? 500 : 400,
                      lineHeight: 1.4,
                    }}>
                      {session.title}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: S.textTer,
                      fontFamily: 'var(--font-mono)',
                      marginTop: 1,
                    }}>
                      {session.date}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${S.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}>
          <CheckCircle2 size={12} color={S.success} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: S.textTer }}>
            FastAPI · :8000
          </span>
        </div>
      </aside>
    </>
  );
};
