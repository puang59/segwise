"""
LOOM — Agent 7: Response Synthesizer & Persona Naming

Synthesizes all agent outputs into a polished narrative, generates persona names for
ML clusters, emits chart specs, produces follow-up chips, and streams SSE events.
Uses LLM — the only arithmetic-free LLM call in the chain.
"""

import re
import json
import logging
from typing import AsyncGenerator, Dict, Any, List

from backend.agents.state import AgentState
from backend.agents.thinking import stream_with_thinking
from backend.config import get_llm_client, AVAILABLE_MODELS
from backend.prompts.loom_response_prompt import build_loom_messages
from backend.prompts.loom_persona_prompt import build_persona_messages

logger = logging.getLogger(__name__)


# ── Persona Generator ────────────────────────────────────────────────────────

async def generate_cluster_personas(
    state: AgentState,
    segment_stats: Dict[str, Any],
) -> Dict[str, Dict[str, str]]:
    """
    Call LLM to generate human-readable persona names and taglines for ML clusters.
    Returns {cluster_label: {name, tagline}}.
    """
    if not segment_stats:
        return {}

    client = get_llm_client(state.get("session_api_key"), is_async=True)
    model_id = state.get("session_loom_model")

    # Build cluster stats text
    lines = []
    for cluster_label, stats in segment_stats.items():
        lines.append(f"\n{cluster_label}:")
        for k, v in stats.items():
            if k not in ("cluster_id",):
                lines.append(f"  {k}: {v}")

    cluster_text = "\n".join(lines)
    messages = build_persona_messages(cluster_text)

    try:
        response = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            max_tokens=4096,
        )
        raw = response.choices[0].message.content or "[]"
        # Strip thinking tags
        raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()

        personas_list = json.loads(raw)
        result = {}
        for entry in personas_list:
            cid = str(entry.get("cluster_id", ""))
            result[f"cluster_{cid}" if not cid.startswith("cluster") else cid] = {
                "name": entry.get("name", f"Cluster {cid}"),
                "tagline": entry.get("tagline", ""),
            }
        return result

    except Exception as e:
        logger.warning(f"[Loom] Persona generation failed: {e}")
        return {}


# ── Chart Spec Generator ──────────────────────────────────────────────────────

def _build_chart_specs(state: AgentState) -> List[Dict[str, Any]]:
    """
    Build Recharts-compatible chart spec JSON based on available agent outputs.
    Returns a list of chart spec dicts for the frontend to render.
    """
    charts = []
    segment_stats = state.get("segment_stats") or {}
    state.get("intent") or "analysis"

    if not segment_stats:
        return charts

    # Chart 1: Segment size distribution (bar chart)
    size_data = []
    for seg, stats in segment_stats.items():
        size_data.append({
            "name": seg,
            "count": stats.get("count", 0),
            "pct": stats.get("pct", 0),
        })

    if size_data:
        charts.append({
            "chart_id": "segment_distribution",
            "chart_type": "bar",
            "title": "Customer Segment Distribution",
            "x_key": "name",
            "bars": [{"key": "count", "color": "#6366f1", "name": "Customers"}],
            "data": size_data,
            "produced_by": "mosaic",
        })

    # Chart 2: Average balance per segment (horizontal bar)
    balance_data = []
    for seg, stats in segment_stats.items():
        avg_bal = stats.get("avg_total_balance", stats.get("avg_balance", None))
        if avg_bal is not None:
            balance_data.append({
                "name": seg,
                "avg_balance": round(float(avg_bal), 2),
            })

    if balance_data:
        charts.append({
            "chart_id": "avg_balance_by_segment",
            "chart_type": "bar",
            "title": "Average Balance per Segment",
            "x_key": "name",
            "bars": [{"key": "avg_balance", "color": "#0ea5e9", "name": "Avg Balance"}],
            "data": balance_data,
            "produced_by": "forge",
        })

    # Chart 3: SHAP feature importance (if available)
    segment_shap = state.get("segment_shap") or {}
    for seg_name, shap_data in list(segment_shap.items())[:1]:  # first segment only
        feat_imp = shap_data.get("feature_importance", {})
        if feat_imp:
            shap_chart_data = [
                {"feature": k, "importance": v}
                for k, v in list(feat_imp.items())[:8]
            ]
            charts.append({
                "chart_id": f"shap_{seg_name}",
                "chart_type": "horizontal_bar",
                "title": f"Feature Importance — {seg_name}",
                "x_key": "importance",
                "y_key": "feature",
                "bars": [{"key": "importance", "color": "#22c55e", "name": "SHAP Score"}],
                "data": shap_chart_data,
                "produced_by": "prism",
            })

    return charts


# ── Follow-up Chip Extractor ──────────────────────────────────────────────────

def _extract_follow_up_chips(narrative: str) -> List[str]:
    """
    Extract follow-up suggestion chips from Loom's narrative.
    Looks for the standard 'Suggested next steps:' section.
    """
    chips = []
    lines = narrative.split("\n")

    in_chips_section = False
    for line in lines:
        stripped = line.strip()
        if "suggested next" in stripped.lower():
            in_chips_section = True
            continue
        if in_chips_section and stripped.startswith("-"):
            chip = stripped.lstrip("- ").strip()
            if chip and len(chip) < 80:  # sanity check on length
                chips.append(chip)
        elif in_chips_section and stripped and not stripped.startswith("-") and len(chips) > 0:
            break  # end of chips section

    return chips[:4]  # max 4 chips


# ── Main Loom Streaming Node ─────────────────────────────────────────────────

async def run_loom(state: AgentState) -> AgentState:
    """
    Loom agent node for LangGraph (non-streaming, collects full response).
    Used when graph runs as a batch pipeline.
    """
    method = state.get("segmentation_method") or "rule"
    segment_stats = state.get("segment_stats") or {}

    # Generate ML cluster personas if applicable
    personas = {}
    if method != "rule" and segment_stats:
        try:
            personas = await generate_cluster_personas(state, segment_stats)
        except Exception as e:
            logger.warning(f"[Loom] Persona generation failed: {e}")

    # Build narrative via LLM
    client = get_llm_client(state.get("session_api_key"), is_async=True)
    model_id = state.get("session_loom_model") or "meta-llama/Meta-Llama-3.1-70B-Instruct"
    model_meta = AVAILABLE_MODELS.get(model_id, {})

    extra_kwargs = {}
    if model_meta.get("reasoning") and "gemini" in model_id:
        extra_kwargs["extra_body"] = {
            "thinking": {
                "type": "enabled",
                "budget_tokens": model_meta.get("thinking_budget", 4096),
            }
        }

    messages = build_loom_messages(state)

    try:
        response = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            max_tokens=8192,
            **extra_kwargs,
        )
        narrative = response.choices[0].message.content or ""
        # Strip thinking blocks
        narrative = re.sub(r'<think>.*?</think>', '', narrative, flags=re.DOTALL).strip()
    except Exception as e:
        logger.error(f"[Loom] Response generation failed: {e}")
        narrative = _build_fallback_narrative(state)

    # Extract follow-up chips from narrative
    follow_up_chips = _extract_follow_up_chips(narrative)
    if not follow_up_chips:
        follow_up_chips = _default_chips(state)

    # Build chart specs
    chart_specs = _build_chart_specs(state)

    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["loom"] = {
        "model_id": model_id,
        "narrative_length": len(narrative),
        "chips": follow_up_chips,
        "chart_count": len(chart_specs),
        "personas": personas,
    }

    updated = dict(state)
    updated["narrative"] = narrative
    updated["follow_up_chips"] = follow_up_chips
    updated["chart_specs"] = chart_specs
    updated["tool_outputs"] = tool_outputs

    return updated


async def stream_loom(state: AgentState) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Streaming version of Loom — yields SSE-ready event dicts.
    Call this from the FastAPI SSE endpoint.
    """
    model_id = state.get("session_loom_model") or "meta-llama/Meta-Llama-3.1-70B-Instruct"
    model_meta = AVAILABLE_MODELS.get(model_id, {})

    method = state.get("segmentation_method") or "rule"
    segment_stats = state.get("segment_stats") or {}

    # Emit model info
    yield {
        "type": "model_info",
        "data": {
            "model_id": model_id,
            "display": model_meta.get("display", model_id),
            "reasoning": model_meta.get("reasoning", False),
        }
    }

    # Generate personas first (non-streaming)
    personas = {}
    if method != "rule" and segment_stats:
        try:
            personas = await generate_cluster_personas(state, segment_stats)
            if personas:
                yield {"type": "structured_output", "data": {"kind": "personas", "payload": personas, "produced_by": "loom"}}
        except Exception as e:
            logger.warning(f"[Loom] Streaming persona gen failed: {e}")

    # Stream narrative
    client = get_llm_client(state.get("session_api_key"), is_async=True)
    messages = build_loom_messages(state)

    extra_kwargs = {}
    if model_meta.get("reasoning") and "gemini" in model_id:
        extra_kwargs["extra_body"] = {
            "thinking": {
                "type": "enabled",
                "budget_tokens": model_meta.get("thinking_budget", 4096),
            }
        }

    full_narrative = []
    has_thinking = False

    try:
        stream = await client.chat.completions.create(
            model=model_id,
            messages=messages,
            stream=True,
            max_tokens=8192,
            **extra_kwargs,
        )

        async for chunk in stream_with_thinking(stream):
            if chunk.type == "thinking":
                if not has_thinking:
                    yield {"type": "thinking_start"}
                    has_thinking = True
                yield {"type": "thought_chunk", "data": {"content": chunk.content}}
            else:
                if has_thinking:
                    yield {"type": "thinking_end"}
                    has_thinking = False
                full_narrative.append(chunk.content)
                yield {"type": "text_chunk", "data": {"content": chunk.content}}

        if has_thinking:
            yield {"type": "thinking_end"}

    except Exception as e:
        logger.error(f"[Loom] Streaming failed: {e}")
        fallback = _build_fallback_narrative(state)
        full_narrative.append(fallback)
        yield {"type": "text_chunk", "data": {"content": fallback}}

    # Emit chart specs
    chart_specs = _build_chart_specs(state)
    for chart in chart_specs:
        yield {"type": "structured_output", "data": {"kind": "chart", "payload": chart, "produced_by": "loom"}}

    # Emit follow-up chips
    narrative_text = "".join(full_narrative)
    chips = _extract_follow_up_chips(narrative_text) or _default_chips(state)
    yield {"type": "suggestions", "data": {"chips": chips}}

    yield {"type": "done"}


def _build_fallback_narrative(state: AgentState) -> str:
    """Build a simple fallback narrative when LLM call fails."""
    intent = state.get("intent") or "analysis"
    seg_stats = state.get("segment_stats") or {}
    row_count = state.get("row_count", 0)

    lines = [f"## Analysis Complete\n"]
    lines.append(f"Analysed **{row_count:,}** customers with intent: **{intent}**.\n")

    if seg_stats:
        lines.append("### Segments Found\n")
        for seg, stats in seg_stats.items():
            cnt = stats.get("count", "?")
            pct = stats.get("pct", "?")
            lines.append(f"- **{seg}**: {cnt} customers ({pct}%)")

    lines.append("\n---\n**Suggested next steps:**")
    for chip in _default_chips(state):
        lines.append(f"- {chip}")

    return "\n".join(lines)


def _default_chips(state: AgentState) -> List[str]:
    """Generate context-aware default follow-up chips."""
    intent = state.get("intent") or "eda"
    segments = list((state.get("segment_stats") or {}).keys())

    if intent == "segment" and segments:
        return [
            f"Explain why customers are in {segments[0]}",
            "Which customers can upgrade segments?",
            "Show product recommendations by segment",
        ]
    elif intent == "explain":
        return [
            "Show me top candidates for promotion",
            "Recommend products for this segment",
            "Compare all segments",
        ]
    elif intent == "recommend":
        return [
            "Show segment breakdown",
            "Which dormant customers should we target?",
            "Export recommendations as CSV",
        ]
    else:
        return [
            "Segment customers into priority, regular, dormant",
            "Show me data quality overview",
            "Find natural customer groups",
        ]
