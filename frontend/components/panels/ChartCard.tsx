import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartSpec, AGENT_REGISTRY } from '@/lib/types';
import { AgentAvatar } from '@/components/agent-trace/AgentAvatar';
import { Maximize2, X } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip as RechartsTooltip,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
} from 'recharts';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
} from '@/components/dither-kit';
import { ChartConfig } from '@/components/dither-kit/chart-context';

interface ChartCardProps {
  chartSpec: ChartSpec;
}

export const ChartCard: React.FC<ChartCardProps> = ({ chartSpec }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!chartSpec || !chartSpec.data || !Array.isArray(chartSpec.data)) return null;

  const meta = AGENT_REGISTRY[chartSpec.produced_by] || AGENT_REGISTRY['forge'];
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
  
  const chartType = chartSpec.type || (chartSpec as any).chart_type;

  const agentColorMap: Record<string, string> = {
    atlas: 'blue',
    scout: 'blue',
    forge: 'purple',
    mosaic: 'green',
    prism: 'red',
    compass: 'orange',
    quill: 'green',
    loom: 'pink',
  };
  const baseColor = agentColorMap[chartSpec.produced_by] || 'grey';
  const allDitherColors = ['purple', 'blue', 'green', 'orange', 'red', 'pink', 'grey'] as const;
  const baseIndex = Math.max(0, allDitherColors.indexOf(baseColor as any));
  const ditherColors = [
    ...allDitherColors.slice(baseIndex),
    ...allDitherColors.slice(0, baseIndex)
  ];

  const ditherConfig: ChartConfig = {};
  if (chartType === 'pie') {
    chartSpec.data.forEach((row, i) => {
      const name = String(row[categoryKey] || 'Unknown');
      ditherConfig[name] = { label: name, color: ditherColors[i % ditherColors.length] };
    });
  } else {
    finalDataKeys.forEach((key, i) => {
      ditherConfig[key] = { label: key, color: ditherColors[i % ditherColors.length] };
    });
  }

  const renderChartContent = (height: string | number, isModal: boolean) => (
    <div style={{ width: '100%', height }}>
        {chartType === 'heatmap' ? (
          <ResponsiveContainer width="100%" height="100%">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `minmax(${isModal ? '120px' : '80px'}, auto) repeat(${finalDataKeys.length}, 1fr)`, 
            gap: '2px', 
            height: '100%', 
            overflow: 'auto', 
            fontSize: isModal ? '12px' : '9px',
            fontFamily: 'var(--font-mono)'
          }}>
            {/* Header Row */}
            <div />
            {finalDataKeys.map(key => (
              <div key={key} style={{ 
                writingMode: 'vertical-rl', 
                transform: 'rotate(180deg)', 
                textAlign: 'left', 
                padding: '4px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                color: 'var(--text-secondary)'
              }} title={key}>
                {key}
              </div>
            ))}
            
            {/* Data Rows */}
            {chartSpec.data.map((row, i) => (
              <React.Fragment key={`row-${i}`}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end', 
                  paddingRight: '6px', 
                  textAlign: 'right', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  color: 'var(--text-secondary)',
                  borderRight: '1px solid var(--border)'
                }} title={row[categoryKey]}>
                  {row[categoryKey]}
                </div>
                {finalDataKeys.map(key => {
                  const val = row[key];
                  const numVal = typeof val === 'number' ? val : 0;
                  
                  // Color mapping: -1 to 1 (blue for positive, red for negative)
                  let bgColor = 'var(--surface-2)';
                  let color = 'var(--text-primary)';
                  
                  if (numVal > 0) {
                    const alpha = Math.min(numVal, 1) * 0.9 + 0.1;
                    bgColor = `rgba(59, 130, 246, ${alpha})`;
                    if (alpha > 0.6) color = 'white';
                  } else if (numVal < 0) {
                    const alpha = Math.min(Math.abs(numVal), 1) * 0.9 + 0.1;
                    bgColor = `rgba(239, 68, 68, ${alpha})`;
                    if (alpha > 0.6) color = 'white';
                  }
                  
                  // For diagonal (correlation = 1)
                  if (row[categoryKey] === key) {
                    bgColor = 'var(--surface-3)';
                    color = 'var(--text-tertiary)';
                  }
                  
                  return (
                    <div key={key} style={{ 
                      backgroundColor: bgColor, 
                      color, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: '2px',
                      cursor: 'default'
                    }} title={`${row[categoryKey]} x ${key}: ${numVal.toFixed(2)}`}>
                      {row[categoryKey] === key ? '-' : numVal.toFixed(2)}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          </ResponsiveContainer>
        ) : chartType === 'pie' ? (
          <PieChart
            data={chartSpec.data}
            config={ditherConfig}
            dataKey={finalDataKeys[0] || 'value'}
            nameKey={categoryKey}
            bloom="aura"
            className="w-full h-full"
          >
            <Pie variant="solid" />
            <Tooltip />
          </PieChart>

        ) : (
          <BarChart data={chartSpec.data} config={ditherConfig} bloom="aura" className="w-full h-full">
            <XAxis 
              dataKey={chartType === 'horizontal_bar' && chartSpec.y_key ? chartSpec.y_key : categoryKey} 
              tickFormatter={(val) => {
                const str = String(val);
                if (isModal || str.length <= 8) return str;
                return str.substring(0, 8) + '..';
              }}
            />
            <YAxis />
            <Tooltip />
            {finalDataKeys.map((key: string) => (
              <Bar
                key={key}
                dataKey={key}
                variant="gradient"
              />
            ))}
          </BarChart>
        )}
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className="w-full p-4 rounded-xl border border-border bg-surface shadow-sm my-3 relative group"
      >
        {/* Header with producing agent attribution */}
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border text-xs">
          <span className="font-semibold text-text-primary pr-2 truncate">{chartSpec.title || 'Agent Chart'}</span>
          <div className="flex items-center gap-2 shrink-0">
            <AgentAvatar agent={chartSpec.produced_by || 'forge'} />
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 rounded-md bg-surface-2 transition-opacity hover:bg-surface-3 border border-border text-text-secondary"
              title="Expand Chart"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recharts chart area */}
        {renderChartContent(192, false)}
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-surface-2">
                <div className="flex items-center gap-3">
                  <AgentAvatar agent={chartSpec.produced_by || 'forge'} />
                  <h3 className="font-semibold text-lg text-text-primary">
                    {chartSpec.title || 'Detailed Chart View'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full hover:bg-surface-3 transition-colors text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[60vh] min-h-[400px] p-4 sm:p-8">
                {renderChartContent('100%', true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
