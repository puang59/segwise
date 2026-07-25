"""
Column Resolver Tool for Vihaan (Data Scout Agent).

Maps intent keywords and feature hints to actual SQLite column names via PRAGMA table_info.
Computes dataset health summary: null rates, dtypes, min/max bounds.
"""

import logging
from typing import List, Dict, Any, Optional

from backend.db.sqlite_client import (
    get_table_columns,
    get_table_schema_info,
    get_table_row_count,
    execute_read_query,
)

logger = logging.getLogger(__name__)


# ── Column Map: intent keyword → customer_profile column ────────────────────

COLUMN_MAP: Dict[str, List[str]] = {
    # Balance / financial strength
    "balance":          ["total_balance"],
    "total_balance":    ["total_balance"],
    "wealth":           ["total_balance"],

    # Spending behaviour
    "spending":         ["total_spent"],
    "total_spent":      ["total_spent"],
    "transactions":     ["total_spent"],

    # Recency / activity
    "recency":          ["recency_days"],
    "recency_days":     ["recency_days"],
    "active":           ["recency_days"],
    "dormant":          ["recency_days"],
    "last_transaction": ["last_txn_date"],

    # Credit / risk
    "credit":           ["credit_score", "credit_risk_tier"],
    "credit_score":     ["credit_score"],
    "risk":             ["credit_risk_tier", "credit_score"],
    "churn":            ["credit_risk_tier", "recency_days"],

    # Loans
    "loan":             ["has_loan", "total_loan_amount", "avg_interest_rate", "loan_count"],
    "debt":             ["total_loan_amount"],

    # Tenure / age
    "tenure":           ["customer_tenure_days"],
    "seniority":        ["customer_tenure_days"],

    # Products
    "products":         ["total_accounts", "has_Business", "has_Checking", "has_Savings", "has_Credit", "has_Debit"],
    "diversity":        ["total_accounts", "has_Business", "has_Checking", "has_Savings"],
    "digital":          ["has_Credit", "has_Debit"],

    # Demographics
    "city":             ["city"],
    "location":         ["city"],

    # All core features for segmentation
    "segment":          ["customer_id", "total_balance", "total_spent", "recency_days",
                         "credit_score", "customer_tenure_days", "total_accounts",
                         "has_loan", "has_Credit", "has_Debit", "credit_risk_tier"],
    "feature_eng":      ["customer_id", "total_balance", "total_spent", "recency_days",
                         "credit_score", "customer_tenure_days", "total_accounts",
                         "has_Business", "has_Checking", "has_Savings", "has_loan",
                         "total_loan_amount", "loan_count", "has_Credit", "has_Debit"],

    # EDA
    "eda":              ["customer_id", "total_balance", "total_spent", "credit_score",
                         "recency_days", "customer_tenure_days", "total_accounts",
                         "has_loan", "credit_risk_tier", "city"],

    # Recommendation features
    "recommend":        ["customer_id", "total_balance", "credit_score", "has_loan",
                         "has_Credit", "total_accounts", "credit_risk_tier"],

    # Transition / upgrade candidates
    "transition":       ["customer_id", "total_balance", "total_spent", "recency_days",
                         "credit_score", "customer_tenure_days", "total_accounts"],
}

# Core columns always included in segmentation + feature engineering
CORE_COLUMNS = [
    "customer_id",
    "total_balance",
    "total_spent",
    "recency_days",
    "credit_score",
    "customer_tenure_days",
    "total_accounts",
    "has_loan",
    "has_Credit",
    "has_Debit",
    "credit_risk_tier",
]


def resolve_columns(intent: str, filters: Dict[str, Any], hints: List[str]) -> List[str]:
    """
    Resolve required column names from the customer_profile table based on intent,
    filters, and segment label hints.

    Returns a deduplicated list of validated column names.
    """
    # Get actual schema from database
    valid_columns = set(get_table_columns("customer_profile"))

    selected = set()

    # Add columns based on intent
    intent_lower = intent.lower()
    if intent_lower in COLUMN_MAP:
        selected.update(COLUMN_MAP[intent_lower])

    # Add columns based on hint keywords
    for hint in hints:
        hint_lower = hint.lower()
        for keyword, cols in COLUMN_MAP.items():
            if keyword in hint_lower:
                selected.update(cols)

    # Add columns from filter keys
    for key in filters.keys():
        key_lower = key.lower()
        if key_lower in valid_columns:
            selected.add(key_lower)
        # Also check COLUMN_MAP
        for keyword, cols in COLUMN_MAP.items():
            if keyword in key_lower:
                selected.update(cols)

    # For segment/feature_eng intents always include core columns
    if intent_lower in ("segment", "feature_eng", "transition", "explain"):
        selected.update(CORE_COLUMNS)

    # Filter to only valid DB columns
    resolved = [col for col in selected if col in valid_columns]

    # Ensure customer_id is always first if present
    if "customer_id" in resolved:
        resolved.remove("customer_id")
        resolved = ["customer_id"] + sorted(resolved)
    else:
        resolved = sorted(resolved)

    logger.info(f"[ColumnResolver] Resolved {len(resolved)} columns for intent='{intent}'")
    return resolved


def compute_dataset_health(columns: List[str], sample_limit: int = 5000) -> Dict[str, Any]:
    """
    Compute dataset health statistics for the resolved columns:
    - null percentage per column
    - dtype per column
    - min/max/mean for numeric columns
    - unique value count for categorical columns

    Uses a sample of rows for performance on large tables.
    """
    row_count = get_table_row_count("customer_profile")

    if not columns:
        return {
            "total_rows": row_count,
            "columns_analysed": 0,
            "column_stats": {},
        }

    cols_str = ", ".join(columns)
    sql = f"SELECT {cols_str} FROM customer_profile LIMIT {sample_limit}"

    try:
        import pandas as pd
        df = execute_read_query(sql)
    except Exception as e:
        logger.error(f"[ColumnResolver] Failed to query health stats: {e}")
        return {"total_rows": row_count, "columns_analysed": 0, "column_stats": {}}

    schema_info = {row["name"]: row["type"] for row in get_table_schema_info("customer_profile")}

    column_stats: Dict[str, Any] = {}
    for col in columns:
        if col not in df.columns:
            continue

        null_count = int(df[col].isna().sum())
        null_pct = round(null_count / len(df) * 100, 2) if len(df) > 0 else 0.0
        dtype = schema_info.get(col, "UNKNOWN")

        stats: Dict[str, Any] = {
            "dtype": dtype,
            "null_count_sample": null_count,
            "null_pct_sample": null_pct,
        }

        # Numeric stats
        if df[col].dtype in ("int64", "float64", "int32", "float32"):
            non_null = df[col].dropna()
            if len(non_null) > 0:
                stats["min"] = round(float(non_null.min()), 4)
                stats["max"] = round(float(non_null.max()), 4)
                stats["mean"] = round(float(non_null.mean()), 4)
                stats["median"] = round(float(non_null.median()), 4)

        # Categorical / text stats
        elif df[col].dtype == object:
            stats["unique_values"] = int(df[col].nunique())
            top_vals = df[col].value_counts().head(5).to_dict()
            stats["top_values"] = {str(k): int(v) for k, v in top_vals.items()}

        column_stats[col] = stats

    return {
        "total_rows": row_count,
        "sample_rows": len(df),
        "columns_analysed": len(column_stats),
        "column_stats": column_stats,
    }
