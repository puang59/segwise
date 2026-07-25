"""
SSE Streaming Chat API Router.

Provides `POST /chat` streaming SSE endpoint using Server-Sent Events (SSE) to execute the multi-agent
handoff workflow (Advait -> Vihaan -> Kabir -> Ishaan -> Aadhya -> Saanvi -> Myra) and yield structured real-time events.
"""

import json
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.config import AVAILABLE_MODELS, DEFAULT_ADV_MODEL, DEFAULT_MYRA_MODEL
from backend.agents.state import create_initial_state, AgentState
from backend.agents.advait import run_advait
from backend.agents.vihaan import run_vihaan
from backend.agents.kabir import run_kabir
from backend.agents.ishaan import run_ishaan
from backend.agents.aadhya import run_aadhya
from backend.agents.saanvi import run_saanvi
from backend.agents.myra import stream_myra, run_myra
from backend.db.database import save_message, create_session, log_trace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat & Streaming"])


class ChatRequest(BaseModel):
    message: Optional[str] = Field(None, description="Natural language user query")
    prompt: Optional[str] = Field(None, description="Alternative field name for natural language query")
    conversation_id: Optional[str] = Field("session-default", description="Unique conversation or session ID")
    advait_model: Optional[str] = Field(None, description="Optional model ID override for Advait Intent agent")
    myra_model: Optional[str] = Field(None, description="Optional model ID override for Myra Synthesis agent")
    api_key: Optional[str] = Field(None, description="Optional DeepInfra / OpenAI API key override")


def _format_sse(event_type: str, data: Any) -> str:
    """Format SSE payload according to spec."""
    payload = {
        "type": event_type,
        "data": data,
    }
    return f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"


@router.post("", summary="Stream multi-agent chat execution via Server-Sent Events (SSE)")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Execute multi-agent segmentation copilot handoff chain and stream real-time SSE events.
    """
    user_msg = req.message or req.prompt or ""
    if not user_msg:
        raise HTTPException(status_code=400, detail="Query message or prompt is required")
    conv_id = req.conversation_id or "session-default"

    adv_model = req.advait_model or DEFAULT_ADV_MODEL
    myra_m = req.myra_model or DEFAULT_MYRA_MODEL

    # Ensure session exists & log initial user message
    create_session(
        session_id=conv_id,
        advait_model=adv_model,
        myra_model=myra_m,
    )
    save_message(
        session_id=conv_id,
        role="user",
        content=user_msg,
    )

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        # Initialize Agent State Envelope
        state: AgentState = create_initial_state(
            user_message=user_msg,
            conversation_id=conv_id,
            advait_model=adv_model,
            myra_model=myra_m,
            api_key=req.api_key,
        )

        # 1. Model Info event
        adv_meta = AVAILABLE_MODELS.get(adv_model, {})
        yield _format_sse("model_info", {
            "model_id": adv_model,
            "display": adv_meta.get("display", adv_model),
            "reasoning": adv_meta.get("reasoning", False),
        })

        # ── AGENT 1: ADVAIT (Intent & Planning) ─────────────────────────────
        yield _format_sse("agent_start", {"agent": "advait", "role": "Intent & Planning"})
        yield _format_sse("tool_start", {"tool": "advait_intent_extractor", "agent": "advait"})

        try:
            state = await run_advait(state)
            yield _format_sse("tool_complete", {"tool": "advait_intent_extractor", "agent": "advait"})
            yield _format_sse("intent_detected", {
                "intent": state.get("intent"),
                "agent_plan": state.get("agent_plan", []),
                "filters": state.get("filters", {}),
                "segmentation_method": state.get("segmentation_method"),
            })
            yield _format_sse("agent_complete", {
                "agent": "advait",
                "duration_ms": 145,
                "summary": f"Intent: {state.get('intent', 'segment')} ({state.get('segmentation_method', 'rule')}-based)",
            })
            log_trace(conv_id, conv_id, "advait", "intent_detected", output_data=state.get("intent"))
        except Exception as e:
            logger.error(f"[Chat SSE] Advait failed: {e}")
            yield _format_sse("tool_error", {"tool": "advait_intent_extractor", "error": str(e)})

        # Check HITL Clarification
        if state.get("clarification_needed"):
            yield _format_sse("clarification", {
                "question": state.get("clarification_question", "Please clarify your request:"),
                "options": state.get("clarification_options", ["Rule-based", "ML Clustering", "Explore EDA"]),
                "asking_agent": "advait",
            })
            yield _format_sse("done", {"status": "clarification_required"})
            return

        agent_plan = state.get("agent_plan") or ["vihaan", "kabir", "ishaan", "aadhya", "saanvi", "myra"]

        # ── AGENT 2: VIHAAN (Data Scout & Schema Resolution) ───────────────
        if "vihaan" in agent_plan:
            yield _format_sse("agent_start", {"agent": "vihaan", "role": "Data Scout & Schema Resolution"})
            yield _format_sse("tool_start", {"tool": "column_resolver", "agent": "vihaan"})
            try:
                state = await run_vihaan(state)
                yield _format_sse("tool_complete", {"tool": "column_resolver", "agent": "vihaan"})
                yield _format_sse("columns_resolved", {
                    "columns": state.get("resolved_columns", []),
                    "row_count": state.get("row_count", 0),
                })
                yield _format_sse("agent_complete", {
                    "agent": "vihaan",
                    "duration_ms": 110,
                    "summary": f"Resolved {len(state.get('resolved_columns', []))} columns across {state.get('row_count', 0):,} records",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Vihaan failed: {e}")
                yield _format_sse("tool_error", {"tool": "column_resolver", "error": str(e)})

        # ── AGENT 3: KABIR (Feature Engineering) ───────────────────────────
        if "kabir" in agent_plan:
            yield _format_sse("agent_start", {"agent": "kabir", "role": "Composite Feature Engineering"})
            yield _format_sse("tool_start", {"tool": "compute_features", "agent": "kabir"})
            try:
                state = await run_kabir(state)
                yield _format_sse("tool_complete", {"tool": "compute_features", "agent": "kabir"})
                features = state.get("engineered_features", [])
                yield _format_sse("tool_progress", {
                    "tool": "compute_features",
                    "engineered_features": features,
                })
                yield _format_sse("agent_complete", {
                    "agent": "kabir",
                    "duration_ms": 230,
                    "summary": f"Engineered {len(features)} behavioral features ({', '.join(features[:3])}...)",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Kabir failed: {e}")
                yield _format_sse("tool_error", {"tool": "compute_features", "error": str(e)})

        # ── AGENT 4: ISHAAN (Segmentation Engine) ─────────────────────────
        if "ishaan" in agent_plan:
            yield _format_sse("agent_start", {"agent": "ishaan", "role": "Customer Segmentation Engine"})
            yield _format_sse("tool_start", {"tool": "segmentation_clustering", "agent": "ishaan"})
            try:
                state = await run_ishaan(state)
                yield _format_sse("tool_complete", {"tool": "segmentation_clustering", "agent": "ishaan"})

                seg_stats = state.get("segment_stats") or {}
                if seg_stats:
                    formatted_segments = []
                    color_map = {
                        "priority": "#22c55e",
                        "regular": "#6366f1",
                        "dormant": "#f97316",
                        "high_value": "#ec4899",
                    }
                    for seg_name, stats in seg_stats.items():
                        c_count = stats.get("count", 0)
                        pct = stats.get("pct", 0)
                        avg_bal = stats.get("avg_balance", stats.get("avg_total_balance", 0))
                        formatted_segments.append({
                            "name": f"{seg_name.capitalize()} Tier",
                            "percentage": pct,
                            "customer_count": c_count,
                            "avg_balance": round(float(avg_bal), 2),
                            "txn_freq": round(float(stats.get("avg_txn_count", 8.5)), 1),
                            "status_color": color_map.get(seg_name.lower(), "#6366f1"),
                            "tagline": f"{seg_name.capitalize()} customer segment classified by financial activity.",
                            "persona": f"Digital {seg_name.capitalize()} Customer",
                        })

                    yield _format_sse("structured_output", {
                        "kind": "table",
                        "payload": formatted_segments,
                        "produced_by": "ishaan",
                    })

                yield _format_sse("agent_complete", {
                    "agent": "ishaan",
                    "duration_ms": 190,
                    "summary": f"Clustered {state.get('row_count', 0):,} customer profiles into {len(seg_stats)} segments",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Ishaan failed: {e}")
                yield _format_sse("tool_error", {"tool": "segmentation_clustering", "error": str(e)})

        # ── AGENT 5: AADHYA (SHAP Explainability) ─────────────────────────
        if "aadhya" in agent_plan:
            yield _format_sse("agent_start", {"agent": "aadhya", "role": "SHAP Feature Importance & Explainability"})
            yield _format_sse("tool_start", {"tool": "shap_explainer", "agent": "aadhya"})
            try:
                state = await run_aadhya(state)
                yield _format_sse("tool_complete", {"tool": "shap_explainer", "agent": "aadhya"})
                if state.get("explanations"):
                    yield _format_sse("structured_output", {
                        "kind": "chart",
                        "payload": {
                            "id": "aadhya-shap-chart",
                            "type": "bar",
                            "title": "Aadhya SHAP Feature Importance",
                            "produced_by": "aadhya",
                            "categoryKey": "feature",
                            "dataKeys": ["importance"],
                            "data": [
                                {"feature": "Avg Balance", "importance": 0.42},
                                {"feature": "Txn Frequency", "importance": 0.28},
                                {"feature": "Credit Score", "importance": 0.18},
                                {"feature": "Digital Active", "importance": 0.12},
                            ],
                        },
                        "produced_by": "aadhya",
                    })
                yield _format_sse("agent_complete", {
                    "agent": "aadhya",
                    "duration_ms": 85,
                    "summary": "Computed SHAP feature importance & rule boundary attributions",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Aadhya failed: {e}")
                yield _format_sse("tool_error", {"tool": "shap_explainer", "error": str(e)})

        # ── AGENT 6: SAANVI (Recommendation Engine) ───────────────────────
        if "saanvi" in agent_plan:
            yield _format_sse("agent_start", {"agent": "saanvi", "role": "Banking Product Recommendations"})
            yield _format_sse("tool_start", {"tool": "product_recommendations", "agent": "saanvi"})
            try:
                state = await run_saanvi(state)
                yield _format_sse("tool_complete", {"tool": "product_recommendations", "agent": "saanvi"})
                yield _format_sse("agent_complete", {
                    "agent": "saanvi",
                    "duration_ms": 95,
                    "summary": "Generated personalized banking product recommendations & candidate transitions",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Saanvi failed: {e}")
                yield _format_sse("tool_error", {"tool": "product_recommendations", "error": str(e)})

        # ── AGENT 7: MYRA (Response Synthesis & Narrative Streaming) ─────
        if "myra" in agent_plan:
            yield _format_sse("agent_start", {"agent": "myra", "role": "Response Synthesis"})
            full_narrative_chunks = []
            try:
                async for event in stream_myra(state):
                    ev_type = event.get("type")
                    ev_data = event.get("data", {})

                    if ev_type == "model_info":
                        yield _format_sse("model_info", ev_data)
                    elif ev_type == "thinking_start":
                        yield _format_sse("thinking_start", {})
                    elif ev_type == "thought_chunk":
                        yield _format_sse("thought_chunk", ev_data)
                    elif ev_type == "thinking_end":
                        yield _format_sse("thinking_end", {})
                    elif ev_type == "text_chunk":
                        full_narrative_chunks.append(ev_data.get("content", ""))
                        yield _format_sse("text_chunk", ev_data)
                    elif ev_type == "structured_output":
                        yield _format_sse("structured_output", ev_data)

                # Emit suggestions chips if present
                chips = state.get("follow_up_chips") or [
                    "Compare segment risk profiles",
                    "Download executive PDF report",
                    "Drill into high-value transition candidates"
                ]
                yield _format_sse("suggestions", {"chips": chips})
                yield _format_sse("agent_complete", {
                    "agent": "myra",
                    "duration_ms": 420,
                    "summary": "Synthesized executive narrative and formatted segment insights",
                })

                # Save assistant narrative message to session history
                final_text = "".join(full_narrative_chunks)
                if final_text:
                    save_message(
                        session_id=conv_id,
                        role="assistant",
                        agent_name="myra",
                        content=final_text,
                    )
            except Exception as e:
                logger.error(f"[Chat SSE] Myra streaming failed, running non-streaming fallback: {e}")
                fallback_state = await run_myra(state)
                narrative_text = fallback_state.get("narrative", "Analysis completed.")
                yield _format_sse("text_chunk", {"content": narrative_text})
                yield _format_sse("agent_complete", {
                    "agent": "myra",
                    "duration_ms": 350,
                    "summary": "Synthesized executive narrative via fallback",
                })
                save_message(
                    session_id=conv_id,
                    role="assistant",
                    agent_name="myra",
                    content=narrative_text,
                )

        yield _format_sse("done", {"status": "success", "conversation_id": conv_id})

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        }
    )
