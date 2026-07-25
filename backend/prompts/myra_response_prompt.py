"""
MYRA response synthesis prompt — narrative generation from structured agent outputs.

The LLM (Myra) NEVER does arithmetic. All numbers come from Python-computed state.
"""

MYRA_RESPONSE_SYSTEM_PROMPT = """You are Myra, the Response Synthesizer for an AI-powered banking analytics platform.

Your job is to turn structured Python analysis results into a polished, readable narrative for a banking analyst.

STRICT RULES — NEVER BREAK THESE:
1. You NEVER perform arithmetic. All numbers are provided to you — quote them exactly as given.
2. You NEVER invent or estimate data. If data is not in the context, say "data not available".
3. You write in clear, professional banking English — concise but insightful.
4. Your response must be in Markdown format.
5. Whenever you present tables, ALWAYS output proper Markdown tables with EACH ROW ON ITS OWN NEW LINE (separated by standard newline \\n characters). NEVER join table rows together with `||` or `| |` on a single line!
6. Always include a brief "What this means for the business" interpretation.
7. End with 3 follow-up suggestion chips (short action phrases, max 8 words each).

RESPONSE STRUCTURE (adapt based on intent):

For SEGMENT results:
- One-sentence summary of what was done
- Table or bullet list of segment stats (use exact numbers from context)
- Brief interpretation per segment
- Business insight paragraph
- Follow-up chips

For EDA results:
- Dataset overview (row count, columns)
- Key findings (use exact numbers)
- Notable patterns / concerns
- Follow-up chips

For EXPLAIN results:
- What segment the customer/group belongs to
- Exact rules or SHAP features that drove the classification (from context)
- Plain-language explanation
- Follow-up chips

For RECOMMEND results:
- List products per segment with eligibility rationale
- Priority score context
- Follow-up chips

For TRANSITION results:
- Summary of transition candidate count
- Top candidates with gap analysis (from context)
- Recommended actions

Always end your message with a section:
---
**Suggested next steps:**
- [chip 1]
- [chip 2]
- [chip 3]

CONTEXT WILL BE PROVIDED IN THE USER MESSAGE.
"""


def build_myra_context(state: dict) -> str:
    """
    Build the context string passed to Myra's user message, pulling all
    relevant computed data from AgentState. LLM reads this, never re-computes.
    """
    import json

    lines = []
    intent = state.get("intent", "unknown")
    lines.append(f"## Query Intent: {intent}")
    lines.append(f"Filters applied: {json.dumps(state.get('filters', {}))}")

    # Vihaan context
    if state.get("resolved_columns"):
        lines.append(f"\n## Dataset")
        lines.append(f"Row count: {state.get('row_count', 'unknown')}")
        lines.append(f"Columns used: {', '.join(state.get('resolved_columns', []))}")

    # Kabir context
    if state.get("engineered_features"):
        lines.append(f"\n## Engineered Features")
        lines.append(f"Features computed: {', '.join(state.get('engineered_features', []))}")

    # Ishaan context
    if state.get("segment_stats"):
        lines.append(f"\n## Segment Results")
        lines.append(json.dumps(state.get("segment_stats", {}), indent=2))

    if state.get("evaluation_metrics"):
        lines.append(f"\n## Evaluation Metrics")
        lines.append(json.dumps(state.get("evaluation_metrics", {}), indent=2))

    # Aadhya context
    if state.get("segment_shap"):
        lines.append(f"\n## SHAP Feature Importance (per segment)")
        lines.append(json.dumps(state.get("segment_shap", {}), indent=2))

    if state.get("explanations"):
        lines.append(f"\n## Customer Explanations")
        lines.append(json.dumps(state.get("explanations", {}), indent=2))

    # Saanvi context
    if state.get("recommendations"):
        lines.append(f"\n## Product Recommendations")
        lines.append(json.dumps(state.get("recommendations", []), indent=2))

    # Tool outputs (full raw data)
    if state.get("tool_outputs"):
        lines.append(f"\n## Full Tool Outputs")
        try:
            lines.append(json.dumps(state.get("tool_outputs", {}), indent=2, default=str))
        except Exception:
            lines.append(str(state.get("tool_outputs", {})))

    return "\n".join(lines)


def build_myra_messages(state: dict) -> list:
    """Build complete message list for Myra's response generation."""
    context = build_myra_context(state)
    return [
        {"role": "system", "content": MYRA_RESPONSE_SYSTEM_PROMPT},
        {"role": "user", "content": f"Here is the full analysis context:\n\n{context}\n\nWrite the response now."},
    ]
