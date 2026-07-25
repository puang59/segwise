# Customer Segmentation & Personalization Agent — Implementation Plan

## Overview

An end-to-end AI-powered analytics copilot for retail banking. A **chain of seven named agents** each own exactly one responsibility. When a user submits a query, Advait parses it and hands off to Vihaan, who hands off to Kabir, and so on down the chain — each agent receiving the previous agent's output, doing its job, and passing the enriched state forward. The LLM (Advait + Myra) never touches numbers; every numerical operation is deterministic Python.

The system directly operates on `/datasets/bank_sqlite.db`, a normalized SQLite database containing 50,000 customers, 1,000,000 transactions, 75,000 accounts, 100,000 cards, 30,000 loans, and a pre-aggregated `customer_profile` analytical table.

---

## Architecture — Multi-Agent Handoff Chain

Each agent owns exactly one job. It receives `AgentState` from the previous agent, does its work, writes its output into state, and passes the updated state to the next agent in the chain. No agent skips ahead; no agent does another agent's job.

```
User Query (Natural Language)
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                               │
│  Chat UI · Agent Trace Stream · Model Picker · Context Panel · Export  │
└──────────────────────────────────┬────────────────────────────────────┘
                                   │  SSE / HTTP
┌──────────────────────────────────▼────────────────────────────────────┐
│                           FastAPI Backend                               │
│          POST /chat  →  initiates LangGraph execution                   │
└──────────────────────────────────┬────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼────────────────────────────────────┐
│                     LangGraph Agent Chain (Sequential)                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. ADVAIT — Intent Extractor                              (LLM) │   │
│  │    Parses NL query → QueryPlan (intent, agent_plan, filters)    │   │
│  │    If ambiguous: emits HITL question → waits for user reply     │   │
│  │    Output goes into: state.intent, state.agent_plan             │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                             │ handoff ↓                                 │
│  ┌─────────────────────────▼───────────────────────────────────────┐   │
│  │ 2. VIHAAN — Data Scout                            (Pure Python) │   │
│  │    Inspects bank_sqlite.db table schemas via PRAGMA              │   │
│  │    Maps intent → relevant SQLite tables & column names          │   │
│  │    Reports dataset size, null rates, column types               │   │
│  │    Output goes into: state.resolved_columns, state.row_count    │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                             │ handoff ↓                                 │
│  ┌─────────────────────────▼───────────────────────────────────────┐   │
│  │ 3. KABIR — Feature Engineer                       (Pure Python) │   │
│  │    Loads state.resolved_columns from customer_profile in SQLite│   │
│  │    Computes derived features from FEATURE_REGISTRY / SQL        │   │
│  │    Saves enriched DataFrame as temp parquet / in-memory DF      │   │
│  │    Output goes into: state.engineered_features, state.df_path   │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                             │ handoff ↓                                 │
│  ┌─────────────────────────▼───────────────────────────────────────┐   │
│  │ 4. ISHAAN — Segmentation Agent                    (Pure Python) │   │
│  │    Rule-based: applies RULE_TEMPLATES if user named segments     │   │
│  │    ML-based: KMeans/HDBSCAN if user said "discover groups"      │   │
│  │    Computes silhouette score, segment stats                      │   │
│  │    Output goes into: state.segment_assignments, state.stats     │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                             │ handoff ↓                                 │
│  ┌─────────────────────────▼───────────────────────────────────────┐   │
│  │ 5. AADHYA — Explainability Agent                  (Pure Python) │   │
│  │    Tier 1: SHAP on 500-sample per cluster (batch, always runs)  │   │
│  │    Tier 2: single-customer SHAP on-demand                       │   │
│  │    For rule-based: returns rule trace + actual values           │   │
│  │    Output goes into: state.explanations, state.segment_shap     │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                             │ handoff ↓                                 │
│  ┌─────────────────────────▼───────────────────────────────────────┐   │
│  │ 6. SAANVI — Recommendation Agent                 (Pure Python) │   │
│  │    Applies PRODUCT_RULES engine per segment/customer            │   │
│  │    Ranks eligible products by priority score                    │   │
│  │    Output goes into: state.recommendations                      │   │
│  └─────────────────────────┬──────────────────�    # ── Vihaan output (Data Scout) ───────────────────────────
    resolved_columns:      List[str]           # columns to load from bank_sqlite.db
    row_count:             int                 # total rows in customer_profile (50,000)
    dataset_summary:       Dict[str, Any]      # null rates, dtypes, sample stats

    # ── Kabir output (Feature Engineer) ─────────────────────
    engineered_features:   List[str]           # names of features computed
    df_path:               str                 # path to temp parquet with features

    # ── Ishaan output (Segmentation) ────────────────────────
    segment_assignments:   Dict[str, str]      # {customer_id: segment_name}
    segment_stats:         Dict[str, Any]      # count, avg_balance, etc. per segment
    cluster_model_path:    Optional[str]       # None for rule-based
    evaluation_metrics:    Dict[str, float]    # silhouette, DB-index, etc.

    # ── Aadhya output (Explainability) ──────────────────────
    segment_shap:          Dict[str, Any]      # {segment: {feature: importance}}
    explanations:          Dict[str, Any]      # {customer_id: explanation} on-demand only

    # ── Saanvi output (Recommendation) ─────────────────────
    recommendations:       Dict[str, List]     # {segment: [product_list]}

    # ── Myra output (Response Synthesizer) ──────────────────
    narrative:             str
    follow_up_chips:       List[str]
    chart_specs:           List[Dict]

    # ── Cross-turn memory ────────────────────────────────────
    current_segments:      Dict               # persisted so follow-ups reuse segments
    tool_outputs:          Dict[str, Any]     # raw outputs keyed by agent name
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Chat UI, agent trace, model picker |
| UI Primitives | base-ui + vanilla CSS | Accessible, unstyled components |
| Animation | motion (Framer Motion v11) | Agent trace, thinking panel, transitions |
| Charts | Recharts (`isAnimationActive=false`) | Charts in context panel |
| Backend | FastAPI (Python 3.11) | REST + SSE streaming |
| Agent Orchestration | **LangGraph** (sequential chain) | Multi-agent handoff state machine |
| LLM Provider | **DeepInfra** (OpenAI-compatible API) | Advait + Myra, 30+ model choices |
| Data Processing | Pandas + NumPy + SQLite3 | All numerical operations — LLM never touches numbers |
| ML | Scikit-learn, HDBSCAN | KMeans, HDBSCAN, GMM clustering |
| Explainability | SHAP | Segment-level batch + per-customer on-demand |
| Database | SQLite (`bank_sqlite.db`) | Customers, transactions, accounts, cards, loans, sessions |
| PDF Export | WeasyPrint + Jinja2 | Executive report |
| Deployment | nginx + gunicorn + uvicorn | Ubuntu VPS, SSE-safe config |

---

## Folder Structure

```
segwise/
├── datasets/                             # Normalized database
│   └── bank_sqlite.db                    # ← SQLite database (50k customers, 1M txns, 9 tables)
│
├── backend/
│   ├── main.py
│   ├── config.py                         # AVAILABLE_MODELS, DeepInfra client
│   ├── .env                              # DEEPINFRA_API_KEY=...
│   │
│   ├── routers/
│   │   ├── chat.py                       # POST /chat → SSE
│   │   ├── segments.py
│   │   ├── customers.py
│   │   ├── export.py
│   │   └── models.py                     # GET/POST /models
│   │
│   ├── agents/                           # ← one file per named agent
│   │   ├── advait.py                     # Intent Extractor (LLM)
│   │   ├── vihaan.py                     # Data Scout (pure Python)
│   │   ├── kabir.py                      # Feature Engineer (pure Python)
│   │   ├── ishaan.py                     # Segmentation (pure Python)
│   │   ├── aadhya.py                     # Explainability (SHAP)
│   │   ├── saanvi.py                     # Recommendation (rule engine)
│   │   ├── myra.py                       # Response Synthesizer (LLM)
│   │   ├── thinking.py                   # Chain-of-thinking stream splitter
│   │   ├── graph.py                      # LangGraph chain: Advait→…→Myra
│   │   └── state.py                      # AgentState TypedDict
│   │
│   ├── tools/
│   │   ├── eda.py
│   │   ├── feature_engineering.py
│   │   ├── segmentation.py
│   │   ├── explainability.py
│   │   ├── recommendation.py
│   │   ├── visualization.py
│   │   └── column_resolver.py            # Vihaan's column map
│   │
│   ├── models/
│   │   ├── clustering.py                 # KMeans / HDBSCAN / GMM
│   │   └── recommender.py
│   │
│   ├── prompts/
│   │   ├── advait_prompt.py              # Few-shot intent extraction
│   │   ├── myra_persona_prompt.py        # Cluster persona naming
│   │   └── myra_response_prompt.py       # Narrative generation
│   │
│   ├── db/
│   │   ├── sqlite_client.py              # SQLite reader/connection helper
│   │   ├── database.py                   # Session/chat DB
│   │   └── models.py
│   └── requirements.txt
```ng panel, transitions |
| Charts | Recharts (`isAnimationActive=false`) | Charts in context panel |
| Backend | FastAPI (Python 3.11) | REST + SSE streaming |
| Agent Orchestration | **LangGraph** (sequential chain) | Multi-agent handoff state machine |
| LLM Provider | **DeepInfra** (OpenAI-compatible API) | Advait + Myra, 30+ model choices |
| Data Processing | Pandas + NumPy | All numerical operations — LLM never touches numbers |
| ML | Scikit-learn, HDBSCAN | KMeans, HDBSCAN, GMM clustering |
| Explainability | SHAP | Segment-level batch + per-customer on-demand |
| Database | SQLite (dev) → PostgreSQL (prod) | Sessions, segments, chat history |
| PDF Export | WeasyPrint + Jinja2 | Executive report |
| Deployment | nginx + gunicorn + uvicorn | Ubuntu VPS, SSE-safe config |

---

## Folder Structure

```
segwise/
├── datasets/                             # ← your actual data files (DO NOT MOVE)
│   ├── bank_transactions.csv             # DS1: 1,048,566 transactions (shivamb)
│   ├── bank_churn_dataset.csv            # DS2: 80,000 customers with churn (thuandao)
│   ├── Customer_financial_profiles.csv   # DS3: 20,000 India profiles (kundanbedmutha)
│   ├── CC GENERAL.csv                    # DS4: 8,950 credit card behaviour (arjunbhasin)
│   ├── accounts.csv                      # DS5: 75,000 accounts (banking_kaggle)
│   ├── customers.csv                     # DS6: 50,000 customers (banking_kaggle)
│   ├── cards.csv                         # DS7: 100,000 cards (banking_kaggle)
│   ├── loans.csv                         # DS8: 30,000 loans (banking_kaggle)
│   ├── branches.csv                      # DS9: branch metadata
│   ├── merchants.csv                     # DS10: merchant metadata
│   └── banking_dataset_kaggle/           # DS11: SQL/DB format subfolder
│
├── backend/
│   ├── main.py
│   ├── config.py                         # AVAILABLE_MODELS, DeepInfra client
│   ├── .env                              # DEEPINFRA_API_KEY=...
│   │
│   ├── routers/
│   │   ├── chat.py                       # POST /chat → SSE
│   │   ├── segments.py
│   │   ├── customers.py
│   │   ├── export.py
│   │   └── models.py                     # GET/POST /models
│   │
│   ├── agents/                           # ← one file per named agent
│   │   ├── advait.py                     # Intent Extractor (LLM)
│   │   ├── vihaan.py                     # Data Scout (pure Python)
│   │   ├── kabir.py                      # Feature Engineer (pure Python)
│   │   ├── ishaan.py                     # Segmentation (pure Python)
│   │   ├── aadhya.py                     # Explainability (SHAP)
│   │   ├── saanvi.py                     # Recommendation (rule engine)
│   │   ├── myra.py                       # Response Synthesizer (LLM)
│   │   ├── thinking.py                   # Chain-of-thinking stream splitter
│   │   ├── graph.py                      # LangGraph chain: Advait→…→Myra
│   │   └── state.py                      # AgentState TypedDict
│   │
│   ├── tools/
│   │   ├── eda.py
│   │   ├── feature_engineering.py
│   │   ├── segmentation.py
│   │   ├── explainability.py
│   │   ├── recommendation.py
│   │   ├── visualization.py
│   │   └── column_resolver.py            # Vihaan's column map
│   │
│   ├── models/
│   │   ├── clustering.py                 # KMeans / HDBSCAN / GMM
│   │   └── recommender.py
│   │
│   ├── prompts/
│   │   ├── advait_prompt.py              # Few-shot intent extraction
│   │   ├── myra_persona_prompt.py        # Cluster persona naming
│   │   └── myra_response_prompt.py       # Narrative generation
│   │
│   ├── data/
│   │   ├── pipeline/
│   │   │   ├── extract.py                # Per-dataset feature extraction
│   │   │   ├── normalize.py              # Conditioned synthetic enrichment
│   │   │   └── build_master.py           # ← Run this FIRST
│   │   └── processed/
│   │       └── master_customers.csv      # ← Output: ~1M rows × 38 cols
│   │
│   ├── db/
│   │   ├── database.py
│   │   ├── models.py
│   │   └── seed.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   └── segments/[id]/page.tsx
│   ├── components/
│   │   ├── agent-trace/
│   │   │   ├── TraceStream.tsx
│   │   │   ├── TraceRow.tsx
│   │   │   ├── AgentAvatar.tsx
│   │   │   ├── ThinkingPanel.tsx
│   │   │   └── ProgressShimmer.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBlock.tsx
│   │   │   ├── SegmentTable.tsx
│   │   │   ├── HitlCard.tsx
│   │   │   └── FollowUpChips.tsx
│   │   ├── model-switcher/
│   │   │   ├── ModelSwitcher.tsx
│   │   │   └── ModelBadge.tsx
│   │   ├── panels/
│   │   │   ├── ContextPanel.tsx
│   │   │   └── SegmentDetailPanel.tsx
│   │   └── sidebar/Sidebar.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   └── package.json
│
└── notebooks/
    ├── 00_dataset_exploration.ipynb
    ├── 01_fusion_pipeline.ipynb
    ├── 02_feature_engineering.ipynb
    └── 03_clustering_experiments.ipynb
```

---

## Phase 0 — Database Inventory & Integration (`bank_sqlite.db`)

The normalized datasets have been compiled into `/datasets/bank_sqlite.db`. The system queries this SQLite database directly.

### Tables in `/datasets/bank_sqlite.db`

| Table | Rows | Primary Schema & Features | Role |
|---|---|---|---|
| `customer_profile` | **50,000** | `customer_id`, `first_name`, `last_name`, `email`, `city`, `credit_score`, `total_balance`, `total_spent`, `total_accounts`, `has_Business`, `has_Checking`, `has_Savings`, `total_loan_amount`, `avg_interest_rate`, `loan_count`, `has_loan`, `has_Credit`, `has_Debit`, `customer_tenure_days`, `recency_days`, `credit_risk_tier` | **Primary Analytical Table**: Pre-aggregated features ready for feature engineering, rule segmentation, and ML clustering |
| `customers` | **50,000** | `customer_id`, `first_name`, `last_name`, `email`, `city`, `credit_score`, `created_at` | Demographics master |
| `accounts` | **75,000** | `account_id`, `customer_id`, `account_type`, `balance_usd`, `open_date`, `account_age_days` | Individual account ledger |
| `accounts_summary` | **75,000** | `account_id`, `customer_id`, `account_type`, `balance_usd`, `open_date`, `total_spent`, `avg_txn_amount`, `txn_count` | Account transaction aggregations |
| `cards` | **100,000** | `card_id`, `account_id`, `card_type`, `expiration_date` | Card ownership mappings |
| `loans` | **30,000** | `loan_id`, `customer_id`, `loan_amount`, `interest_rate`, `start_date` | Active/historical loan ledger |
| `transactions` | **1,000,000** | `transaction_id`, `account_id`, `merchant_id`, `amount_usd`, `transaction_date`, `txn_year`, `txn_month`, `txn_day_of_week`, `txn_hour`, `txn_is_weekend` | Detailed transaction ledger |
| `merchants` | **5,000** | `merchant_id`, `merchant_name`, `city` | Merchant directory |
| `branches` | **500** | `branch_id`, `branch_name`, `manager_name`, `city`, `country` | Branch directory |

---

### SQLite Data Access Layer Configuration

**File**: `backend/db/sqlite_client.py`

```python
import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = Path("datasets/bank_sqlite.db")

def get_connection():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def get_table_schema(table_name: str):
    conn = get_connection()
    df_info = pd.read_sql_query(f"PRAGMA table_info({table_name});", conn)
    conn.close()
    return df_info

def query_customer_profiles(columns: list[str] = None, where_clause: str = "") -> pd.DataFrame:
    conn = get_connection()
    cols_str = ", ".join(columns) if columns else "*"
    sql = f"SELECT {cols_str} FROM customer_profile"
    if where_clause:
        sql += f" WHERE {where_clause}"
    df = pd.read_sql_query(sql, conn)
    conn.close()
    return df
```
    'nums_card':    'num_credit_cards',
    'nums_service': 'num_products_owned',
    'exit':         'churn_label',
    'monthly_ir':   'monthly_income',
    # DS3 → master
    'yearly_income': 'estimated_salary',
    'total_debt':    'loan_amount',
    # DS6 → master
    'created_at':    'account_open_date',
}
```

---

## Phase 2 — Backend (FastAPI + LangGraph)

### 2.1 LangGraph State Machine

**File**: `backend/agent/graph.py`

```python
class AgentState(TypedDict):
    messages: List[BaseMessage]
    intent: str                        # "eda" | "segment" | "explain" | "recommend" | "aggregate"
    tool_plan: List[str]               # Ordered list of tools to call
    filters: Dict[str, Any]            # e.g., {"segment": "dormant", "city": "Mumbai"}
    tool_outputs: Dict[str, Any]       # Results keyed by tool name
    clarification_needed: bool         # HITL flag
    clarification_question: str        # Question to ask user
    current_segments: Dict             # Most recently computed segments (persisted across turns)
    conversation_id: str
```

**Graph nodes** (each is a Python function, not an LLM call except planner/responder):

```
START → planner → supervisor → [eda | feature_eng | segment | explain | recommend] → response_generator → END
                      ↑_____________________________________________|
                                  (looping until plan exhausted)
```

The `supervisor` pops the first tool from `tool_plan`, routes to it, stores output in `tool_outputs`, repeats until `tool_plan` is empty.

### 2.2 Query Planner Node

**File**: `backend/agent/planner.py`

Uses structured output (Pydantic model) to extract intent from user message:

```python
class QueryPlan(BaseModel):
    intent: Literal["eda", "segment", "feature_eng", "explain", "recommend", "aggregate", "transition"]
    tools: List[Literal["eda", "feature_eng", "segment", "explain", "recommend", "visualize"]]
    filters: Dict[str, Any]
    clarification_needed: bool
    clarification_question: Optional[str]
    metrics: Optional[List[str]]  # e.g., ["avg_transaction_amount"]
    segment_labels: Optional[List[str]]  # e.g., ["priority", "regular", "dormant"]
    segmentation_method: Optional[Literal["rule", "kmeans", "hdbscan", "gmm"]]
```

**Prompt strategy**: Few-shot with 5 examples mapping natural language to `QueryPlan` JSON. The planner never calls tools; it only plans.

**Human-in-the-loop**: If `clarification_needed=True`, the graph stops, returns the question to the frontend, and waits for user reply before continuing.

### 2.3 EDA Tool

**File**: `backend/tools/eda.py`

All functions take a Pandas DataFrame and return a dict of results (JSON-serializable + chart paths).

| Function | Output |
|---|---|
| `missing_values(df)` | Per-column null count + percentage |
| `distribution(df, columns)` | Histogram data (bins + counts) |
| `correlation(df, columns)` | Pearson correlation matrix |
| `outlier_detection(df, columns)` | IQR-based outliers, z-score flags |
| `feature_summary(df)` | Min, max, mean, median, std, skewness per column |
| `categorical_frequency(df, col)` | Value counts for categorical columns |
| `generate_eda_report(df)` | Calls all of the above, returns combined dict |

### 2.4 Feature Engineering Tool

**File**: `backend/tools/feature_engineering.py`

Accepts a list of requested feature names (from planner) and computes only those:

```python
FEATURE_REGISTRY = {
    "engagement_score":       compute_engagement_score,
    "customer_value_score":   compute_customer_value_score,
    "risk_score":             compute_risk_score,
    "savings_ratio":          compute_savings_ratio,
    "credit_utilization":     compute_credit_utilization,
    "digital_score":          compute_digital_score,
    "recency_score":          compute_recency_score,
    "balance_trend":          compute_balance_trend,
    "product_diversity_score": compute_product_diversity,
    "transition_potential":   compute_transition_potential,  # distance to priority centroid
}

def run_feature_engineering(df, requested_features):
    for feat in requested_features:
        df[feat] = FEATURE_REGISTRY[feat](df)
    return df
```

Composite feature formulas:

```python
engagement_score       = 0.4 * digital_score + 0.35 * txn_frequency_score + 0.25 * products_diversity
customer_value_score   = 0.5 * normalized_balance + 0.3 * normalized_salary + 0.2 * tenure_score
risk_score             = 1 - (0.6 * credit_score_norm + 0.4 * (1 - debt_to_income))
transition_potential   = 1 - cosine_distance(customer_vector, priority_centroid)
```

### 2.5 Segmentation Tool

**File**: `backend/tools/segmentation.py`

#### Rule-based engine

Activated when user specifies named segments (e.g., "priority, regular, dormant"):

```python
RULE_TEMPLATES = {
    "priority": lambda df: (df['avg_balance'] > 100_000) & (df['txn_frequency_per_month'] > 15),
    "dormant":  lambda df: (df['recency'] > 90) | (df['txn_frequency_per_month'] < 2),
    "regular":  lambda df: ~RULE_TEMPLATES['priority'](df) & ~RULE_TEMPLATES['dormant'](df),
    "vip":      None,  # Triggers HITL: "How would you like to define VIP?"
    "high_value": lambda df: df['customer_value_score'] > df['customer_value_score'].quantile(0.9),
}
```

User-defined thresholds flow in from `filters` extracted by the planner.

#### ML-based clustering

Activated when user says "discover segments" or doesn't name them:

```python
def cluster_customers(df, features, method='kmeans', n_clusters=None):
    # Preprocessing pipeline
    pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler()),
    ])
    X = pipe.fit_transform(df[features])

    if method == 'kmeans':
        # Auto-select k via silhouette score (k=2..8)
        best_k, best_score = 0, -1
        for k in range(2, 9):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X)
            score = silhouette_score(X, labels)
            if score > best_score:
                best_k, best_score, best_model = k, score, km
        return best_model.labels_, best_model, pipe

    elif method == 'hdbscan':
        model = HDBSCAN(min_cluster_size=50, min_samples=10)
        return model.fit_predict(X), model, pipe

    elif method == 'gmm':
        # BIC-based model selection
        ...
```

#### Persona naming

After clustering, cluster statistics are passed to LLM with a strict prompt:

```
You are given cluster statistics. Name each cluster with a business-friendly persona.
Only use the provided data. Do not invent facts.

Cluster 0:
  median_age: 27, avg_balance: 8500, txn_freq: 22/month, products: 1.2
  most_common_city: Bangalore, engagement_score: 78

Return JSON: {"cluster_id": 0, "name": "Digital Young Professional", "tagline": "..."}
```

### 2.6 Explainability Tool

**File**: `backend/tools/explainability.py`

For ML-segmented customers:
```python
def explain_customer(customer_id, model, X_processed, feature_names):
    explainer = shap.KernelExplainer(model.predict, shap.sample(X_processed, 100))
    shap_values = explainer.shap_values(X_processed[customer_idx])
    top_features = sorted(zip(feature_names, shap_values), key=lambda x: abs(x[1]), reverse=True)[:5]
    return top_features  # [("avg_balance", 0.42), ("txn_freq", 0.31), ...]
```

For rule-based customers:
```python
def explain_rule_based(customer_id, segment, df):
    row = df[df['CustomerID'] == customer_id].iloc[0]
    rules = RULE_TEMPLATES[segment]
    return {
        "segment": segment,
        "triggered_rules": evaluate_rules_verbose(row, segment),
        "key_values": {
            "avg_balance": row['avg_balance'],
            "txn_frequency": row['txn_frequency_per_month'],
            "recency_days": row['recency'],
        }
    }
```

### 2.7 Recommendation Tool

**File**: `backend/tools/recommendation.py`

Business rule engine that maps segment + customer attributes to eligible products:

```python
PRODUCT_RULES = [
    {
        "product": "Premium Savings Account",
        "condition": lambda r: r['avg_balance'] > 50_000 and r['products_owned'] < 3,
        "priority": 10,
        "segment_affinity": ["priority", "high_value"],
    },
    {
        "product": "Mutual Fund SIP",
        "condition": lambda r: r['estimated_salary'] > 40_000 and not r['has_investment'] and r['age'] < 45,
        "priority": 9,
        "segment_affinity": ["young_professional", "regular"],
    },
    {
        "product": "Travel Credit Card",
        "condition": lambda r: r['estimated_salary'] > 60_000 and not r['has_credit_card'],
        "priority": 8,
    },
    {
        "product": "Personal Loan Top-up",
        "condition": lambda r: r['has_loan'] and r['credit_score'] > 700,
        "priority": 7,
    },
    {
        "product": "Student Account Upgrade",
        "condition": lambda r: r['age'] < 25 and r['avg_balance'] < 5_000,
        "priority": 6,
        "segment_affinity": ["student"],
    },
    # ... 10+ more rules
]

def recommend_products(customer_row, segment_label, top_n=3):
    eligible = [p for p in PRODUCT_RULES if p['condition'](customer_row)]
    ranked = sorted(eligible, key=lambda x: x['priority'], reverse=True)
    return ranked[:top_n]
```

### 2.8 Customer Transition Predictor

**File**: `backend/tools/segmentation.py` (sub-function)

Answers: "Which regular customers can become priority?"

```python
def find_transition_candidates(df, from_segment='regular', to_segment='priority', top_n=50):
    regular_customers = df[df['segment'] == from_segment]
    priority_centroid  = df[df['segment'] == to_segment][CLUSTER_FEATURES].mean()

    # Euclidean distance in normalized space
    scaler = StandardScaler().fit(df[CLUSTER_FEATURES])
    regular_scaled  = scaler.transform(regular_customers[CLUSTER_FEATURES])
    priority_scaled = scaler.transform(priority_centroid.values.reshape(1, -1))

    distances = np.linalg.norm(regular_scaled - priority_scaled, axis=1)
    regular_customers = regular_customers.copy()
    regular_customers['transition_score'] = 1 - (distances / distances.max())
    regular_customers['gap_analysis'] = regular_customers.apply(
        lambda r: compute_gap(r, priority_centroid), axis=1
    )
    return regular_customers.nlargest(top_n, 'transition_score')
```

Each returned customer includes `gap_analysis`: a dict of `{feature: delta_needed}` so the agent can say "needs +£12,000 average balance and +5 transactions/month."

### 2.9 Visualization Tool

**File**: `backend/tools/visualization.py`

All charts are generated with Plotly and returned as JSON (for Plotly.js on frontend) or PNG for PDF reports:

| Chart | Trigger |
|---|---|
| Bar chart — missing values | EDA |
| Histogram — feature distributions | EDA / distribution query |
| Heatmap — correlation matrix | EDA / correlation query |
| Box plots — feature by segment | Segment comparison |
| Scatter plot — 2D PCA of clusters | After clustering |
| Sankey diagram — transitions | Transition analysis |
| Radar chart — persona profile | Persona generation |
| Waterfall chart — SHAP values | Explainability |

### 2.10 FastAPI Endpoints

**File**: `backend/main.py` + `backend/routers/`

```
POST /chat              — Sends a message, returns agent response (streaming SSE)
GET  /segments          — Returns all current segments with stats
GET  /segments/{id}     — Segment detail: stats, top customers, persona, recommendations
GET  /customers         — Paginated customer list with segment labels
GET  /customers/{id}    — Single customer: features, segment, explanation, recommendations
GET  /visualizations    — List of generated chart JSONs for current session
POST /export/csv        — Export customers in segment as CSV
POST /export/pdf        — Generate full executive report PDF
GET  /health            — Health check
```

**WebSocket** `/ws/chat/{session_id}` — For real-time streaming of agent responses token by token.

---

## Phase 3 — Frontend (Next.js)

### 3.1 Chat Interface

**File**: `frontend/app/page.tsx`

- Left sidebar: conversation history + session management
- Main area: chat messages (markdown rendered, tables embedded)
- Right panel: live chart updates from agent responses
- Bottom: input bar + follow-up suggestion chips

**Message types** (rendered differently):
- `text` — Markdown narrative
- `table` — Paginated data table (shadcn Table)
- `chart` — Plotly chart rendered inline
- `csv_download` — Download button for CSV
- `hitl_question` — Agent asking for clarification (rendered as a card with option buttons)
- `follow_up_suggestions` — Horizontally scrolling chips

### 3.2 Human-in-the-Loop UI

When the agent sets `clarification_needed=True`:

```tsx
<HumanInLoopPrompt
  question="How would you like to define VIP customers?"
  options={[
    "Balance > threshold",
    "Income > threshold",
    "Product ownership",
    "Let the model decide",
    "I'll specify manually"
  ]}
  onSelect={(choice) => sendMessage(choice)}
/>
```

### 3.3 Segment Dashboard

**File**: `frontend/app/dashboard/page.tsx`

- Metrics grid: total customers, segments count, avg balance per segment
- Segment cards: persona name, tagline, customer count, top 3 products recommended
- Charts: distribution comparison across segments
- Customer search with segment filter

### 3.4 Segment Detail Page

**File**: `frontend/app/segments/[id]/page.tsx`

- Persona card: name, tagline, radar chart of attributes
- Key statistics table
- Customer table (paginated, sortable, with individual explain button)
- Recommended campaigns section
- Transition candidates table (if applicable)

---

## Phase 4 — Executive Report Generation

**File**: `backend/routers/export.py`

After any analysis, user can trigger `POST /export/pdf`:

Report contents:
1. Cover page — bank name, date, generated by agent
2. Executive Summary — LLM-generated 2-paragraph summary
3. Data Overview — row count, date range, missing value summary
4. EDA Findings — key distributions, outliers, correlations (charts embedded)
5. Customer Segments — one page per segment with persona, stats, radar chart
6. Cross-sell Opportunities — recommended products per segment with rationale
7. Retention Strategies — LLM-generated actionable recommendations
8. Transition Candidates — Top 20 customers with gap analysis
9. Methodology — which algorithm was used, silhouette scores, feature list

Implementation: Jinja2 HTML template → WeasyPrint → PDF bytes → returned as response.

---

## Phase 5 — Example Query Walkthroughs

### Query 1: "Segment customers into priority, regular and dormant"

```
Planner output:
  intent: "segment"
  tools: ["feature_eng", "segment", "visualize"]
  segmentation_method: "rule"
  segment_labels: ["priority", "regular", "dormant"]
  filters: {}

Execution:
  1. feature_eng: compute txn_frequency_per_month, recency, avg_balance
  2. segment:     apply RULE_TEMPLATES → label each customer
  3. visualize:   pie chart of segment distribution + bar chart of avg metrics

Response:
  "I segmented 823,411 customers using rule-based logic:
   - Priority (18%): balance > £100k AND txn_freq > 15/month
   - Dormant (24%): recency > 90 days OR txn_freq < 2/month
   - Regular (58%): remaining customers
   [TABLE: segment | count | avg_balance | avg_txn_freq]
   [CHART: pie chart]
   [DOWNLOAD: customers_segmented.csv]

   Follow-up: Would you like to see which regular customers are closest to becoming priority?"
```

---

### Query 2: "On what basis were priority customers selected?"

```
Planner output:
  intent: "explain"
  tools: ["explain"]
  filters: {"segment": "priority"}

Execution:
  1. explain: fetch_rules("priority") → return rule definition

Response:
  "Priority customers were selected using the following rules:
   ✓ Average account balance > £100,000
   ✓ Transaction frequency > 15 transactions per month
   Customers satisfying both conditions are classified as Priority."
```

---

### Query 3: "Which regular customers can become priority customers?"

```
Planner output:
  intent: "transition"
  tools: ["feature_eng", "segment", "recommend"]
  filters: {"from_segment": "regular", "to_segment": "priority"}

Execution:
  1. feature_eng: compute transition_potential for all regular customers
  2. segment:     find_transition_candidates(from="regular", to="priority", top_n=50)
  3. recommend:   for each candidate, list products to accelerate transition

Response:
  "Here are the top 50 regular customers with the highest potential to become priority:
   [TABLE: CustomerID | transition_score | gap_avg_balance | gap_txn_freq | recommended_actions]
   
   Example: Customer #482901 (transition score: 0.91)
   - Needs +£23,400 in avg balance
   - Needs +6 more transactions/month
   - Recommended: Salary account upgrade, savings booster plan"
```

---

## Phase 6 — Model Evaluation

**File**: `backend/models/clustering.py`

Metrics computed for every clustering run:

| Metric | Purpose |
|---|---|
| Silhouette Score | Cluster separation quality |
| Davies-Bouldin Index | Cluster compactness |
| Calinski-Harabasz Score | Cluster definition quality |
| Inertia (KMeans only) | Within-cluster variance |
| Cluster size balance | Check for degenerate clusters |

All metrics are stored in `tool_outputs["segment"]["evaluation"]` and surfaced in the response narrative.

---

## Implementation Sequence (Weekend Hackathon Timeline)

### Day 1 — Backend Core

| Time | Task |
|---|---|
| 0–2h | Data pipeline: load Kaggle dataset, build `customer_features.csv` |
| 2–4h | EDA tool + Feature engineering tool (all functions) |
| 4–6h | Segmentation tool: rule engine + KMeans + HDBSCAN |
| 6–8h | FastAPI skeleton + DB models + /chat endpoint |
| 8–10h | LangGraph graph: planner + supervisor + state machine |

### Day 2 — Agent Intelligence + Frontend

| Time | Task |
|---|---|
| 0–2h | Response generator + persona prompt + narrative LLM integration |
| 2–4h | Explainability tool (SHAP) + Recommendation rule engine |
| 4–6h | Transition predictor + human-in-the-loop flow |
| 6–8h | Next.js frontend: chat UI + chart rendering + HITL components |
| 8–9h | Dashboard + segment detail pages |
| 9–10h | PDF export + follow-up suggestions + end-to-end testing |

---

## Resolved Decisions

### LLM Provider & Model Picker — DeepInfra ✓

All LLM calls go through DeepInfra's **OpenAI-compatible API** at `https://api.deepinfra.com/v1/openai`.
The model picker exposes the full DeepInfra catalog, grouped by provider, with reasoning models clearly labelled.

#### Complete `AVAILABLE_MODELS` Registry

**File**: `backend/config.py`

```python
AVAILABLE_MODELS = {

    # ── GOOGLE GEMINI ──────────────────────────────────────────────────────────
    "google/gemini-3.1-pro": {
        "display": "Gemini 3.1 Pro",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Latest Gemini Pro — best quality, massive context",
    },
    "google/gemini-3.5-flash": {
        "display": "Gemini 3.5 Flash",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait", "myra"],
        "description": "Ultra-fast, large context, best for production",
    },
    "google/gemini-3.1-flash-lite": {
        "display": "Gemini 3.1 Flash Lite",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Lowest latency — ideal for intent extraction",
    },
    "google/gemini-2.5-pro": {
        "display": "Gemini 2.5 Pro",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fast",
        "reasoning": True,               # ← thinking mode available
        "thinking_budget": 8192,         # tokens allocated to thinking
        "recommended_for": ["advait", "myra"],
        "description": "Pro with built-in thinking — great for complex queries",
    },
    "google/gemini-2.5-flash": {
        "display": "Gemini 2.5 Flash",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fast",
        "reasoning": True,               # ← thinking mode available
        "thinking_budget": 4096,
        "recommended_for": ["advait"],
        "description": "Flash with thinking — fast + reasoning combined",
    },
    "google/gemini-3-pro-image": {
        "display": "Gemini 3 Pro Image",
        "provider": "Google",
        "context_window": 128_000,
        "speed": "medium",
        "reasoning": False,
        "recommended_for": [],
        "description": "Multimodal — future use for chart understanding",
    },

    # ── META LLAMA ─────────────────────────────────────────────────────────────
    "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo": {
        "display": "Llama 3.3 70B Turbo",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait", "myra"],
        "description": "Best open-source instruct model, high throughput",
    },
    "meta-llama/Meta-Llama-3.1-70B-Instruct": {
        "display": "Llama 3.1 70B",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Reliable, widely tested 70B model",
    },
    "meta-llama/Meta-Llama-3.1-8B-Instruct": {
        "display": "Llama 3.1 8B",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Fastest open model — for quick intent parsing",
    },
    "meta-llama/Meta-Llama-3.1-405B-Instruct": {
        "display": "Llama 3.1 405B",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "medium",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Most capable open model — highest quality responses",
    },
    "meta-llama/Llama-3.2-11B-Vision-Instruct": {
        "display": "Llama 3.2 11B Vision",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": [],
        "description": "Multimodal — future chart analysis",
    },
    "nvidia/Llama-3.1-Nemotron-70B-Instruct": {
        "display": "Nemotron 70B",
        "provider": "NVIDIA",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "NVIDIA fine-tune of Llama 3.1 — strong instruction following",
    },

    # ── DEEPSEEK (REASONING) ────────────────────────────────────────────────────
    "deepseek-ai/DeepSeek-R1": {
        "display": "DeepSeek R1",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "slow",
        "reasoning": True,               # ← emits <think>...</think> tokens
        "recommended_for": ["advait", "myra"],
        "description": "Full 671B reasoning model — most thorough analysis",
    },
    "deepseek-ai/DeepSeek-R1-Distill-Llama-70B": {
        "display": "DeepSeek R1 70B",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "medium",
        "reasoning": True,               # ← emits <think>...</think> tokens
        "recommended_for": ["advait", "myra"],
        "description": "R1 reasoning distilled into Llama 70B — balanced",
    },
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B": {
        "display": "DeepSeek R1 Qwen 32B",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "medium",
        "reasoning": True,               # ← emits <think>...</think> tokens
        "recommended_for": ["advait"],
        "description": "R1 reasoning distilled into Qwen 32B — compact reasoning",
    },
    "deepseek-ai/DeepSeek-R1-Distill-Llama-8B": {
        "display": "DeepSeek R1 8B",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "fast",
        "reasoning": True,               # ← emits <think>...</think> tokens
        "recommended_for": ["advait"],
        "description": "Smallest R1 distill — fast reasoning for simple intent",
    },
    "deepseek-ai/DeepSeek-V3": {
        "display": "DeepSeek V3",
        "provider": "DeepSeek",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "High-quality non-reasoning model from DeepSeek",
    },

    # ── QWEN ────────────────────────────────────────────────────────────────────
    "Qwen/QwQ-32B": {
        "display": "QwQ 32B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "medium",
        "reasoning": True,               # ← emits <think>...</think> tokens
        "recommended_for": ["advait", "myra"],
        "description": "Qwen reasoning model — strong math and logic",
    },
    "Qwen/Qwen2.5-72B-Instruct": {
        "display": "Qwen 2.5 72B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Best Qwen instruct model — excellent reasoning without CoT",
    },
    "Qwen/Qwen2.5-32B-Instruct": {
        "display": "Qwen 2.5 32B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Compact Qwen — good speed/quality tradeoff",
    },
    "Qwen/Qwen2.5-7B-Instruct": {
        "display": "Qwen 2.5 7B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Smallest Qwen — very fast, basic tasks",
    },
    "Qwen/Qwen2.5-Coder-32B-Instruct": {
        "display": "Qwen 2.5 Coder 32B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": [],
        "description": "Code-specialized — future use for generated SQL/Python",
    },

    # ── MISTRAL ─────────────────────────────────────────────────────────────────
    "mistralai/Mistral-Small-24B-Instruct-2501": {
        "display": "Mistral Small 24B",
        "provider": "Mistral",
        "context_window": 32_768,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Mistral's latest small model — good instruction following",
    },
    "mistralai/Mixtral-8x7B-Instruct-v0.1": {
        "display": "Mixtral 8×7B MoE",
        "provider": "Mistral",
        "context_window": 32_768,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "MoE architecture — fast, strong at structured tasks",
    },
    "mistralai/Mistral-7B-Instruct-v0.3": {
        "display": "Mistral 7B",
        "provider": "Mistral",
        "context_window": 32_768,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Baseline fast model — lowest cost",
    },

    # ── MICROSOFT ────────────────────────────────────────────────────────────────
    "microsoft/phi-4": {
        "display": "Phi-4",
        "provider": "Microsoft",
        "context_window": 16_384,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Small but surprisingly capable — efficient intent extraction",
    },
    "microsoft/WizardLM-2-8x22B": {
        "display": "WizardLM 2 8×22B",
        "provider": "Microsoft",
        "context_window": 65_536,
        "speed": "medium",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Large MoE — high quality narrative generation",
    },
}

DEFAULT_MODEL      = "google/gemini-3.5-flash"   # default for both agents
DEFAULT_ADV_MODEL  = "google/gemini-3.1-flash-lite"  # Advait default (fastest)
DEFAULT_MYRA_MODEL = "google/gemini-3.1-pro"         # Myra default (best quality)
```

#### Model Picker API

```
GET  /models                         → grouped model list with all metadata
GET  /models/recommended             → {advait: [...], myra: [...]} recommended models
POST /models/select                  → {"model_id": "...", "api_key": "?", "scope": "both|advait|myra"}
GET  /models/current                 → {advait: model_info, myra: model_info}
```

The `scope` field lets the user pick different models for Advait (fast/cheap intent extraction) vs Myra (high-quality narrative). This is surfaced in the UI as two separate selectors.

#### Model Picker UI

```
Model                          ← section header
──────────────────────────────
Intent Agent (Advait)
  ◈ Gemini 3.1 Flash Lite ▾   ← fast, structured output
  
Response Agent (Myra)
  ◈ Gemini 3.1 Pro ▾          ← quality narrative
──────────────────────────────
Reasoning                      ← section header (thinking models)
 ⚡ DeepSeek R1 (both agents)  ← single pick applies to both
──────────────────────────────
API Key  [••••••••] [Edit]
```

---

### Chain-of-Thinking Architecture ✓

Reasoning models (DeepSeek R1, QwQ, Gemini 2.5 with thinking mode) expose their internal reasoning process — a scratchpad where the model "thinks out loud" before producing the final answer. This must be handled explicitly in the backend and surfaced visually in the frontend.

#### How reasoning models work

**DeepSeek R1 / QwQ** — emit `<think>` XML tags in the stream:
```
<think>
The user wants to segment customers. I need to figure out if they want rule-based 
or ML-based. They said "priority, regular, dormant" — those are named segments, 
so this is rule-based. I should set method=rule and segment_label_hints=[...].
Let me also check if they specified any thresholds...
</think>
I'll segment your customers using rule-based logic with three groups...
```

**Gemini 2.5 Flash/Pro** — thinking is controlled via the `thinking_budget` parameter in the API call. The thinking content arrives in a separate `reasoning_content` field on the delta.

#### Backend: Thinking Token Extractor

**File**: `backend/agents/thinking.py`

```python
import re
from dataclasses import dataclass
from typing import AsyncGenerator

@dataclass
class StreamChunk:
    type: str       # "thinking" | "text"
    content: str

THINK_OPEN  = re.compile(r'<think>', re.IGNORECASE)
THINK_CLOSE = re.compile(r'</think>', re.IGNORECASE)

async def stream_with_thinking(stream) -> AsyncGenerator[StreamChunk, None]:
    """
    Wraps an OpenAI streaming response. Separates <think>...</think> tokens
    from the final answer text. Works for DeepSeek R1, QwQ, and Gemini thinking.
    """
    buffer = ""
    in_think = False

    async for chunk in stream:
        delta = chunk.choices[0].delta

        # Gemini thinking mode: arrives in reasoning_content field
        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
            yield StreamChunk(type="thinking", content=delta.reasoning_content)
            continue

        content = delta.content or ""
        buffer += content

        while buffer:
            if in_think:
                close_match = THINK_CLOSE.search(buffer)
                if close_match:
                    # Flush everything before </think> as thinking
                    thinking_part = buffer[:close_match.start()]
                    if thinking_part:
                        yield StreamChunk(type="thinking", content=thinking_part)
                    buffer = buffer[close_match.end():]
                    in_think = False
                else:
                    # All buffered content is thinking
                    yield StreamChunk(type="thinking", content=buffer)
                    buffer = ""
            else:
                open_match = THINK_OPEN.search(buffer)
                if open_match:
                    # Flush text before <think> as normal text
                    text_part = buffer[:open_match.start()]
                    if text_part:
                        yield StreamChunk(type="text", content=text_part)
                    buffer = buffer[open_match.end():]
                    in_think = True
                else:
                    # No <think> tag — all normal text
                    yield StreamChunk(type="text", content=buffer)
                    buffer = ""
```

#### Backend: Myra streaming with thinking SSE events

**File**: `backend/agents/myra.py` (updated stream loop)

```python
async def run_myra(state: AgentState):
    client = get_llm_client(state['session_api_key'])
    model_id = state['session_myra_model']
    model_meta = AVAILABLE_MODELS[model_id]

    extra_kwargs = {}
    # Gemini thinking mode: pass thinking_budget if supported
    if model_meta.get("reasoning") and "gemini" in model_id:
        extra_kwargs["extra_body"] = {
            "thinking": {"type": "enabled", "budget_tokens": model_meta.get("thinking_budget", 4096)}
        }

    stream = await client.chat.completions.create(
        model=model_id,
        messages=MYRA_RESPONSE_PROMPT(build_myra_context(state)),
        stream=True,
        max_tokens=1200,
        **extra_kwargs,
    )

    # Emit model info at start of stream
    yield SSEEvent(type="model_info", data={"model_id": model_id, "display": model_meta["display"]})

    # Stream with thinking separation
    has_thinking = False
    async for chunk in stream_with_thinking(stream):
        if chunk.type == "thinking":
            if not has_thinking:
                yield SSEEvent(type="thinking_start")   # signal UI to open thinking panel
                has_thinking = True
            yield SSEEvent(type="thought_chunk", data={"content": chunk.content})
        else:
            if has_thinking:
                yield SSEEvent(type="thinking_end")     # signal UI to close thinking panel
                has_thinking = False
            yield SSEEvent(type="text_chunk", data={"content": chunk.content})
```

#### Similarly for Advait (intent extraction with thinking)

```python
async def run_advait(state: AgentState):
    model_id = state['session_advait_model']
    model_meta = AVAILABLE_MODELS[model_id]

    # For reasoning models: use regular (non-structured) output + parse JSON manually
    # because DeepSeek R1 doesn't support response_format=BaseModel natively
    if model_meta.get("reasoning"):
        response = await call_with_thinking_parse(state, model_id, model_meta)
    else:
        response = await call_structured_output(state, model_id)

    return response
```

For reasoning models, Advait uses a different prompt that asks the model to output JSON explicitly in its final answer (after thinking), then parse it with a regex JSON extractor rather than `beta.chat.completions.parse`.

#### Updated SSE Event Schema (with thinking events)

```ts
type AgentName = 'advait' | 'vihaan' | 'kabir' | 'ishaan' | 'aadhya' | 'saanvi' | 'myra'

type AgentEvent =
  // ── Model info ──────────────────────────────────────────────────
  | { type: 'model_info';       data: { model_id: string; display: string; reasoning: boolean } }

  // ── Agent lifecycle ─────────────────────────────────────────────
  | { type: 'agent_start';      data: { agent: AgentName; role: string } }
  | { type: 'agent_complete';   data: { agent: AgentName; duration_ms: number; summary: string } }

  // ── Tool trace ─────────────────────────────────────────────────
  | { type: 'intent_detected';  data: { intent: string; method: string | null; agent_plan: AgentName[] } }
  | { type: 'columns_resolved'; data: { columns: string[]; row_count: number } }
  | { type: 'tool_start';       data: { agent: AgentName; tool: string } }
  | { type: 'tool_progress';    data: { agent: AgentName; progress: number; message: string } }
  | { type: 'tool_complete';    data: { agent: AgentName; duration_ms: number; summary: string } }
  | { type: 'tool_error';       data: { agent: AgentName; error: string } }

  // ── Chain-of-thinking ──────────────────────────────────────────
  | { type: 'thinking_start' }                               // reasoning model started thinking
  | { type: 'thought_chunk';    data: { content: string } }  // streaming thought token
  | { type: 'thinking_end' }                                 // thinking complete, final answer follows

  // ── Output ─────────────────────────────────────────────────────
  | { type: 'text_chunk';         data: { content: string } }
  | { type: 'structured_output';  data: { kind: 'table' | 'chart' | 'csv'; payload: unknown } }
  | { type: 'suggestions';        data: { chips: string[] } }
  | { type: 'clarification';      data: { question: string; options: string[]; asking_agent: AgentName } }
  | { type: 'done' }
```

#### Frontend: Thinking Panel in TraceStream

When `thinking_start` arrives, the TraceStream opens a collapsible "Reasoning" panel above the Myra row:

```
┌──────────────────────────────────────────────────────────────┐
│  ✦ Myra  ·  DeepSeek R1 70B                    thinking...  │  ← reasoning model badge
│  ┌── Reasoning ──────────────────────────────────────────┐  │
│  │  The user wants to segment customers into priority,   │  │  ← streaming, monospace, muted
│  │  regular and dormant. This is clearly rule-based      │  │
│  │  because they named the groups. I need to set         │  │
│  │  method=rule in the plan and pass balance and         │  │
│  │  txn_frequency as the key features...                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                      ⟳ generating answer... │
└──────────────────────────────────────────────────────────────┘
```

After `thinking_end`, the panel auto-collapses to a `▾ Reasoning (842 tokens)` disclosure. The main response text then streams below.

```tsx
// ThinkingPanel.tsx
import { motion, AnimatePresence } from 'motion/react'

export function ThinkingPanel({ thoughts, isActive, tokenCount }) {
  const [expanded, setExpanded] = useState(true)

  // Auto-collapse when thinking ends
  useEffect(() => {
    if (!isActive && thoughts.length > 0) {
      const timer = setTimeout(() => setExpanded(false), 800)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  return (
    <div className="thinking-panel">
      <button
        className="thinking-header"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="thinking-icon">◎</span>
        {isActive ? "Reasoning..." : `▾ Reasoning (${tokenCount} tokens)`}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            <pre className="thought-text">{thoughts}</pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**CSS for thinking panel:**
```css
.thinking-panel {
  border-left: 2px solid var(--agent-myra);
  margin: 8px 0;
  border-radius: 0 6px 6px 0;
  background: rgba(236, 72, 153, 0.04);
}
.thinking-header {
  padding: 6px 12px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  cursor: pointer;
  width: 100%;
  text-align: left;
}
.thought-text {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-tertiary);
  padding: 8px 12px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
}
```

Animation rules for thinking panel:
- **While streaming**: no animation on individual characters — text just appears (cursor-like, too frequent for animation)
- **On `thinking_end` + auto-collapse**: `height: auto → 0`, 250ms, `--ease-drawer` — earns animation because it's a spatial change signalling a state transition
- **On manual expand/collapse**: same 250ms height animation

**State persistence**: After the thinking panel collapses, the full thought text is still accessible via the `▾ Reasoning` disclosure toggle. The thought content is never thrown away.

---

### Dataset Access — Local CSVs in `datasets/` ✓

All 4 datasets are downloaded and stored as `.csv` files in `datasets/`. Update the path constants in `build_master.py`:

```python
RAW = Path("datasets")    # ← points to user's datasets/ folder

DS1_PATH = RAW / "bank_transactions.csv"        # or whatever the actual filenames are
DS2_PATH = RAW / "bank_churn.csv"
DS3_PATH = RAW / "india_financial_profiles.csv"
DS4_PATH = RAW / "credit_card.csv"
```

Check the actual filenames in `datasets/` before running — rename to match the above if needed.

---

### Deployment — Ubuntu VPS ✓

Target: Ubuntu VPS (hackathon demo, public URL).

**Backend** (FastAPI):
```bash
# Install
pip install gunicorn uvicorn[standard]

# Run with gunicorn + uvicorn workers
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or with pm2 (if Node ecosystem preferred)
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name backend
```

**Frontend** (Next.js):
```bash
npm run build
# Option A: pm2
pm2 start "npm start" --name frontend
# Option B: serve with nginx as static export
```

**Nginx reverse proxy** (`/etc/nginx/sites-available/segwise`):
```nginx
server {
    listen 80;
    server_name your-vps-ip-or-domain;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # SSE requires these headers
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

> [!IMPORTANT]
> SSE (Server-Sent Events) requires `proxy_buffering off` in nginx — otherwise the agent trace stream will appear frozen and only flush at the end. Don't forget this.

Add `DEEPINFRA_API_KEY=sk-...` to a `.env` file in `backend/` and load it with `python-dotenv`. Never commit `.env` to git.

---

### Clustering — Rule-based vs ML (Clarified) ✓

**Plain-English explanation:**

When a user asks about segments, there are two ways the system can create them:

**Rule-based** — the user tells the system *what the segments mean*:
> "Segment into **priority**, **regular**, and **dormant**"

The system applies predefined business logic:
- Priority = balance > ₹1L AND transactions > 15/month
- Dormant = no transaction in 90+ days OR < 2 transactions/month
- Regular = everyone else

This is fast, deterministic, and easy to explain.

**ML-based (clustering)** — the user asks the system to *discover* groups it doesn't know about yet:
> "What natural customer groups exist in our data?"

The system runs KMeans or HDBSCAN, finds clusters automatically, and Myra names them ("Digital Young Professional", "Dormant Savers", etc.).

**Decision: opt-in (one or the other, not both in parallel)**

- If the user names segments → rule-based only (Ishaan applies RULE_TEMPLATES)
- If the user says "discover groups" / "find natural segments" / doesn't name them → ML-based only
- Running both in parallel would double the compute time and confuse the output

This aligns with the problem statement: *"Performs rule-based OR ML-based clustering"* — they are alternatives, chosen by the user's phrasing.

---

### Explainability Scale — Segment-level batch + on-demand per customer ✓

**Decision based on problem statement:**

The problem statement says:
> *"Explainability Tool: Explains why a particular customer belongs to a segment"*
> *"If ML algorithm was used, it should return some distinguishing features of priority customers"*

This means **two tiers** of explainability:

**Tier 1 — Segment-level (computed in batch immediately after Ishaan runs)**

After every segmentation run, Aadhya pre-computes feature importance at the **cluster level** — not per individual customer. This answers: *"What makes Priority customers different from Regular customers?"*

- For rule-based: trivially the rule conditions
- For ML: compute SHAP values on a **representative sample of 500 customers per cluster** (not all 800k). Run once, store results.

```python
# Aadhya batch: ~500 per cluster × N clusters × SHAP ≈ manageable
sample_per_cluster = 500
for cluster_id in unique_clusters:
    cluster_rows = df[df['segment'] == cluster_id].sample(sample_per_cluster, random_state=42)
    shap_values = explainer.shap_values(cluster_rows[features])
    segment_feature_importance[cluster_id] = mean_abs_shap(shap_values, features)
```

**Tier 2 — Per-customer (on-demand only)**

When the user asks about a specific individual:
> *"Why is customer #48291 classified as Regular?"*

Aadhya computes SHAP for that one row on-demand. Fast — single customer takes < 1 second.

This matches the problem statement's example: it asks about segment-level explanation ("On what basis were priority customers selected?") — not individual SHAP for 800k rows.

---

## Verification Plan

### Automated
```bash
# Data pipeline
python -m data.pipeline.build_master            # Quality gate + output stats
pytest backend/tests/test_extract.py            # Per-dataset extraction
pytest backend/tests/test_normalize.py          # Imputation conditionality

# Agent unit tests (mock LLM + fixture DataFrames)
pytest backend/tests/test_advait.py             # Intent accuracy on 10 examples
pytest backend/tests/test_vihaan.py             # Column resolution
pytest backend/tests/test_ishaan.py             # Rule engine + KMeans smoke test
pytest backend/tests/test_aadhya.py             # SHAP batch output shape + values
pytest backend/tests/test_saanvi.py             # Product rule coverage

# Graph integration
pytest backend/tests/test_graph.py              # Full pipeline, mock LLM

# API
pytest backend/tests/test_api.py                # All endpoints + SSE event sequence
```

### Manual
- Run all 4 example queries from the problem statement; verify outputs match expectations
- Verify HITL: "Segment VIP customers" → Advait asks for clarification
- Verify rule-based path: user names segments → no ML call, instant results
- Verify ML path: "discover groups" → KMeans runs, Myra names clusters
- Switch model mid-session via Model Switcher → next query uses new model
- Verify SSE trace shows all 7 agent names with correct colours
- Verify CSV export works for each segment type
- Verify PDF report generates with embedded charts
- On VPS: verify SSE stream is live (not buffered) through nginx
