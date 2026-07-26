<div align="center">
  <img src="frontend/public/segwise_logo.png" height="50" alt="Segwise" style="vertical-align: middle;" />
  <span style="font-size: 28px; font-weight: bold; margin: 0 30px; vertical-align: middle; color: #a1a1aa;">×</span>
  <img src="frontend/public/sg.png" height="50" alt="SG" style="vertical-align: middle;" />
</div>

<br />

# Segwise — Customer Segmentation & Personalization Copilot

[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![DiceBear](https://img.shields.io/badge/DiceBear-Shape_Grid-purple?style=flat-square)](https://www.dicebear.com/)

An enterprise-grade, multi-agent AI copilot designed for retail banking analytics. Segwise automates exploratory data analysis (EDA), customer segmentation, SHAP feature importance calculation, churn risk breakdown, and personalized product recommendation strategies on high-volume customer databases (800,000+ accounts).

---

## System Architecture

Segwise utilizes a decoupled 3-column client-server architecture. The frontend streams agent reasoning traces via Server-Sent Events (SSE) from a FastAPI microservice backend connected to a relational customer database (`bank_sqlite.db`).

```mermaid
graph TD
    subgraph Client ["Next.js 14 Frontend (Port 3000)"]
        UI["Main Workspace (#FDFDFC Light UI)"]
        Chat["ChatWindow & InputBar"]
        Trace["TraceStream & AgentAvatar (DiceBear)"]
        Panel["ContextPanel (Dither-kit Charts, Data, PDF/CSV)"]
    end

    subgraph Server ["FastAPI Microservice Backend (Port 8000)"]
        Router["/api/v1/chat/stream (SSE)"]
        Registry["Agent Registry & State Envelope"]
        PDF["PDF Export Engine (WeasyPrint)"]
    end

    subgraph Data ["Data & Execution Layer"]
        DB[(bank_sqlite.db / 800k records)]
        LLM["DeepInfra / Meta-Llama 3.1 70B & Gemini"]
    end

    UI --> Chat
    Chat -->|POST Query| Router
    Router -->|SSE Stream| Trace
    Router --> Registry
    Registry --> DB
    Registry --> LLM
    Router -->|Structured Payload| Panel
    Panel -->|Export Request| PDF
```

---

## 8-Agent Orchestration Flow

Rather than a single prompt-response LLM, Segwise deploys an **8-agent specialized pipeline** simulating an entire bank data analytics department:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Atlas as 1. Atlas (Intent Router)
    participant Scout as 2. Scout (Data Scout)
    participant Forge as 3. Forge (Feature Eng)
    participant Mosaic as 4. Mosaic (Segmentation)
    participant Prism as 5. Prism (Explainability)
    participant Compass as 6. Compass (Recommendations)
    participant Quill as 7. Quill (PDF Report)
    participant Loom as 8. Loom (Synthesizer)

    User->>Atlas: "Segment retail customers into priority, regular, & dormant"
    Note over Atlas: Parses query, extracts intent, plans agent pipeline
    Atlas->>Scout: Execute EDA on customer balances & transactions
    Scout->>DB: SQL Query (bank_sqlite.db)
    DB-->>Scout: Raw customer records & summary stats
    Scout-->>Forge: Hand off preprocessed feature vectors
    Forge-->>Mosaic: Compute SHAP feature importance metrics
    Note over Mosaic: Runs K-Means & Rule-Based Clustering
    Mosaic-->>Prism: Partitioned clusters (Priority, Regular, Dormant)
    Note over Prism: Derives personas & explainability profiles
    Prism-->>Compass: Cluster interpretation & churn risk metrics
    Note over Compass: Generates cross-sell & upgrade recommendations
    Compass-->>Quill: Prepares insights for executive export
    Quill-->>Loom: Formats data streams for client consumption
    Note over Loom: Synthesizes final response & formats Markdown tables
    Loom-->>User: Streaming final response + interactive Dither-kit charts
```

### Agent Roles & Responsibilities

| Agent Avatar | Name | Role | Responsibilities |
| :---: | :--- | :--- | :--- |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Atlas&shapeColor=6366f1" width="32" height="32" /> | **Atlas** | Intent & Planning | Parses user query, determines pipeline requirements, handles HITL clarifications. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Scout&shapeColor=0284c7" width="32" height="32" /> | **Scout** | Data Scout | Queries `bank_sqlite.db`, resolves columns, calculates missing values & statistics. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Forge&shapeColor=9333ea" width="32" height="32" /> | **Forge** | Feature Engineer | Computes SHAP feature importance, balance-to-spend ratios, and digital engagement scores. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Mosaic&shapeColor=10b981" width="32" height="32" /> | **Mosaic** | Segmentation Engine | Executes K-Means clustering and business rule-based customer partitioning. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Prism&shapeColor=f43f5e" width="32" height="32" /> | **Prism** | Explainability | Explains segment membership criteria, persona traits, and churn risk factors. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Compass&shapeColor=d97706" width="32" height="32" /> | **Compass** | Recommendations | Identifies upgrade candidates (Regular → Priority) and cross-sell banking products. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Quill&shapeColor=059669" width="32" height="32" /> | **Quill** | PDF Report Generator | Compiles insights into a formal PDF report. |
| <img src="https://api.dicebear.com/10.x/shape-grid/svg?seed=Loom&shapeColor=be185d" width="32" height="32" /> | **Loom** | Synthesizer | Compiles all agent outputs into formatted markdown, tables, and executive summaries. |

---

## Key Features

- **Pristine `#FDFDFC` Light UI**: Designed using Emil Kowalski and Apple Design engineering principles (`scale(0.97)` active press feedback, sub-200ms spring animations).
- **Client-Side DiceBear Shape-Grid Avatars**: Local Data URI generation (`@dicebear/core` + `@dicebear/shape-grid`) for 0-latency, 100% offline avatar rendering dynamically matched to agent theme colors.
- **Dynamic Dither-kit Charts**: Implemented `@dither-kit/cli` composable charts that automatically adapt their color palette to match the generating agent (e.g., Forge uses a purple palette, Mosaic uses emerald green).
- **Real-Time Agent Execution Trace**: Streaming visual feedback with typewriter caret, dot-bounce indicators, and progress shimmers reflecting Live Agent Statuses.
- **Context Panel Controls**: Toggleable right panel displaying interactive dithered charts, customer record tables, and PDF export buttons.
- **Multi-Model Registry**: Hot-swap between state-of-the-art LLMs (Gemini, Llama 3.1 70B) natively through the backend execution envelope.
- **Human-In-The-Loop (HITL)**: Interactive clarification cards when ambiguous query parameters are encountered.
- **Executive PDF & CSV Exports**: Generate comprehensive 9-section PDF reports or export segment data directly to CSV.

---

## Repository Structure

```
segwise/
├── backend/
│   ├── agents/            # 8 specialized AI agents (Atlas..Loom)
│   ├── db/                # SQLite database connection & seed data
│   ├── routers/           # FastAPI SSE stream & REST endpoints
│   ├── services/          # PDF report compiler & CSV exporter
│   ├── tools/             # EDA, Feature Selection, K-Means & Explainability
│   ├── main.py            # FastAPI entrypoint (Port 8000)
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── app/               # Next.js 14 App Router, globals.css, layout.tsx
│   ├── components/        # Chat, Agent Trace, Context Panel, Sidebar, Dither-kit
│   ├── lib/               # API client, types, SSE event parsers
│   └── package.json       # Node.js dependencies
├── problem_statement.txt  # Core business requirements & evaluation criteria
└── README.md
```

---

## Local Setup & Installation

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **Python**: `v3.10` or higher
- **Git**: Installed

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/puang59/segwise.git
cd segwise
```

---

### Step 2: Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate

   # On Windows
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure Environment Variables:
   Create a `.env` file inside the `backend` folder (optional for default local models):
   ```env
   DEEPINFRA_API_KEY=your_deepinfra_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. Start the FastAPI development server:
   From the project root directory (`segwise/`):
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   *(Or if inside the `backend/` directory: `PYTHONPATH=.. uvicorn main:app --reload --port 8000`)*

   The backend API will be live at `http://localhost:8000`. Test endpoint docs at `http://localhost:8000/docs`.

---

### Step 3: Frontend Setup (Next.js 14)

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node modules:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend UI will be live at `http://localhost:3000`.

---

## Example Queries to Test

Try entering these natural language prompts into the chat input bar:

1. **Customer Segmentation Query**:
   > *"Segment retail customers into priority, regular, and dormant tiers based on balance maintained and transaction frequency."*

2. **Explainability & Persona Query**:
   > *"On what basis were priority customers selected and what are their key traits?"*

3. **Aggregation & EDA Query**:
   > *"What is the average transaction size and balance for priority vs regular customers?"*

4. **Recommendation & Cross-Sell Query**:
   > *"Which regular customers can be converted into priority customers? What strategy should be used?"*
