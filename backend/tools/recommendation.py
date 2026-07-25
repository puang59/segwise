"""
Recommendation Tool — Product cross-sell/up-sell rule engine.

Implements PRODUCT_RULES registry with priority scoring and segment affinity.
"""

import logging
import pandas as pd
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ── Product Rules Registry ────────────────────────────────────────────────────

PRODUCT_RULES = [
    {
        "product": "Premium Savings Account",
        "code": "premium_savings",
        "condition": lambda r: (
            (r.get("total_balance") or 0) > 50_000 and
            (r.get("total_accounts") or 0) < 3
        ),
        "priority": 10,
        "segment_affinity": ["priority", "high_value"],
        "description": "Exclusive high-yield savings for customers with strong balances.",
        "action": "Offer Premium Savings with bonus interest rate",
    },
    {
        "product": "Mutual Fund SIP",
        "code": "mutual_fund_sip",
        "condition": lambda r: (
            (r.get("total_spent") or 0) > 40_000 and
            not bool(r.get("has_Business")) and  # proxy for no investment product
            (r.get("credit_score") or 0) > 650
        ),
        "priority": 9,
        "segment_affinity": ["regular", "priority"],
        "description": "Systematic investment plan for active spenders with good credit.",
        "action": "Pitch SIP starting ₹500/month with tax benefits",
    },
    {
        "product": "Travel Credit Card",
        "code": "travel_credit_card",
        "condition": lambda r: (
            (r.get("total_spent") or 0) > 60_000 and
            not bool(r.get("has_Credit"))
        ),
        "priority": 8,
        "segment_affinity": ["priority", "high_value"],
        "description": "Premium travel card for high spenders without a credit card.",
        "action": "Issue Travel Credit Card with airport lounge access",
    },
    {
        "product": "Personal Loan Top-Up",
        "code": "personal_loan_topup",
        "condition": lambda r: (
            bool(r.get("has_loan")) and
            (r.get("credit_score") or 0) > 700
        ),
        "priority": 7,
        "segment_affinity": ["priority", "regular"],
        "description": "Top-up existing loan at lower rate for creditworthy borrowers.",
        "action": "Offer loan top-up at 0.5% reduced interest rate",
    },
    {
        "product": "Business Banking Package",
        "code": "business_banking",
        "condition": lambda r: (
            (r.get("total_balance") or 0) > 75_000 and
            not bool(r.get("has_Business"))
        ),
        "priority": 7,
        "segment_affinity": ["priority", "high_value"],
        "description": "Business account bundle for high-balance customers without business banking.",
        "action": "Invite to business banking with dedicated relationship manager",
    },
    {
        "product": "Digital Debit Card Upgrade",
        "code": "debit_card_upgrade",
        "condition": lambda r: (
            bool(r.get("has_Debit")) and
            (r.get("total_spent") or 0) > 20_000 and
            (r.get("recency_days") or 999) < 30
        ),
        "priority": 6,
        "segment_affinity": ["regular", "priority"],
        "description": "Premium debit card upgrade for active, recent transactors.",
        "action": "Upgrade to premium debit with cashback rewards",
    },
    {
        "product": "Re-Engagement Offer",
        "code": "reengagement",
        "condition": lambda r: (
            (r.get("recency_days") or 0) > 200
        ),
        "priority": 5,
        "segment_affinity": ["dormant"],
        "description": "Win-back offer for dormant customers.",
        "action": "Send personalised re-engagement email with zero-fee offer for 3 months",
    },
    {
        "product": "Account Reactivation Bonus",
        "code": "reactivation_bonus",
        "condition": lambda r: (
            (r.get("recency_days") or 0) > 300 and
            (r.get("total_balance") or 0) < 5_000
        ),
        "priority": 4,
        "segment_affinity": ["dormant"],
        "description": "Cash bonus incentive for long-dormant customers to reactivate.",
        "action": "Offer ₹500 bonus on first transaction after account reactivation",
    },
    {
        "product": "Secured Credit Card",
        "code": "secured_credit_card",
        "condition": lambda r: (
            not bool(r.get("has_Credit")) and
            (r.get("credit_score") or 0) < 650 and
            (r.get("total_balance") or 0) > 10_000
        ),
        "priority": 5,
        "segment_affinity": ["regular"],
        "description": "Credit-building secured card for customers with moderate credit scores.",
        "action": "Offer secured credit card to build credit history",
    },
    {
        "product": "Savings Booster Plan",
        "code": "savings_booster",
        "condition": lambda r: (
            (r.get("total_balance") or 0) < 20_000 and
            (r.get("total_spent") or 0) > 10_000 and
            (r.get("recency_days") or 999) < 60
        ),
        "priority": 4,
        "segment_affinity": ["regular"],
        "description": "Automated savings plan to help active spenders build a safety net.",
        "action": "Enrol in auto-save with 5% of each transaction",
    },
    {
        "product": "Loan Against Fixed Deposit",
        "code": "loan_fd",
        "condition": lambda r: (
            (r.get("total_balance") or 0) > 30_000 and
            (r.get("has_Savings") or False) and
            not bool(r.get("has_loan"))
        ),
        "priority": 6,
        "segment_affinity": ["priority", "regular"],
        "description": "Collateral-free borrowing against savings for customers without loans.",
        "action": "Offer OD against FD at 1% over deposit rate",
    },
]


def recommend_products(
    customer_row: Dict[str, Any],
    segment_label: Optional[str] = None,
    top_n: int = 3,
) -> List[Dict[str, Any]]:
    """
    Evaluate product eligibility for a single customer and return top-N recommendations.

    :param customer_row: Dict of customer feature values.
    :param segment_label: Optional segment label for segment_affinity filtering.
    :param top_n: Maximum number of recommendations to return.
    :return: List of eligible product dicts sorted by priority.
    """
    eligible = []
    for product in PRODUCT_RULES:
        try:
            if product["condition"](customer_row):
                rec = {
                    "product": product["product"],
                    "code": product["code"],
                    "priority": product["priority"],
                    "description": product["description"],
                    "action": product["action"],
                    "segment_affinity": product.get("segment_affinity", []),
                }
                # Boost priority if segment matches affinity
                if segment_label and segment_label in product.get("segment_affinity", []):
                    rec["priority"] += 1
                eligible.append(rec)
        except Exception as e:
            logger.debug(f"[Recommend] Product '{product['product']}' condition error: {e}")

    # Sort by priority descending
    eligible.sort(key=lambda x: x["priority"], reverse=True)
    return eligible[:top_n]


def recommend_for_segments(
    df: pd.DataFrame,
    segment_assignments: Dict[str, str],
    top_n: int = 3,
) -> Dict[str, Any]:
    """
    Compute recommendations for each segment by aggregating representative customer profiles.

    :param df: Customer DataFrame.
    :param segment_assignments: {customer_id: segment_name}.
    :param top_n: Top products per segment.
    :return: {segment_label: [product_list]}.
    """
    import pandas as pd

    if "customer_id" in df.columns:
        df["_segment"] = df["customer_id"].astype(str).map(segment_assignments)
    else:
        df["_segment"] = pd.Series(list(segment_assignments.values())[:len(df)], index=df.index)

    segment_recs: Dict[str, Any] = {}

    for seg in df["_segment"].dropna().unique():
        seg_df = df[df["_segment"] == seg]

        # Use median values as segment representative
        numeric_cols = seg_df.select_dtypes(include=["number"]).columns.tolist()
        representative = seg_df[numeric_cols].median().to_dict()

        # Boolean columns — use majority vote
        for col in ["has_loan", "has_Credit", "has_Debit", "has_Business", "has_Savings", "has_Checking"]:
            if col in seg_df.columns:
                representative[col] = bool(seg_df[col].mode().iloc[0]) if len(seg_df) > 0 else False

        recs = recommend_products(representative, segment_label=str(seg), top_n=top_n)
        segment_recs[str(seg)] = recs
        logger.debug(f"[Recommend] Segment '{seg}': {[r['product'] for r in recs]}")

    return segment_recs
