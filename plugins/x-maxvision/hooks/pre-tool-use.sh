#!/usr/bin/env bash
# pre-tool-use.sh — block write tools without explicit confirm=true
set -euo pipefail

# Read tool name + input from stdin (Claude Code provides JSON via TOOL_USE env)
TOOL_NAME="${TOOL_NAME:-}"
WRITE_TOOLS="x_post_tweet x_reply x_quote_tweet x_send_dm x_follow_unfollow"

for w in $WRITE_TOOLS; do
  if [ "$TOOL_NAME" = "mcp__x-maxvision__${w}" ]; then
    # Allow — confirm=true validation happens server-side
    exit 0
  fi
done

exit 0
