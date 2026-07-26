"""
Multi-Model Configuration & DeepInfra LLM Registry.

Provides AVAILABLE_MODELS registry (20+ LLM models), default model constants,
and DeepInfra OpenAI-compatible API client initialization.
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Optional
try:
    from dotenv import load_dotenv
    # Load environment variables from .env if present
    BASE_DIR = Path(__file__).resolve().parent.parent
    dotenv_path = BASE_DIR / ".env"
    if dotenv_path.exists():
        load_dotenv(dotenv_path)
    else:
        load_dotenv()
except ImportError:
    pass

# DeepInfra Base Endpoint
DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai"

# Default Model Constants
DEFAULT_MODEL = "google/gemini-3.5-flash"
DEFAULT_ADV_MODEL = "google/gemini-3.1-flash-lite"
DEFAULT_MYRA_MODEL = "google/gemini-3.1-pro"

# ── DEEPINFRA MODEL REGISTRY (20+ Models) ───────────────────────────────────
AVAILABLE_MODELS: Dict[str, Dict[str, Any]] = {

    # ── GOOGLE GEMINI ──────────────────────────────────────────────────────────
    "google/gemini-3.1-pro": {
        "display": "Gemini 3.1 Pro",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Latest Gemini Pro — best quality, massive context",
    },
    "google/gemini-3.5-flash": {
        "display": "Gemini 3.5 Flash",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait", "myra"],
        "description": "Ultra-fast, large context, best for production",
    },
    "google/gemini-3.1-flash-lite": {
        "display": "Gemini 3.1 Flash Lite",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Lowest latency — ideal for intent extraction",
    },
    "google/gemini-2.5-pro": {
        "display": "Gemini 2.5 Pro",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fast",
        "reasoning": True,
        "thinking_budget": 8192,
        "recommended_for": ["advait", "myra"],
        "description": "Pro with built-in thinking — great for complex queries",
    },
    "google/gemini-2.5-flash": {
        "display": "Gemini 2.5 Flash",
        "provider": "Google",
        "context_window": 1_000_000,
        "speed": "fast",
        "reasoning": True,
        "thinking_budget": 4096,
        "recommended_for": ["advait"],
        "description": "Flash with thinking — fast + reasoning combined",
    },
    "google/gemini-3-pro-image": {
        "display": "Gemini 3 Pro Image",
        "provider": "Google",
        "context_window": 128_000,
        "speed": "medium",
        "reasoning": False,
        "recommended_for": [],
        "description": "Multimodal — future use for chart understanding",
    },

    # ── META LLAMA ─────────────────────────────────────────────────────────────
    "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo": {
        "display": "Llama 3.3 70B Turbo",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait", "myra"],
        "description": "Best open-source instruct model, high throughput",
    },
    "meta-llama/Meta-Llama-3.1-70B-Instruct": {
        "display": "Llama 3.1 70B",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Reliable, widely tested 70B model",
    },
    "meta-llama/Meta-Llama-3.1-8B-Instruct": {
        "display": "Llama 3.1 8B",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Fastest open model — for quick intent parsing",
    },
    "meta-llama/Meta-Llama-3.1-405B-Instruct": {
        "display": "Llama 3.1 405B",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "medium",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Most capable open model — highest quality responses",
    },
    "meta-llama/Llama-3.2-11B-Vision-Instruct": {
        "display": "Llama 3.2 11B Vision",
        "provider": "Meta",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": [],
        "description": "Multimodal — future chart analysis",
    },
    "nvidia/Llama-3.1-Nemotron-70B-Instruct": {
        "display": "Nemotron 70B",
        "provider": "NVIDIA",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "NVIDIA fine-tune of Llama 3.1 — strong instruction following",
    },

    # ── DEEPSEEK (REASONING) ────────────────────────────────────────────────────
    "deepseek-ai/DeepSeek-R1": {
        "display": "DeepSeek R1",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "slow",
        "reasoning": True,
        "recommended_for": ["advait", "myra"],
        "description": "Full 671B reasoning model — most thorough analysis",
    },
    "deepseek-ai/DeepSeek-R1-Distill-Llama-70B": {
        "display": "DeepSeek R1 70B",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "medium",
        "reasoning": True,
        "recommended_for": ["advait", "myra"],
        "description": "R1 reasoning distilled into Llama 70B — balanced",
    },
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B": {
        "display": "DeepSeek R1 Qwen 32B",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "medium",
        "reasoning": True,
        "recommended_for": ["advait"],
        "description": "R1 reasoning distilled into Qwen 32B — compact reasoning",
    },
    "deepseek-ai/DeepSeek-R1-Distill-Llama-8B": {
        "display": "DeepSeek R1 8B",
        "provider": "DeepSeek",
        "context_window": 65_536,
        "speed": "fast",
        "reasoning": True,
        "recommended_for": ["advait"],
        "description": "Smallest R1 distill — fast reasoning for simple intent",
    },
    "deepseek-ai/DeepSeek-V3": {
        "display": "DeepSeek V3",
        "provider": "DeepSeek",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "High-quality non-reasoning model from DeepSeek",
    },

    # ── QWEN ────────────────────────────────────────────────────────────────────
    "Qwen/QwQ-32B": {
        "display": "QwQ 32B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "medium",
        "reasoning": True,
        "recommended_for": ["advait", "myra"],
        "description": "Qwen reasoning model — strong math and logic",
    },
    "Qwen/Qwen2.5-72B-Instruct": {
        "display": "Qwen 2.5 72B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Best Qwen instruct model — excellent reasoning without CoT",
    },
    "Qwen/Qwen2.5-32B-Instruct": {
        "display": "Qwen 2.5 32B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Compact Qwen — good speed/quality tradeoff",
    },
    "Qwen/Qwen2.5-7B-Instruct": {
        "display": "Qwen 2.5 7B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Smallest Qwen — very fast, basic tasks",
    },
    "Qwen/Qwen2.5-Coder-32B-Instruct": {
        "display": "Qwen 2.5 Coder 32B",
        "provider": "Qwen",
        "context_window": 131_072,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": [],
        "description": "Code-specialized — future use for generated SQL/Python",
    },

    # ── MISTRAL ─────────────────────────────────────────────────────────────────
    "mistralai/Mistral-Small-24B-Instruct-2501": {
        "display": "Mistral Small 24B",
        "provider": "Mistral",
        "context_window": 32_768,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Mistral's latest small model — good instruction following",
    },
    "mistralai/Mixtral-8x7B-Instruct-v0.1": {
        "display": "Mixtral 8×7B MoE",
        "provider": "Mistral",
        "context_window": 32_768,
        "speed": "fast",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "MoE architecture — fast, strong at structured tasks",
    },
    "mistralai/Mistral-7B-Instruct-v0.3": {
        "display": "Mistral 7B",
        "provider": "Mistral",
        "context_window": 32_768,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Baseline fast model — lowest cost",
    },

    # ── MICROSOFT ────────────────────────────────────────────────────────────────
    "microsoft/phi-4": {
        "display": "Phi-4",
        "provider": "Microsoft",
        "context_window": 16_384,
        "speed": "fastest",
        "reasoning": False,
        "recommended_for": ["advait"],
        "description": "Small but surprisingly capable — efficient intent extraction",
    },
    "microsoft/WizardLM-2-8x22B": {
        "display": "WizardLM 2 8×22B",
        "provider": "Microsoft",
        "context_window": 65_536,
        "speed": "medium",
        "reasoning": False,
        "recommended_for": ["myra"],
        "description": "Large MoE — high quality narrative generation",
    },
}


def get_llm_api_key(api_key: Optional[str] = None) -> str:
    """
    Resolve DeepInfra API key from parameter or environment variables.

    :param api_key: Explicitly provided API key.
    :return: Resolved API key string.
    :raises ValueError: If no API key is found.
    """
    resolved_key = api_key or os.getenv("DEEPINFRA_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not resolved_key or not resolved_key.strip():
        raise ValueError(
            "DeepInfra API Key not found. Please set DEEPINFRA_API_KEY in environment or pass key."
        )
    return resolved_key.strip()


def get_llm_client(api_key: Optional[str] = None, is_async: bool = True):
    """
    Initialize DeepInfra OpenAI-compatible API client.

    :param api_key: Optional API key. Fallback to DEEPINFRA_API_KEY env var.
    :param is_async: If True, returns AsyncOpenAI client; else standard OpenAI client.
    :return: OpenAI or AsyncOpenAI client instance configured for DeepInfra.
    """
    from openai import OpenAI, AsyncOpenAI

    resolved_key = get_llm_api_key(api_key)
    if is_async:
        return AsyncOpenAI(api_key=resolved_key, base_url=DEEPINFRA_BASE_URL)
    return OpenAI(api_key=resolved_key, base_url=DEEPINFRA_BASE_URL)


def get_model_metadata(model_id: str) -> Dict[str, Any]:
    """Retrieve metadata dict for a model ID from AVAILABLE_MODELS registry."""
    if model_id not in AVAILABLE_MODELS:
        raise KeyError(f"Model ID '{model_id}' is not in AVAILABLE_MODELS registry.")
    return AVAILABLE_MODELS[model_id]


def get_recommended_models(agent_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Filter available models recommended for a specific agent ('advait' or 'myra').
    If agent_name is None, returns all models.
    """
    results = []
    for model_id, meta in AVAILABLE_MODELS.items():
        if agent_name is None or agent_name.lower() in meta.get("recommended_for", []):
            item = meta.copy()
            item["model_id"] = model_id
            results.append(item)
    return results
