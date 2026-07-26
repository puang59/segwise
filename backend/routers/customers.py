"""
Customers API Router.

Provides paginated search, filter, and detail endpoints for retail bank customer profiles,
including engineered features, segment assignments, SHAP explanations, and Saanvi product recommendations.
"""

import pandas as pd
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query

from backend.db.sqlite_client import get_connection
from backend.tools.segmentation import apply_rule_segmentation
from backend.tools.feature_engineering import run_feature_engineering
from backend.tools.recommendation import recommend_products
from backend.tools.explainability import explain_customer_shap

router = APIRouter(prefix="/customers", tags=["Customers"])


import json
from backend.db.database import get_db_session
from backend.db.models import SegmentCacheModel

def _load_full_customer_dataset(session_id: Optional[str] = None) -> pd.DataFrame:
    """Load full customer dataset with segmentation labels and engineered features."""
    conn = get_connection()
    try:
        df = pd.read_sql_query("SELECT * FROM customer_profile", conn)
    finally:
        conn.close()
        
    assignments = None
    if session_id:
        with get_db_session() as s:
            cache = s.query(SegmentCacheModel).filter(SegmentCacheModel.session_id == session_id).order_by(SegmentCacheModel.created_at.desc()).first()
            if cache:
                try:
                    assignments_dict = json.loads(cache.segment_assignments)
                    id_col = df["customer_id"].astype(str) if "customer_id" in df.columns else pd.Series(df.index.astype(str))
                    assignments = id_col.map(assignments_dict)
                except Exception:
                    pass
                    
    if assignments is None or assignments.isna().all():
        assignments, _ = apply_rule_segmentation(df, segment_labels=["priority", "high_value", "dormant", "regular"], filters={})
        
    df["segment_label"] = assignments
    
    default_features = [
        "engagement_score", "customer_value_score", "risk_score",
        "savings_ratio", "credit_utilization", "recency_score",
        "balance_trend", "product_diversity", "digital_score"
    ]
    df_feat = run_feature_engineering(df, requested_features=default_features)
    return df_feat


@router.get("", summary="Get paginated list of customers with filtering")
def get_customers_list(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    segment: Optional[str] = Query(None, description="Filter by segment label"),
    city: Optional[str] = Query(None, description="Filter by customer city"),
    min_balance: Optional[float] = Query(None, description="Minimum estimated balance"),
    max_balance: Optional[float] = Query(None, description="Maximum estimated balance"),
    search: Optional[str] = Query(None, description="Search query matching customer ID or name"),
    session_id: Optional[str] = Query(None, description="Filter by session ID")
) -> Dict[str, Any]:
    """
    Return a paginated list of customer records matching filter criteria.
    """
    df = _load_full_customer_dataset(session_id=session_id)
    
    # Filter by segment
    if segment:
        df = df[df["segment_label"] == segment]
        
    # Filter by city
    if city and "city" in df.columns:
        df = df[df["city"].str.lower() == city.lower()]
        
    # Filter by balance range
    if min_balance is not None and "estimated_balance" in df.columns:
        df = df[df["estimated_balance"] >= min_balance]
    if max_balance is not None and "estimated_balance" in df.columns:
        df = df[df["estimated_balance"] <= max_balance]
        
    # Search filter (matches customer_id, name, or city)
    if search:
        s_lower = search.lower()
        id_match = df["customer_id"].astype(str).str.lower().str.contains(s_lower)
        city_match = df["city"].astype(str).str.lower().str.contains(s_lower) if "city" in df.columns else False
        name_match = df["name"].astype(str).str.lower().str.contains(s_lower) if "name" in df.columns else False
        df = df[id_match | city_match | name_match]
        
    total_count = len(df)
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_df = df.iloc[start_idx:end_idx]
    
    records = page_df.to_dict(orient="records")
    
    return {
        "page": page,
        "limit": limit,
        "total": total_count,
        "pages": total_pages,
        "items": records,
    }


@router.get("/{customer_id}", summary="Get customer detail profile by ID")
def get_customer_detail(customer_id: str) -> Dict[str, Any]:
    """
    Return detailed customer profile including raw demographic/financial features,
    engineered composite features, segment label, SHAP explanation, and product recommendations.
    """
    df = _load_full_customer_dataset()
    
    # Find matching customer row
    match = df[df["customer_id"].astype(str) == str(customer_id)]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Customer ID '{customer_id}' not found.")
        
    row = match.iloc[0]
    cust_dict = row.to_dict()
    
    # Generate recommendations for customer
    recs = recommend_products(cust_dict)
    
    # Generate SHAP explanation for customer profile
    try:
        feature_cols = [c for c in ["estimated_balance", "credit_score", "age", "engagement_score", "customer_value_score", "risk_score"] if c in df.columns]
        shap_info = explain_customer_shap(customer_row=row.to_frame().T, model=None, df_background=df.head(10), features=feature_cols)
    except Exception:
        shap_info = {
            "customer_id": customer_id,
            "feature_importance": {},
            "top_drivers": [],
            "status": "fallback"
        }
        
    return {
        "customer_id": str(customer_id),
        "profile": cust_dict,
        "segment_label": cust_dict.get("segment_label", "regular"),
        "engineered_features": {
            "engagement_score": cust_dict.get("engagement_score"),
            "customer_value_score": cust_dict.get("customer_value_score"),
            "risk_score": cust_dict.get("risk_score"),
            "savings_ratio": cust_dict.get("savings_ratio"),
            "credit_utilization": cust_dict.get("credit_utilization"),
            "recency_score": cust_dict.get("recency_score"),
            "balance_trend": cust_dict.get("balance_trend"),
            "digital_score": cust_dict.get("digital_score"),
        },
        "recommendations": recs,
        "shap_explanation": shap_info,
    }
