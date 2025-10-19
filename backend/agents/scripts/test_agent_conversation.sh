#!/usr/bin/env bash

# Quick harness to trigger an ElevenLabs conversation via the orchestrator.
# Usage:
#   bash scripts/test_agent_conversation.sh nebula [customer_id] [session_id]
#
# Defaults:
#   customer_id = 68f42c289683f20dd51a0293
#   session_id  = cli-demo-<timestamp>

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent_slug> [customer_id] [session_id]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

AGENT_NAME="$1"
CUSTOMER_ID="${2:-68f42c289683f20dd51a0293}"
SESSION_ID="${3:-cli-demo-$(date +%s)}"

(cd "$ROOT_DIR" || exit 3

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "ELEVENLABS_API_KEY not set. Source backend/.env before running." >&2
  exit 2
fi

PYTHONPATH="$ROOT_DIR" python3 - <<PY
import asyncio
from src.orchestrator.llm_orchestrator import llm_orchestrator

async def main():
    result = await llm_orchestrator.start_agent_conversation(
        agent_name="${AGENT_NAME}",
        customer_id="${CUSTOMER_ID}",
        session_id="${SESSION_ID}",
    )
    print(result)

asyncio.run(main())
PY
)
