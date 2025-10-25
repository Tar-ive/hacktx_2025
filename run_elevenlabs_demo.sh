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

echo "🌐 Starting ngrok tunnel on port 8000"
ngrok http 8000 --log stdout >/dev/null 2>&1 &
NGROK_PID=$!

cleanup() {
  echo ""
  echo "🛑 Shutting down services..."
  if ps -p "$SERVER_PID" >/dev/null 2>&1; then
    echo "   Stopping FastAPI (pid: $SERVER_PID)"
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if ps -p "$NGROK_PID" >/dev/null 2>&1; then
    echo "   Stopping ngrok (pid: $NGROK_PID)"
    kill "$NGROK_PID" >/dev/null 2>&1 || true
    wait "$NGROK_PID" 2>/dev/null || true
  fi
  echo "✅ Cleanup complete"
}
trap cleanup EXIT INT TERM

echo "🔍 Waiting for backend health check…"
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Backend health check failed after 30 seconds"
    exit 1
  fi
  sleep 1
done

echo "🔍 Waiting for ngrok tunnel to be ready…"
sleep 3
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
if [ -n "$NGROK_URL" ]; then
  echo "✅ Ngrok tunnel active: $NGROK_URL"
  echo "   Configure this URL in your ElevenLabs webhook settings"
else
  echo "⚠️  Could not detect ngrok tunnel URL"
  echo "   Check ngrok status at: http://127.0.0.1:4040"
fi

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

echo "✅ Initial agent conversation complete."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Services are now running and ready to receive webhooks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Endpoints:"
echo "   Backend:      http://127.0.0.1:8000"
echo "   Health:       http://127.0.0.1:8000/health"
echo "   Ngrok URL:    ${NGROK_URL:-Check http://127.0.0.1:4040}"
echo "   Ngrok Admin:  http://127.0.0.1:4040"
echo ""
echo "📨 Webhook endpoint for ElevenLabs:"
echo "   ${NGROK_URL:-[ngrok-url]}/api/v1/webhooks/elevenlabs"
echo ""
echo "💡 The server will keep running until you press Ctrl+C"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Keep the script running and display logs
echo ""
echo "📋 Watching for activity (press Ctrl+C to stop)..."
echo ""

# Wait indefinitely, allowing the background processes to run
wait
