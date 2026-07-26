import re
import json

JSON_BLOCK_RE = re.compile(r'```(?:json)?\s*(\{.*?\})\s*```', re.DOTALL)
RAW_JSON_RE = re.compile(r'\{.*\}', re.DOTALL)

def _extract_json_from_text(text: str):
    match = JSON_BLOCK_RE.search(text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as e:
            print(f"JSON_BLOCK_RE Decode Error: {e}")
            pass

    match = RAW_JSON_RE.search(text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as e:
            print(f"RAW_JSON_RE Decode Error: {e}")
            pass

    return None

text1 = """
```json
{
  "intent": "segment",
  "agent_plan": ["scout", "forge", "mosaic", "prism", "compass", "loom"],
  "filters": {},
  "segmentation_method": "rule",
  "segment_label_hints": ["priority", "regular", "dormant"],
  "clarification_needed": false,
  "clarification_question": null
}
```
"""

text2 = """{
  "intent": "segment",
  "agent_plan": ["scout", "forge", "mosaic", "prism", "compass", "loom"],
  "filters": {},
  "segmentation_method": "rule",
  "segment_label_hints": ["priority", "regular", "dormant"],
  "clarification_needed": false,
  "clarification_question": null
}"""

print(f"Test 1: {_extract_json_from_text(text1) is not None}")
print(f"Test 2: {_extract_json_from_text(text2) is not None}")
