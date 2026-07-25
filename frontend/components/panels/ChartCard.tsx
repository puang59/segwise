'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChartSpec, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChartCardProps {
  chartSpec: ChartSpec;
}

export const ChartCard: React.FC<ChartCardProps> = ({ chartSpec }) => {
  if (!chartSpec || !chartSpec.data || !Array.isArray(chartSpec.data)) return null;

  const meta = AGENT_REGISTRY[chartSpec.produced_by] || AGENT_REGISTRY['kabir'];
  const defaultColors = ['#6366f1', '#0ea5e9', '#a78bfa', '#f97316', '#22c55e', '#f59e0b', '#ec4899'];

  const categoryKey =
    chartSpec.categoryKey ||
    (chartSpec as any).x_key ||
    (chartSpec as any).y_key ||
    'name';

  const rawDataKeys =
    chartSpec.dataKeys && chartSpec.dataKeys.length > 0
      ? chartSpec.dataKeys
      : (chartSpec as any).bars?.map((b: any) => b.key) ||
        Object.keys(chartSpec.data[0] || {}).filter((k) => k !== categoryKey && typeof chartSpec.data[0][k] === 'number');

  const finalDataKeys: string[] = rawDataKeys && rawDataKeys.length > 0 ? rawDataKeys : ['value', 'count', 'importance'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      className="w-full p-4 rounded-xl border border-border bg-surface shadow-sm my-3"
    >
      {/* Header with producing agent attribution */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-border text-xs">
        <span className="font-semibold text-text-primary">{chartSpec.title || 'Agent Chart'}</span>
        <AgentAvatar agent={chartSpec.produced_by || 'kabir'} />
      </div>

      {/* Recharts chart area with isAnimationActive={false} */}
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          {chartSpec.type === 'pie' ? (
            <PieChart>
              <Pie
                data={chartSpec.data}
                dataKey={finalDataKeys[0] || 'value'}
                nameKey={categoryKey}
                cx="50%"
                cy="50%"
                outerRadius={65}
                isAnimationActive={false}
              >
                {chartSpec.data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={defaultColors[index % defaultColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          ) : (
            <BarChart data={chartSpec.data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis
                dataKey={categoryKey}
                stroke="var(--text-tertiary)"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                fontSize={10}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              {finalDataKeys.map((key: string, idx: number) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={defaultColors[idx % defaultColors.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
