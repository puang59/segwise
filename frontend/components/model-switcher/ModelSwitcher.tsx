'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelInfo } from '@/lib/types';
import { fetchModels, selectModel } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';
import { ChevronDown, Check, Key, Cpu } from 'lucide-react';

interface ModelSwitcherProps {
  selectedAdvaitModel: string;
  selectedMyraModel: string;
  onSelectAdvaitModel: (modelId: string) => void;
  onSelectMyraModel: (modelId: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  selectedAdvaitModel,
  selectedMyraModel,
  onSelectAdvaitModel,
  onSelectMyraModel,
  apiKey,
  onApiKeyChange,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [activeTab, setActiveTab] = useState<'loom' | 'atlas'>('loom');
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    fetchModels().then((data) => {
      if (data && data.length > 0) {
        setModels(data);
      }
    });
  }, []);

  const handleSelect = (modelId: string) => {
    if (activeTab === 'atlas') {
      onSelectAdvaitModel(modelId);
      selectModel(modelId, 'atlas');
    } else {
      onSelectMyraModel(modelId);
      selectModel(modelId, 'loom');
    }
    setIsOpen(false);
    const selectedModelName = models.find((m) => m.id === modelId)?.name || modelId;
    showToast.info('Model updated', `Active ${activeTab === 'atlas' ? 'Atlas' : 'Loom'} model set to ${selectedModelName}`);
  };

  const handleSaveApiKey = () => {
    onApiKeyChange(tempApiKey);
    setIsEditingKey(false);
    showToast.success('API Key updated', tempApiKey ? 'Custom DeepInfra API key active' : 'Using default server API key');
  };

  const activeAdvaitObj = models.find((m) => m.id === selectedAdvaitModel);
  const activeMyraObj = models.find((m) => m.id === selectedMyraModel);

  return (
    <div ref={modalRef} style={{ position: 'relative', margin: '0' }}>

      {/* Main Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
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
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{activeMyraObj?.name || 'Llama 3.1 70B'}</span>
        <ChevronDown size={13} color="rgba(26,26,24,0.5)" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              width: 240,
              zIndex: 50,
              marginBottom: 8,
              padding: 8,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#ffffff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Tabs to select Atlas vs Loom using DiceBear avatars */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 8 }}>
              <button
                onClick={() => setActiveTab('loom')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'loom' ? '2px solid #be185d' : '2px solid transparent',
                  color: activeTab === 'loom' ? '#be185d' : 'rgba(26,26,24,0.4)',
                  cursor: 'pointer',
                }}
              >
                <AgentAvatar agent="loom" size={14} showName={false} />
                Loom
              </button>
              <button
                onClick={() => setActiveTab('atlas')}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'atlas' ? '2px solid #4338ca' : '2px solid transparent',
                  color: activeTab === 'atlas' ? '#4338ca' : 'rgba(26,26,24,0.4)',
                  cursor: 'pointer',
                }}
              >
                <AgentAvatar agent="atlas" size={14} showName={false} />
                Atlas
              </button>
            </div>

            {/* Models List */}
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[...models].sort((a, b) => {
                const aSelected = activeTab === 'atlas' ? selectedAdvaitModel === a.id : selectedMyraModel === a.id;
                const bSelected = activeTab === 'atlas' ? selectedAdvaitModel === b.id : selectedMyraModel === b.id;
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return 0;
              }).map((model) => {
                const isSelected =
                  activeTab === 'atlas'
                    ? selectedAdvaitModel === model.id
                    : selectedMyraModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: isSelected ? 'rgba(79,70,229,0.07)' : 'transparent',
                      color: isSelected ? '#1a1a18' : 'rgba(26,26,24,0.6)',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model.name}</span>
                      <span style={{ fontSize: 9.5, color: 'rgba(26,26,24,0.35)' }}>{model.provider}</span>
                    </div>
                    {isSelected && <Check size={13} color="#4f46e5" />}
                  </button>
                );
              })}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
