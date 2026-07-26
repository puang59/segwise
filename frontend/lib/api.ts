import { SSEEvent, ModelInfo, CustomerRecord } from './types';

// Bypass Next.js proxy (/api) because it buffers SSE streams in dev mode
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface StreamChatCallbacks {
  onEvent?: (event: SSEEvent) => void;
  onError?: (err: Error) => void;
  onComplete?: () => void;
}

/**
 * Initiates an SSE streaming chat query to the Segwise FastAPI backend.
 */
export async function streamChatQuery(
  queryText: string,
  sessionId: string,
  advaitModel: string,
  myraModel: string,
  apiKey: string,
  callbacks: StreamChatCallbacks
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: queryText,
        conversation_id: sessionId,
        atlas_model: advaitModel,
        loom_model: myraModel,
        api_key: apiKey || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by browser or response body empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || trimmed.startsWith('event:')) {
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.substring(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.type) {
              callbacks.onEvent?.({
                type: parsed.type,
                data: parsed.data,
              } as SSEEvent);
            }
          } catch (e) {
            console.warn('[SSE Parse Warning] Could not parse SSE line:', jsonStr, e);
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().substring(6).trim();
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && parsed.type) {
            callbacks.onEvent?.({
              type: parsed.type,
              data: parsed.data,
            } as SSEEvent);
          }
        } catch {
          // ignore trailing partial line
        }
      }
    }

    callbacks.onComplete?.();
  } catch (err: any) {
    console.error('[streamChatQuery Error]', err);
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Fetches available LLM models from the backend.
 */
export async function fetchModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();

    const result: ModelInfo[] = [];
    if (data.raw_models) {
      Object.entries(data.raw_models).forEach(([id, meta]: [string, any]) => {
        result.push({
          id,
          name: meta.display || meta.name || id,
          provider: meta.provider || 'AI Provider',
          speed: meta.speed || 'fast',
          contextLength: meta.context_window ? `${Math.round(meta.context_window / 1000)}k` : '128k',
        });
      });
    } else if (Array.isArray(data.providers)) {
      data.providers.forEach((prov: any) => {
        if (Array.isArray(prov.models)) {
          prov.models.forEach((m: any) => {
            result.push({
              id: m.id,
              name: m.display || m.name || m.id,
              provider: prov.provider || 'AI Provider',
              speed: m.speed || 'fast',
              contextLength: m.context_window ? `${Math.round(m.context_window / 1000)}k` : '128k',
            });
          });
        }
      });
    }

    if (result.length > 0) return result;
  } catch (err) {
    console.warn('[fetchModels] Network error, using default model list fallback', err);
  }

  // Fallback defaults if backend is unavailable
  return [
    {
      id: 'google/gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      provider: 'Google',
      speed: 'fastest',
      contextLength: '1000k',
    },
    {
      id: 'google/gemini-3.1-pro',
      name: 'Gemini 3.1 Pro',
      provider: 'Google',
      speed: 'fast',
      contextLength: '2000k',
    },
    {
      id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      name: 'Llama 3.1 70B Instruct',
      provider: 'Meta',
      speed: 'medium',
      contextLength: '128k',
    },
    {
      id: 'deepseek-ai/DeepSeek-R1',
      name: 'DeepSeek R1',
      provider: 'DeepSeek',
      speed: 'slow',
      contextLength: '128k',
    },
  ];
}

/**
 * Updates model selection preference on the backend.
 */
export async function selectModel(modelId: string, scope: 'atlas' | 'loom'): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/models/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'session-default',
        scope,
        atlas_model: scope === 'atlas' ? modelId : undefined,
        loom_model: scope === 'loom' ? modelId : undefined,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[selectModel] Server unreachable, setting local model preference only');
    return { status: 'local_only' };
  }
}

/**
 * Fetches customer records for the data view table.
 * Pass an optional segment string to filter server-side (e.g. 'priority', 'dormant').
 */
export async function fetchCustomers(segment?: string, sessionId?: string): Promise<CustomerRecord[]> {
  try {
    const params = new URLSearchParams({ limit: '50' });
    if (segment) params.set('segment', segment);
    if (sessionId) params.set('session_id', sessionId);
    const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    const data = await res.json();

    if (data.items && Array.isArray(data.items)) {
      return data.items.map((item: any) => {
        const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ');
        return {
          customer_id: String(item.customer_id || item.id),
          full_name: fullName || item.name || item.full_name || `Customer ${item.customer_id}`,
          segment: item.segment_label || item.segment || 'Regular',
          avg_balance: Number(item.total_balance ?? item.estimated_balance ?? item.avg_balance ?? 0),
          txn_freq: Number(item.txn_count ?? item.txn_freq ?? 12),
          credit_score: Number(item.credit_score ?? 720),
          churn_risk_score: Number(item.churn_risk_score ?? 0),
          is_high_risk: Number(item.is_high_risk ?? 0),
        };
      });
    }
  } catch (err) {
    console.warn('[fetchCustomers] Backend unreachable — no customer data available', err);
  }

  // Return empty — the UI will show a proper empty state instead of fake data
  return [];
}


/**
 * Triggers Executive PDF/HTML report generation and downloads the file directly.
 * The backend returns either a PDF blob (if WeasyPrint is available) or an HTML file.
 */
export async function generatePdfReport(
  sessionId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`Export failed (${res.status}): ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = contentType.includes('pdf')
    ? 'Segwise_Executive_Report.pdf'
    : 'Segwise_Executive_Report.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { success: true };
}

/**
 * Exports customer segment data as a CSV download.
 * Optionally filtered by segment, city, or minimum balance.
 */
export async function exportCustomersCsv(options?: {
  segmentId?: string;
  city?: string;
  minBalance?: number;
  sessionId?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/export/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segment_id: options?.segmentId ?? null,
      city: options?.city ?? null,
      min_balance: options?.minBalance ?? null,
      session_id: options?.sessionId ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`CSV export failed (${res.status}): ${text}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = options?.segmentId
    ? `segment_${options.segmentId}_customers.csv`
    : 'all_customers_export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Enhances a user's prompt by rewriting it with an LLM for clarity.
 */
export async function enhancePrompt(prompt: string, model?: string, apiKey?: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        api_key: apiKey || undefined,
      }),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to enhance prompt: ${res.status}`);
    }
    
    const data = await res.json();
    return data.enhanced_prompt || prompt;
  } catch (err) {
    console.error('[enhancePrompt] Error:', err);
    return prompt;
  }
}

