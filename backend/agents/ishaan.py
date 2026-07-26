"""
ISHAAN — Agent 4: Segmentation Agent

Performs deterministic rule-based segmentation or unsupervised ML clustering.
Computes evaluation metrics (silhouette, Davies-Bouldin, Calinski-Harabasz).
Pure Python — no LLM calls.
"""

import os
import uuid
import pickle
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional

from backend.agents.state import AgentState
from backend.tools.segmentation import (
    apply_rule_segmentation,
    apply_ml_clustering,
    find_transition_candidates,
    HITL_LABELS,
)

logger = logging.getLogger(__name__)

TEMP_DIR = Path("/tmp")


async def run_ishaan(state: AgentState) -> AgentState:
    """
    Ishaan agent node for LangGraph.
    1. Reads df_path from state (Parquet written by Kabir).
    2. Applies rule-based or ML segmentation based on segmentation_method.
    3. Computes segment stats and evaluation metrics.
    4. Writes segment_assignments, segment_stats, evaluation_metrics, cluster_model_path.
    """
    intent = state.get("intent", "segment")
    method = state.get("segmentation_method") or "rule"
    labels_hints = state.get("segment_label_hints") or []
    filters = state.get("filters") or {}
    df_path = state.get("df_path")
    engineered_features = state.get("engineered_features") or []
    conv_id = state.get("conversation_id") or str(uuid.uuid4())

    # Skip for non-segmentation intents
    if intent not in ("segment", "transition", "explain"):
        logger.info(f"[Ishaan] Skipping — intent='{intent}' does not require segmentation.")
        return state

    # Load DataFrame from Parquet
    if not df_path or not os.path.exists(df_path):
        logger.error(f"[Ishaan] Parquet file not found at: {df_path}")
        updated = dict(state)
        updated["segment_assignments"] = {}
        updated["segment_stats"] = {}
        updated["evaluation_metrics"] = {"error": "Parquet file not found"}
        return updated

    try:
        df = pd.read_parquet(df_path, engine="pyarrow")
        logger.info(f"[Ishaan] Loaded DataFrame: {df.shape}")
    except Exception as e:
        logger.error(f"[Ishaan] Failed to load Parquet: {e}")
        updated = dict(state)
        updated["segment_stats"] = {}
        updated["evaluation_metrics"] = {"error": str(e)}
        return updated

    segment_assignments_dict: Dict[str, str] = {}
    segment_stats: Dict[str, Any] = {}
    eval_metrics: Dict[str, Any] = {}
    model_path: Optional[str] = None

    # ── Handle transition intent ──────────────────────────────────────────────
    if intent == "transition":
        from_seg = filters.get("from_segment", "regular")
        to_seg = filters.get("to_segment", "priority")

        # First we need segments — run rule-based to establish them
        rule_labels = [from_seg, to_seg]
        for lbl in rule_labels:
            if lbl not in ("priority", "dormant", "regular", "high_value"):
                rule_labels = ["priority", "regular", "dormant"]
                break

        assignments, stats = apply_rule_segmentation(df, rule_labels, filters)
        df["_segment"] = assignments.values
        segment_stats = stats

        # Find transition candidates
        candidates_df = find_transition_candidates(df, from_seg, to_seg, top_n=50, features=engineered_features)
        candidates_list = []
        if not candidates_df.empty:
            candidates_list = candidates_df.to_dict("records")

        eval_metrics["transition_candidates_count"] = len(candidates_list)
        eval_metrics["from_segment"] = from_seg
        eval_metrics["to_segment"] = to_seg

        # Store candidates in tool_outputs
        tool_outputs = dict(state.get("tool_outputs") or {})
        tool_outputs["ishaan"] = {
            "intent": intent,
            "method": "transition",
            "segment_stats": stats,
            "transition_candidates": candidates_list[:20],  # top 20 for display
        }

        updated = dict(state)
        updated["segment_assignments"] = dict(zip(
            df["customer_id"].astype(str).tolist() if "customer_id" in df.columns else df.index.astype(str).tolist(),
            assignments.tolist()
        ))
        updated["segment_stats"] = segment_stats
        updated["evaluation_metrics"] = eval_metrics
        updated["tool_outputs"] = tool_outputs
        return updated

    # ── Rule-based segmentation ───────────────────────────────────────────────
    if method == "rule":
        # Validate labels — check for HITL-required labels
        safe_labels = [l.lower() for l in labels_hints if l.lower() not in HITL_LABELS]
        if not safe_labels:
            safe_labels = ["priority", "regular", "dormant"]

        logger.info(f"[Ishaan] Rule-based segmentation: {safe_labels}")
        assignments, stats = apply_rule_segmentation(df, safe_labels, filters)

        # Map customer_id → segment name
        id_col = df["customer_id"].astype(str) if "customer_id" in df.columns else pd.Series(df.index.astype(str))
        segment_assignments_dict = dict(zip(id_col.tolist(), assignments.tolist()))

        segment_stats = stats
        eval_metrics = {
            "method": "rule-based",
            "segments": safe_labels,
            "total_customers": len(df),
        }

    # ── ML clustering ────────────────────────────────────────────────────────
    else:
        logger.info(f"[Ishaan] ML clustering: method={method}")

        # Prefer engineered features, fallback to numeric columns
        feat_cols = [f for f in engineered_features if f in df.columns]
        if not feat_cols:
            feat_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            feat_cols = [c for c in feat_cols if c not in ("customer_id",)][:8]

        labels_arr, model, stats, metrics = apply_ml_clustering(df, method, feat_cols, filters)

        # Map customer_id → cluster label
        id_col = df["customer_id"].astype(str) if "customer_id" in df.columns else pd.Series(df.index.astype(str))
        segment_assignments_dict = dict(zip(id_col.tolist(), [str(l) for l in labels_arr.tolist()]))

        segment_stats = stats
        eval_metrics = metrics

        # Save model to disk for SHAP access
        model_fname = f"ishaan_model_{conv_id}.pkl"
        model_path = str(TEMP_DIR / model_fname)
        try:
            with open(model_path, "wb") as f:
                pickle.dump({"model": model, "features": feat_cols}, f)
            logger.info(f"[Ishaan] Saved model to: {model_path}")
        except Exception as e:
            logger.warning(f"[Ishaan] Failed to save model: {e}")
            model_path = None

    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["ishaan"] = {
        "intent": intent,
        "method": method,
        "segment_labels": list(segment_stats.keys()),
        "segment_stats": segment_stats,
        "evaluation_metrics": eval_metrics,
    }

    from backend.db.database import cache_segment_results
    try:
        cache_segment_results(
            session_id=conv_id,
            method=method,
            features=list(engineered_features) if engineered_features else [],
            assignments=segment_assignments_dict,
            stats=segment_stats,
            metrics=eval_metrics,
        )
        logger.info(f"[Ishaan] Cached segmentation results for session {conv_id}")
    except Exception as e:
        logger.error(f"[Ishaan] Failed to cache segmentation results: {e}")

    updated = dict(state)
    updated["segment_assignments"] = segment_assignments_dict
    updated["segment_stats"] = segment_stats
    updated["evaluation_metrics"] = eval_metrics
    updated["cluster_model_path"] = model_path
    updated["tool_outputs"] = tool_outputs

    # Persist segments for cross-turn reuse
    updated["current_segments"] = {
        "method": method,
        "labels": list(segment_stats.keys()),
        "stats": segment_stats,
    }

    logger.info(f"[Ishaan] Done. Segments: {list(segment_stats.keys())}")
    return updated
