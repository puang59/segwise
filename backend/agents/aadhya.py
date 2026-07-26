"""
AADHYA — Agent 5: Explainability Agent

Computes SHAP values for ML clusters and detailed rule traces for rule-based segments.
Tier 1: Batch SHAP (cluster-level, 500 samples/cluster).
Tier 2: On-demand per-customer SHAP.
Pure Python — no LLM calls.
"""

import os
import pickle
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any

from backend.agents.state import AgentState
from backend.tools.explainability import (
    explain_segments_batch,
    compute_rule_shap_approximation,
    explain_rule_segment,
)

logger = logging.getLogger(__name__)


async def run_aadhya(state: AgentState) -> AgentState:
    """
    Aadhya agent node for LangGraph.
    Computes SHAP or rule-trace explanations depending on segmentation method.
    """
    intent = state.get("intent", "segment")
    method = state.get("segmentation_method") or "rule"
    df_path = state.get("df_path")
    model_path = state.get("cluster_model_path")
    segment_assignments = state.get("segment_assignments") or {}
    engineered_features = state.get("engineered_features") or []

    # Skip for non-explainability intents
    if intent not in ("segment", "explain", "transition"):
        logger.info(f"[Aadhya] Skipping — intent='{intent}' does not require explainability.")
        return state

    # Load DataFrame
    if not df_path or not os.path.exists(df_path):
        logger.warning("[Aadhya] Parquet file not found, returning empty explanations.")
        updated = dict(state)
        updated["segment_shap"] = {}
        updated["explanations"] = {}
        return updated

    try:
        df = pd.read_parquet(df_path, engine="pyarrow")
    except Exception as e:
        logger.error(f"[Aadhya] Failed to load Parquet: {e}")
        updated = dict(state)
        updated["segment_shap"] = {}
        updated["explanations"] = {}
        return updated

    # Select features
    feat_cols = [f for f in engineered_features if f in df.columns]
    if not feat_cols:
        feat_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        feat_cols = [c for c in feat_cols if c not in ("customer_id",)][:8]

    segment_shap: Dict[str, Any] = {}
    explanations: Dict[str, Any] = {}

    if method == "rule":
        # Rule-based: use approximation (mean-difference) instead of true SHAP
        logger.info("[Aadhya] Computing rule-based feature importance approximation")
        segment_shap = compute_rule_shap_approximation(df, segment_assignments, feat_cols)

        # Generate rule traces for up to 3 sample customers per segment
        if "customer_id" in df.columns:
            df["_segment"] = df["customer_id"].astype(str).map(segment_assignments)
            filters = state.get("filters") or {}

            for seg in df["_segment"].dropna().unique():
                seg_sample = df[df["_segment"] == seg].head(3)
                for _, row in seg_sample.iterrows():
                    cid = str(row.get("customer_id", row.name))
                    explanations[cid] = explain_rule_segment(row, str(seg), filters)

    else:
        # ML clustering: use SHAP batch explainability
        if not model_path or not os.path.exists(model_path):
            logger.warning("[Aadhya] Model file not found, skipping SHAP.")
        else:
            try:
                with open(model_path, "rb") as f:
                    model_data = pickle.load(f)

                model = model_data["model"]
                model_features = model_data.get("features", feat_cols)
                available_feats = [f for f in model_features if f in df.columns]

                if not available_feats:
                    available_feats = feat_cols

                # Reconstruct labels array from segment_assignments
                if "customer_id" in df.columns:
                    id_to_idx = {str(cid): i for i, cid in enumerate(df["customer_id"].astype(str))}
                    label_arr = np.full(len(df), -1, dtype=int)
                    for cid, seg in segment_assignments.items():
                        if cid in id_to_idx:
                            try:
                                label_arr[id_to_idx[cid]] = int(seg.replace("cluster_", ""))
                            except (ValueError, AttributeError):
                                pass
                else:
                    label_arr = np.array([
                        int(seg.replace("cluster_", "")) if "cluster_" in str(seg) else -1
                        for seg in list(segment_assignments.values())[:len(df)]
                    ])

                logger.info(f"[Aadhya] Running batch SHAP on {len(set(label_arr))} clusters")
                segment_shap = explain_segments_batch(
                    df, label_arr, model, available_feats, samples_per_cluster=500
                )

            except Exception as e:
                logger.error(f"[Aadhya] SHAP batch failed: {e}")
                # Fallback to approximation
                segment_shap = compute_rule_shap_approximation(df, segment_assignments, feat_cols)

    logger.info(f"[Aadhya] Computed explanations for {len(segment_shap)} segments")

    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["aadhya"] = {
        "method": "shap" if method != "rule" else "rule-approximation",
        "segments_explained": list(segment_shap.keys()),
        "sample_explanations": len(explanations),
    }

    updated = dict(state)
    updated["segment_shap"] = segment_shap
    updated["explanations"] = explanations
    updated["tool_outputs"] = tool_outputs

    return updated
