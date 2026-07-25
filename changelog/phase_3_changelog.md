# Phase 3 Changelog: Backend FastAPI & SSE Real-Time Streaming Server

## Overview
Phase 3 completes the implementation of the core FastAPI backend application (`segwise-api`), Server-Sent Events (SSE) real-time streaming chat endpoint, dynamic multi-model registry switcher, customer and segment analytics REST API endpoints, and executive 9-section PDF/CSV export engine.

---

## Key Achievements & Implementation Summary

### 1. FastAPI Core Server & Routing Engine
- **File**: `backend/main.py`
- Initialized FastAPI application with metadata title `"segwise-api"`.
- Configured CORS middleware allowing origins (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:8000`, `http://127.0.0.1:8000`).
- Registered lifecycle startup hook to initialize SQLite database tables via `init_db()`.
- Included API router modules: `chat_router`, `models_router`, `segments_router`, `customers_router`, `export_router`.
- Added health check status endpoint `GET /`.

### 2. SSE Real-Time Streaming Chat Endpoint
- **File**: `backend/routers/chat.py`
- Defined `ChatRequest` schema (`message`, `conversation_id`, `advait_model`, `myra_model`, `api_key`).
- Implemented `POST /chat` streaming endpoint yielding structured Server-Sent Events (SSE) over `text/event-stream`.
- Dispatched complete SSE event stream payload:
  - `model_info`: `{"model_id": ..., "display": ..., "reasoning": ...}`
  - `agent_start`: `{"agent": "advait", "role": ...}`
  - `intent_detected`: `{"intent": ..., "agent_plan": [...]}`
  - `columns_resolved`: `{"columns": [...], "row_count": ...}`
  - `tool_start` / `tool_progress` / `tool_complete` / `tool_error`
  - `thinking_start` / `thought_chunk` / `thinking_end`
  - `text_chunk`: `{"content": "..."}`
  - `structured_output`: `{"kind": "table"|"chart", "payload": ...}`
  - `suggestions`: `{"chips": [...]}`
  - `clarification`: `{"question": ..., "options": [...]}`
  - `done`: `{"status": "success", "conversation_id": ...}`
- Integrated database session persistence logging initial user queries and assistant narrative outputs.

### 3. Dynamic Model Switcher Endpoints
- **File**: `backend/routers/models.py`
- `GET /models`: Returns full `AVAILABLE_MODELS` list (20+ DeepInfra/Google/Meta models) grouped by LLM provider.
- `GET /models/recommended`: Returns recommended defaults (`advait`: Gemini 3.1 Flash Lite / Llama 8B, `myra`: Gemini 3.1 Pro / Llama 70B).
- `POST /models/select`: Updates model selection per active session (`scope`: `both` | `advait` | `myra`).
- `GET /models/current`: Returns currently active models for a session ID.

### 4. Segments Analytics REST API Endpoints
- **File**: `backend/routers/segments.py`
- `GET /segments`: Returns overview stats of all segments (customer count, portfolio share percentage, average balance, average credit score, average age, and top product recommendations).
- `GET /segments/{id}`: Returns comprehensive segment detail profile, persona description, recommended products, and a sample customer list.

### 5. Customers Directory REST API Endpoints
- **File**: `backend/routers/customers.py`
- `GET /customers`: Returns paginated list of customers with filtering by `segment`, `city`, `min_balance`, `max_balance`, and `search` query.
- `GET /customers/{id}`: Returns complete customer profile including raw demographic features, engineered composite features, segment label assignment, SHAP explanation breakdown, and Saanvi product recommendations.

### 6. Executive PDF & CSV Export Engine
- **File**: `backend/routers/export.py`
- `POST /export/csv`: Streams CSV file export of segment customer records.
- `POST /export/pdf`: Renders a 9-section Jinja2 HTML report template and compiles it into an executive PDF document using WeasyPrint:
  1. Cover page (Bank name, date, agent metadata)
  2. Executive Summary (LLM narrative)
  3. Data Overview (row counts, null summary)
  4. EDA Findings
  5. Customer Segments (persona profiles & stats)
  6. Cross-sell Opportunities (Saanvi recommendations)
  7. Retention & Re-activation Strategies
  8. High-Potential Transition Candidates (Top 10 table)
  9. Methodology & Model Evaluation metrics

### 7. Database Session & Persistence Layer Updates
- **File**: `backend/db/database.py`
- Added `get_session(session_id)` and `update_session_models(session_id, advait_model, myra_model)`.
- Updated `create_session` to handle session existence checks gracefully, preventing duplicate primary key errors during repeated chat requests.

---

## Verification & Testing
- Executed automated API endpoint tests covering `GET /`, `GET /models`, `GET /models/recommended`, `POST /models/select`, `GET /models/current`, `GET /segments`, `GET /segments/{id}`, `GET /customers`, `GET /customers/{id}`, `POST /export/csv`, `POST /export/pdf`, and `POST /chat` SSE streaming.
- Verified 100% test pass rate across all endpoints.
- Cleaned up temporary test files.
