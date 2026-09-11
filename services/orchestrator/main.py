import asyncio
import json
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from config import settings
from agents import run_agent_workflow
from rag import rag_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("orchestrator")

app = FastAPI(
    title="AetherNet AI Orchestrator",
    description="Air-Gapped Offline Autonomous Telemetry & Self-Healing Decision Engine",
    version="1.0.0"
)

# Enable CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "aethernet-orchestrator",
        "llm_provider": settings.llm_provider,
        "llm_base_url": settings.llm_base_url,
        "llm_model": settings.llm_model_name,
        "qdrant_connected": rag_engine.connected,
    }

async def event_generator(trigger_source: str) -> AsyncGenerator[str, None]:
    """Generates SSE payload stream for live xterm terminal rendering."""
    yield f"data: {json.dumps({'type': 'log', 'data': f'\\x1b[36m[AI ORCHESTRATOR]\\x1b[0m Triggered self-healing agent loop (Source: {trigger_source})'})}\n\n"
    await asyncio.sleep(0.3)

    result = run_agent_workflow(trigger_source)
    logs = result.get("execution_logs", [])

    for line in logs:
        # Format logs with ANSI color sequences for xterm.js
        formatted_line = line
        if "🔍" in line or "[Observer" in line:
            formatted_line = f"\\x1b[36m{line}\\x1b[0m"
        elif "🧠" in line or "[Planner" in line:
            formatted_line = f"\\x1b[35m{line}\\x1b[0m"
        elif "🔧" in line or "🚀" in line or "[Executor" in line:
            formatted_line = f"\\x1b[33m{line}\\x1b[0m"
        elif "🚨" in line or "ALERT" in line or "❌" in line:
            formatted_line = f"\\x1b[31m{line}\\x1b[0m"
        elif "✅" in line or "✨" in line or "SUCCESS" in line:
            formatted_line = f"\\x1b[32m{line}\\x1b[0m"
            
        yield f"data: {json.dumps({'type': 'log', 'data': formatted_line})}\n\n"
        await asyncio.sleep(0.4)

    summary = {
        "status": result.get("status", "SUCCESS"),
        "anomaly_type": result.get("anomaly_type", "NONE"),
        "plan": result.get("plan", {}),
    }
    yield f"data: {json.dumps({'type': 'summary', 'data': summary})}\n\n"

from pydantic import BaseModel
from typing import List, Optional
from llm_factory import get_llm

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Interactive Chatbot endpoint querying local Ollama / LM Studio model."""
    user_msg = request.message.strip()
    logger.info(f"Chat request received: {user_msg}")

    # RAG lookup for context
    rag_logs = rag_engine.search_logs(user_msg, limit=2)
    rag_context_str = "\n".join([f"- {l}" for l in rag_logs])

    system_prompt = (
        "You are AetherNet Local AI Assistant, an air-gapped autonomous telemetry and self-healing engine.\n"
        f"Configured LLM Provider: {settings.llm_provider.upper()} | Model: {settings.llm_model_name}\n"
        f"Relevant System Logs / RAG Context:\n{rag_context_str}\n\n"
        "Respond concisely, professionally, and directly to the user's request."
    )

    full_prompt = f"{system_prompt}\n\nUser Question: {user_msg}\nAssistant Answer:"

    try:
        llm = get_llm()
        response = llm.invoke(full_prompt)
        reply_text = response.content if hasattr(response, "content") else str(response)
        
        return {
            "reply": reply_text.strip(),
            "provider": settings.llm_provider,
            "model": settings.llm_model_name,
            "rag_context": rag_logs,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return {
            "reply": f"⚠️ Could not reach local LLM ({settings.llm_provider} at {settings.llm_base_url}): {str(e)}. Please check if Ollama or LM Studio is running.",
            "provider": settings.llm_provider,
            "model": settings.llm_model_name,
            "rag_context": rag_logs,
            "status": "error"
        }

@app.get("/api/agent/trigger")
async def trigger_agent(request: Request, source: str = "manual"):
    """Server-Sent Events (SSE) endpoint streaming execution steps back to terminal."""
    logger.info(f"Trigger request received from source: {source}")
    return StreamingResponse(
        event_generator(source),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
