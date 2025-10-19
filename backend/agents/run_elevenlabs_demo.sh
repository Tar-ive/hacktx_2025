#!/usr/bin/env bash
# End-to-end harness for the ElevenLabs banking demo.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

# Load environment (API keys, webhook secret, etc.) if present.
if [[ -f "$BACKEND_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$BACKEND_DIR/.env"
fi

AGENT_NAME="${1:-nebula}"
CUSTOMER_ID="${CUSTOMER_ID:-${NESSIE_CUSTOMER_ID:-68f42c289683f20dd51a0293}}"
SESSION_ID="${SESSION_ID:-cli-demo-$(date +%s)}"

echo "→ Agent            : $AGENT_NAME"
echo "→ Customer ID      : $CUSTOMER_ID"
echo "→ Session ID       : $SESSION_ID"

cd "$BACKEND_DIR"

echo "⏳ Syncing dependencies with uv…"
uv sync >/dev/null

echo "🚀 Launching FastAPI (uvicorn) on 127.0.0.1:8000"
uv run uvicorn src.main:app --host 127.0.0.1 --port 8000 --log-level warning &
SERVER_PID=$!

cleanup() {
  if ps -p "$SERVER_PID" >/dev/null 2>&1; then
    echo "🛑 Stopping FastAPI (pid: $SERVER_PID)"
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "🔍 Waiting for backend health check…"
for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "🤖 Starting ElevenLabs conversation via orchestrator"
uv run python - <<PY
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

if [[ -n "${ELEVENLABS_WEBHOOK_SECRET:-}" ]]; then
  echo "📨 Sending demo agent_finished webhook to populate summary bundle"
  curl -fsS -X POST \
    -H "Content-Type: application/json" \
    -H "x-elevenlabs-webhook-secret: ${ELEVENLABS_WEBHOOK_SECRET}" \
    -d @- \
    http://127.0.0.1:8000/api/v1/webhooks/elevenlabs <<JSON
{
  "event": "agent_finished",
  "agentId": "demo-agent",
  "agentName": "${AGENT_NAME^}",
  "sessionId": "${SESSION_ID}",
  "utterance": "Here's your wrap-up with spending insights.",
  "metadata": {
    "agent": "${AGENT_NAME}",
    "audio": {
      "url": "https://example.com/wrap-up.mp3",
      "expires_at": "2025-10-20T18:22:04Z",
      "codec": "mp3"
    }
  }
}
JSON
else
  echo "⚠️ ELEVENLABS_WEBHOOK_SECRET is not set; skipping webhook simulation."
  echo "   Set it in backend/.env to exercise the summary bundle path."
fi

echo "✅ Demo complete."
