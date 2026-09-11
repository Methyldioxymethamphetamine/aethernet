import logging
from typing import Any, List
from config import settings

logger = logging.getLogger("llm_factory")

class FallbackLLM:
    """Mock/Fallback LLM used when local LLM server (Ollama/LM Studio) is offline."""
    def __init__(self, provider: str, base_url: str, model_name: str):
        self.provider = provider
        self.base_url = base_url
        self.model_name = model_name

    def invoke(self, prompt: Any) -> str:
        prompt_str = str(prompt)
        logger.warning(f"Using Fallback LLM logic. Endpoint {self.base_url} unreachable or offline.")
        
        if "VRAM" in prompt_str or "GPU" in prompt_str or "ollama" in prompt_str.lower():
            return (
                "{\n"
                '  "analysis": "High VRAM usage or GPU temperature alert detected in system metrics.",\n'
                '  "action": "flush_vram",\n'
                '  "service": "ollama",\n'
                '  "reason": "VRAM allocation exceeds critical threshold. Triggering flush_vram playbook to restart container and release GPU memory."\n'
                "}"
            )
        else:
            return (
                "{\n"
                '  "analysis": "Service degradation or container failure detected in system metrics.",\n'
                '  "action": "restart_service",\n'
                '  "service": "redis",\n'
                '  "reason": "Redis cache snapshot key metrics:latest missed heartbeat. Triggering container restart playbook."\n'
                "}"
            )

class FallbackEmbeddings:
    """Fallback 384-dim dummy embeddings when local embedding model is offline."""
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[0.01 * (i % 10) for i in range(384)] for _ in texts]
    
    def embed_query(self, text: str) -> List[float]:
        return [0.01 * (i % 10) for i in range(384)]

def get_llm():
    """Returns configured Chat LLM (Ollama or LM Studio)."""
    provider = settings.llm_provider.lower()
    base_url = settings.llm_base_url
    model_name = settings.llm_model_name

    try:
        if provider in ["lmstudio", "lm_studio", "openai", "openai_compatible"]:
            from langchain_openai import ChatOpenAI
            logger.info(f"Initializing LM Studio ChatOpenAI ({model_name} at {base_url})")
            return ChatOpenAI(
                base_url=base_url if base_url.endswith("/v1") else f"{base_url}/v1",
                api_key="lm-studio",
                model=model_name,
                temperature=0.1,
                timeout=10,
            )
        else:
            # Default to Ollama
            from langchain_ollama import ChatOllama
            logger.info(f"Initializing Ollama ChatOllama ({model_name} at {base_url})")
            return ChatOllama(
                base_url=base_url,
                model=model_name,
                temperature=0.1,
                timeout=10,
            )
    except Exception as e:
        logger.error(f"Failed to instantiate LLM client ({provider}): {e}. Using Fallback LLM.")
        return FallbackLLM(provider, base_url, model_name)

def get_embeddings():
    """Returns configured Embeddings instance."""
    provider = settings.embedding_provider.lower()
    base_url = settings.embedding_base_url
    model_name = settings.embedding_model_name

    try:
        if provider == "ollama":
            from langchain_ollama import OllamaEmbeddings
            logger.info(f"Initializing OllamaEmbeddings ({model_name} at {base_url})")
            return OllamaEmbeddings(
                base_url=base_url,
                model=model_name,
            )
        else:
            return FallbackEmbeddings()
    except Exception as e:
        logger.error(f"Failed to instantiate Embeddings ({provider}): {e}. Using Fallback Embeddings.")
        return FallbackEmbeddings()
