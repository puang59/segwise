"""
Dynamic Model Switcher API Router.

Provides endpoints to query available LLM models in the registry, fetch default & recommended
models for Atlas & Loom agents, select active models per session, and get current session models.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.config import AVAILABLE_MODELS, DEFAULT_ADV_MODEL, DEFAULT_LOOM_MODEL, DEFAULT_MODEL
from backend.db.database import get_session, update_session_models

router = APIRouter(prefix="/models", tags=["Models"])


class ModelSelectRequest(BaseModel):
    session_id: str = Field(..., description="Session/Conversation ID")
    scope: str = Field("both", description="Scope of model update: 'both' | 'atlas' | 'loom'")
    atlas_model: Optional[str] = Field(None, description="Model ID for Atlas Intent agent")
    loom_model: Optional[str] = Field(None, description="Model ID for Loom Synthesis agent")


@router.get("", summary="Get all available LLM models grouped by provider")
def get_all_models() -> Dict[str, Any]:
    """
    Return all models registered in AVAILABLE_MODELS grouped by provider name.
    """
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    
    for model_id, meta in AVAILABLE_MODELS.items():
        provider = meta.get("provider", "Other")
        if provider not in grouped:
            grouped[provider] = []
        
        model_entry = {
            "id": model_id,
            "display": meta.get("display", model_id),
            "provider": provider,
            "context_window": meta.get("context_window", 128000),
            "speed": meta.get("speed", "fast"),
            "reasoning": meta.get("reasoning", False),
            "recommended_for": meta.get("recommended_for", []),
            "description": meta.get("description", ""),
        }
        grouped[provider].append(model_entry)
        
    providers_list = [
        {"provider": provider, "models": models}
        for provider, models in grouped.items()
    ]
    
    return {
        "total_models": len(AVAILABLE_MODELS),
        "providers": providers_list,
        "raw_models": AVAILABLE_MODELS
    }


@router.get("/recommended", summary="Get recommended default models for agents")
def get_recommended_models() -> Dict[str, Any]:
    """
    Return recommended default LLMs for Atlas (Intent agent) and Loom (Synthesis agent).
    """
    adv_model_info = AVAILABLE_MODELS.get(DEFAULT_ADV_MODEL, {})
    loom_model_info = AVAILABLE_MODELS.get(DEFAULT_LOOM_MODEL, {})
    
    return {
        "atlas": {
            "model_id": DEFAULT_ADV_MODEL,
            "display": adv_model_info.get("display", "Gemini 3.1 Flash Lite"),
            "provider": adv_model_info.get("provider", "Google"),
            "reasoning": adv_model_info.get("reasoning", False),
            "description": adv_model_info.get("description", "Lowest latency — ideal for intent extraction"),
        },
        "loom": {
            "model_id": DEFAULT_LOOM_MODEL,
            "display": loom_model_info.get("display", "Gemini 3.1 Pro"),
            "provider": loom_model_info.get("provider", "Google"),
            "reasoning": loom_model_info.get("reasoning", False),
            "description": loom_model_info.get("description", "Best quality narrative & persona generation"),
        },
        "default": DEFAULT_MODEL,
    }


@router.post("/select", summary="Update model selection for active session")
def select_session_models(req: ModelSelectRequest) -> Dict[str, Any]:
    """
    Update active LLM models for a session.
    - scope 'both': Updates both Atlas and Loom models.
    - scope 'atlas': Updates only Atlas model.
    - scope 'loom': Updates only Loom model.
    """
    if req.atlas_model and req.atlas_model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid atlas_model ID: {req.atlas_model}")
    if req.loom_model and req.loom_model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid loom_model ID: {req.loom_model}")
        
    atlas_m = req.atlas_model if req.scope in ("both", "atlas") else None
    loom_m = req.loom_model if req.scope in ("both", "loom") else None
    
    updated = update_session_models(
        session_id=req.session_id,
        atlas_model=atlas_m,
        loom_model=loom_m,
    )
    
    return {
        "status": "success",
        "session_id": updated["id"],
        "active_models": {
            "atlas": updated["atlas_model"],
            "loom": updated["loom_model"],
        }
    }


@router.get("/current", summary="Get active models for a session")
def get_current_models(session_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    """
    Return currently active models for a given session ID (or global default if session not found).
    """
    atlas_model = DEFAULT_ADV_MODEL
    loom_model = DEFAULT_LOOM_MODEL
    
    if session_id:
        sess = get_session(session_id)
        if sess:
            atlas_model = sess.get("atlas_model") or DEFAULT_ADV_MODEL
            loom_model = sess.get("loom_model") or DEFAULT_LOOM_MODEL
            
    adv_info = AVAILABLE_MODELS.get(atlas_model, {})
    loom_info = AVAILABLE_MODELS.get(loom_model, {})
    
    return {
        "session_id": session_id,
        "atlas": {
            "model_id": atlas_model,
            "display": adv_info.get("display", atlas_model),
            "provider": adv_info.get("provider", "Unknown"),
            "reasoning": adv_info.get("reasoning", False),
        },
        "loom": {
            "model_id": loom_model,
            "display": loom_info.get("display", loom_model),
            "provider": loom_info.get("provider", "Unknown"),
            "reasoning": loom_info.get("reasoning", False),
        }
    }
