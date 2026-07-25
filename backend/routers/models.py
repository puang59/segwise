"""
Dynamic Model Switcher API Router.

Provides endpoints to query available LLM models in the registry, fetch default & recommended
models for Advait & Myra agents, select active models per session, and get current session models.
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.config import AVAILABLE_MODELS, DEFAULT_ADV_MODEL, DEFAULT_MYRA_MODEL, DEFAULT_MODEL
from backend.db.database import get_session, update_session_models

router = APIRouter(prefix="/models", tags=["Models"])


class ModelSelectRequest(BaseModel):
    session_id: str = Field(..., description="Session/Conversation ID")
    scope: str = Field("both", description="Scope of model update: 'both' | 'advait' | 'myra'")
    advait_model: Optional[str] = Field(None, description="Model ID for Advait Intent agent")
    myra_model: Optional[str] = Field(None, description="Model ID for Myra Synthesis agent")


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
    Return recommended default LLMs for Advait (Intent agent) and Myra (Synthesis agent).
    """
    adv_model_info = AVAILABLE_MODELS.get(DEFAULT_ADV_MODEL, {})
    myra_model_info = AVAILABLE_MODELS.get(DEFAULT_MYRA_MODEL, {})
    
    return {
        "advait": {
            "model_id": DEFAULT_ADV_MODEL,
            "display": adv_model_info.get("display", "Gemini 3.1 Flash Lite"),
            "provider": adv_model_info.get("provider", "Google"),
            "reasoning": adv_model_info.get("reasoning", False),
            "description": adv_model_info.get("description", "Lowest latency — ideal for intent extraction"),
        },
        "myra": {
            "model_id": DEFAULT_MYRA_MODEL,
            "display": myra_model_info.get("display", "Gemini 3.1 Pro"),
            "provider": myra_model_info.get("provider", "Google"),
            "reasoning": myra_model_info.get("reasoning", False),
            "description": myra_model_info.get("description", "Best quality narrative & persona generation"),
        },
        "default": DEFAULT_MODEL,
    }


@router.post("/select", summary="Update model selection for active session")
def select_session_models(req: ModelSelectRequest) -> Dict[str, Any]:
    """
    Update active LLM models for a session.
    - scope 'both': Updates both Advait and Myra models.
    - scope 'advait': Updates only Advait model.
    - scope 'myra': Updates only Myra model.
    """
    if req.advait_model and req.advait_model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid advait_model ID: {req.advait_model}")
    if req.myra_model and req.myra_model not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid myra_model ID: {req.myra_model}")
        
    advait_m = req.advait_model if req.scope in ("both", "advait") else None
    myra_m = req.myra_model if req.scope in ("both", "myra") else None
    
    updated = update_session_models(
        session_id=req.session_id,
        advait_model=advait_m,
        myra_model=myra_m,
    )
    
    return {
        "status": "success",
        "session_id": updated["id"],
        "active_models": {
            "advait": updated["advait_model"],
            "myra": updated["myra_model"],
        }
    }


@router.get("/current", summary="Get active models for a session")
def get_current_models(session_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    """
    Return currently active models for a given session ID (or global default if session not found).
    """
    advait_model = DEFAULT_ADV_MODEL
    myra_model = DEFAULT_MYRA_MODEL
    
    if session_id:
        sess = get_session(session_id)
        if sess:
            advait_model = sess.get("advait_model") or DEFAULT_ADV_MODEL
            myra_model = sess.get("myra_model") or DEFAULT_MYRA_MODEL
            
    adv_info = AVAILABLE_MODELS.get(advait_model, {})
    myra_info = AVAILABLE_MODELS.get(myra_model, {})
    
    return {
        "session_id": session_id,
        "advait": {
            "model_id": advait_model,
            "display": adv_info.get("display", advait_model),
            "provider": adv_info.get("provider", "Unknown"),
            "reasoning": adv_info.get("reasoning", False),
        },
        "myra": {
            "model_id": myra_model,
            "display": myra_info.get("display", myra_model),
            "provider": myra_info.get("provider", "Unknown"),
            "reasoning": myra_info.get("reasoning", False),
        }
    }
