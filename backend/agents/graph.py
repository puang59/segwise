"""
LangGraph Chain Orchestrator — Multi-Agent Handoff State Machine.

Builds the sequential agent execution graph:
  START → atlas → scout → forge → mosaic → prism → compass → loom → END

Implements:
- Dynamic agent skipping via router_step (agents not in agent_plan are bypassed)
- Human-in-the-Loop interrupt when clarification_needed=True
- Pure sequential handoff — each agent receives the enriched state from the previous
"""

import logging
from typing import Literal, Dict, Any

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from backend.agents.state import AgentState
from backend.agents.atlas import run_atlas
from backend.agents.scout import run_scout
from backend.agents.forge import run_forge
from backend.agents.mosaic import run_mosaic
from backend.agents.prism import run_prism
from backend.agents.compass import run_compass
from backend.agents.loom import run_loom

logger = logging.getLogger(__name__)

# ── Agent Names (must match agent_plan values from Atlas) ───────────────────

AGENT_NAMES = ["atlas", "scout", "forge", "mosaic", "prism", "compass", "loom"]


# ── Router Functions ─────────────────────────────────────────────────────────

def router_after_atlas(state: AgentState) -> Literal["scout", "hitl", "__end__"]:
    """
    After Atlas runs:
    - If clarification_needed → interrupt (HITL)
    - If scout is in agent_plan → proceed to scout
    - Otherwise → end (edge case: empty plan)
    """
    if state.get("clarification_needed"):
        logger.info("[Graph] HITL interrupt — clarification needed")
        return "hitl"

    agent_plan = state.get("agent_plan") or []
    if "scout" in agent_plan:
        return "scout"
    return "__end__"


def router_after_scout(state: AgentState) -> Literal["forge", "loom", "__end__"]:
    """After Scout: skip forge if not in agent_plan (e.g. eda, aggregate, recommend)."""
    agent_plan = state.get("agent_plan") or []
    if "forge" in agent_plan:
        return "forge"
    if "loom" in agent_plan:
        return "loom"
    return "__end__"


def router_after_forge(state: AgentState) -> Literal["mosaic", "loom", "__end__"]:
    """After Forge: skip mosaic if intent is feature_eng only."""
    agent_plan = state.get("agent_plan") or []
    if "mosaic" in agent_plan:
        return "mosaic"
    if "loom" in agent_plan:
        return "loom"
    return "__end__"


def router_after_mosaic(state: AgentState) -> Literal["prism", "loom", "__end__"]:
    """After Mosaic: skip prism if not in plan."""
    agent_plan = state.get("agent_plan") or []
    if "prism" in agent_plan:
        return "prism"
    if "loom" in agent_plan:
        return "loom"
    return "__end__"


def router_after_prism(state: AgentState) -> Literal["compass", "loom", "__end__"]:
    """After Prism: skip compass if not in plan (e.g., transition, explain)."""
    agent_plan = state.get("agent_plan") or []
    if "compass" in agent_plan:
        return "compass"
    if "loom" in agent_plan:
        return "loom"
    return "__end__"


# ── HITL Placeholder Node ────────────────────────────────────────────────────

async def hitl_node(state: AgentState) -> AgentState:
    """
    Human-in-the-Loop interrupt node.
    In a production streaming setup, the graph halts here and returns the state
    to the API caller, which sends the clarification question to the frontend.
    The graph is resumed once the user provides the clarification answer.
    """
    logger.info(f"[Graph] HITL activated: {state.get('clarification_question')}")
    # State is passed through unchanged — the interrupt is handled at the graph level
    return state


# ── Build LangGraph ──────────────────────────────────────────────────────────

def build_agent_graph(use_checkpointer: bool = False) -> Any:
    """
    Construct the sequential multi-agent LangGraph execution graph.

    Graph structure:
      START → atlas → [router] → scout/hitl
      scout → [router] → forge/loom
      forge → [router] → mosaic/loom
      mosaic → [router] → prism/loom
      prism → [router] → compass/loom
      compass → loom → END
      hitl → END (await user response to resume)

    :param use_checkpointer: If True, enables in-memory checkpointing for HITL state persistence.
    :return: Compiled LangGraph CompiledGraph.
    """
    graph = StateGraph(AgentState)

    # ── Add nodes ────────────────────────────────────────────────────────────
    graph.add_node("atlas", run_atlas)
    graph.add_node("scout", run_scout)
    graph.add_node("forge", run_forge)
    graph.add_node("mosaic", run_mosaic)
    graph.add_node("prism", run_prism)
    graph.add_node("compass", run_compass)
    graph.add_node("loom", run_loom)
    graph.add_node("hitl", hitl_node)

    # ── Add edges ────────────────────────────────────────────────────────────
    graph.add_edge(START, "atlas")

    # Atlas → (scout | hitl | end)
    graph.add_conditional_edges(
        "atlas",
        router_after_atlas,
        {
            "scout": "scout",
            "hitl": "hitl",
            "__end__": END,
        }
    )

    # HITL → END (await user re-submission)
    graph.add_edge("hitl", END)

    # Scout → (forge | loom | end)
    graph.add_conditional_edges(
        "scout",
        router_after_scout,
        {
            "forge": "forge",
            "loom": "loom",
            "__end__": END,
        }
    )

    # Forge → (mosaic | loom | end)
    graph.add_conditional_edges(
        "forge",
        router_after_forge,
        {
            "mosaic": "mosaic",
            "loom": "loom",
            "__end__": END,
        }
    )

    # Mosaic → (prism | loom | end)
    graph.add_conditional_edges(
        "mosaic",
        router_after_mosaic,
        {
            "prism": "prism",
            "loom": "loom",
            "__end__": END,
        }
    )

    # Prism → (compass | loom | end)
    graph.add_conditional_edges(
        "prism",
        router_after_prism,
        {
            "compass": "compass",
            "loom": "loom",
            "__end__": END,
        }
    )

    # Compass always goes to Loom (final node before END)
    graph.add_edge("compass", "loom")

    # Loom → END
    graph.add_edge("loom", END)

    # Compile with optional checkpointer for HITL
    if use_checkpointer:
        checkpointer = MemorySaver()
        compiled = graph.compile(checkpointer=checkpointer)
    else:
        compiled = graph.compile()

    logger.info("[Graph] LangGraph chain compiled: atlas→scout→forge→mosaic→prism→compass→loom")
    return compiled


# ── Singleton Graph Instance ──────────────────────────────────────────────────

_graph_instance = None
_graph_with_checkpointer = None


def get_graph(with_checkpointer: bool = False):
    """
    Get or create the compiled LangGraph instance.
    Uses singleton pattern to avoid re-building the graph on every request.
    """
    global _graph_instance, _graph_with_checkpointer

    if with_checkpointer:
        if _graph_with_checkpointer is None:
            _graph_with_checkpointer = build_agent_graph(use_checkpointer=True)
        return _graph_with_checkpointer
    else:
        if _graph_instance is None:
            _graph_instance = build_agent_graph(use_checkpointer=False)
        return _graph_instance


# ── Graph Execution Helper ────────────────────────────────────────────────────

async def run_graph(
    initial_state: AgentState,
    config: Dict[str, Any] = None,
    use_checkpointer: bool = False,
) -> AgentState:
    """
    Execute the full agent chain graph with the given initial state.

    :param initial_state: Created via create_initial_state().
    :param config: Optional LangGraph thread config (required for checkpointer).
    :param use_checkpointer: Use in-memory checkpointer (needed for HITL).
    :return: Final AgentState after all agents complete.
    """
    graph = get_graph(with_checkpointer=use_checkpointer)

    run_config = config or {}
    if use_checkpointer and "configurable" not in run_config:
        run_config["configurable"] = {
            "thread_id": initial_state.get("conversation_id", "default")
        }

    logger.info(f"[Graph] Executing graph for conversation: {initial_state.get('conversation_id')}")

    final_state = await graph.ainvoke(initial_state, config=run_config)
    return final_state
