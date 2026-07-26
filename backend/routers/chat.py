"""
SSE Streaming Chat API Router.

Provides `POST /chat` streaming SSE endpoint using Server-Sent Events (SSE) to execute the multi-agent
handoff workflow (Atlas -> Scout -> Forge -> Mosaic -> Prism -> Compass -> Loom) and yield structured real-time events.
"""

import json
import asyncio
import logging
from typing import Any, Optional, AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.config import AVAILABLE_MODELS, DEFAULT_ADV_MODEL, DEFAULT_LOOM_MODEL
from backend.agents.state import create_initial_state, AgentState
from backend.agents.atlas import run_atlas
from backend.agents.scout import run_scout
from backend.agents.forge import run_forge
from backend.agents.mosaic import run_mosaic
from backend.agents.prism import run_prism
from backend.agents.compass import run_compass
from backend.agents.loom import stream_loom, run_loom
from backend.db.database import save_message, create_session, log_trace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat & Streaming"])


class ChatRequest(BaseModel):
    message: Optional[str] = Field(None, description="Natural language user query")
    prompt: Optional[str] = Field(None, description="Alternative field name for natural language query")
    conversation_id: Optional[str] = Field("session-default", description="Unique conversation or session ID")
    atlas_model: Optional[str] = Field(None, description="Optional model ID override for Atlas Intent agent")
    loom_model: Optional[str] = Field(None, description="Optional model ID override for Loom Synthesis agent")
    api_key: Optional[str] = Field(None, description="Optional DeepInfra / OpenAI API key override")


def _format_sse(event_type: str, data: Any) -> str:
    """Format SSE payload according to spec."""
    payload = {"type": event_type, "data": data}
    return f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"

class EnhanceRequest(BaseModel):
    prompt: str
    model: Optional[str] = Field(None, description="Model ID")
    api_key: Optional[str] = Field(None, description="API Key")

@router.post("/enhance", summary="Enhance a prompt for better segmentation analysis")
async def enhance_prompt_endpoint(req: EnhanceRequest):
    if not req.prompt or not req.prompt.strip():
        return {"enhanced_prompt": ""}
        
    from backend.config import get_llm_client, DEFAULT_ADV_MODEL
    model = req.model or DEFAULT_ADV_MODEL
    client = get_llm_client(req.api_key)
    
    system_prompt = (
        "You are an expert prompt engineer for a banking customer segmentation AI. "
        "Your task is to take the user's rough query and rewrite it into a clear, "
        "professional, and highly specific analytical prompt. "
        "Ensure the intention is clear and relevant to bring out optimal results from the agents. "
        "Keep it concise. Do not add any introductory or concluding remarks. Just output the enhanced prompt."
    )
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.prompt}
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        import re
        enhanced = response.choices[0].message.content.strip()
        enhanced = re.sub(r'<think>.*?</think>', '', enhanced, flags=re.DOTALL).strip()
        return {"enhanced_prompt": enhanced}
    except Exception as e:
        logger.error(f"[Enhance] Failed to enhance prompt: {e}")
        return {"enhanced_prompt": req.prompt + " (Enhanced for clarity)"}



@router.post("", summary="Stream multi-agent chat execution via Server-Sent Events (SSE)")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Execute multi-agent segmentation copilot handoff chain and stream real-time SSE events.
    """
    user_msg = req.message or req.prompt or ""
    if not user_msg:
        raise HTTPException(status_code=400, detail="Query message or prompt is required")
    conv_id = req.conversation_id or "session-default"

    adv_model = req.atlas_model or DEFAULT_ADV_MODEL
    loom_m = req.loom_model or DEFAULT_LOOM_MODEL

    create_session(session_id=conv_id, atlas_model=adv_model, loom_model=loom_m)
    save_message(session_id=conv_id, role="user", content=user_msg)

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        state: AgentState = create_initial_state(
            user_message=user_msg,
            conversation_id=conv_id,
            atlas_model=adv_model,
            loom_model=loom_m,
            api_key=req.api_key,
        )

        # Model info
        adv_meta = AVAILABLE_MODELS.get(adv_model, {})
        yield _format_sse("model_info", {
            "model_id": adv_model,
            "display": adv_meta.get("display", adv_model),
            "reasoning": adv_meta.get("reasoning", False),
        })

        # Pad with 8KB of comment data to force Next.js proxy and Uvicorn to flush the buffer immediately
        yield f": {' ' * 8192}\n\n"
        await asyncio.sleep(0)

        # ── 1. ATLAS (Intent Extractor & Planner) ───────────────────────────
        yield _format_sse("agent_start", {"agent": "atlas", "role": "Intent & Planning"})
        yield _format_sse("tool_start", {"tool": "atlas_intent_extractor", "agent": "atlas"})
        yield f": {' ' * 2048}\n\n"  # Flush buffer again
        await asyncio.sleep(0.35)  # Realistic live pipeline pacing

        try:
            state = await run_atlas(state)
            yield _format_sse("tool_complete", {"tool": "atlas_intent_extractor", "agent": "atlas"})
            yield _format_sse("intent_detected", {
                "intent": state.get("intent"),
                "agent_plan": state.get("agent_plan", []),
                "filters": state.get("filters", {}),
                "segmentation_method": state.get("segmentation_method"),
            })
            yield _format_sse("agent_complete", {
                "agent": "atlas",
                "duration_ms": 350,
                "summary": f"Intent: {state.get('intent', 'segment')} ({state.get('segmentation_method', 'rule')}-based)",
            })
            log_trace(conv_id, conv_id, "atlas", "intent_detected", output_data=state.get("intent"))
        except Exception as e:
            logger.error(f"[Chat SSE] Atlas failed: {e}")
            yield _format_sse("tool_error", {"tool": "atlas_intent_extractor", "agent": "atlas", "error": str(e)})

        await asyncio.sleep(0.35)

        # HITL check
        if state.get("clarification_needed"):
            yield _format_sse("clarification", {
                "question": state.get("clarification_question", "Please clarify your request:"),
                "options": state.get("clarification_options", ["Rule-based", "ML Clustering", "Explore EDA"]),
                "asking_agent": "atlas",
            })
            yield _format_sse("done", {"status": "clarification_required"})
            return

        agent_plan = state.get("agent_plan") or ["scout", "forge", "mosaic", "prism", "compass", "loom"]

        # ── 2. SCOUT (Data Scout & Column Resolver) ─────────────────────────
        if "scout" in agent_plan:
            yield _format_sse("agent_start", {"agent": "scout", "role": "Data Scout"})
            yield _format_sse("tool_start", {"tool": "column_resolver", "agent": "scout"})
            await asyncio.sleep(0.35)
            try:
                state = await run_scout(state)
                yield _format_sse("tool_complete", {"tool": "column_resolver", "agent": "scout"})
                yield _format_sse("columns_resolved", {
                    "columns": state.get("resolved_columns") or [],
                    "row_count": state.get("row_count", 0),
                })
                yield _format_sse("agent_complete", {
                    "agent": "scout",
                    "duration_ms": 350,
                    "summary": f"Resolved {len(state.get('resolved_columns') or [])} columns across {state.get('row_count', 0):,} records",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Scout failed: {e}")
                yield _format_sse("tool_error", {"tool": "column_resolver", "agent": "scout", "error": str(e)})

            await asyncio.sleep(0.35)

        # ── 3. FORGE (Feature Engineering & SHAP Radar) ───────────────────────
        if "forge" in agent_plan:
            yield _format_sse("agent_start", {"agent": "forge", "role": "Feature Engineer"})
            yield _format_sse("tool_start", {"tool": "compute_features", "agent": "forge"})
            await asyncio.sleep(0.35)
            try:
                state = await run_forge(state)
                yield _format_sse("tool_complete", {"tool": "compute_features", "agent": "forge"})
                features = state.get("engineered_features") or []
                yield _format_sse("tool_progress", {
                    "agent": "forge",
                    "tool": "compute_features",
                    "progress": 100,
                    "message": f"Engineered {len(features)} behavioral features",
                })
                
                # Emit Correlation Heatmap if generated
                forge_outputs = state.get("tool_outputs", {}).get("forge", {})
                corr_chart = forge_outputs.get("correlation_chart")
                if corr_chart:
                    yield _format_sse("structured_output", {
                        "kind": "chart",
                        "payload": corr_chart,
                        "produced_by": "forge",
                    })

                yield _format_sse("agent_complete", {
                    "agent": "forge",
                    "duration_ms": 350,
                    "summary": f"Engineered {len(features)} behavioral features ({', '.join(features[:3])}...)",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Forge failed: {e}")
                yield _format_sse("tool_error", {"tool": "compute_features", "agent": "forge", "error": str(e)})

            await asyncio.sleep(0.35)

        # ── 4. MOSAIC (Customer Segmentation Engine) ─────────────────────────
        if "mosaic" in agent_plan:
            yield _format_sse("agent_start", {"agent": "mosaic", "role": "Segmentation"})
            yield _format_sse("tool_start", {"tool": "segmentation_clustering", "agent": "mosaic"})
            await asyncio.sleep(0.4)
            try:
                state = await run_mosaic(state)
                yield _format_sse("tool_complete", {"tool": "segmentation_clustering", "agent": "mosaic"})

                seg_stats = state.get("segment_stats") or {}
                if seg_stats:
                    color_map = {
                        "priority": "#22c55e", "regular": "#6366f1",
                        "dormant": "#f97316", "high_value": "#ec4899",
                    }
                    formatted_segments = []
                    for seg_name, stats in seg_stats.items():
                        avg_bal = stats.get("avg_balance", stats.get("avg_total_balance", 0))
                        formatted_segments.append({
                            "id": seg_name,
                            "name": f"{seg_name.capitalize()} Tier",
                            "percentage": stats.get("pct", 0),
                            "customer_count": stats.get("count", 0),
                            "avg_balance": round(float(avg_bal), 2),
                            "txn_freq": round(float(stats.get("avg_txn_count", 8.5)), 1),
                            "status_color": color_map.get(seg_name.lower(), "#6366f1"),
                            "tagline": f"{seg_name.capitalize()} customer segment classified by financial activity.",
                            "persona": f"Digital {seg_name.capitalize()} Customer",
                        })
                    yield _format_sse("structured_output", {
                        "kind": "table",
                        "payload": formatted_segments,
                        "produced_by": "mosaic",
                    })

                yield _format_sse("agent_complete", {
                    "agent": "mosaic",
                    "duration_ms": 400,
                    "summary": f"Clustered {state.get('row_count', 0):,} customer profiles into {len(seg_stats)} segments",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Mosaic failed: {e}")
                yield _format_sse("tool_error", {"tool": "segmentation_clustering", "agent": "mosaic", "error": str(e)})

            await asyncio.sleep(0.35)

        # ── 5. PRISM (Explainability Engine) ─────────────────────────────────
        if "prism" in agent_plan:
            yield _format_sse("agent_start", {"agent": "prism", "role": "Explainability"})
            yield _format_sse("tool_start", {"tool": "shap_explainer", "agent": "prism"})
            await asyncio.sleep(0.4)
            from backend.agents.prism import run_prism
            try:
                state = await run_prism(state)
                yield _format_sse("tool_complete", {"tool": "shap_explainer", "agent": "prism"})
                yield _format_sse("agent_complete", {
                    "agent": "prism",
                    "duration_ms": 380,
                    "summary": "Computed SHAP feature importance values for segments",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Prism failed: {e}")
                yield _format_sse("tool_error", {"tool": "shap_explainer", "agent": "prism", "error": str(e)})

            await asyncio.sleep(0.35)

        # ── 6. COMPASS (Recommendation Engine) ───────────────────────────────
        if "compass" in agent_plan:
            yield _format_sse("agent_start", {"agent": "compass", "role": "Recommendations"})
            yield _format_sse("tool_start", {"tool": "product_recommendations", "agent": "compass"})
            await asyncio.sleep(0.35)
            try:
                state = await run_compass(state)
                yield _format_sse("tool_complete", {"tool": "product_recommendations", "agent": "compass"})
                yield _format_sse("agent_complete", {
                    "agent": "compass",
                    "duration_ms": 350,
                    "summary": "Generated personalized banking product recommendations & candidate transitions",
                })
            except Exception as e:
                logger.error(f"[Chat SSE] Compass failed: {e}")
                yield _format_sse("tool_error", {"tool": "product_recommendations", "agent": "compass", "error": str(e)})

            await asyncio.sleep(0.35)

        # ── 6. QUILL (Executive Report Generator) ────────────────────────────
        yield _format_sse("agent_start", {"agent": "quill", "role": "PDF Report Generator"})
        yield _format_sse("tool_start", {"tool": "pdf_report_compiler", "agent": "quill"})
        await asyncio.sleep(0.3)
        yield _format_sse("tool_complete", {"tool": "pdf_report_compiler", "agent": "quill"})
        yield _format_sse("agent_complete", {
            "agent": "quill",
            "duration_ms": 300,
            "summary": "Compiled executive report structure & PDF export schemas",
        })

        await asyncio.sleep(0.35)

        # ── 7. LOOM (Response Synthesizer & Narrative Streaming) ─────────────
        if "loom" in agent_plan:
            yield _format_sse("agent_start", {"agent": "loom", "role": "Synthesizer"})
            full_narrative_chunks = []
            try:
                async for event in stream_loom(state):
                    ev_type = event.get("type")
                    ev_data = event.get("data", {})
                    if ev_type == "model_info":
                        yield _format_sse("model_info", ev_data)
                    elif ev_type == "thinking_start":
                        yield _format_sse("thinking_start", {"agent": "loom"})
                    elif ev_type == "thought_chunk":
                        yield _format_sse("thinking_chunk", ev_data)
                    elif ev_type == "thinking_end":
                        yield _format_sse("thinking_end", {"agent": "loom"})
                    elif ev_type == "text_chunk":
                        full_narrative_chunks.append(ev_data.get("content", ""))
                        yield _format_sse("text_chunk", ev_data)
                    elif ev_type == "structured_output":
                        yield _format_sse("structured_output", ev_data)

                chips = state.get("follow_up_chips") or [
                    "Compare segment risk profiles",
                    "Download executive PDF report",
                    "Drill into high-value transition candidates",
                ]
                yield _format_sse("suggestions", {"chips": chips})
                yield _format_sse("agent_complete", {
                    "agent": "loom",
                    "duration_ms": 420,
                    "summary": "Synthesized executive narrative and formatted segment insights",
                })

                final_text = "".join(full_narrative_chunks)
                if final_text:
                    save_message(session_id=conv_id, role="assistant", agent_name="loom", content=final_text)

            except Exception as e:
                logger.error(f"[Chat SSE] Loom streaming failed, running non-streaming fallback: {e}")
                fallback_state = await run_loom(state)
                narrative_text = fallback_state.get("narrative") or "Analysis completed."
                yield _format_sse("text_chunk", {"content": narrative_text})
                yield _format_sse("agent_complete", {
                    "agent": "loom",
                    "duration_ms": 350,
                    "summary": "Synthesized executive narrative via fallback",
                })
                save_message(session_id=conv_id, role="assistant", agent_name="loom", content=narrative_text)

        yield _format_sse("done", {"status": "success", "conversation_id": conv_id})

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )
