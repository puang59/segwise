"""
Agent State Envelope Definition for LangGraph State Machine.

Defines the rigid `AgentState` TypedDict used to pass state through all
specialized sub-agents (Atlas, Scout, Forge, Mosaic, Prism, Compass, Loom).
"""

import uuid
from typing import Dict, Any, List, Optional, TypedDict
from backend.config import DEFAULT_ADV_MODEL, DEFAULT_LOOM_MODEL


class AgentState(TypedDict, total=False):
    """
    Rigid pass-through state envelope shared across all agents in the LangGraph workflow.
    """

    # ── 1. SESSION & CONTEXT ───────────────────────────────────────────────────
    messages: List[Dict[str, Any]]
    conversation_id: str
    session_atlas_model: str
    session_loom_model: str
    session_api_key: Optional[str]

    # ── 2. ATLAS OUTPUTS (Intent & Plan Extraction) ──────────────────────────
    intent: Optional[str]                          # "eda" | "segment" | "explain" | "recommend" | "aggregate"
    agent_plan: Optional[List[str]]                # Ordered list of sub-agent tool nodes to execute
    filters: Optional[Dict[str, Any]]              # Filtering dict, e.g. {"credit_risk_tier": "Low"}
    segmentation_method: Optional[str]             # "rule" | "kmeans" | "hdbscan" | "gmm"
    segment_label_hints: Optional[List[str]]        # Proposed labels, e.g. ["High Value", "Dormant"]
    clarification_needed: bool                     # Human-in-the-loop flag
    clarification_question: Optional[str]          # Clarifying question to frontend

    # ── 3. SCOUT OUTPUTS (Data Scout & Column Resolver) ─────────────────────
    resolved_columns: Optional[List[str]]          # Columns validated against DB schema
    row_count: Optional[int]                       # Rows matched after filter application
    dataset_summary: Optional[Dict[str, Any]]      # Dataset metadata & profile summary

    # ── 4. FORGE OUTPUTS (Feature Engineering) ────────────────────────────────
    engineered_features: Optional[List[str]]       # Computed derived features
    df_path: Optional[str]                         # Temporary Parquet/CSV file path for pipeline

    # ── 5. MOSAIC OUTPUTS (Segmentation Engine) ──────────────────────────────
    segment_assignments: Optional[Any]             # Array or dict of cluster/rule assignments
    segment_stats: Optional[Dict[str, Any]]        # Per-segment statistical metrics (mean, median, count)
    cluster_model_path: Optional[str]              # Saved model object path
    evaluation_metrics: Optional[Dict[str, Any]]   # Silhouette score, inertia, DB index

    # ── 6. PRISM OUTPUTS (Explainability & SHAP) ─────────────────────────────
    segment_shap: Optional[Dict[str, Any]]         # SHAP feature importance values
    explanations: Optional[Dict[str, Any]]         # Key segment drivers and distinguishing factors

    # ── 7. COMPASS OUTPUTS (Actionable Recommendations) ────────────────────────
    recommendations: Optional[List[Dict[str, Any]]] # Banking strategy recommendations per segment

    # ── 8. LOOM OUTPUTS (Response Synthesizer) ────────────────────────────────
    narrative: Optional[str]                        # Executive synthesis response text
    follow_up_chips: Optional[List[str]]           # Next suggested user prompt chips
    chart_specs: Optional[List[Dict[str, Any]]]     # Structured Recharts chart specs

    # ── 9. CROSS-TURN MEMORY & TOOL OUTPUTS ───────────────────────────────────
    current_segments: Optional[Dict[str, Any]]     # Most recently computed active segments
    tool_outputs: Optional[Dict[str, Any]]          # Output dictionary keyed by tool/agent name


def create_initial_state(
    user_message: str,
    conversation_id: Optional[str] = None,
    atlas_model: str = DEFAULT_ADV_MODEL,
    loom_model: str = DEFAULT_LOOM_MODEL,
    api_key: Optional[str] = None,
    current_segments: Optional[Dict[str, Any]] = None,
) -> AgentState:
    """
    Factory helper to initialize a clean `AgentState` for a new conversation turn.
    """
    cid = conversation_id or str(uuid.uuid4())
    state: AgentState = {
        "messages": [{"role": "user", "content": user_message}],
        "conversation_id": cid,
        "session_atlas_model": atlas_model,
        "session_loom_model": loom_model,
        "session_api_key": api_key,
        "intent": None,
        "agent_plan": [],
        "filters": {},
        "segmentation_method": None,
        "segment_label_hints": [],
        "clarification_needed": False,
        "clarification_question": None,
        "resolved_columns": [],
        "row_count": 0,
        "dataset_summary": {},
        "engineered_features": [],
        "df_path": None,
        "segment_assignments": None,
        "segment_stats": {},
        "cluster_model_path": None,
        "evaluation_metrics": {},
        "segment_shap": {},
        "explanations": {},
        "recommendations": [],
        "narrative": None,
        "follow_up_chips": [],
        "chart_specs": [],
        "current_segments": current_segments or {},
        "tool_outputs": {},
    }
    return state
