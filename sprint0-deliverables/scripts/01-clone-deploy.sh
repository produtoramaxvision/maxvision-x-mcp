#!/usr/bin/env bash
# 01-clone-deploy.sh — clone repo + docker compose up
set -euo pipefail

TARGET_DIR="${1:-/opt/maxvision-x-mcp}"
REPO_URL="${REPO_URL:-https://github.com/produtoramaxvision/maxvision-x-mcp.git}"

if [ ! -d "$TARGET_DIR" ]; then
  git clone "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"
git pull --ff-only

cd mcp-server/docker

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Edit .env then re-run this script."
  exit 1
fi

# Ensure secrets exist
for s in master_key postgres_password webhook_secret xai_api_key; do
  if [ ! -f "secrets/${s}.txt" ]; then
    echo "Missing secrets/${s}.txt — see secrets/README.md"
    exit 1
  fi
done

docker compose up -d
docker compose logs -f mcp
