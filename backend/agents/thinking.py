"""
Chain-of-Thinking Stream Extractor.

Separates reasoning/thinking tokens (<think>...</think> and delta.reasoning_content)
from final response narrative tokens in streaming LLM responses.
"""

import re
from dataclasses import dataclass
from typing import AsyncGenerator, Literal, Any

@dataclass
class StreamChunk:
    type: Literal["thinking", "text"]
    content: str


THINK_OPEN = re.compile(r'<think>', re.IGNORECASE)
THINK_CLOSE = re.compile(r'</think>', re.IGNORECASE)


async def stream_with_thinking(stream: Any) -> AsyncGenerator[StreamChunk, None]:
    """
    Wraps an OpenAI streaming response generator. Separates reasoning tokens
    from final answer text.

    Supports:
    - Gemini 2.5 & DeepSeek API native `delta.reasoning_content`
    - DeepSeek R1 & QwQ inline `<think>...</think>` tags in `delta.content`

    :param stream: Async generator yielding OpenAI stream chunks.
    :return: Async generator yielding StreamChunk objects (type='thinking' or 'text').
    """
    buffer = ""
    in_think = False

    async for chunk in stream:
        if not hasattr(chunk, "choices") or not chunk.choices:
            continue

        delta = chunk.choices[0].delta

        # 1. Native reasoning_content attribute (Gemini 2.5 thinking & DeepSeek API)
        reasoning_content = getattr(delta, "reasoning_content", None)
        if reasoning_content:
            yield StreamChunk(type="thinking", content=reasoning_content)
            continue

        # 2. Text content parsing for <think> and </think> tags
        content = getattr(delta, "content", "") or ""
        if not content:
            continue

        buffer += content

        while buffer:
            if in_think:
                close_match = THINK_CLOSE.search(buffer)
                if close_match:
                    thinking_part = buffer[:close_match.start()]
                    if thinking_part:
                        yield StreamChunk(type="thinking", content=thinking_part)
                    buffer = buffer[close_match.end():]
                    in_think = False
                else:
                    # Check if buffer ends with a potential partial match of </think> (max len 8)
                    partial_len = 0
                    for i in range(1, min(8, len(buffer))):
                        sub = buffer[-i:]
                        if "</think>"[:i].lower() == sub.lower():
                            partial_len = i

                    if partial_len > 0:
                        emit_part = buffer[:-partial_len]
                        if emit_part:
                            yield StreamChunk(type="thinking", content=emit_part)
                        buffer = buffer[-partial_len:]
                        break
                    else:
                        yield StreamChunk(type="thinking", content=buffer)
                        buffer = ""
            else:
                open_match = THINK_OPEN.search(buffer)
                if open_match:
                    text_part = buffer[:open_match.start()]
                    if text_part:
                        yield StreamChunk(type="text", content=text_part)
                    buffer = buffer[open_match.end():]
                    in_think = True
                else:
                    # Check if buffer ends with a potential partial match of <think> (max len 7)
                    partial_len = 0
                    for i in range(1, min(7, len(buffer))):
                        sub = buffer[-i:]
                        if "<think>"[:i].lower() == sub.lower():
                            partial_len = i

                    if partial_len > 0:
                        emit_part = buffer[:-partial_len]
                        if emit_part:
                            yield StreamChunk(type="text", content=emit_part)
                        buffer = buffer[-partial_len:]
                        break
                    else:
                        yield StreamChunk(type="text", content=buffer)
                        buffer = ""

    # Flush any remaining buffer on stream completion
    if buffer:
        chunk_type: Literal["thinking", "text"] = "thinking" if in_think else "text"
        yield StreamChunk(type=chunk_type, content=buffer)
