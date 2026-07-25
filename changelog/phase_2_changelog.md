# Phase 2 Changelog: Multi-Agent Handoff Chain & LangGraph Implementation

## Overview
Phase 2 establishes the complete Multi-Agent Handoff Chain using LangGraph, dynamic state routing, deterministic Python analytical tools, machine learning models, explainability engines, recommendation engines, and narrative response synthesis.

---

## Key Achievements & Implementation Summary

### 1. LangGraph Chain Orchestrator & State Machine
- **File**: `backend/agents/graph.py`
- Constructed the 7-agent sequential handoff graph: `START -> advait -> vihaan -> kabir -> ishaan -> aadhya -> saanvi -> myra -> END`.
- Implemented dynamic router functions (`router_after_advait`, `router_after_vihaan`, etc.) enabling agents to be bypassed dynamically based on `agent_plan`.
- Integrated Human-in-the-Loop (HITL) interrupt mechanism triggered when `clarification_needed=True`.
- Configured thread-safe singleton compiled graph with `MemorySaver` checkpointer support.

### 2. Advait Agent (Intent Extractor & Planner)
- **Files**: `backend/prompts/advait_prompt.py`, `backend/agents/advait.py`
- Designed standard system prompt featuring 10 diverse few-shot examples covering intent extraction, filter parsing, and tool routing (`eda`, `segment`, `feature_eng`, `explain`, `recommend`, `aggregate`, `transition`).
- Implemented structured output extraction with Pydantic schema validation (`QueryPlan`).
- Added robust JSON extraction fallbacks with `<think>...</think>` tag stripping for reasoning models (DeepSeek R1, QwQ, Gemini 3.0 Flash Thinking).

### 3. Vihaan Agent (Data Scout) & Column Resolver
- **Files**: `backend/tools/column_resolver.py`, `backend/agents/vihaan.py`
- Built column resolver mapping natural language query keywords, intent types, and filter constraints to SQLite database schema (`customer_profile`).
- Added dataset health summary generator inspecting null rates, sample statistics, distributions, and column types.

### 4. Kabir Agent (Feature Engineer) & Composite Feature Registry
- **Files**: `backend/tools/feature_engineering.py`, `backend/agents/kabir.py`
- Implemented `FEATURE_REGISTRY` containing 9 vectorised composite feature formulas:
  - `engagement_score`, `customer_value_score`, `risk_score`, `savings_ratio`, `credit_utilization`, `recency_score`, `balance_trend`, `product_diversity`, `digital_score`.
- Added temporary Parquet serialization for high-performance intermediate storage during execution turns.

### 5. Ishaan Agent (Segmentation Agent) & Clustering Models
- **Files**: `backend/models/clustering.py`, `backend/tools/segmentation.py`, `backend/agents/ishaan.py`
- Implemented `RULE_TEMPLATES` for rule-based customer segmentation (priority, dormant, regular, high_value).
- Built unsupervised ML clustering models:
  - `KMeans` with automatic $k$ selection using silhouette optimization ($k \in [2, 8]$).
  - `HDBSCAN` density-based clustering with noise point detection.
  - `GMM` with Bayesian Information Criterion (BIC) component selection.
- Added comprehensive cluster evaluation metrics (Silhouette score, Davies-Bouldin index, Calinski-Harabasz score).
- Implemented Customer Transition Predictor (`find_transition_candidates`) using normalized feature-space Euclidean distance and gap analysis.

### 6. Aadhya Agent (Explainability Agent) & SHAP Engine
- **Files**: `backend/tools/explainability.py`, `backend/agents/aadhya.py`
- Implemented Tier-1 Batch SHAP feature importance calculation across clusters (500 samples per cluster).
- Implemented Tier-2 on-demand single customer SHAP explanations.
- Built Rule Trace Inspector (`explain_rule_segment`) providing exact threshold evaluation breakdown for rule-based segments.
- Added group mean difference approximation fallback for rule-based segmentation modes.

### 7. Saanvi Agent (Recommendation Agent) & Banking Product Rules
- **Files**: `backend/tools/recommendation.py`, `backend/agents/saanvi.py`
- Created `PRODUCT_RULES` registry with 11 banking product cross-sell/up-sell eligibility rules.
- Implemented priority scoring, segment affinity boosting, and segment-level product recommendation mapping.

### 8. Myra Agent (Response Synthesizer & Persona Naming)
- **Files**: `backend/prompts/myra_persona_prompt.py`, `backend/prompts/myra_response_prompt.py`, `backend/agents/myra.py`
- Implemented LLM persona generator (`generate_cluster_personas`) transforming ML cluster statistical summaries into business persona names and taglines.
- Built Recharts-compatible chart specification generator (`_build_chart_specs`) emitting bar charts, horizontal bars, and SHAP feature importance charts.
- Implemented SSE streaming handler (`stream_myra`) rendering chain-of-thought tokens, structured outputs, text chunks, and follow-up suggestion chips.

---

## Verification & Testing
- Executed unit tests for all tools, prompts, schemas, and models.
- Conducted full pipeline integration test with live SQLite database (`datasets/bank_sqlite.db`, 50,000 customer records).
- All 12 verification test suites passed successfully.
