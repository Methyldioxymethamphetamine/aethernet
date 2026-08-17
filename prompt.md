Act as a Principal Systems Architect. We are building "AetherNet", an air-gapped autonomous telemetry and self-healing local AI workspace.

Phase 1 Goal: Initialize a clean monorepo with pnpm workspaces.
Structure:
- `apps/web`: Next.js 15/16 App Router, TypeScript, Tailwind CSS v4, Zustand, Lucide-react.
- `services/daemon`: Bare-metal Go collector structure.
- `services/orchestrator`: Python 3.12 (FastAPI, LangGraph) structure.
- `infra/docker`: Compose files for local Kafka (KRaft), Redis 7, Postgres 16, Qdrant, Ollama, and Traefik.

Deliverables:
1. Generate root `package.json` and `pnpm-workspace.yaml`.
2. Generate root `docker-compose.yml` for infrastructure dependencies (KRaft Kafka, Redis, Postgres, Qdrant).
3. Provide the exact bash setup commands to scaffold the folders and install dependencies without warnings.

Phase 2 Goal: Implement the low-level hardware metrics ingestion pipeline.

Requirements:
1. In `services/daemon` (Go):
   - Use `gopsutil` to collect CPU%, Per-Core load, RAM usage, and Disk I/O at 100ms intervals.
   - Structure a C-Go / stub fallback interface for NVIDIA NVML metrics (GPU util, VRAM used, Temp).
   - Publish serialized JSON payloads to Kafka topic: `telemetry.raw`.
2. In `services/daemon/consumer` (Go):
   - Consume `telemetry.raw`.
   - Write latest snapshot to Redis key `metrics:latest` (TTL 5s) and publish to Redis PubSub channel `metrics:stream`.
   - Batch insert into Postgres `system_metrics` table every 5 seconds.

Deliverable: Provide fully functional, complete Go source code (`main.go`, `collector.go`, `kafka.go`, `db.go`, `go.mod`). No placeholders or truncated logic.


Phase 3 Goal: Build an ultra-responsive, dark-mode NOC Control Center UI in `apps/web`.

Design Specs:
- Industrial cyber-ops palette: Slate-950 base, Cyan-400 primary accents, Emerald-500 online indicators, Amber/Red alert states.
- High-density responsive grid (Mobile to 4K desktop).

Features:
1. `src/components/telemetry-grid.tsx`: Live gauges for CPU, RAM, VRAM, GPU Temp using Recharts and smooth state transitions via Zustand.
2. `src/components/terminal-view.tsx`: Embedded `@xterm/xterm` with `@xterm/addon-fit` streaming live pipeline logs via WebSocket.
3. `src/app/api/ws/route.ts` (or custom server handler): WebSocket connection streaming live data from Redis PubSub `metrics:stream`.
4. Visual health nodes component showing status of local services (Kafka, Postgres, Ollama, Go Daemon).

Deliverable: Provide complete Next.js components, page layout, and styling configs. Prioritize modularity and performance.

Phase 4 Goal: Build the offline AI decision engine in `services/orchestrator`.

Requirements:
1. `services/orchestrator/rag.py`:
   - Connect to local Qdrant instance.
   - Parse `/var/log/syslog` (or mock error logs), generate embeddings locally via Ollama (`nomic-embed-text`), and upsert.
2. `services/orchestrator/agents.py` (LangGraph):
   - State Graph containing 3 nodes:
     * `Observer`: Reads threshold alerts from Redis (e.g., VRAM > 90% or Container crash).
     * `Planner`: Queries local Ollama (`llama3.1:8b`) with retrieved RAG log context to generate a fix action.
     * `Executor`: Runs an Ansible playbook or Docker API command in an isolated sandbox and captures stdout.
3. Fast-API endpoint `/api/agent/trigger` with SSE output streaming execution logs back to the Next.js terminal.

Deliverable: Complete Python codebase (`main.py`, `rag.py`, `agents.py`, `requirements.txt`).

Phase 5 Goal: Close the self-healing loop and write end-to-end chaos tests.

Requirements:
1. Create `infra/ansible/playbooks/`:
   - `flush_vram.yml`: Restarts Ollama containers and clears GPU cache.
   - `restart_service.yml`: Parametrized container self-heal script.
2. Build a chaos test script `scripts/chaos_test.sh` that:
   - Artificially spikes CPU/Memory.
   - Kills the Redis container.
   - Verifies the LangGraph Observer catches the fault, triggers the Ansible playbook, restores the container, and logs everything to `xterm.js`.
3. Provide the unified root `Makefile` to run the entire stack with a single command (`make up`, `make dev`, `make chaos`).

Deliverable: Ansible YAML files, chaos bash script, and root `Makefile`.