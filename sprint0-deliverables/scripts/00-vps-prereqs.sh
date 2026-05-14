#!/usr/bin/env bash
# 00-vps-prereqs.sh — install Docker + create traefik-public network (idempotent)
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker network ls --format '{{.Name}}' | grep -qx 'traefik-public'; then
  echo "Creating traefik-public network..."
  docker network create --driver=overlay --attachable traefik-public 2>/dev/null \
    || docker network create traefik-public
fi

echo "Done. Verify: docker info; docker network ls"
