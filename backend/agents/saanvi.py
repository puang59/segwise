"""
SAANVI — Agent 6: Recommendation Agent

Matches segment profiles and customer financial signals against banking PRODUCT_RULES.
Ranks eligible products by priority score.
Pure Python — no LLM calls.
"""

import logging
import pandas as pd
from typing import Dict, Any, List

from backend.agents.state import AgentState
from backend.tools.recommendation import recommend_for_segments, recommend_products

logger = logging.getLogger(__name__)


async def run_saanvi(state: AgentState) -> AgentState:
    """
    Saanvi agent node for LangGraph.
    Applies PRODUCT_RULES per segment, ranks eligible products, writes recommendations.
    """
    intent = state.get("intent", "segment")
    segment_assignments = state.get("segment_assignments") or {}
    df_path = state.get("df_path")

    # Skip for intents that don't need recommendations
    if intent not in ("segment", "recommend"):
        logger.info(f"[Saanvi] Skipping — intent='{intent}' does not require recommendations.")
        return state

    if not segment_assignments:
        logger.warning("[Saanvi] No segment assignments found, skipping recommendations.")
        updated = dict(state)
        updated["recommendations"] = []
        return updated

    recommendations: Dict[str, Any] = {}

    if df_path:
        try:
            import os
            if os.path.exists(df_path):
                df = pd.read_parquet(df_path, engine="pyarrow")
                recommendations = recommend_for_segments(df, segment_assignments, top_n=3)
                logger.info(f"[Saanvi] Computed recommendations for {len(recommendations)} segments")
            else:
                raise FileNotFoundError(f"df_path not found: {df_path}")
        except Exception as e:
            logger.error(f"[Saanvi] Failed to compute from DataFrame: {e}")
            # Fallback: recommend from segment stats
            segment_stats = state.get("segment_stats") or {}
            for seg, stats in segment_stats.items():
                recs = recommend_products(stats, segment_label=seg, top_n=3)
                recommendations[seg] = recs
    else:
        # No DataFrame: use segment stats as representative values
        segment_stats = state.get("segment_stats") or {}
        for seg, stats in segment_stats.items():
            recs = recommend_products(stats, segment_label=seg, top_n=3)
            recommendations[seg] = recs
        logger.info(f"[Saanvi] Computed recommendations from segment stats for {len(recommendations)} segments")

    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["saanvi"] = {
        "segments_with_recs": list(recommendations.keys()),
        "total_recommendations": sum(len(v) for v in recommendations.values()),
        "recommendations": recommendations,
    }

    updated = dict(state)
    # Store as list of {segment, products} for frontend compatibility
    recs_list = [
        {"segment": seg, "products": prods}
        for seg, prods in recommendations.items()
    ]
    updated["recommendations"] = recs_list
    updated["tool_outputs"] = tool_outputs

    return updated
