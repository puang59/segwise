"""
Explainability Tool — SHAP-based feature importance and rule trace inspector.

Implements:
- Tier 1: Batch SHAP per cluster (500-sample per cluster)
- Tier 2: On-demand single-customer SHAP
- Rule Trace Inspector for rule-based segments
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


def _get_shap_explainer(model: Any, X_background: np.ndarray) -> Any:
    """
    Select the appropriate SHAP explainer based on model type.
    Uses TreeExplainer for tree-based models, KernelExplainer otherwise.
    """
    import shap

    # Check if model is tree-based
    try:
        explainer = shap.TreeExplainer(model)
        logger.debug("[SHAP] Using TreeExplainer")
        return explainer
    except Exception:
        pass

    # Fallback to KernelExplainer with a background sample
    background = shap.sample(X_background, min(100, len(X_background)))
    logger.debug("[SHAP] Using KernelExplainer")
    return shap.KernelExplainer(model.predict, background)


def explain_segments_batch(
    df: pd.DataFrame,
    labels: np.ndarray,
    model: Any,
    features: List[str],
    samples_per_cluster: int = 500,
) -> Dict[str, Any]:
    """
    Tier 1: Batch SHAP computation at cluster/segment level.
    Samples up to `samples_per_cluster` per cluster, computes SHAP values,
    and returns mean absolute SHAP importance per feature per cluster.

    :param df: Customer DataFrame with feature columns.
    :param labels: Cluster label array aligned with df rows.
    :param model: Fitted clustering or classification model.
    :param features: Feature column names used in model.
    :param samples_per_cluster: Max samples per cluster for SHAP computation.
    :return: {segment_label: {feature: mean_abs_shap}}
    """
    import shap

    available_feats = [f for f in features if f in df.columns]
    if not available_feats:
        logger.warning("[SHAP] No valid feature columns — skipping SHAP")
        return {}

    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler

    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()

    X = imputer.fit_transform(df[available_feats])
    X_scaled = scaler.fit_transform(X)

    segment_shap: Dict[str, Any] = {}
    unique_labels = sorted(set(labels))

    # Build background for KernelExplainer
    shap.sample(X_scaled, min(100, len(X_scaled)))

    try:
        explainer = _get_shap_explainer(model, X_scaled)
    except Exception as e:
        logger.error(f"[SHAP] Failed to build explainer: {e}")
        return {}

    for cluster_id in unique_labels:
        if cluster_id == -1:  # Skip HDBSCAN noise
            continue

        cluster_mask = labels == cluster_id
        cluster_X = X_scaled[cluster_mask]

        # Sample for efficiency
        if len(cluster_X) > samples_per_cluster:
            rng = np.random.default_rng(42)
            sample_idx = rng.choice(len(cluster_X), samples_per_cluster, replace=False)
            cluster_X_sample = cluster_X[sample_idx]
        else:
            cluster_X_sample = cluster_X

        try:
            shap_vals = explainer.shap_values(cluster_X_sample)

            # Handle multi-output SHAP (e.g., for GMM or multi-class)
            if isinstance(shap_vals, list):
                # Average across outputs
                shap_vals = np.mean(np.abs(shap_vals), axis=0)
            else:
                shap_vals = np.abs(shap_vals)

            # Mean abs SHAP per feature
            mean_shap = np.mean(shap_vals, axis=0)

            feature_importance = {
                feat: round(float(mean_shap[i]), 6)
                for i, feat in enumerate(available_feats)
            }
            # Sort by importance descending
            feature_importance = dict(
                sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            )

            label_name = "noise" if cluster_id == -1 else f"cluster_{cluster_id}"
            segment_shap[label_name] = {
                "top_features": list(feature_importance.keys())[:5],
                "feature_importance": feature_importance,
                "sample_size": len(cluster_X_sample),
            }
            logger.debug(f"[SHAP] Cluster {cluster_id}: top feature = {list(feature_importance.keys())[0]}")

        except Exception as e:
            logger.warning(f"[SHAP] Failed for cluster {cluster_id}: {e}")
            segment_shap[f"cluster_{cluster_id}"] = {"error": str(e)}

    return segment_shap


def explain_customer_shap(
    customer_row: pd.DataFrame,
    model: Any,
    df_background: pd.DataFrame,
    features: List[str],
) -> Dict[str, Any]:
    """
    Tier 2: On-demand single-customer SHAP explanation.

    :param customer_row: Single-row DataFrame for the customer.
    :param model: Fitted model.
    :param df_background: Background dataset for KernelExplainer.
    :param features: Feature names.
    :return: {feature: shap_contribution} sorted by abs impact.
    """
    import shap

    available_feats = [f for f in features if f in customer_row.columns]
    if not available_feats:
        return {"error": "No valid features"}

    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler

    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()

    X_bg = imputer.fit_transform(df_background[available_feats])
    X_bg_scaled = scaler.fit_transform(X_bg)

    X_customer = imputer.transform(customer_row[available_feats])
    X_customer_scaled = scaler.transform(X_customer)

    try:
        background = shap.sample(X_bg_scaled, min(100, len(X_bg_scaled)))
        explainer = shap.KernelExplainer(model.predict, background)
        shap_vals = explainer.shap_values(X_customer_scaled)

        if isinstance(shap_vals, list):
            shap_vals = shap_vals[0]

        result = {
            feat: round(float(shap_vals[0, i]), 6)
            for i, feat in enumerate(available_feats)
        }
        # Sort by absolute contribution
        result = dict(sorted(result.items(), key=lambda x: abs(x[1]), reverse=True))
        return result

    except Exception as e:
        logger.error(f"[SHAP] Single-customer SHAP failed: {e}")
        return {"error": str(e)}


def explain_rule_segment(
    customer_row: pd.Series,
    segment: str,
    filters: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Rule Trace Inspector for rule-based segmentation.
    Returns exact threshold evaluations for a customer.

    :param customer_row: Single customer row as pd.Series.
    :param segment: Segment name (priority / dormant / regular).
    :param filters: Active filter thresholds.
    :return: Structured rule trace dict.
    """
    trace: Dict[str, Any] = {
        "segment": segment,
        "rules_evaluated": [],
        "key_values": {},
    }

    # Extract actual values
    balance = float(customer_row.get("total_balance", 0) or 0)
    spent = float(customer_row.get("total_spent", 0) or 0)
    recency = float(customer_row.get("recency_days", 0) or 0)
    credit = float(customer_row.get("credit_score", 0) or 0)
    tenure = float(customer_row.get("customer_tenure_days", 0) or 0)

    trace["key_values"] = {
        "total_balance": balance,
        "total_spent": spent,
        "recency_days": recency,
        "credit_score": credit,
        "customer_tenure_days": tenure,
    }

    # Priority rules
    if segment == "priority":
        min_bal = float(filters.get("priority_min_balance", 200_000))
        min_txn = float(filters.get("priority_min_txn_proxy", 120_000))
        trace["rules_evaluated"] = [
            {
                "rule": f"total_balance > {min_bal:,.0f}",
                "actual": balance,
                "threshold": min_bal,
                "result": balance > min_bal,
            },
            {
                "rule": f"total_spent > {min_txn:,.0f}",
                "actual": spent,
                "threshold": min_txn,
                "result": spent > min_txn,
            },
        ]

    elif segment == "dormant":
        max_rec = float(filters.get("dormant_max_recency", 375))
        max_spent = float(filters.get("dormant_max_spent", 20_000))
        trace["rules_evaluated"] = [
            {
                "rule": f"recency_days > {max_rec}",
                "actual": recency,
                "threshold": max_rec,
                "result": recency > max_rec,
            },
            {
                "rule": f"total_spent < {max_spent:,.0f}",
                "actual": spent,
                "threshold": max_spent,
                "result": spent < max_spent,
            },
        ]

    elif segment == "regular":
        trace["rules_evaluated"] = [
            {"rule": "Not priority AND not dormant", "result": True}
        ]

    return trace


def compute_rule_shap_approximation(
    df: pd.DataFrame,
    segment_assignments: Dict[str, str],
    features: List[str],
) -> Dict[str, Any]:
    """
    For rule-based mode: compute approximate feature importance via
    group mean differences (no real SHAP required).
    Returns same structure as SHAP output for API consistency.
    """
    available_feats = [f for f in features if f in df.columns]
    if not available_feats or not segment_assignments:
        return {}

    df_copy = df.copy()
    if "customer_id" in df_copy.columns:
        id_col = df_copy["customer_id"].astype(str)
        df_copy["_segment"] = id_col.map(segment_assignments).fillna("unassigned")
    else:
        df_copy["_segment"] = pd.Series(list(segment_assignments.values())[:len(df_copy)], index=df_copy.index)

    global_means = df_copy[available_feats].mean()
    segment_shap: Dict[str, Any] = {}

    for seg in df_copy["_segment"].unique():
        seg_df = df_copy[df_copy["_segment"] == seg]
        seg_means = seg_df[available_feats].mean()

        importance = {}
        for feat in available_feats:
            if global_means[feat] != 0:
                diff = abs(seg_means[feat] - global_means[feat]) / (abs(global_means[feat]) + 1e-9)
                importance[feat] = round(float(diff), 6)

        importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
        segment_shap[str(seg)] = {
            "top_features": list(importance.keys())[:5],
            "feature_importance": importance,
            "segment_mean": {f: round(float(seg_means.get(f, 0)), 4) for f in available_feats[:5]},
            "sample_size": len(seg_df),
            "method": "rule-based-approximation",
        }

    return segment_shap
