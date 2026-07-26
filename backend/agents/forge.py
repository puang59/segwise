"""
FORGE — Agent 3: Feature Engineer

Loads features from customer_profile in bank_sqlite.db and computes derived features
via the FEATURE_REGISTRY. Saves enriched DataFrame to a temporary Parquet file.
Pure Python — no LLM calls.
"""

import uuid
import logging
from pathlib import Path

from backend.agents.state import AgentState
from backend.db.sqlite_client import fetch_customer_data
from backend.tools.feature_engineering import (
    run_feature_engineering,
    get_features_for_intent,
    FEATURE_REGISTRY,
)

logger = logging.getLogger(__name__)

# Directory for temporary Parquet files
TEMP_DIR = Path("/tmp")


async def run_forge(state: AgentState) -> AgentState:
    """
    Forge agent node for LangGraph.
    1. Loads resolved_columns from customer_profile in bank_sqlite.db into Pandas DataFrame.
    2. Executes required feature transformations from FEATURE_REGISTRY.
    3. Saves processed DataFrame to a temporary Parquet file.
    4. Updates AgentState with df_path and engineered_features.
    """
    intent = state.get("intent", "eda")
    resolved_columns = state.get("resolved_columns") or []
    conv_id = state.get("conversation_id") or str(uuid.uuid4())
    filters = state.get("filters") or {}

    logger.info(f"[Forge] Loading {len(resolved_columns)} columns from customer_profile")

    # Build WHERE clause from filters
    where_clause = ""
    params = ()

    filter_col_map = {
        "city": "city",
        "credit_risk_tier": "credit_risk_tier",
        "min_balance": "total_balance",
        "max_balance": "total_balance",
        "segment": None,  # handled by mosaic, skip here
        "from_segment": None,
        "to_segment": None,
    }

    sql_filters = []
    param_list = []
    for key, value in filters.items():
        col = filter_col_map.get(key)
        if col:
            if key.startswith("min_"):
                sql_filters.append(f"{col} >= ?")
                param_list.append(value)
            elif key.startswith("max_"):
                sql_filters.append(f"{col} <= ?")
                param_list.append(value)
            else:
                sql_filters.append(f"{col} = ?")
                param_list.append(value)

    if sql_filters:
        where_clause = " AND ".join(sql_filters)
        params = tuple(param_list)

    # Load data from SQLite
    try:
        df = fetch_customer_data(
            columns=resolved_columns if resolved_columns else None,
            where_clause=where_clause,
            params=params,
        )
        logger.info(f"[Forge] Loaded DataFrame: {df.shape[0]} rows × {df.shape[1]} columns")
    except Exception as e:
        logger.error(f"[Forge] Failed to load customer data: {e}")
        updated = dict(state)
        updated["engineered_features"] = []
        updated["df_path"] = None
        return updated

    # Determine which features to compute
    features_to_compute = get_features_for_intent(intent)

    # For feature_eng intent, compute all registered features
    if intent == "feature_eng":
        features_to_compute = list(FEATURE_REGISTRY.keys())

    # Compute features
    try:
        df = run_feature_engineering(df, features_to_compute)
        engineered = [f for f in features_to_compute if f in df.columns]
    except Exception as e:
        logger.error(f"[Forge] Feature engineering failed: {e}")
        engineered = []

    # Save to temp Parquet
    parquet_path = str(TEMP_DIR / f"forge_features_{conv_id}.parquet")
    try:
        df.to_parquet(parquet_path, index=False, engine="pyarrow")
        logger.info(f"[Forge] Saved Parquet: {parquet_path} ({len(df)} rows)")
    except Exception as e:
        logger.error(f"[Forge] Failed to save Parquet: {e}")
        parquet_path = None

    # Build summary stats for tool_outputs
    feature_summary = {}
    for feat in engineered:
        if feat in df.columns:
            col = df[feat].dropna()
            feature_summary[feat] = {
                "mean": round(float(col.mean()), 4) if len(col) > 0 else None,
                "min": round(float(col.min()), 4) if len(col) > 0 else None,
                "max": round(float(col.max()), 4) if len(col) > 0 else None,
            }

    updated = dict(state)
    updated["engineered_features"] = engineered
    updated["df_path"] = parquet_path

    # Calculate Pearson Correlation Matrix for Heatmap
    import numpy as np
    numeric_df = df.select_dtypes(include=[np.number])
    correlation_chart = None
    if not numeric_df.empty:
        feats_to_corr = [f for f in engineered if f in numeric_df.columns]
        if len(feats_to_corr) < 6:
            additional = [c for c in numeric_df.columns if c not in feats_to_corr and not c.endswith('_id')]
            feats_to_corr.extend(additional[:8 - len(feats_to_corr)])
        
        if len(feats_to_corr) > 0:
            corr_matrix = numeric_df[feats_to_corr].corr().round(2).fillna(0)
            heatmap_data = []
            for row_name in feats_to_corr:
                row_data = {"name": row_name}
                for col_name in feats_to_corr:
                    row_data[col_name] = float(corr_matrix.loc[row_name, col_name])
                heatmap_data.append(row_data)

            correlation_chart = {
                "id": f"forge_corr_{conv_id}",
                "type": "heatmap",
                "title": "Feature Correlation Matrix",
                "produced_by": "forge",
                "categoryKey": "name",
                "dataKeys": feats_to_corr,
                "data": heatmap_data,
            }

    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["forge"] = {
        "engineered_features": engineered,
        "df_path": parquet_path,
        "row_count": len(df),
        "feature_summary": feature_summary,
        "correlation_chart": correlation_chart,
    }
    updated["tool_outputs"] = tool_outputs

    return updated
