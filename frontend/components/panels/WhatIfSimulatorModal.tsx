import React, { useState, useEffect } from 'react';
import { X, Activity, TrendingUp, RefreshCcw, Save } from 'lucide-react';
import { CustomerRecord } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatIfSimulatorModalProps {
  customer: CustomerRecord;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({ customer, isOpen, onClose }) => {
  // Extract initial values from the customer record
  const initialEngagement = customer.engagement_score || 0.5;
  const initialRecency = customer.recency_score || 0.5;
  const initialTrend = customer.balance_trend || 0.0;
  const initialRisk = customer.churn_risk_score || 0.0;

  // Simulator State
  const [engagement, setEngagement] = useState(initialEngagement);
  const [recency, setRecency] = useState(initialRecency);
  const [trend, setTrend] = useState(initialTrend);
  const [simulatedRisk, setSimulatedRisk] = useState(initialRisk);

  // Re-calculate risk dynamically based on sliders
  useEffect(() => {
    const trendTerm = Math.max(0, Math.min(1, (trend + 0.2) / 0.4));
    let risk = (1.0 - recency) * 0.4 + (1.0 - engagement) * 0.4 + (1.0 - trendTerm) * 0.2;
    risk = Math.max(0, Math.min(1, risk));
    setSimulatedRisk(risk);
  }, [engagement, recency, trend]);

  // Reset to original state when customer changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setEngagement(initialEngagement);
      setRecency(initialRecency);
      setTrend(initialTrend);
      setSimulatedRisk(initialRisk);
    }
  }, [isOpen, customer, initialEngagement, initialRecency, initialTrend, initialRisk]);

  if (!isOpen) return null;

  const isHighRisk = simulatedRisk >= 0.25;
  const originalIsHighRisk = initialRisk >= 0.25;
  
  // Calculate delta percentage for visual flair
  const delta = ((simulatedRisk - initialRisk) * 100).toFixed(1);
  const isImproved = simulatedRisk < initialRisk;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-text-primary m-0">What-If Churn Simulator</h2>
                <p className="text-[11px] text-text-tertiary m-0 font-mono mt-0.5">
                  Customer ID: {customer.customer_id}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-3 text-text-tertiary transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-6">
            
            {/* Real-time Risk Gauge Header */}
            <div className="flex flex-col items-center justify-center bg-surface-2 p-5 rounded-xl border border-border relative overflow-hidden">
              <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Simulated Churn Risk</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold font-mono tracking-tight text-text-primary">
                  {(simulatedRisk * 100).toFixed(1)}%
                </span>
                {Math.abs(parseFloat(delta)) > 0 && (
                  <span className={`text-sm font-semibold flex items-center gap-1 ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUp size={14} className={isImproved ? 'rotate-180' : ''} />
                    {Math.abs(parseFloat(delta))}%
                  </span>
                )}
              </div>
              
              <div className="mt-3 w-full flex items-center gap-3">
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${isHighRisk ? 'bg-red-500' : 'bg-green-500'}`}
                    animate={{ width: `${simulatedRisk * 100}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${originalIsHighRisk ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="text-[11px] text-text-secondary font-medium">Original: {(initialRisk * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_8px_currentColor]`} />
                  <span className="text-[11px] text-text-primary font-bold">Simulated Status: {isHighRisk ? 'HIGH RISK' : 'SAFE'}</span>
                </div>
              </div>
            </div>

            {/* Interactive Sliders */}
            <div className="flex flex-col gap-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary m-0">Intervention Strategies</h3>
              
              <SliderControl 
                label="Digital Engagement Score" 
                value={engagement} 
                min={0} max={1} step={0.01} 
                onChange={setEngagement} 
                description="Simulate the impact of pushing mobile app usage or marketing interactions."
              />
              
              <SliderControl 
                label="Recency Score" 
                value={recency} 
                min={0} max={1} step={0.01} 
                onChange={setRecency} 
                description="Simulate running a reactivation campaign to trigger a recent transaction."
              />
              
              <SliderControl 
                label="Balance Trend" 
                value={trend} 
                min={-1} max={1} step={0.05} 
                onChange={setTrend} 
                description="Simulate offering high-yield incentives to stop balance outflow."
              />
            </div>

          </div>
          
          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-border bg-surface flex justify-between items-center">
            <button 
              onClick={() => {
                setEngagement(initialEngagement);
                setRecency(initialRecency);
                setTrend(initialTrend);
              }}
              className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:bg-surface-2 flex items-center gap-2 transition-colors border border-transparent hover:border-border"
            >
              <RefreshCcw size={13} /> Reset
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <Save size={14} /> Apply Strategy
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Simple reusable slider component tailored for the simulator
const SliderControl = ({ 
  label, value, min, max, step, onChange, description 
}: { 
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; description: string;
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-end">
        <label className="text-[12px] font-semibold text-text-primary">{label}</label>
        <span className="text-[11px] font-mono text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded border border-border">
          {value.toFixed(2)}
        </span>
      </div>
      <p className="text-[10px] text-text-tertiary m-0 mb-1">{description}</p>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>
  );
};
