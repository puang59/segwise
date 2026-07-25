"""
Segmentation Tool — Rule-based and ML clustering engines.

Implements:
- RULE_TEMPLATES for deterministic named segment assignment
- ML clustering pipeline (KMeans / HDBSCAN / GMM)
- Customer Transition Predictor (regular → priority upgrade candidates)
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ── Rule Templates ────────────────────────────────────────────────────────────

def _priority_rule(df: pd.DataFrame, filters: Dict[str, Any] = None) -> pd.Series:
    """Priority: high balance AND high spending activity.
    
    Thresholds calibrated to actual bank_sqlite.db data:
    - total_balance: mean=149k, 75th pct=228k → use 200k
    - total_spent: mean=100k, 75th pct=150k → use 120k
    """
    filters = filters or {}
    min_balance = float(filters.get("priority_min_balance", 200_000))
    min_txn_proxy = float(filters.get("priority_min_txn_proxy", 120_000))

    balance = df.get("total_balance", pd.Series(0, index=df.index)).fillna(0)
    spent = df.get("total_spent", pd.Series(0, index=df.index)).fillna(0)
    return (balance > min_balance) & (spent > min_txn_proxy)


def _dormant_rule(df: pd.DataFrame, filters: Dict[str, Any] = None) -> pd.Series:
    """Dormant: very low spending (last-transaction proxy) relative to dataset.
    
    Thresholds calibrated to actual bank_sqlite.db data:
    - recency_days: ALL customers have min=205 days (data property) — use recency as
      a relative measure: top quartile (>375 days) = most dormant
    - total_spent: 25th pct=38k → use < 20k as proxy for genuinely low activity
    """
    filters = filters or {}
    max_recency = float(filters.get("dormant_max_recency", 375))   # 75th pct of recency
    max_spent = float(filters.get("dormant_max_spent", 20_000))    # below 25th pct spending

    recency = df.get("recency_days", pd.Series(300, index=df.index)).fillna(300)
    spent = df.get("total_spent", pd.Series(0, index=df.index)).fillna(0)
    return (recency > max_recency) | (spent < max_spent)


def _high_value_rule(df: pd.DataFrame, filters: Dict[str, Any] = None) -> pd.Series:
    """High value: top 10% by customer_value_score or total_balance."""
    if "customer_value_score" in df.columns:
        threshold = df["customer_value_score"].quantile(0.9)
        return df["customer_value_score"] > threshold
    else:
        balance = df.get("total_balance", pd.Series(0, index=df.index)).fillna(0)
        threshold = balance.quantile(0.9)
        return balance > threshold


def _regular_rule(
    df: pd.DataFrame,
    priority_mask: pd.Series,
    dormant_mask: pd.Series,
) -> pd.Series:
    """Regular: everything that is not priority and not dormant."""
    return ~priority_mask & ~dormant_mask


# Rule template registry (labels that trigger HITL are set to None)
RULE_TEMPLATES = {
    "priority":   _priority_rule,
    "dormant":    _dormant_rule,
    "high_value": _high_value_rule,
    "regular":    None,   # computed as residual
    "vip":        None,   # requires HITL definition
    "premium":    None,   # requires HITL definition
}

HITL_LABELS = {"vip", "premium", "important", "top", "gold", "platinum"}


def apply_rule_segmentation(
    df: pd.DataFrame,
    segment_labels: List[str],
    filters: Dict[str, Any],
) -> Tuple[pd.Series, Dict[str, Any]]:
    """
    Apply rule-based segmentation to assign each customer a segment label.

    Returns:
    - assignments: pd.Series mapping customer_id → segment_name
    - segment_stats: dict of {segment: {count, pct, avg_balance, avg_spent, ...}}
    """
    n = len(df)
    assignment_arr = pd.Series(["unassigned"] * n, index=df.index)

    # Compute masks for each supported label
    masks: Dict[str, pd.Series] = {}

    # Compute priority mask first (needed for regular computation)
    if "priority" in segment_labels or "regular" in segment_labels:
        masks["priority"] = _priority_rule(df, filters)

    # Compute dormant mask
    if "dormant" in segment_labels or "regular" in segment_labels:
        masks["dormant"] = _dormant_rule(df, filters)

    # Apply high_value if requested
    if "high_value" in segment_labels:
        masks["high_value"] = _high_value_rule(df, filters)

    # Compute regular as residual
    if "regular" in segment_labels:
        p_mask = masks.get("priority", pd.Series(False, index=df.index))
        d_mask = masks.get("dormant", pd.Series(False, index=df.index))
        masks["regular"] = _regular_rule(df, p_mask, d_mask)

    # Assign in priority order (later labels overwrite earlier ones if overlap)
    label_order = ["regular", "dormant", "high_value", "priority"]
    for label in label_order:
        if label in masks and label in segment_labels:
            assignment_arr[masks[label].fillna(False)] = label

    # Fallback any unassigned to 'regular' so all customers have a valid segment
    assignment_arr = assignment_arr.replace({"unassigned": "regular"})

    # Compute segment stats
    df_copy = df.copy()
    df_copy["_segment"] = assignment_arr.values

    # Compute estimated transaction frequency column if total_spent is present
    if "total_spent" in df_copy.columns:
        df_copy["txn_count"] = (df_copy["total_spent"] / 4500.0).clip(1, 60).round(1)

    segment_stats: Dict[str, Any] = {}
    for seg in df_copy["_segment"].unique():
        seg_df = df_copy[df_copy["_segment"] == seg]
        count = len(seg_df)
        pct = round(count / n * 100, 2) if n > 0 else 0

        stats: Dict[str, Any] = {
            "count": count,
            "pct": pct,
        }

        for col in ["total_balance", "total_spent", "credit_score", "recency_days", "customer_tenure_days", "txn_count"]:
            if col in seg_df.columns:
                non_null = seg_df[col].dropna()
                if len(non_null) > 0:
                    stats[f"avg_{col}"] = round(float(non_null.mean()), 2)
                    stats[f"median_{col}"] = round(float(non_null.median()), 2)

        if "txn_count" in seg_df.columns:
            stats["avg_txn_count"] = round(float(seg_df["txn_count"].mean()), 1)

        segment_stats[str(seg)] = stats

    logger.info(f"[Segmentation] Rule-based: {dict(df_copy['_segment'].value_counts())}")
    return assignment_arr, segment_stats


def apply_ml_clustering(
    df: pd.DataFrame,
    method: str,
    engineered_features: List[str],
    filters: Dict[str, Any],
) -> Tuple[np.ndarray, Any, Dict[str, Any], Dict[str, Any]]:
    """
    Apply ML clustering (KMeans / HDBSCAN / GMM) on engineered features.

    Returns:
    - labels: numpy array of cluster assignments
    - model: fitted model object
    - segment_stats: per-cluster statistics
    - evaluation_metrics: silhouette, DB index, etc.
    """
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.impute import SimpleImputer
    from backend.models.clustering import run_kmeans, run_hdbscan, run_gmm, compute_cluster_metrics

    # Select feature columns available in df
    available_feats = [f for f in engineered_features if f in df.columns]
    if not available_feats:
        # Fallback to numeric columns
        available_feats = df.select_dtypes(include=[np.number]).columns.tolist()
        available_feats = [c for c in available_feats if c != "customer_id"][:8]

    logger.info(f"[Segmentation] ML clustering with method={method}, features={available_feats}")

    # Preprocessing pipeline
    pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    X = pipe.fit_transform(df[available_feats])

    # Run selected algorithm
    if method == "kmeans":
        labels, model, algo_meta = run_kmeans(X)
    elif method == "hdbscan":
        labels, model, algo_meta = run_hdbscan(X, min_cluster_size=50, min_samples=10)
    elif method == "gmm":
        labels, model, algo_meta = run_gmm(X)
    else:
        logger.warning(f"[Segmentation] Unknown method '{method}', defaulting to kmeans")
        labels, model, algo_meta = run_kmeans(X)

    # Full evaluation metrics
    eval_metrics = compute_cluster_metrics(X, labels)
    eval_metrics.update(algo_meta)

    # Per-cluster statistics
    df_copy = df.copy()
    df_copy["_cluster"] = labels

    segment_stats: Dict[str, Any] = {}
    for cluster_id in sorted(set(labels)):
        cluster_df = df_copy[df_copy["_cluster"] == cluster_id]
        count = len(cluster_df)
        pct = round(count / len(df) * 100, 2)

        stats: Dict[str, Any] = {
            "cluster_id": int(cluster_id),
            "count": count,
            "pct": pct,
        }

        for col in ["total_balance", "total_spent", "credit_score", "recency_days",
                    "customer_tenure_days"] + available_feats:
            if col in cluster_df.columns:
                non_null = cluster_df[col].dropna()
                if len(non_null) > 0:
                    stats[f"avg_{col}"] = round(float(non_null.mean()), 4)
                    stats[f"median_{col}"] = round(float(non_null.median()), 4)

        label_name = "noise" if cluster_id == -1 else f"cluster_{cluster_id}"
        segment_stats[label_name] = stats

    logger.info(f"[Segmentation] ML: {len(set(labels))} clusters, silhouette={algo_meta.get('silhouette_score')}")
    return labels, model, segment_stats, eval_metrics


# ── Customer Transition Predictor ─────────────────────────────────────────────

def find_transition_candidates(
    df: pd.DataFrame,
    from_segment: str = "regular",
    to_segment: str = "priority",
    top_n: int = 50,
    features: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Identify candidate customers in 'from_segment' most likely to
    upgrade to 'to_segment' based on feature-space distance.

    Returns a DataFrame of top_n candidates with transition_score and gap_analysis.
    """
    from sklearn.preprocessing import StandardScaler
    from sklearn.impute import SimpleImputer

    if "_segment" not in df.columns and "segment" not in df.columns:
        logger.warning("[Transition] No segment column in DataFrame — cannot find candidates.")
        return pd.DataFrame()

    seg_col = "_segment" if "_segment" in df.columns else "segment"

    # Select numeric features for distance computation
    if features is None:
        features = [c for c in [
            "total_balance", "total_spent", "credit_score",
            "recency_days", "customer_tenure_days", "total_accounts",
            "customer_value_score", "engagement_score", "recency_score",
        ] if c in df.columns]

    if not features:
        logger.warning("[Transition] No usable features for transition analysis.")
        return pd.DataFrame()

    from_df = df[df[seg_col] == from_segment].copy()
    to_df = df[df[seg_col] == to_segment].copy()

    if len(from_df) == 0 or len(to_df) == 0:
        logger.warning(f"[Transition] Empty segment: from={len(from_df)}, to={len(to_df)}")
        return pd.DataFrame()

    # Fit scaler on full dataset for proper normalisation
    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()

    X_all = imputer.fit_transform(df[features])
    X_all_scaled = scaler.fit_transform(X_all)

    from_idx = df.index.isin(from_df.index)
    to_idx = df.index.isin(to_df.index)

    X_from = X_all_scaled[from_idx]
    X_to = X_all_scaled[to_idx]

    # Priority centroid in scaled space
    priority_centroid = X_to.mean(axis=0)

    # Euclidean distance from each regular customer to priority centroid
    distances = np.linalg.norm(X_from - priority_centroid, axis=1)
    d_max = distances.max() if distances.max() > 0 else 1.0

    from_df = from_df.copy()
    from_df["transition_score"] = (1.0 - distances / d_max).round(4)

    # Gap analysis: per-feature delta needed to reach priority centroid mean
    priority_means = to_df[features].mean()
    gap_analysis = []
    for _, row in from_df.iterrows():
        gaps = {}
        for feat in features:
            if feat in row and feat in priority_means:
                delta = priority_means[feat] - row[feat]
                if abs(delta) > 0.01:
                    gaps[feat] = round(float(delta), 2)
        gap_analysis.append(gaps)

    from_df["gap_analysis"] = gap_analysis

    # Return top N by transition score
    result = from_df.nlargest(top_n, "transition_score")[
        ["customer_id"] + features + ["transition_score", "gap_analysis"]
    ] if "customer_id" in from_df.columns else from_df.nlargest(top_n, "transition_score")

    logger.info(f"[Transition] Found {len(result)} candidates from '{from_segment}' → '{to_segment}'")
    return result
