import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM Settings
    # Options: "ollama", "lmstudio", "openai_compatible"
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    
    # Base URLs
    # Ollama default: http://localhost:11434
    # LM Studio default: http://localhost:1234/v1
    llm_base_url: str = os.getenv("LLM_BASE_URL", "http://localhost:11434")
    llm_model_name: str = os.getenv("LLM_MODEL_NAME", "llama3.1:8b")
    
    # Embedding Settings
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "ollama")
    embedding_model_name: str = os.getenv("EMBEDDING_MODEL_NAME", "nomic-embed-text")
    embedding_base_url: str = os.getenv("EMBEDDING_BASE_URL", "http://localhost:11434")
    
    # Database Settings
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    qdrant_host: str = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port: int = int(os.getenv("QDRANT_PORT", "6333"))
    
    # FastAPI Settings
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

settings = Settings()

