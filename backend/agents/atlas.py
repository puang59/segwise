"""
ATLAS — Agent 1: Intent Extractor & Planner

Parses natural-language user queries into a structured QueryPlan using an LLM.
Handles both reasoning models (DeepSeek R1, QwQ) and structured-output models.
Implements Human-in-the-Loop (HITL) flag setting for ambiguous queries.
"""

import re
import json
import logging
from typing import Optional
from pydantic import BaseModel, Field
from typing import Literal, List, Dict, Any

from backend.agents.state import AgentState
from backend.config import get_llm_client, AVAILABLE_MODELS
from backend.prompts.atlas_prompt import build_atlas_messages

logger = logging.getLogger(__name__)


# ── QueryPlan Pydantic Schema ────────────────────────────────────────────────

class QueryPlan(BaseModel):
    """Structured output schema for Atlas's intent extraction."""
    intent: Literal["eda", "segment", "feature_eng", "explain", "recommend", "aggregate", "transition"]
    agent_plan: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    segmentation_method: Optional[Literal["rule", "kmeans", "hdbscan", "gmm"]] = None
    segment_label_hints: List[str] = Field(default_factory=list)
    clarification_needed: bool = False
    clarification_question: Optional[str] = None


# ── JSON Extractor for Reasoning Models ─────────────────────────────────────

JSON_BLOCK_RE = re.compile(r'```(?:json)?\s*(\{.*?\})\s*```', re.DOTALL)
RAW_JSON_RE = re.compile(r'\{.*\}', re.DOTALL)


def _extract_json_from_text(text: str) -> Optional[dict]:
    """
    Extract JSON object from raw LLM text output.
    Handles both markdown fenced blocks and raw JSON.
    """
    # Try fenced block first
    match = JSON_BLOCK_RE.search(text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try raw JSON extraction by finding boundaries
    start_idx = text.find('{')
    while start_idx != -1:
        end_idx = text.rfind('}')
        if end_idx > start_idx:
            try:
                return json.loads(text[start_idx:end_idx+1])
            except json.JSONDecodeError:
                # Move to the next { and try again
                start_idx = text.find('{', start_idx + 1)
        else:
            break

    return None


def _parse_query_plan(data: dict) -> QueryPlan:
    """Parse a dict into QueryPlan, tolerating missing or extra fields."""
    return QueryPlan(
        intent=data.get("intent", "eda"),
        agent_plan=data.get("agent_plan", []),
        filters=data.get("filters", {}),
        segmentation_method=data.get("segmentation_method"),
        segment_label_hints=data.get("segment_label_hints", []),
        clarification_needed=bool(data.get("clarification_needed", False)),
        clarification_question=data.get("clarification_question"),
    )


# ── Structured Output Call (non-reasoning models) ────────────────────────────

async def _call_structured_output(state: AgentState) -> QueryPlan:
    """Call LLM with Pydantic structured output (works for non-reasoning models)."""
    client = get_llm_client(state.get("session_api_key"), is_async=True)
    model_id = state.get("session_atlas_model")
    messages = build_atlas_messages(state["messages"][-1]["content"])

    try:
        response = await client.beta.chat.completions.parse(
            model=model_id,
            messages=messages,
            response_format=QueryPlan,
            max_tokens=4096,
        )
        plan = response.choices[0].message.parsed
        if plan is not None:
            return plan
    except Exception as e:
        logger.warning(f"[Atlas] Structured output failed ({e}), falling back to text parse.")

    # Fallback: regular completion + regex JSON extraction
    return await _call_with_text_parse(state)


async def _call_with_text_parse(state: AgentState) -> QueryPlan:
    """Call LLM as regular text completion, then extract JSON via regex."""
    client = get_llm_client(state.get("session_api_key"), is_async=True)
    model_id = state.get("session_atlas_model")
    messages = build_atlas_messages(state["messages"][-1]["content"])

    extra_kwargs = {}
    model_meta = AVAILABLE_MODELS.get(model_id, {})
    if model_meta.get("reasoning") and "gemini" in model_id:
        extra_kwargs["extra_body"] = {
            "thinking": {
                "type": "enabled",
                "budget_tokens": model_meta.get("thinking_budget", 4096)
            }
        }

    response = await client.chat.completions.create(
        model=model_id,
        messages=messages,
        max_tokens=4096,
        **extra_kwargs,
    )

    raw_text = response.choices[0].message.content or ""

    # Strip <think>...</think> blocks before parsing
    raw_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()

    data = _extract_json_from_text(raw_text)
    if data:
        return _parse_query_plan(data)

    logger.error(f"[Atlas] Failed to parse JSON from model output: {raw_text[:500]}")
    # Return a safe default fallback plan
    return QueryPlan(
        intent="eda",
        agent_plan=["scout", "loom"],
        filters={},
        segmentation_method=None,
        segment_label_hints=[],
        clarification_needed=True,
        clarification_question="I couldn't fully understand your request. Could you rephrase what you'd like to analyse?",
    )


# ── Main Atlas Node ─────────────────────────────────────────────────────────

async def run_atlas(state: AgentState) -> AgentState:
    """
    Atlas agent node for LangGraph.
    Extracts intent from the latest user message, populates state with QueryPlan fields.
    """
    model_id = state.get("session_atlas_model", "")
    model_meta = AVAILABLE_MODELS.get(model_id, {})
    is_reasoning_model = model_meta.get("reasoning", False)

    logger.info(f"[Atlas] Running with model={model_id}, reasoning={is_reasoning_model}")

    # Reasoning models: use text parse to avoid structured output incompatibility
    if is_reasoning_model:
        plan = await _call_with_text_parse(state)
    else:
        plan = await _call_structured_output(state)

    logger.info(f"[Atlas] QueryPlan: intent={plan.intent}, method={plan.segmentation_method}, "
                f"clarification={plan.clarification_needed}")

    # Write plan results into state
    updated = dict(state)
    updated["intent"] = plan.intent
    updated["agent_plan"] = plan.agent_plan
    updated["filters"] = plan.filters
    updated["segmentation_method"] = plan.segmentation_method
    updated["segment_label_hints"] = plan.segment_label_hints
    updated["clarification_needed"] = plan.clarification_needed
    updated["clarification_question"] = plan.clarification_question

    # Store in tool_outputs for trace
    tool_outputs = dict(state.get("tool_outputs") or {})
    tool_outputs["atlas"] = {
        "intent": plan.intent,
        "agent_plan": plan.agent_plan,
        "filters": plan.filters,
        "segmentation_method": plan.segmentation_method,
        "segment_label_hints": plan.segment_label_hints,
        "clarification_needed": plan.clarification_needed,
        "clarification_question": plan.clarification_question,
    }
    updated["tool_outputs"] = tool_outputs

    return updated
