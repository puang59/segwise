"""
Segments API Router.

Provides structured REST endpoints for retrieving segment overview statistics, persona details,
feature distributions, recommended products, and customer sample lists for dashboard cards.
"""

import pandas as pd
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Query

from backend.db.sqlite_client import get_connection
from backend.tools.segmentation import apply_rule_segmentation
from backend.tools.recommendation import recommend_for_segments

router = APIRouter(prefix="/segments", tags=["Segments"])


def _load_segmented_dataset() -> pd.DataFrame:
    """Helper to query database and apply default rule segmentation if cached state is absent."""
    conn = get_connection()
    try:
        df = pd.read_sql_query("SELECT * FROM customer_profile", conn)
    finally:
        conn.close()
        
    assignments, _ = apply_rule_segmentation(df, segment_labels=["priority", "high_value", "dormant", "regular"], filters={})
    df["segment_label"] = assignments
    return df



@router.get("", summary="Get overview statistics for all segments")
def get_segments_overview() -> Dict[str, Any]:
    """
    Return overview statistics for all customer segments including count, percentage,
    average balance, average engagement score, and risk profile.
    """
    df = _load_segmented_dataset()
    total_customers = len(df)
    
    if "segment_label" not in df.columns:
        raise HTTPException(status_code=500, detail="Segmentation failed to generate segment_label.")
        
    segments_summary = []
    unique_segments = df["segment_label"].unique()
    
    # Calculate recommendations for segments
    seg_assignments = dict(zip(df["customer_id"].astype(str), df["segment_label"]))
    recommendations_by_seg = recommend_for_segments(df, seg_assignments)

    
    for seg_name in unique_segments:
        seg_df = df[df["segment_label"] == seg_name]
        count = len(seg_df)
        pct = round((count / total_customers) * 100, 2)
        avg_bal = float(seg_df["estimated_balance"].mean()) if "estimated_balance" in seg_df.columns else 0.0
        avg_credit = float(seg_df["credit_score"].mean()) if "credit_score" in seg_df.columns else 0.0
        avg_age = float(seg_df["age"].mean()) if "age" in seg_df.columns else 0.0
        
        # Product recommendations for this segment
        seg_recs = recommendations_by_seg.get(seg_name, [])
        top_products = [r["product"] for r in seg_recs[:3]]
        
        # Friendly persona names map
        persona_map = {
            "priority": "High-Net-Worth Priority Clients",
            "high_value": "Affluent Growth Customers",
            "regular": "Standard Retail Depositors",
            "dormant": "At-Risk Inactive Account Holders",
        }
        
        segments_summary.append({
            "id": str(seg_name),
            "name": str(seg_name).capitalize(),
            "persona_name": persona_map.get(str(seg_name), f"Segment {seg_name}"),
            "customer_count": count,
            "percentage": pct,
            "metrics": {
                "avg_balance": round(avg_bal, 2),
                "avg_credit_score": round(avg_credit, 1),
                "avg_age": round(avg_age, 1),
            },
            "top_products": top_products,
        })
        
    return {
        "total_customers": total_customers,
        "total_segments": len(segments_summary),
        "segments": segments_summary,
    }


@router.get("/{segment_id}", summary="Get detailed segment information by segment ID")
def get_segment_detail(
    segment_id: str,
    sample_limit: int = Query(20, ge=1, le=100)
) -> Dict[str, Any]:
    """
    Return comprehensive segment breakdown including stats, top products, persona profile,
    and a sample customer list.
    """
    df = _load_segmented_dataset()
    
    seg_df = df[df["segment_label"] == segment_id]
    if seg_df.empty:
        raise HTTPException(status_code=404, detail=f"Segment '{segment_id}' not found.")
        
    total_customers = len(df)
    count = len(seg_df)
    pct = round((count / total_customers) * 100, 2)
    
    # Calculate segment metrics
    avg_bal = float(seg_df["estimated_balance"].mean()) if "estimated_balance" in seg_df.columns else 0.0
    avg_credit = float(seg_df["credit_score"].mean()) if "credit_score" in seg_df.columns else 0.0
    avg_age = float(seg_df["age"].mean()) if "age" in seg_df.columns else 0.0
    
    # Top products recommendation
    seg_assignments = dict(zip(df["customer_id"].astype(str), df["segment_label"]))
    recommendations_by_seg = recommend_for_segments(df, seg_assignments)
    seg_recs = recommendations_by_seg.get(segment_id, [])

    
    # Sample customer records
    sample_cols = [c for c in ["customer_id", "name", "customer_short_id", "city", "age", "estimated_balance", "credit_score"] if c in seg_df.columns]
    sample_customers = seg_df[sample_cols].head(sample_limit).to_dict(orient="records")
    
    persona_map = {
        "priority": "High-Net-Worth Priority Clients",
        "high_value": "Affluent Growth Customers",
        "regular": "Standard Retail Depositors",
        "dormant": "At-Risk Inactive Account Holders",
    }
    
    persona_desc_map = {
        "priority": "Premium customers with high balance reserves and excellent credit stability.",
        "high_value": "Growing affluent segment with active digital usage and cross-sell potential.",
        "regular": "Stable day-to-day retail banking customers with steady deposit activity.",
        "dormant": "Low engagement accounts showing reduced transaction frequency requiring re-activation.",
    }
    
    return {
        "id": segment_id,
        "name": segment_id.capitalize(),
        "persona_name": persona_map.get(segment_id, f"Segment {segment_id}"),
        "description": persona_desc_map.get(segment_id, "Target customer segment profile."),
        "customer_count": count,
        "percentage": pct,
        "metrics": {
            "avg_balance": round(avg_bal, 2),
            "avg_credit_score": round(avg_credit, 1),
            "avg_age": round(avg_age, 1),
        },
        "recommendations": seg_recs,
        "sample_customers": sample_customers,
    }
