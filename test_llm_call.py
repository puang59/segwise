import json

def _extract_json_from_text(text: str):
    import re
    JSON_BLOCK_RE = re.compile(r'```(?:json)?\s*(\{.*?\})\s*```', re.DOTALL)
    match = JSON_BLOCK_RE.search(text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    start_idx = text.find('{')
    while start_idx != -1:
        end_idx = text.rfind('}')
        if end_idx > start_idx:
            try:
                return json.loads(text[start_idx:end_idx+1])
            except json.JSONDecodeError:
                start_idx = text.find('{', start_idx + 1)
        else:
            break

    return None

text1 = """
<think>
I'd assume a default filter like {"segment_type": "retail"} if that's a common field. For this specific analysis, I opted to keep filters as an empty set {} initially
</think>

{
  "intent": "segment",
  "agent_plan": ["scout", "forge", "mosaic", "prism", "compass", "loom"],
  "filters": {},
  "segmentation_method": "rule",
  "segment_label_hints": ["priority", "regular", "dormant"],
  "clarification_needed": false,
  "clarification_question": null
}
"""

print("Extracted:", _extract_json_from_text(text1))
