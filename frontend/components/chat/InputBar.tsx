'use client';

import React, { useState } from 'react';
import { AgentName } from '@/lib/types';
import { LiveAgentStatus } from './LiveAgentStatus';
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { showToast } from '@/components/shared/ToastProvider';
import { ModelSwitcher } from '@/components/model-switcher/ModelSwitcher';
import { enhancePrompt } from '@/lib/api';

interface InputBarProps {
  activeAgent?: AgentName;
  isStreaming?: boolean;
  liveStatusText?: string;
  onSendMessage: (text: string) => void;
  presetText?: string;
  selectedAdvaitModel?: string;
  selectedMyraModel?: string;
  onSelectAdvaitModel?: (model: string) => void;
  onSelectMyraModel?: (model: string) => void;
  apiKey?: string;
  onApiKeyChange?: (key: string) => void;
}

export const InputBar: React.FC<InputBarProps> = ({
  activeAgent = 'atlas',
  isStreaming = false,
  liveStatusText = '',
  onSendMessage,
  presetText = '',
  selectedAdvaitModel,
  selectedMyraModel,
  onSelectAdvaitModel,
  onSelectMyraModel,
  apiKey,
  onApiKeyChange,
}) => {
  const [text, setText] = useState(presetText);
  const [focused, setFocused] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  React.useEffect(() => {
    if (presetText) setText(presetText);
  }, [presetText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleEnhancePrompt = async () => {
    if (!text.trim()) {
      showToast.info('Enhance Prompt', 'Please type a prompt first to enhance it.');
      return;
    }
    
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(text, selectedAdvaitModel, apiKey);
      if (enhanced && enhanced !== text) {
        setText(enhanced);
        showToast.success('Prompt Enhanced', 'Your prompt was rewritten for clarity');
      } else {
        showToast.info('No changes needed', 'Your prompt looks good!');
      }
    } catch (err) {
      showToast.error('Enhance Failed', 'Could not reach the enhance service');
    } finally {
      setIsEnhancing(false);
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Live Agent Status Line (Cyan text + Avatar) directly above input container */}
      <LiveAgentStatus
        activeAgent={activeAgent}
        isStreaming={isStreaming}
        statusText={liveStatusText}
      />

      {/* Main Input Box Container */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 22,
          background: '#ffffff',
          border: focused
            ? '1.5px solid rgba(14,165,233,0.5)'
            : '1.5px solid rgba(0,0,0,0.12)',
          boxShadow: focused
            ? '0 0 0 4px rgba(14,165,233,0.08), 0 4px 16px rgba(0,0,0,0.06)'
            : '0 2px 10px rgba(0,0,0,0.04)',
          padding: '16px 16px 12px 18px',
          transition: 'all 180ms cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {/* Input Textarea / Field */}
        <input
          type="text"
          disabled={isStreaming}
          placeholder="Ask me anything..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 14.5,
            color: '#1a1a18',
            caretColor: '#0ea5e9',
            padding: '2px 0 16px 0',
            opacity: isStreaming ? 0.6 : 1,
            cursor: isStreaming ? 'not-allowed' : 'text',
          }}
        />

        {/* Bottom Toolbar inside Input Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 4,
        }}>
          {/* Bottom Left: Model Switcher and Enhance Pill Button */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ModelSwitcher
              selectedAdvaitModel={selectedAdvaitModel || 'google/gemini-3.1-flash-lite'}
              selectedMyraModel={selectedMyraModel || 'meta-llama/Meta-Llama-3.1-70B-Instruct'}
              onSelectAdvaitModel={onSelectAdvaitModel || (() => {})}
              onSelectMyraModel={onSelectMyraModel || (() => {})}
              apiKey={apiKey || ''}
              onApiKeyChange={onApiKeyChange || (() => {})}
            />

            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={isStreaming || isEnhancing || !hasText}
              className="pressable"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid rgba(0,0,0,0.14)',
                background: '#ffffff',
                color: '#333331',
                fontSize: 12,
                fontWeight: 500,
                cursor: (isStreaming || isEnhancing || !hasText) ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                marginLeft: 12,
                opacity: (!hasText || isStreaming) ? 0.5 : 1,
              }}
            >
              {isEnhancing ? (
                <Loader2 size={13} color="#444" className="animate-spin" />
              ) : (
                <Sparkles size={13} color="#444" />
              )}
              <span>{isEnhancing ? 'Enhancing...' : 'Enhance'}</span>
            </button>
          </div>

          {/* Bottom Right: Send Pill Button */}
          <button
            type="submit"
            disabled={!hasText || isStreaming}
            className="pressable"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 16px',
              borderRadius: 20,
              border: 'none',
              cursor: hasText && !isStreaming ? 'pointer' : 'not-allowed',
              background: hasText && !isStreaming ? '#1a1a18' : 'rgba(26,26,24,0.12)',
              color: hasText && !isStreaming ? '#ffffff' : 'rgba(26,26,24,0.4)',
              fontSize: 12.5,
              fontWeight: 500,
              transition: 'all 150ms cubic-bezier(0.23,1,0.32,1)',
              opacity: isStreaming ? 0.5 : 1,
            }}
          >
            {isStreaming ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ArrowUp size={13} />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
