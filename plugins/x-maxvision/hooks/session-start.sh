#!/usr/bin/env bash
# session-start.sh — ToS disclaimer once per session
set -euo pipefail
cat <<EOF
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"⚠ MaxVision X Suite carregado. Respeite X (Twitter) Developer Agreement: tools acessam apenas dados públicos + sua conta autenticada. Rate-limit por tool ativo. Writes exigem confirm=true. Use /x-status para checar saúde da conta."}}
EOF
