'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelInfo } from '@/lib/types';
import { fetchModels, selectModel } from '@/lib/api';
import { showToast } from '@/components/shared/ToastProvider';
import { ChevronDown, Check, Key, Cpu, Sparkles } from 'lucide-react';

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

  const getSpeedBadgeColor = (speed: ModelInfo['speed']) => {
    switch (speed) {
      case 'fastest':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'fast':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'slow':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-surface-3 text-text-secondary border-border';
    }
  };

  const activeAdvaitObj = models.find((m) => m.id === selectedAdvaitModel);
  const activeMyraObj = models.find((m) => m.id === selectedMyraModel);

  return (
    <div className="w-full relative text-xs my-2">
      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5 px-1">
        Model Engine
      </div>

      {/* Main Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors pressable text-left"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Cpu className="w-4 h-4 text-accent shrink-0" />
          <div className="flex flex-col truncate">
            <span className="font-medium text-text-primary text-xs truncate">
              {activeMyraObj?.name || 'Gemini 3.1 Pro'}
            </span>
            <span className="text-[10px] text-text-tertiary truncate">
              Advait: {activeAdvaitObj?.name || 'Flash Lite'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono ${getSpeedBadgeColor(
              activeMyraObj?.speed || 'fast'
            )}`}
          >
            {activeMyraObj?.speed || 'fast'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            style={{ transformOrigin: 'top left' }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-full left-0 right-0 z-50 mt-1 p-2 rounded-xl border border-border bg-surface-2 shadow-2xl backdrop-blur-md"
          >
            {/* Tabs to select Advait (Fast Intent) vs Myra (Synthesis) */}
            <div className="flex border-b border-border mb-2">
              <button
                onClick={() => setActiveTab('myra')}
                className={`flex-1 py-1.5 text-[11px] font-medium text-center transition-colors border-b-2 ${
                  activeTab === 'myra'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-tertiary hover:text-text-primary'
                }`}
              >
                ✦ Myra (Synthesis)
              </button>
              <button
                onClick={() => setActiveTab('advait')}
                className={`flex-1 py-1.5 text-[11px] font-medium text-center transition-colors border-b-2 ${
                  activeTab === 'advait'
                    ? 'border-[#6366f1] text-[#6366f1]'
                    : 'border-transparent text-text-tertiary hover:text-text-primary'
                }`}
              >
                ◆ Advait (Intent)
              </button>
            </div>

            {/* Models List */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {models.map((model) => {
                const isSelected =
                  activeTab === 'advait'
                    ? selectedAdvaitModel === model.id
                    : selectedMyraModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left text-xs ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/30 text-text-primary'
                        : 'hover:bg-surface-3 text-text-secondary'
                    }`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="font-medium truncate">{model.name}</span>
                      <span className="text-[10px] text-text-tertiary">{model.provider}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono ${getSpeedBadgeColor(
                          model.speed
                        )}`}
                      >
                        {model.speed}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Masked API Key Section */}
            <div className="mt-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                  <Key className="w-3 h-3 text-warning" /> API Key
                </span>
                <button
                  onClick={() => setIsEditingKey((prev) => !prev)}
                  className="text-[10px] text-accent hover:underline"
                >
                  {isEditingKey ? 'Cancel' : apiKey ? 'Edit' : 'Add Custom'}
                </button>
              </div>

              {isEditingKey ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="password"
                    placeholder="sk-deepinfra-..."
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="flex-1 px-2 py-1 bg-surface border border-border rounded text-[11px] text-text-primary focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    className="px-2 py-1 bg-accent text-white rounded text-[11px] font-medium pressable"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-text-tertiary font-mono truncate">
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
