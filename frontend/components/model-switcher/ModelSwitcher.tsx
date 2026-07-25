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
  const [activeTab, setActiveTab] = useState<'myra' | 'advait'>('myra');

  useEffect(() => {
    fetchModels().then((data) => {
      if (data && data.length > 0) {
        setModels(data);
      }
    });
  }, []);

  const handleSelect = (modelId: string) => {
    if (activeTab === 'advait') {
      onSelectAdvaitModel(modelId);
      selectModel(modelId, 'advait');
    } else {
      onSelectMyraModel(modelId);
      selectModel(modelId, 'myra');
    }
    setIsOpen(false);
    const selectedModelName = models.find((m) => m.id === modelId)?.name || modelId;
    showToast.info('Model updated', `Active ${activeTab === 'advait' ? 'Advait' : 'Myra'} model set to ${selectedModelName}`);
  };

  const handleSaveApiKey = () => {
    onApiKeyChange(tempApiKey);
    setIsEditingKey(false);
    showToast.success('API Key updated', tempApiKey ? 'Custom DeepInfra API key active' : 'Using default server API key');
  };

  const activeAdvaitObj = models.find((m) => m.id === selectedAdvaitModel);
  const activeMyraObj = models.find((m) => m.id === selectedMyraModel);

  return (
    <div style={{ position: 'relative', margin: '8px 0' }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(26,26,24,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, padding: '0 4px' }}>
        Model Engine
      </div>

      {/* Main Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="pressable"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.07)',
          background: '#ffffff',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <Cpu size={14} color="#4f46e5" style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeMyraObj?.name || 'Gemini 3.1 Pro'}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Advait: {activeAdvaitObj?.name || 'Flash Lite'}
            </span>
          </div>
        </div>

        <ChevronDown size={13} color="rgba(26,26,24,0.4)" style={{ flexShrink: 0 }} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 50,
              marginTop: 4,
              padding: 8,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.08)',
              background: '#ffffff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Tabs to select Advait vs Myra using DiceBear avatars */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 8 }}>
              <button
                onClick={() => setActiveTab('myra')}
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
                  borderBottom: activeTab === 'myra' ? '2px solid #be185d' : '2px solid transparent',
                  color: activeTab === 'myra' ? '#be185d' : 'rgba(26,26,24,0.4)',
                  cursor: 'pointer',
                }}
              >
                <AgentAvatar agent="myra" size={14} showName={false} />
                Myra
              </button>
              <button
                onClick={() => setActiveTab('advait')}
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
                  borderBottom: activeTab === 'advait' ? '2px solid #4338ca' : '2px solid transparent',
                  color: activeTab === 'advait' ? '#4338ca' : 'rgba(26,26,24,0.4)',
                  cursor: 'pointer',
                }}
              >
                <AgentAvatar agent="advait" size={14} showName={false} />
                Advait
              </button>
            </div>

            {/* Models List */}
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {models.map((model) => {
                const isSelected =
                  activeTab === 'advait'
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

            {/* API Key */}
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(26,26,24,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Key size={10} color="#d97706" /> API Key
                </span>
                <button
                  onClick={() => setIsEditingKey((prev) => !prev)}
                  style={{ fontSize: 10, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {isEditingKey ? 'Cancel' : apiKey ? 'Edit' : 'Custom'}
                </button>
              </div>

              {isEditingKey ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="password"
                    placeholder="sk-deepinfra-..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      borderRadius: 4,
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: 10,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSaveApiKey}
                    style={{
                      padding: '4px 8px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      borderRadius: 4,
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'rgba(26,26,24,0.35)', fontFamily: 'var(--font-mono)' }}>
                  {apiKey ? `••••••••${apiKey.slice(-4)}` : 'Default Server Key'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
