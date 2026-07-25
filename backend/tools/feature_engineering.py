"""
Feature Engineering Tool for Kabir Agent.

Implements FEATURE_REGISTRY with pure Python vector functions.
All formulas are deterministic — no LLM involvement.
"""

import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


# ── Helper normalization functions ────────────────────────────────────────────

def _min_max_norm(series: pd.Series) -> pd.Series:
    """Min-max normalise a series to [0, 1]. Returns 0.5 if all values identical."""
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(0.5, index=series.index)
    return (series - mn) / (mx - mn)


def _safe_div(a: pd.Series, b: pd.Series, fill: float = 0.0) -> pd.Series:
    """Safe division, filling division-by-zero with fill value."""
    with np.errstate(divide="ignore", invalid="ignore"):
        result = a / b.replace(0, np.nan)
    return result.fillna(fill)


# ── Feature computation functions ─────────────────────────────────────────────

def compute_engagement_score(df: pd.DataFrame) -> pd.Series:
    """
    engagement_score = 0.4 * digital_score + 0.35 * txn_freq_score + 0.25 * product_diversity
    """
    # digital_score: proportion of digital products (credit + debit cards) owned
    digital_score = _min_max_norm(
        df.get("has_Credit", pd.Series(0, index=df.index)).fillna(0).astype(float) +
        df.get("has_Debit", pd.Series(0, index=df.index)).fillna(0).astype(float)
    )

    # txn_freq_score: normalised spending (proxy for transaction frequency)
    txn_freq_score = _min_max_norm(
        df.get("total_spent", pd.Series(0, index=df.index)).fillna(0).astype(float)
    )

    # product_diversity: normalised total accounts held
    product_diversity = _min_max_norm(
        df.get("total_accounts", pd.Series(0, index=df.index)).fillna(0).astype(float)
    )

    score = 0.4 * digital_score + 0.35 * txn_freq_score + 0.25 * product_diversity
    return score.round(4)


def compute_customer_value_score(df: pd.DataFrame) -> pd.Series:
    """
    customer_value_score = 0.5 * norm_balance + 0.3 * norm_salary + 0.2 * tenure_score
    """
    norm_balance = _min_max_norm(
        df.get("total_balance", pd.Series(0, index=df.index)).fillna(0).astype(float)
    )

    # norm_salary: use total_spent as proxy for income/salary since no salary column
    norm_salary = _min_max_norm(
        df.get("total_spent", pd.Series(0, index=df.index)).fillna(0).astype(float)
    )

    tenure_score = _min_max_norm(
        df.get("customer_tenure_days", pd.Series(0, index=df.index)).fillna(0).astype(float)
    )

    score = 0.5 * norm_balance + 0.3 * norm_salary + 0.2 * tenure_score
    return score.round(4)


def compute_risk_score(df: pd.DataFrame) -> pd.Series:
    """
    risk_score = 1 - (0.6 * credit_score_norm + 0.4 * (1 - debt_to_income))
    Lower risk_score = safer customer.
    """
    credit_score_norm = _min_max_norm(
        df.get("credit_score", pd.Series(650, index=df.index)).fillna(650).astype(float)
    )

    # debt_to_income: total_loan_amount / (total_balance + 1)
    balance = df.get("total_balance", pd.Series(1, index=df.index)).fillna(1).astype(float)
    loan_amount = df.get("total_loan_amount", pd.Series(0, index=df.index)).fillna(0).astype(float)
    debt_to_income_raw = _safe_div(loan_amount, balance + 1)
    debt_to_income = debt_to_income_raw.clip(0, 1)

    risk = 1.0 - (0.6 * credit_score_norm + 0.4 * (1.0 - debt_to_income))
    return risk.clip(0, 1).round(4)


def compute_savings_ratio(df: pd.DataFrame) -> pd.Series:
    """savings_ratio = total_balance / (total_balance + total_loan_amount + 1)"""
    balance = df.get("total_balance", pd.Series(0, index=df.index)).fillna(0).astype(float)
    loans = df.get("total_loan_amount", pd.Series(0, index=df.index)).fillna(0).astype(float)
    ratio = _safe_div(balance, balance + loans + 1)
    return ratio.clip(0, 1).round(4)


def compute_credit_utilization(df: pd.DataFrame) -> pd.Series:
    """
    credit_utilization = total_spent / (total_balance + 1)
    Higher = more spending relative to balance.
    """
    spent = df.get("total_spent", pd.Series(0, index=df.index)).fillna(0).astype(float)
    balance = df.get("total_balance", pd.Series(1, index=df.index)).fillna(1).astype(float)
    utilization = _safe_div(spent, balance + 1)
    return utilization.clip(0, 5).round(4)  # cap at 5x to avoid extreme outliers


def compute_recency_score(df: pd.DataFrame) -> pd.Series:
    """
    recency_score = 1 - norm(recency_days)
    High score = recently active customer. Score near 0 = very dormant.
    """
    recency = df.get("recency_days", pd.Series(90, index=df.index)).fillna(90).astype(float)
    score = 1.0 - _min_max_norm(recency)
    return score.round(4)


def compute_balance_trend(df: pd.DataFrame) -> pd.Series:
    """
    balance_trend = total_balance / (total_spent + 1)
    Proxy: balance preserved vs spending — higher = accumulating wealth.
    """
    balance = df.get("total_balance", pd.Series(0, index=df.index)).fillna(0).astype(float)
    spent = df.get("total_spent", pd.Series(1, index=df.index)).fillna(1).astype(float)
    trend = _safe_div(balance, spent + 1)
    return _min_max_norm(trend).round(4)


def compute_product_diversity(df: pd.DataFrame) -> pd.Series:
    """
    product_diversity: weighted count of different product types owned.
    = total_accounts * 0.4 + has_Business * 0.3 + (has_Credit + has_Debit) * 0.15 each
    """
    accounts = df.get("total_accounts", pd.Series(0, index=df.index)).fillna(0).astype(float)
    biz = df.get("has_Business", pd.Series(0, index=df.index)).fillna(0).astype(float)
    credit = df.get("has_Credit", pd.Series(0, index=df.index)).fillna(0).astype(float)
    debit = df.get("has_Debit", pd.Series(0, index=df.index)).fillna(0).astype(float)

    raw = 0.4 * accounts + 0.3 * biz + 0.15 * credit + 0.15 * debit
    return _min_max_norm(raw).round(4)


def compute_digital_score(df: pd.DataFrame) -> pd.Series:
    """digital_score: fraction of digital products held (credit card + debit card)."""
    credit = df.get("has_Credit", pd.Series(0, index=df.index)).fillna(0).astype(float)
    debit = df.get("has_Debit", pd.Series(0, index=df.index)).fillna(0).astype(float)
    score = (credit + debit) / 2.0
    return score.round(4)


# ── Feature Registry ─────────────────────────────────────────────────────────

FEATURE_REGISTRY: Dict[str, Any] = {
    "engagement_score":      compute_engagement_score,
    "customer_value_score":  compute_customer_value_score,
    "risk_score":            compute_risk_score,
    "savings_ratio":         compute_savings_ratio,
    "credit_utilization":    compute_credit_utilization,
    "recency_score":         compute_recency_score,
    "balance_trend":         compute_balance_trend,
    "product_diversity":     compute_product_diversity,
    "digital_score":         compute_digital_score,
}

# Features to always compute for segmentation and clustering
SEGMENTATION_FEATURES = [
    "engagement_score",
    "customer_value_score",
    "risk_score",
    "savings_ratio",
    "recency_score",
    "balance_trend",
    "product_diversity",
]

# Features for EDA only
EDA_FEATURES = [
    "customer_value_score",
    "risk_score",
    "recency_score",
]


def run_feature_engineering(
    df: pd.DataFrame,
    requested_features: List[str],
) -> pd.DataFrame:
    """
    Compute the requested features and add them as new columns to the DataFrame.

    :param df: Customer profile DataFrame from SQLite.
    :param requested_features: List of feature names from FEATURE_REGISTRY.
    :return: DataFrame with additional computed feature columns.
    """
    computed = []
    for feat in requested_features:
        if feat in FEATURE_REGISTRY:
            try:
                df[feat] = FEATURE_REGISTRY[feat](df)
                computed.append(feat)
                logger.debug(f"[FeatureEng] Computed: {feat}")
            except Exception as e:
                logger.warning(f"[FeatureEng] Failed to compute '{feat}': {e}")
        else:
            logger.warning(f"[FeatureEng] Unknown feature '{feat}', skipping.")

    logger.info(f"[FeatureEng] Computed {len(computed)} features: {computed}")
    return df


def get_features_for_intent(intent: str) -> List[str]:
    """Return the recommended feature list for a given intent."""
    if intent in ("segment", "transition", "explain"):
        return SEGMENTATION_FEATURES
    elif intent == "eda":
        return EDA_FEATURES
    elif intent == "feature_eng":
        return list(FEATURE_REGISTRY.keys())
    else:
        return EDA_FEATURES
