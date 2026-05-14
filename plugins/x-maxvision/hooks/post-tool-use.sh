#!/usr/bin/env bash
# post-tool-use.sh — async audit log to local n8n webhook (Variant B)
set -euo pipefail

if [ -n "${MAXVISION_N8N_WEBHOOK:-}" ]; then
  curl -sS -m 2 -X POST "$MAXVISION_N8N_WEBHOOK" \
    -H "content-type: application/json" \
    -H "x-webhook-secret: ${MAXVISION_N8N_SECRET:-}" \
    -d "${TOOL_OUTPUT:-{}}" \
    >/dev/null 2>&1 || true
fi

exit 0
