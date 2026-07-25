"""
LangGraph Chain Orchestrator — Multi-Agent Handoff State Machine.

Builds the sequential agent execution graph:
  START → advait → vihaan → kabir → ishaan → aadhya → saanvi → myra → END

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
from backend.agents.advait import run_advait
from backend.agents.vihaan import run_vihaan
from backend.agents.kabir import run_kabir
from backend.agents.ishaan import run_ishaan
from backend.agents.aadhya import run_aadhya
from backend.agents.saanvi import run_saanvi
from backend.agents.myra import run_myra

logger = logging.getLogger(__name__)

# ── Agent Names (must match agent_plan values from Advait) ───────────────────

AGENT_NAMES = ["advait", "vihaan", "kabir", "ishaan", "aadhya", "saanvi", "myra"]


# ── Router Functions ─────────────────────────────────────────────────────────

def router_after_advait(state: AgentState) -> Literal["vihaan", "hitl", "__end__"]:
    """
    After Advait runs:
    - If clarification_needed → interrupt (HITL)
    - If vihaan is in agent_plan → proceed to vihaan
    - Otherwise → end (edge case: empty plan)
    """
    if state.get("clarification_needed"):
        logger.info("[Graph] HITL interrupt — clarification needed")
        return "hitl"

    agent_plan = state.get("agent_plan") or []
    if "vihaan" in agent_plan:
        return "vihaan"
    return "__end__"


def router_after_vihaan(state: AgentState) -> Literal["kabir", "myra", "__end__"]:
    """After Vihaan: skip kabir if not in agent_plan (e.g. eda, aggregate, recommend)."""
    agent_plan = state.get("agent_plan") or []
    if "kabir" in agent_plan:
        return "kabir"
    if "myra" in agent_plan:
        return "myra"
    return "__end__"


def router_after_kabir(state: AgentState) -> Literal["ishaan", "myra", "__end__"]:
    """After Kabir: skip ishaan if intent is feature_eng only."""
    agent_plan = state.get("agent_plan") or []
    if "ishaan" in agent_plan:
        return "ishaan"
    if "myra" in agent_plan:
        return "myra"
    return "__end__"


def router_after_ishaan(state: AgentState) -> Literal["aadhya", "myra", "__end__"]:
    """After Ishaan: skip aadhya if not in plan."""
    agent_plan = state.get("agent_plan") or []
    if "aadhya" in agent_plan:
        return "aadhya"
    if "myra" in agent_plan:
        return "myra"
    return "__end__"


def router_after_aadhya(state: AgentState) -> Literal["saanvi", "myra", "__end__"]:
    """After Aadhya: skip saanvi if not in plan (e.g., transition, explain)."""
    agent_plan = state.get("agent_plan") or []
    if "saanvi" in agent_plan:
        return "saanvi"
    if "myra" in agent_plan:
        return "myra"
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
      START → advait → [router] → vihaan/hitl
      vihaan → [router] → kabir/myra
      kabir → [router] → ishaan/myra
      ishaan → [router] → aadhya/myra
      aadhya → [router] → saanvi/myra
      saanvi → myra → END
      hitl → END (await user response to resume)

    :param use_checkpointer: If True, enables in-memory checkpointing for HITL state persistence.
    :return: Compiled LangGraph CompiledGraph.
    """
    graph = StateGraph(AgentState)

    # ── Add nodes ────────────────────────────────────────────────────────────
    graph.add_node("advait", run_advait)
    graph.add_node("vihaan", run_vihaan)
    graph.add_node("kabir", run_kabir)
    graph.add_node("ishaan", run_ishaan)
    graph.add_node("aadhya", run_aadhya)
    graph.add_node("saanvi", run_saanvi)
    graph.add_node("myra", run_myra)
    graph.add_node("hitl", hitl_node)

    # ── Add edges ────────────────────────────────────────────────────────────
    graph.add_edge(START, "advait")

    # Advait → (vihaan | hitl | end)
    graph.add_conditional_edges(
        "advait",
        router_after_advait,
        {
            "vihaan": "vihaan",
            "hitl": "hitl",
            "__end__": END,
        }
    )

    # HITL → END (await user re-submission)
    graph.add_edge("hitl", END)

    # Vihaan → (kabir | myra | end)
    graph.add_conditional_edges(
        "vihaan",
        router_after_vihaan,
        {
            "kabir": "kabir",
            "myra": "myra",
            "__end__": END,
        }
    )

    # Kabir → (ishaan | myra | end)
    graph.add_conditional_edges(
        "kabir",
        router_after_kabir,
        {
            "ishaan": "ishaan",
            "myra": "myra",
            "__end__": END,
        }
    )

    # Ishaan → (aadhya | myra | end)
    graph.add_conditional_edges(
        "ishaan",
        router_after_ishaan,
        {
            "aadhya": "aadhya",
            "myra": "myra",
            "__end__": END,
        }
    )

    # Aadhya → (saanvi | myra | end)
    graph.add_conditional_edges(
        "aadhya",
        router_after_aadhya,
        {
            "saanvi": "saanvi",
            "myra": "myra",
            "__end__": END,
        }
    )

    # Saanvi always goes to Myra (final node before END)
    graph.add_edge("saanvi", "myra")

    # Myra → END
    graph.add_edge("myra", END)

    # Compile with optional checkpointer for HITL
    if use_checkpointer:
        checkpointer = MemorySaver()
        compiled = graph.compile(checkpointer=checkpointer)
    else:
        compiled = graph.compile()

    logger.info("[Graph] LangGraph chain compiled: advait→vihaan→kabir→ishaan→aadhya→saanvi→myra")
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
