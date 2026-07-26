export type AgentName =
  | 'advait'
  | 'vihaan'
  | 'ishaan'
  | 'kabir'
  | 'saanvi'
  | 'aanav'
  | 'myra';

export type AgentStatus = 'queued' | 'running' | 'done' | 'error';

export interface AgentMeta {
  name: AgentName;
  displayName: string;
  role: string;
  color: string;
  icon: string;
  symbol: string;
}

export const AGENT_REGISTRY: Record<AgentName, AgentMeta> = {
  advait: {
    name: 'advait',
    displayName: 'Advait',
    role: 'Intent Extractor',
    color: '#6366f1',
    icon: '◆',
    symbol: '◆',
  },
  vihaan: {
    name: 'vihaan',
    displayName: 'Vihaan',
    role: 'SQL Scout & Data Cleaner',
    color: '#0284c7',
    icon: '◉',
    symbol: '◉',
  },
  ishaan: {
    name: 'ishaan',
    displayName: 'Ishaan',
    role: 'Segmentation Engineer',
    color: '#7c3aed',
    icon: '◈',
    symbol: '◈',
  },
  kabir: {
    name: 'kabir',
    displayName: 'Kabir',
    role: 'SHAP & XAI Specialist',
    color: '#9333ea',
    icon: '⬡',
    symbol: '⬡',
  },
  saanvi: {
    name: 'saanvi',
    displayName: 'Saanvi',
    role: 'Recommendation Engine',
    color: '#d97706',
    icon: '◎',
    symbol: '◎',
  },
  aanav: {
    name: 'aanav',
    displayName: 'Aanav',
    role: 'PDF Report Generator',
    color: '#059669',
    icon: '◇',
    symbol: '◇',
  },
  myra: {
    name: 'myra',
    displayName: 'Myra',
    role: 'Response Synthesizer',
    color: '#be185d',
    icon: '✦',
    symbol: '✦',
  },
};

export interface AgentTraceItem {
  id: string;
  agent: AgentName;
  role: string;
  status: AgentStatus;
  summary?: string;
  toolName?: string;
  progress?: number;
  duration_ms?: number;
  thinking?: string;
  details?: any;
}

export interface SegmentSummary {
  id?: string;
  name: string;
  percentage: number;
  count?: number;
  customer_count?: number;
  avg_balance: number;
  txn_freq: number;
  status_color?: string;
  persona?: string;
  tagline?: string;
  key_attributes?: { trait: string; score: number }[];
  recommendations?: string[];
  candidate_transitions?: { target: string; potential_count: number; uplift: string }[];
}

export interface ChartSpec {
  id: string;
  type: 'bar' | 'pie' | 'line' | string;
  title: string;
  produced_by: AgentName;
  categoryKey?: string;
  dataKeys?: string[];
  data: any[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'myra' | string;
  content: string;
  timestamp: string;
  attribution?: string;
  traceItems?: AgentTraceItem[];
  segmentData?: SegmentSummary[];
  suggestions?: string[];
  clarification?: {
    question: string;
    options: string[];
    asking_agent?: AgentName | string;
  };
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  chartSpecs: ChartSpec[];
}

export interface CustomerRecord {
  customer_id: string;
  full_name?: string;
  segment: string;
  avg_balance: number;
  txn_freq?: number;
  credit_score?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  speed?: 'fastest' | 'fast' | 'medium' | 'slow';
  contextLength?: string;
}

export type SSEEvent =
  | { type: 'agent_start'; data: { agent: AgentName; role?: string } }
  | { type: 'agent_complete'; data: { agent: AgentName; duration_ms?: number; summary?: string } }
  | { type: 'tool_start'; data: { agent: AgentName; tool: string } }
  | { type: 'tool_complete'; data: { agent: AgentName; tool: string } }
  | { type: 'tool_error'; data: { agent: AgentName; tool: string; error: string } }
  | { type: 'tool_progress'; data: { agent: AgentName; progress?: number; message?: string } }
  | { type: 'intent_detected'; data: { intent?: string; segmentation_method?: string; agent_plan?: string[] } }
  | { type: 'columns_resolved'; data: { row_count?: number; columns?: string[] } }
  | { type: 'clarification'; data: { question: string; options: string[]; asking_agent?: AgentName } }
  | { type: 'text_chunk'; data: { content: string } }
  | { type: 'structured_output'; data: { kind: 'table' | 'chart'; payload: any } }
  | { type: 'suggestions'; data: { chips: string[] } }
  | { type: 'done'; data?: any };
