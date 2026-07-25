"""
VIHAAN — Agent 2: Data Scout

Inspects bank_sqlite.db schemas via PRAGMA table_info, resolves required column names
deterministically based on intent, and computes dataset health summary.
Pure Python — no LLM calls.
"""

import logging
from backend.agents.state import AgentState
from backend.tools.column_resolver import resolve_columns, compute_dataset_health
from backend.db.sqlite_client import get_table_row_count

logger = logging.getLogger(__name__)


async def run_vihaan(state: AgentState) -> AgentState:
    """
    Vihaan agent node for LangGraph.
    Resolves DB columns from intent and computes dataset health summary.
    Writes resolved_columns, row_count, and dataset_summary into state.
    """
    intent = state.get("intent", "eda")
    filters = state.get("filters") or {}
    hints = state.get("segment_label_hints") or []

    logger.info(f"[Vihaan] Resolving columns for intent='{intent}', filters={filters}, hints={hints}")

    # Resolve columns from intent + filters + hints
    resolved = resolve_columns(intent, filters, hints)

    # Get total row count from customer_profile
    try:
        row_count = get_table_row_count("customer_profile")
    except Exception as e:
        logger.error(f"[Vihaan] Failed to get row count: {e}")
        row_count = 0

    # Compute dataset health summary
    try:
        dataset_summary = compute_dataset_health(resolved, sample_limit=5000)
    except Exception as e:
        logger.error(f"[Vihaan] Failed to compute dataset health: {e}")
        dataset_summary = {"total_rows": row_count, "error": str(e)}

    logger.info(f"[Vihaan] Resolved {len(resolved)} columns, row_count={row_count}")

    updated = dict(state)
    updated["resolved_columns"] = resolved
    updated["row_count"] = row_count
    updated["dataset_summary"] = dataset_summary

    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["vihaan"] = {
        "resolved_columns": resolved,
        "row_count": row_count,
        "dataset_summary": dataset_summary,
    }
    updated["tool_outputs"] = tool_outputs

    return updated
