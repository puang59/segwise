export type AgentName =
  | 'atlas'
  | 'scout'
  | 'mosaic'
  | 'forge'
  | 'prism'
  | 'compass'
  | 'quill'
  | 'loom';

export type AgentStatus = 'queued' | 'running' | 'done' | 'error';

export interface AgentMeta {
  name: AgentName;
  displayName: string;
  role: string;
  color: string;
  icon: string;
  symbol: string;
  description: string;
}

export const AGENT_REGISTRY: Record<AgentName, AgentMeta> = {
  atlas: {
    name: 'atlas',
    displayName: 'Atlas',
    role: 'Intent & Planning',
    color: '#6366f1',
    icon: '◆',
    symbol: '◆',
    description: 'Orchestrates the workflow and determines intent.',
  },
  scout: {
    name: 'scout',
    displayName: 'Scout',
    role: 'Data Scout',
    color: '#0284c7',
    icon: '◉',
    symbol: '◉',
    description: 'Fetches and processes raw customer data.',
  },
  forge: {
    name: 'forge',
    displayName: 'Forge',
    role: 'Feature Engineer',
    color: '#9333ea',
    icon: '⬡',
    symbol: '⬡',
    description: 'Extracts critical data features for analysis.',
  },
  mosaic: {
    name: 'mosaic',
    displayName: 'Mosaic',
    role: 'Segmentation',
    color: '#10b981',
    icon: '◈',
    symbol: '◈',
    description: 'Groups customers into actionable segments.',
  },
  prism: {
    name: 'prism',
    displayName: 'Prism',
    role: 'Explainability',
    color: '#f43f5e',
    icon: '❖',
    symbol: '❖',
    description: 'Provides insights and explains segment logic.',
  },
  compass: {
    name: 'compass',
    displayName: 'Compass',
    role: 'Recommendations',
    color: '#d97706',
    icon: '◎',
    symbol: '◎',
    description: 'Generates personalized strategic recommendations.',
  },
  quill: {
    name: 'quill',
    displayName: 'Quill',
    role: 'PDF Report Generator',
    color: '#059669',
    icon: '◇',
    symbol: '◇',
    description: 'Compiles insights into a formal PDF report.',
  },
  loom: {
    name: 'loom',
    displayName: 'Loom',
    role: 'Synthesizer',
    color: '#be185d',
    icon: '✦',
    symbol: '✦',
    description: 'Synthesizes information into human-readable text.',
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
  chart_type?: string;
  title: string;
  produced_by: AgentName;
  categoryKey?: string;
  dataKeys?: string[];
  x_key?: string;
  y_key?: string;
  bars?: any[];
  data: any[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'loom' | string;
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
  churn_risk_score?: number;
  is_high_risk?: number;
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
