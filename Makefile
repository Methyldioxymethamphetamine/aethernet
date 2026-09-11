.PHONY: help start up down dev daemon orchestrator web chaos build clean

# Default goal
.DEFAULT_GOAL := help

help:
	@echo "=========================================================================="
	@echo "⚡ AetherNet Air-Gapped Telemetry & Self-Healing Workspace ⚡"
	@echo "=========================================================================="
	@echo "Available commands:"
	@echo "  make start        Start the entire project using start.sh"
	@echo "  make up           Start Docker infrastructure (Kafka, Redis, Postgres, Qdrant, Ollama)"
	@echo "  make down         Stop Docker infrastructure"
	@echo "  make dev          Start full stack in development mode"
	@echo "  make daemon       Start Go bare-metal telemetry collector"
	@echo "  make orchestrator  Start Python AI decision engine (FastAPI + LangGraph)"
	@echo "  make web          Start Next.js NOC Control Center UI"
	@echo "  make chaos        Run end-to-end self-healing chaos test"
	@echo "  make build        Build production binaries for daemon and web dashboard"
	@echo "  make clean        Remove generated build binaries and caches"
	@echo "=========================================================================="

start:
	@bash start.sh

up:
	@echo "🚀 Starting Docker infrastructure services..."
	docker compose -f infra/docker/docker-compose.yml up -d

down:
	@echo "🛑 Stopping Docker infrastructure services..."
	docker compose -f infra/docker/docker-compose.yml down

daemon:
	@echo "⚙️ Starting Go Telemetry Daemon..."
	cd services/daemon && go run .

orchestrator:
	@echo "🧠 Starting Python AI Orchestrator..."
	cd services/orchestrator && \
		( [ -d .venv ] && source .venv/bin/activate || true ) && \
		python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

web:
	@echo "🖥️ Starting Next.js NOC Dashboard..."
	pnpm dev:web

dev: up
	@echo "🚀 Launching full AetherNet development stack..."
	@echo "Run 'make daemon', 'make orchestrator', and 'make web' in separate terminals or use a multiplexer."

chaos:
	@bash scripts/chaos_test.sh

build:
	@echo "🔨 Building Go daemon binary..."
	cd services/daemon && go build -o aethernet-daemon .
	@echo "🔨 Building Next.js web application..."
	pnpm --filter web build
	@echo "✅ All production targets compiled successfully."

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -f services/daemon/aethernet-daemon
	rm -rf apps/web/.next
