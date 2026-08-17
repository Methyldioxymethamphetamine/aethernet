#!/bin/bash

# Exit on error
set -e

echo "🚀 Initializing AetherNet Monorepo Workspace..."

# Create directory structure
mkdir -p apps/web
mkdir -p services/daemon/consumer
mkdir -p services/orchestrator
mkdir -p infra/docker
mkdir -p infra/ansible/playbooks
mkdir -p scripts

echo "✅ Directories scaffolded successfully."
