# Customer Segmentation & Personalization Agent — Master Phased Execution Plan

## Executive Overview

This master plan provides a granular, deterministic breakdown of every task and subtask required to build the **Customer Segmentation & Personalization Agent**. The system is an end-to-end AI-powered analytics copilot for retail banking that operates directly on `/datasets/bank_sqlite.db` (50k customer profiles, 1M transactions, 75k accounts, 9 tables) and routes queries through a **sequential 7-agent handoff chain (LangGraph)**.

All numerical computations, feature engineering, clustering, explainability calculations, and recommendation rankings are executed in **pure Python** (Pandas/NumPy/Scikit-learn/SHAP/SQLite3). The LLM is restricted exclusively to intent extraction (Atlas) and narrative response synthesis (Loom).

---

## System Architecture Reference

```
User Query (Natural Language)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Next.js 14 App Router UI                           │
│  Three-Column Shell · Agent Trace Stream · Model Switcher · Context Panel   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SSE Stream / HTTP REST
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            FastAPI Backend Router                           │
│         POST /chat  →  Initiates LangGraph Sequential Agent Chain           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    LangGraph Agent Handoff Chain (Sequential)               │
│                                                                             │
│  1. ATLAS (Intent Extractor - LLM)                                         │
│     Parses NL query → QueryPlan (intent, agent_plan, filters, HITL flag)    │
│                                                                             │
│  2. SCOUT (Data Scout - Pure Python)                                       │
│     Scouts bank_sqlite.db table schemas → resolves columns & metadata       │
│                                                                             │
│  3. FORGE (Feature Engineer - Pure Python)                                  │
│     Loads features from customer_profile in SQLite → calculates derived     │
│                                                                             │
│  4. MOSAIC (Segmentation Agent - Pure Python)                               │
│     Rule-based (RULE_TEMPLATES) OR ML-based (KMeans auto-k / HDBSCAN / GMM) │
│                                                                             │
│  5. PRISM (Explainability Agent - Pure Python / SHAP)                      │
│     Tier 1: Cluster-level batch SHAP (500 sample) | Tier 2: Per-customer    │
│                                                                             │
│  6. COMPASS (Recommendation Agent - Pure Python Rule Engine)                 │
│     Evaluates PRODUCT_RULES engine per segment & ranks recommendations      │
│                                                                             │
│  7. LOOM (Response Synthesizer - LLM)                                       │
│     Streams narrative response + names ML personas + emits chart specs      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     Data Layer — bank_sqlite.db Database                    │
│       Normalized SQLite DB with 9 tables & 50,000 customer profiles         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Task Breakdown

---

### PHASE 0: Environment Setup & SQLite Database Integration (`bank_sqlite.db`)

#### Task 0.1: Project Directory Structure & Virtual Environment Initialization
* **Target Directory**: Project root (`/Users/puang/segwise`)
* **Objective**: Establish clean Python and Node.js environments with isolated directory layouts for backend and frontend.
* **Subtasks**:
  1. Create backend folder structure: `backend/routers`, `backend/agents`, `backend/tools`, `backend/models`, `backend/prompts`, `backend/db`.
  2. Create frontend folder structure: `frontend/app`, `frontend/components/agent-trace`, `frontend/components/chat`, `frontend/components/model-switcher`, `frontend/components/panels`, `frontend/components/sidebar`, `frontend/components/shared`, `frontend/lib`.
  3. Create `backend/requirements.txt` with required python dependencies: `fastapi`, `uvicorn[standard]`, `gunicorn`, `pydantic`, `langgraph`, `langchain-core`, `openai`, `pandas`, `numpy`, `scikit-learn`, `hdbscan`, `shap`, `plotly`, `weasyprint`, `jinja2`, `python-dotenv`, `pyarrow`, `sqlalchemy`.
  4. Initialize Virtual Environment (`python3.11 -m venv venv`) and verify package installation without dependency conflicts.

#### Task 0.2: SQLite Database Schema Inspection & PRAGMA Audit
* **Target File**: `backend/db/sqlite_client.py`
* **Objective**: Audit tables in `/datasets/bank_sqlite.db` to confirm exact table schemas, row counts, and indexed primary keys.
* **Subtasks**:
  1. Inspect `customer_profile` table (50,000 rows): Verify pre-aggregated analytical columns `[customer_id, credit_score, total_balance, total_spent, total_accounts, has_Business, has_Checking, has_Savings, total_loan_amount, avg_interest_rate, loan_count, has_loan, has_Credit, has_Debit, customer_tenure_days, recency_days, credit_risk_tier]`.
  2. Inspect `customers` table (50,000 rows): Verify customer demographic fields `[customer_id, first_name, last_name, email, city, credit_score, created_at]`.
  3. Inspect `accounts` & `accounts_summary` tables (75,000 rows): Map `account_id`, `customer_id`, `account_type`, `balance_usd`, `total_spent`, `avg_txn_amount`, `txn_count`.
  4. Inspect `cards` (100,000 rows) & `loans` (30,000 rows) tables: Map `card_type`, `expiration_date`, `loan_amount`, `interest_rate`.
  5. Inspect `transactions` ledger table (1,000,000 rows): Map transaction behavior fields `[transaction_id, account_id, merchant_id, amount_usd, transaction_date, txn_year, txn_month, txn_day_of_week, txn_hour, txn_is_weekend]`.

#### Task 0.3: SQLite Connection & Query Utility Module
* **Target File**: `backend/db/sqlite_client.py`
* **Objective**: Write pure Python connection and SQL execution helpers for efficient read operations from `bank_sqlite.db`.
* **Subtasks**:
  1. Implement thread-safe connection pooling / factory using `sqlite3` or SQLAlchemy.
  2. Implement `get_table_columns(table_name)`: Returns list of column names via `PRAGMA table_info`.
  3. Implement `fetch_customer_data(columns, filters, limit)`: Returns Pandas DataFrame loaded from `customer_profile` / joined tables.

#### Task 0.4: Database Verification & Integrity Suite
* **Target File**: `backend/db/verify_db.py`
* **Objective**: Run automated assertions on `bank_sqlite.db` to ensure data access layer readiness.
* **Subtasks**:
  1. Assert presence and row count of all 9 tables (`customer_profile`: 50,000, `transactions`: 1,000,000, `accounts`: 75,000, `cards`: 100,000, `loans`: 30,000).
  2. Validate zero nulls in mandatory analytical fields (`customer_id`, `total_balance`, `credit_score`).
  3. Benchmark query execution speed: loading 50,000 customer profile records in $< 100\text{ms}$.

---

### PHASE 1: Backend Infrastructure & Shared State Setup

#### Task 1.1: Multi-Model Configuration & DeepInfra Registry
* **Target File**: `backend/config.py`
* **Objective**: Configure DeepInfra OpenAI-compatible client and register available LLM models with metadata flags.
* **Subtasks**:
  1. Define `AVAILABLE_MODELS` dictionary containing 20+ models categorized by provider:
     - Google: `google/gemini-3.1-pro`, `google/gemini-3.5-flash`, `google/gemini-3.1-flash-lite`, `google/gemini-2.5-pro` (reasoning=True, thinking_budget=8192), `google/gemini-2.5-flash` (reasoning=True, thinking_budget=4096).
     - Meta: `meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo`, `meta-llama/Meta-Llama-3.1-70B-Instruct`, `meta-llama/Meta-Llama-3.1-8B-Instruct`, `meta-llama/Meta-Llama-3.1-405B-Instruct`.
     - DeepSeek: `deepseek-ai/DeepSeek-R1` (reasoning=True), `deepseek-ai/DeepSeek-R1-Distill-Llama-70B` (reasoning=True), `deepseek-ai/DeepSeek-R1-Distill-Qwen-32B` (reasoning=True), `deepseek-ai/DeepSeek-V3`.
     - Qwen: `Qwen/QwQ-32B` (reasoning=True), `Qwen/Qwen2.5-72B-Instruct`, `Qwen/Qwen2.5-32B-Instruct`.
     - Mistral & Microsoft: `mistralai/Mistral-Small-24B-Instruct-2501`, `microsoft/phi-4`.
  2. Set default model constants: `DEFAULT_MODEL = "google/gemini-3.5-flash"`, `DEFAULT_ADV_MODEL = "google/gemini-3.1-flash-lite"`, `DEFAULT_LOOM_MODEL = "google/gemini-3.1-pro"`.
  3. Implement `get_llm_client(api_key: Optional[str])` helper function that connects to `https://api.deepinfra.com/v1/openai` using user API key or environment fallback.

#### Task 1.2: Agent State Envelope Definition
* **Target File**: `backend/agents/state.py`
* **Objective**: Define the rigid `AgentState` TypedDict used as the state pass-through envelope in LangGraph.
* **Subtasks**:
  1. Implement `AgentState` TypedDict containing:
     - Session: `messages`, `conversation_id`, `session_atlas_model`, `session_loom_model`, `session_api_key`.
     - Atlas outputs: `intent`, `agent_plan`, `filters`, `segmentation_method`, `segment_label_hints`, `clarification_needed`, `clarification_question`.
     - Scout outputs: `resolved_columns`, `row_count`, `dataset_summary`.
     - Forge outputs: `engineered_features`, `df_path`.
     - Mosaic outputs: `segment_assignments`, `segment_stats`, `cluster_model_path`, `evaluation_metrics`.
     - Prism outputs: `segment_shap`, `explanations`.
     - Compass outputs: `recommendations`.
     - Loom outputs: `narrative`, `follow_up_chips`, `chart_specs`.
     - Cross-turn memory: `current_segments`, `tool_outputs`.

#### Task 1.3: Chain-of-Thinking Stream Extractor
* **Target File**: `backend/agents/thinking.py`
* **Objective**: Implement a stream wrapper that separates `<think>...</think>` tags and Gemini reasoning content from final output tokens.
* **Subtasks**:
  1. Create `@dataclass class StreamChunk` with fields `type: Literal["thinking", "text"]` and `content: str`.
  2. Implement `async def stream_with_thinking(stream)` generator:
     - Detect `delta.reasoning_content` for Gemini 2.5 thinking models.
     - Parse buffer regex for `<think>` and `</think>` tags in DeepSeek R1 and QwQ streams.
     - Yield `StreamChunk(type="thinking", ...)` for reasoning tokens and `StreamChunk(type="text", ...)` for response narrative tokens.

#### Task 1.4: Database Layer & Persistence
* **Target File**: `backend/db/database.py` & `backend/db/models.py`
* **Objective**: Setup SQLite database for session history, segment caching, and audit logging.
* **Subtasks**:
  1. Define SQLAlchemy models for `Session`, `Message`, `SegmentCache`, and `TraceLog`.
  2. Implement helper functions: `create_session()`, `save_message()`, `get_session_history()`, `cache_segment_results()`.

---

### PHASE 2: Multi-Agent Handoff Chain (LangGraph Implementation)

#### Task 2.1: LangGraph Chain Orchestrator & State Machine
* **Target File**: `backend/agents/graph.py`
* **Objective**: Construct the sequential multi-agent execution graph that enforces strict agent handoffs.
* **Subtasks**:
  1. Define LangGraph nodes for each named agent: `atlas_node`, `scout_node`, `forge_node`, `mosaic_node`, `prism_node`, `compass_node`, `loom_node`.
  2. Build sequential graph edges: `START` $\rightarrow$ `atlas` $\rightarrow$ `scout` $\rightarrow$ `forge` $\rightarrow$ `mosaic` $\rightarrow$ `prism` $\rightarrow$ `compass` $\rightarrow$ `loom` $\rightarrow$ `END`.
  3. Implement dynamic agent skipping edge logic (`router_step`): If `agent_plan` in `AgentState` omits an agent (e.g. `intent == "eda"` omits Mosaic, Prism, Compass), automatically pass state directly to the next scheduled agent in `agent_plan`.
  4. Implement Human-in-the-Loop interrupt condition: If `state['clarification_needed'] == True`, halt graph execution and yield control to the API caller.

#### Task 2.2: Agent 1 — ATLAS (Intent Extractor & Planner)
* **Target Files**: `backend/agents/atlas.py` & `backend/prompts/atlas_prompt.py`
* **Objective**: Parse natural language user queries into structured `QueryPlan` JSON using an LLM.
* **Subtasks**:
  1. Define Pydantic schema `QueryPlan`:
     - `intent`: `Literal["eda", "segment", "feature_eng", "explain", "recommend", "aggregate", "transition"]`
     - `agent_plan`: `List[str]`
     - `filters`: `Dict[str, Any]`
     - `segmentation_method`: `Optional[Literal["rule", "kmeans", "hdbscan", "gmm"]]`
     - `segment_label_hints`: `List[str]`
     - `clarification_needed`: `bool`
     - `clarification_question`: `Optional[str]`
  2. Construct `ATLAS_PROMPT` with 10 few-shot examples mapping ambiguous/unstructured user queries to target JSON structures.
  3. Implement dual handling for reasoning vs structured models:
     - Non-reasoning models: Call API with `response_format=QueryPlan`.
     - Reasoning models (DeepSeek R1): Extract JSON block from output using regex after thinking block completes.
  4. Handle HITL logic: If user query specifies ambiguous segment rules (e.g., "segment by VIP"), set `clarification_needed=True` and generate prompt question.

#### Task 2.3: Agent 2 — SCOUT (Data Scout)
* **Target Files**: `backend/agents/scout.py` & `backend/tools/column_resolver.py`
* **Objective**: Inspect `bank_sqlite.db` schemas via `PRAGMA table_info` and resolve required column names deterministically based on intent.
* **Subtasks**:
  1. Implement `COLUMN_MAP` dictionary linking feature intent keywords (e.g., "balance", "recency", "churn", "transactions") to explicit columns in `customer_profile`, `accounts_summary`, `transactions`, `cards`, and `loans`.
  2. Implement `resolve_columns(intent, filters, hints)` pure Python function: Query SQLite table schemas via `PRAGMA table_info` to select required columns.
  3. Compute dataset health summary: Table row count, null percentage for resolved columns, data types, min/max bounds.
  4. Write `resolved_columns`, `row_count`, and `dataset_summary` into `AgentState`.

#### Task 2.4: Agent 3 — FORGE (Feature Engineer)
* **Target Files**: `backend/agents/forge.py` & `backend/tools/feature_engineering.py`
* **Objective**: Load features from `customer_profile` in `bank_sqlite.db` or compute derived features via SQL / Pandas on demand.
* **Subtasks**:
  1. Create `FEATURE_REGISTRY` mapping feature names to pure Python vector functions:
     - `engagement_score` $= 0.4 \times \text{digital\_score} + 0.35 \times \text{txn\_freq\_score} + 0.25 \times \text{product\_diversity}$
     - `customer_value_score` $= 0.5 \times \text{norm\_balance} + 0.3 \times \text{norm\_salary} + 0.2 \times \text{tenure\_score}$
     - `risk_score` $= 1 - (0.6 \times \text{credit\_score\_norm} + 0.4 \times (1 - \text{debt\_to\_income}))$
     - `savings_ratio`, `credit_utilization`, `recency_score`, `balance_trend`.
  2. Read `resolved_columns` directly from `customer_profile` table in `bank_sqlite.db` into Pandas DataFrame.
  3. Execute required feature transformations from `FEATURE_REGISTRY`.
  4. Save processed DataFrame to temporary Parquet file (`/tmp/forge_features_{conv_id}.parquet`) and update `AgentState` with `df_path` and `engineered_features`.

#### Task 2.5: Agent 4 — MOSAIC (Segmentation Agent)
* **Target Files**: `backend/agents/mosaic.py`, `backend/tools/segmentation.py`, `backend/models/clustering.py`
* **Objective**: Perform deterministic rule-based segmentation or unsupervised ML clustering with evaluation metrics.
* **Subtasks**:
  1. Implement Rule-Based Engine (`RULE_TEMPLATES`):
     - `priority`: `(avg_balance > 100,000) & (txn_freq > 15)`
     - `dormant`: `(recency_days > 90) | (txn_freq < 2)`
     - `regular`: Not priority and Not dormant
     - User filter overrides: Apply dynamic threshold values from `state['filters']`.
  2. Implement ML Clustering Engine:
     - `KMeans`: Preprocess with `StandardScaler` + `SimpleImputer`. Iterate $k \in [2..8]$, select best $k$ using `silhouette_score`.
     - `HDBSCAN`: Configure `min_cluster_size=50`, `min_samples=10`.
     - `GMM`: Fit Gaussian Mixture Models, evaluate BIC score.
  3. Compute Evaluation Metrics: Silhouette Score, Davies-Bouldin Index, Calinski-Harabasz Score, cluster size distribution.
  4. Update `AgentState` with `segment_assignments`, `segment_stats`, and `evaluation_metrics`.

#### Task 2.6: Agent 5 — PRISM (Explainability Agent)
* **Target Files**: `backend/agents/prism.py` & `backend/tools/explainability.py`
* **Objective**: Compute SHAP values for ML clusters and detailed rule traces for rule-based segments.
* **Subtasks**:
  1. Implement Tier 1 Batch SHAP (Cluster-level):
     - Sample 500 representative customers per cluster.
     - Calculate `TreeExplainer` or `KernelExplainer` SHAP values across engineered features.
     - Aggregate top distinguishing features per cluster and write to `state['segment_shap']`.
  2. Implement Tier 2 On-Demand Customer SHAP:
     - Compute single-customer feature contributions for detailed user inspection.
  3. Implement Rule Trace Inspector for rule-based mode:
     - Return exact threshold evaluations (e.g. `avg_balance: 142,000 > 100,000 [TRUE]`) per customer.

#### Task 2.7: Agent 6 — COMPASS (Recommendation Agent)
* **Target Files**: `backend/agents/compass.py` & `backend/tools/recommendation.py`
* **Objective**: Match segment profiles and customer financial signals against banking product rules.
* **Subtasks**:
  1. Construct `PRODUCT_RULES` registry:
     - Premium Savings Account: `avg_balance > 50,000` AND `products_owned < 3`.
     - Mutual Fund SIP: `estimated_salary > 40,000` AND `has_investment == False` AND `age < 45`.
     - Travel Credit Card: `estimated_salary > 60,000` AND `has_credit_card == False`.
     - Personal Loan Top-Up: `has_loan == True` AND `credit_score > 700`.
     - Student Account Upgrade: `age < 25` AND `avg_balance < 5,000`.
  2. Evaluate product eligibility per segment/customer and rank products by priority score.
  3. Update `AgentState` with `recommendations`.

#### Task 2.8: Sub-Feature — Customer Transition Predictor
* **Target File**: `backend/tools/segmentation.py`
* **Objective**: Identify candidate customers in regular segment eligible for upgrade to priority segment.
* **Subtasks**:
  1. Extract Priority Segment Centroid vector in scaled feature space.
  2. Compute Euclidean/Cosine distance from each Regular customer vector to Priority centroid.
  3. Calculate `transition_score` $= 1 - (d / d_{\max})$.
  4. Perform `gap_analysis`: Compute specific metric delta required per candidate (e.g., Needs $+₹23,400$ average balance, $+6$ txns/month).
  5. Return top 50 transition candidates with gap details.

#### Task 2.9: Agent 7 — LOOM (Response Synthesizer & Persona Naming)
* **Target Files**: `backend/agents/loom.py`, `backend/prompts/loom_persona_prompt.py`, `backend/prompts/loom_response_prompt.py`
* **Objective**: Synthesize all agent outputs into a polished narrative, generate persona names for ML clusters, emit chart specs, and produce follow-up chips.
* **Subtasks**:
  1. Implement ML Persona Generator: Pass cluster feature statistics to LLM to create human titles (e.g. "Digital Young Professional", "Dormant Saver") with taglines.
  2. Construct `LOOM_RESPONSE_PROMPT`: Direct LLM to stream markdown narrative based solely on Python results in `AgentState` (LLM does no arithmetic).
  3. Implement SSE event generation for narrative text streaming and chain-of-thought thinking chunks.
  4. Generate 3-4 context-aware follow-up suggestion chips.
  5. Output standard Plotly chart JSON specifications for visual rendering.

---

### PHASE 3: Backend FastAPI & SSE Real-Time Streaming Server

#### Task 3.1: FastAPI Core Server & Routing Engine
* **Target File**: `backend/main.py`
* **Objective**: Initialize FastAPI app with middleware, CORS rules, and route inclusion.
* **Subtasks**:
  1. Setup FastAPI instance with metadata title `"Banking Analytics Multi-Agent API"`.
  2. Configure CORS middleware allowing origins (`http://localhost:3000`, `http://127.0.0.1:3000`).
  3. Include routers: `chat_router`, `models_router`, `segments_router`, `customers_router`, `export_router`.

#### Task 3.2: SSE Streaming Chat Endpoint
* **Target File**: `backend/routers/chat.py`
* **Objective**: Implement `POST /chat` streaming endpoint using Server-Sent Events (SSE).
* **Subtasks**:
  1. Define request model `ChatRequest(message: str, conversation_id: str, atlas_model: Optional[str], loom_model: Optional[str], api_key: Optional[str])`.
  2. Implement SSE Event Schema dispatcher yielding structured events:
     - `model_info`: `{"model_id": ..., "display": ..., "reasoning": ...}`
     - `agent_start`: `{"agent": "atlas", "role": "Intent"}`
     - `intent_detected`: `{"intent": "segment", "agent_plan": [...]}`
     - `columns_resolved`: `{"columns": [...], "row_count": 823411}`
     - `tool_start` / `tool_progress` / `tool_complete` / `tool_error`
     - `thinking_start` / `thought_chunk` / `thinking_end`
     - `text_chunk`: `{"content": "..."}`
     - `structured_output`: `{"kind": "table"|"chart"|"csv", "payload": ...}`
     - `suggestions`: `{"chips": [...]}`
     - `clarification`: `{"question": ..., "options": [...]}`
     - `done`
  3. Set HTTP headers for SSE compatibility: `Cache-Control: no-cache`, `Connection: keep-alive`, `Content-Type: text/event-stream`.

#### Task 3.3: Dynamic Model Switcher Endpoints
* **Target File**: `backend/routers/models.py`
* **Objective**: Provide endpoints to query available LLM models and switch active session models.
* **Subtasks**:
  1. `GET /models`: Return full `AVAILABLE_MODELS` list grouped by provider.
  2. `GET /models/recommended`: Return recommended defaults (`atlas`: Flash Lite/Llama 8B, `loom`: Gemini 3.1 Pro/Llama 70B).
  3. `POST /models/select`: Update model selection for session (`scope`: `both` | `atlas` | `loom`).
  4. `GET /models/current`: Return currently active models for session.

#### Task 3.4: Segments & Customer Data API Endpoints
* **Target Files**: `backend/routers/segments.py` & `backend/routers/customers.py`
* **Objective**: Serve structured REST endpoints for frontend dashboard cards and customer drill-downs.
* **Subtasks**:
  1. `GET /segments`: Return overview stats of all segments in active session.
  2. `GET /segments/{id}`: Return segment details (persona name, stats, top products, customer list).
  3. `GET /customers`: Paginated list of customers with filtering by segment/city/balance.
  4. `GET /customers/{id}`: Single customer detail (engineered features, segment label, SHAP explanation, recommendations).

#### Task 3.5: Executive PDF & CSV Export Engine
* **Target File**: `backend/routers/export.py`
* **Objective**: Generate downloadable CSV files and multi-page executive PDF reports using Jinja2 and WeasyPrint.
* **Subtasks**:
  1. `POST /export/csv`: Stream CSV file of segment customer records.
  2. `POST /export/pdf`: Render 9-section HTML template with Jinja2 and compile to PDF bytes using WeasyPrint:
     - Section 1: Cover page (Bank name, date, agent metadata).
     - Section 2: Executive Summary (LLM narrative).
     - Section 3: Data Overview (row counts, null summary).
     - Section 4: EDA Findings (embedded Plotly chart images).
     - Section 5: Customer Segments (persona profiles & radar charts).
     - Section 6: Cross-sell Opportunities (Compass recommendations).
     - Section 7: Retention Strategies.
     - Section 8: Transition Candidates (Top 20 candidates table).
     - Section 9: Methodology & Model Evaluation metrics.

---

### PHASE 4: Frontend Design System & Shell Architecture

#### Task 4.1: Next.js 14 App Setup & Dependencies
* **Target Files**: `frontend/package.json` & `frontend/app/layout.tsx`
* **Objective**: Initialize Next.js App Router project and set up core dependencies.
* **Subtasks**:
  1. Install dependencies: `@base-ui-components/react`, `motion` (Framer Motion v11), `sonner`, `recharts`, `shiki`, `lucide-react`, `clsx`, `tailwind-merge`.
  2. Configure root layout with font imports (`Geist` sans, `Geist Mono`).

#### Task 4.2: Design Tokens & Monochromatic Theme
* **Target File**: `frontend/app/globals.css`
* **Objective**: Define CSS custom properties for dark mode theme, agent colors, and cubic-bezier easing curves.
* **Subtasks**:
  1. Configure base color tokens: `--bg: #0a0a0a`, `--surface: #111111`, `--surface-2: #1a1a1a`, `--surface-3: #222222`, `--border: rgba(255,255,255,0.06)`, `--text-primary: #f0f0f0`.
  2. Configure Agent Identity Color Tokens:
     - `--agent-atlas: #6366f1` (Indigo - Intent)
     - `--agent-scout: #0ea5e9` (Sky - Data Scout)
     - `--agent-forge: #a78bfa` (Violet - Features)
     - `--agent-mosaic: #f97316` (Orange - Segmentation)
     - `--agent-prism: #22c55e` (Green - Explainability)
     - `--agent-compass: #f59e0b` (Amber - Recommendations)
     - `--agent-loom: #ec4899` (Pink - Response Synthesis)
  3. Define custom cubic-bezier easings:
     - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
     - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`
     - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`
  4. Write utility classes for `.pressable:active` (`scale(0.97)`), `.entering`, and `@media (prefers-reduced-motion: reduce)`.

#### Task 4.3: Three-Column Shell Layout Component
* **Target Files**: `frontend/app/page.tsx` & `frontend/components/sidebar/Sidebar.tsx`
* **Objective**: Create the responsive three-column application shell.
* **Subtasks**:
  1. Left Column (240px fixed width): Sidebar containing Segwise branding, Model Switcher, and Session History list.
  2. Center Column (`flex-1`): Main workspace holding Agent Trace Stream, Chat Messages, HITL cards, and Input Bar.
  3. Right Column (360px fixed width): Context Panel with tabbed navigation (Charts, Data, Report).
  4. Responsive rules: Collapse right panel into a slide-over sheet on mobile screens (<1024px).

---

### PHASE 5: Frontend Interactive UI Components

#### Task 5.1: Agent Trace Stream & Live Execution Panel
* **Target Files**: `frontend/components/agent-trace/TraceStream.tsx`, `TraceRow.tsx`, `AgentAvatar.tsx`, `ThinkingPanel.tsx`, `ProgressShimmer.tsx`, `TraceCollapse.tsx`
* **Objective**: Build real-time stream viewer displaying each named agent's progress and chain-of-thought reasoning.
* **Subtasks**:
  1. `AgentAvatar.tsx`: Render agent badge with assigned icon (`◆`, `◉`, `⬡`, `◈`, `◎`, `◇`, `✦`) and identity color.
  2. `TraceRow.tsx`: Render individual agent row with entrance animation (`opacity: 0->1, y: -8->0`, 200ms `ease-out`), execution status dot (`○` queued $\rightarrow$ `⟳` running $\rightarrow$ `✓` done), duration timer, and expandable raw output JSON disclosure (`▸ Show details`).
  3. `ProgressShimmer.tsx`: Render subtle indeterminate shimmer line while agent status is running.
  4. `ThinkingPanel.tsx`: Collapsible reasoning panel for thinking models (DeepSeek R1 / Gemini 2.5 thinking). Show streaming monospace thought tokens during reasoning phase. Automatically animate collapse (`height: auto -> 0`, 250ms `--ease-drawer`) when `thinking_end` event arrives, transforming into `▾ Reasoning (N tokens)`.
  5. `TraceCollapse.tsx`: Upon full query completion (`done` event), fold entire agent trace stream into single disclosure `▾ Reasoning (4 agents, 2.3s)`.

#### Task 5.2: Model Switcher & API Key Component
* **Target Files**: `frontend/components/model-switcher/ModelSwitcher.tsx` & `ModelBadge.tsx`
* **Objective**: Enable model selection per agent role and custom API key configuration.
* **Subtasks**:
  1. `ModelSwitcher.tsx`: Sidebar dropdown component with origin-aware open animation (`scale: 0.97->1, opacity: 0->1`).
  2. Dual Model Selectors: Allow distinct model picking for Atlas (Fast intent parsing, e.g. Gemini 3.1 Flash Lite) vs Loom (Rich narrative, e.g. Gemini 3.1 Pro).
  3. Model Speed Badges: Color-coded pills (`fastest`=green, `fast`=indigo, `medium`=amber, `slow`=red).
  4. API Key Masked Input: Inline toggle to enter personal DeepInfra API key or default to server key.
  5. `ModelBadge.tsx`: Display active model in chat header (`✦ Loom · Gemini 3.1 Pro`). Click opens Model Switcher.

#### Task 5.3: Chat Window, Message Blocks & HITL Card
* **Target Files**: `frontend/components/chat/ChatWindow.tsx`, `MessageBlock.tsx`, `SegmentTable.tsx`, `HitlCard.tsx`, `FollowUpChips.tsx`, `InputBar.tsx`
* **Objective**: Render full-width document message blocks, dynamic data tables, HITL prompts, and interactive chips.
* **Subtasks**:
  1. `MessageBlock.tsx`: Full-width document block with attribution header (`✦ Loom · Llama 3.1 70B`). Animate entrance (`opacity: 0->1, y: 12->0`, 240ms `ease-out`). Render markdown text using `react-markdown`.
  2. `SegmentTable.tsx`: Styled interactive table showing segment distribution, customer counts, average balance, transaction frequency, and color-coded status dots.
  3. `HitlCard.tsx`: Render clarification prompt when `clarification_needed == True`. Header displays `◆ Atlas needs input` in indigo. Render choice buttons and custom text response field. Selection triggers immediate message dispatch and card fade-out (`opacity: 1->0`).
  4. `FollowUpChips.tsx`: Render horizontally scrolling suggestion chips with staggered entry (`delay: i * 30ms`). Click fills input bar and submits query.
  5. `InputBar.tsx`: Chat input field featuring active agent indicator pill (`◆ Atlas` $\rightarrow$ `◉ Scout` $\rightarrow$ `⟳ Mosaic` $\rightarrow$ `✦ Loom`) updating dynamically as SSE events arrive.

#### Task 5.4: Context Panel & Segment Detail Slide-Over
* **Target Files**: `frontend/components/panels/ContextPanel.tsx`, `ChartCard.tsx`, `SegmentDetailPanel.tsx`
* **Objective**: Display real-time Plotly charts, data tables, PDF generation status, and segment drill-down drawer.
* **Subtasks**:
  1. `ContextPanel.tsx`: Tabbed panel holding **Charts**, **Data**, and **Report** tabs.
  2. `ChartCard.tsx`: Embed Plotly charts rendered from agent `chart_specs`. Force `isAnimationActive={false}` on charts to prevent internal chart decoration jumps. Show producing agent header (e.g. `⬡ Forge's feature distribution`).
  3. `SegmentDetailPanel.tsx`: Slide-over drawer (`x: 40->0, opacity: 0->1`, 280ms `--ease-drawer`) presenting segment deep-dive: Persona title, tagline, key metrics grid, attribute radar chart, Compass product recommendations list, and candidate transition table.
  4. Report Tab: "Generate PDF Report" button with loading spinner state transformation.

#### Task 5.5: Shared State, Types & Notifications
* **Target Files**: `frontend/lib/types.ts`, `frontend/lib/api.ts`, `frontend/components/shared/ToastProvider.tsx`
* **Objective**: Define TypeScript schemas, EventSource stream handlers, and Sonner toast notifications.
* **Subtasks**:
  1. `types.ts`: Define TypeScript interfaces for `AgentState`, `AgentEvent`, `ModelInfo`, `SegmentSummary`, `CustomerRecord`, `ChartSpec`.
  2. `api.ts`: Implement `fetchEventSource` wrapper to consume `POST /chat` SSE stream and dispatch strongly-typed callbacks.
  3. `ToastProvider.tsx`: Configure Sonner toast notifications for export downloads, API errors, and model updates.

---

### PHASE 6: Verification, End-to-End Testing & Production Deployment

#### Task 6.1: Data Pipeline Automated Tests
* **Target File**: `backend/tests/test_pipeline.py`
* **Objective**: Verify dataset fusion and feature engineering outputs.
* **Subtasks**:
  1. Test `build_master.py` output exists and has expected shape ($\ge 800,000$ rows, $\ge 38$ columns).
  2. Test `FEATURE_REGISTRY` functions return non-null, correctly normalized arrays for sample inputs.

#### Task 6.2: Agent Chain Integration Test Suite
* **Target File**: `backend/tests/test_agents.py`
* **Objective**: Validate end-to-end execution for three primary query patterns.
* **Subtasks**:
  1. Test Query 1 ("Segment customers into priority, regular and dormant"): Verify Atlas selects `intent="segment"`, `method="rule"`, Scout loads columns, Forge computes features, Mosaic applies rules, Compass recommends products, Loom synthesizes narrative.
  2. Test Query 2 ("On what basis were priority customers selected?"): Verify Atlas selects `intent="explain"`, Prism returns rule definitions, Loom streams explanation.
  3. Test Query 3 ("Which regular customers can become priority customers?"): Verify transition predictor returns top 50 candidates with valid `gap_analysis` metrics.

#### Task 6.3: Clustering Model Evaluation Benchmarks
* **Target File**: `backend/tests/test_clustering.py`
* **Objective**: Assert clustering algorithm performance standards.
* **Subtasks**:
  1. Verify KMeans auto-$k$ selection picks optimal cluster count ($k \in [3..6]$) with Silhouette score $> 0.35$.
  2. Verify HDBSCAN correctly flags noise points without crashing pipeline.

#### Task 6.4: Frontend Integration & SSE Stream Verification
* **Target File**: `frontend/cypress/e2e/chat.cy.ts` or manual assertion script
* **Objective**: Verify SSE stream rendering, trace collapse, model switching, and HITL flow in browser environment.
* **Subtasks**:
  1. Verify live trace stream updates agent rows smoothly upon receiving SSE events.
  2. Verify thinking panel expands during reasoning stream and auto-collapses to disclosure button on `thinking_end`.
  3. Verify model switcher correctly changes backend model on subsequent queries.

#### Task 6.5: Production Deployment & Nginx SSE Configuration
* **Target File**: `nginx/segwise.conf` & `scripts/deploy.sh`
* **Objective**: Deploy application to Ubuntu VPS with SSE proxy buffering disabled.
* **Subtasks**:
  1. Build Next.js production frontend (`npm run build`).
  2. Configure Gunicorn with Uvicorn workers for FastAPI (`gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`).
  3. Write Nginx server block with mandatory SSE configuration:
     ```nginx
     location /api/ {
         proxy_pass http://localhost:8000/;
         proxy_buffering off;          # CRITICAL for SSE real-time streaming
         proxy_cache off;
         proxy_set_header Connection '';
         proxy_http_version 1.1;
         chunked_transfer_encoding on;
     }
     ```
  4. Setup `.env` environment variables (`DEEPINFRA_API_KEY`) and run system service verification.

---

## Task Execution Matrix & Dependencies

| Task ID | Component / Area | Primary Files | Dependencies | Pure Python vs LLM |
|---|---|---|---|---|
| **0.1** | Setup | `requirements.txt`, directory layout | None | Setup |
| **0.2** | Data Audit | `backend/data/pipeline/extract.py` | 0.1 | Pure Python |
| **0.3** | Data Normalization | `backend/data/pipeline/normalize.py` | 0.2 | Pure Python |
| **0.4** | Data Fusion | `backend/data/pipeline/build_master.py` | 0.3 | Pure Python |
| **0.5** | Data Verification | `backend/data/pipeline/verify_master.py` | 0.4 | Pure Python |
| **1.1** | Config & Models | `backend/config.py` | 0.1 | Configuration |
| **1.2** | State Envelope | `backend/agents/state.py` | 0.1 | Data Contract |
| **1.3** | Thinking Stream | `backend/agents/thinking.py` | 1.1 | Pure Python |
| **1.4** | Database | `backend/db/database.py`, `models.py` | 0.1 | SQLite DB |
| **2.1** | LangGraph Chain | `backend/agents/graph.py` | 1.2 | Orchestration |
| **2.2** | Agent 1: Atlas | `backend/agents/atlas.py`, `prompts/` | 1.1, 2.1 | **LLM (Structured / Reasoning)** |
| **2.3** | Agent 2: Scout | `backend/agents/scout.py`, `tools/` | 0.4, 2.1 | **Pure Python** |
| **2.4** | Agent 3: Forge | `backend/agents/forge.py`, `tools/` | 2.3 | **Pure Python** |
| **2.5** | Agent 4: Mosaic | `backend/agents/mosaic.py`, `models/` | 2.4 | **Pure Python** |
| **2.6** | Agent 5: Prism | `backend/agents/prism.py`, `tools/` | 2.5 | **Pure Python (SHAP)** |
| **2.7** | Agent 6: Compass | `backend/agents/compass.py`, `tools/` | 2.5 | **Pure Python (Rule Engine)** |
| **2.8** | Transition Tool | `backend/tools/segmentation.py` | 2.5 | **Pure Python** |
| **2.9** | Agent 7: Loom | `backend/agents/loom.py`, `prompts/` | 2.2..2.8 | **LLM (Narrative & Personas)** |
| **3.1** | FastAPI Core | `backend/main.py` | 0.1 | API Framework |
| **3.2** | SSE Chat Endpoint | `backend/routers/chat.py` | 2.1, 1.3 | Streaming HTTP |
| **3.3** | Model Switcher API | `backend/routers/models.py` | 1.1 | REST API |
| **3.4** | Data API Routers | `backend/routers/segments.py`, `customers.py` | 1.4, 2.5 | REST API |
| **3.5** | Export PDF & CSV | `backend/routers/export.py` | 2.9 | WeasyPrint / Jinja2 |
| **4.1** | Next.js Setup | `frontend/package.json` | None | Next.js 14 |
| **4.2** | Design Tokens | `frontend/app/globals.css` | 4.1 | CSS System |
| **4.3** | Three-Column Shell | `frontend/app/page.tsx`, `Sidebar.tsx` | 4.2 | React Layout |
| **5.1** | Agent Trace Stream | `frontend/components/agent-trace/*` | 3.2, 4.2 | React + Framer Motion |
| **5.2** | Model Switcher UI | `frontend/components/model-switcher/*` | 3.3, 4.2 | React UI |
| **5.3** | Chat UI & HITL Card | `frontend/components/chat/*` | 3.2, 4.2 | React UI |
| **5.4** | Context Panel UI | `frontend/components/panels/*` | 3.4, 3.5 | React + Plotly |
| **5.5** | Types & Stream Client | `frontend/lib/types.ts`, `api.ts` | 3.2 | TypeScript |
| **6.1** | Pipeline Tests | `backend/tests/test_pipeline.py` | 0.5 | pytest |
| **6.2** | Integration Tests | `backend/tests/test_agents.py` | 2.9, 3.2 | pytest |
| **6.3** | Clustering Tests | `backend/tests/test_clustering.py` | 2.5 | pytest |
| **6.4** | Frontend E2E Tests | `frontend/cypress/e2e/chat.cy.ts` | 5.3, 5.4 | Cypress / Manual |
| **6.5** | Deployment | `nginx/segwise.conf`, `scripts/deploy.sh` | 3.1, 4.1 | Nginx / Linux VPS |
