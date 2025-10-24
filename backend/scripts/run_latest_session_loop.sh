#!/usr/bin/env bash
# Monitor the local conversation store and replay the latest session with an ElevenLabs agent.
# Usage: scripts/run_latest_session_loop.sh [agent_slug] [customer_id] [interval_seconds]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"

DEFAULT_AGENT="${1:-nebula}"
DEFAULT_CUSTOMER="${2:-${NESSIE_CUSTOMER_ID:-68f42c289683f20dd51a0293}}"
INTERVAL="${3:-15}"

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "ELEVENLABS_API_KEY not set. Export it or source backend/.env before running." >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for parsing conversation files." >&2
  exit 3
fi

LATEST_SESSION=""

while true; do
  LATEST_FILE="$(ls -t "${BACKEND_DIR}/data/conversations"/session_*.json 2>/dev/null | head -1 || true)"

  if [[ -z "${LATEST_FILE}" ]]; then
    echo "[watch] No conversation sessions found yet. Sleeping ${INTERVAL}s..."
    sleep "${INTERVAL}"
    continue
  fi

  SESSION_FROM_FILE="$(jq -r '.session_id // empty' "${LATEST_FILE}")"
  if [[ -z "${SESSION_FROM_FILE}" ]]; then
    SESSION_FROM_FILE="$(basename "${LATEST_FILE}" .json)"
  fi

  if [[ "${SESSION_FROM_FILE}" != "${LATEST_SESSION}" ]]; then
    CUSTOMER_ID="$(jq -r '.customer_id // empty' "${LATEST_FILE}")"
    if [[ -z "${CUSTOMER_ID}" ]]; then
      CUSTOMER_ID="${DEFAULT_CUSTOMER}"
    fi

    AGENT_SLUG="$(jq -r '.messages[]? | select(.role=="assistant" and .agent != null) | .agent' "${LATEST_FILE}" | tail -1)"
    if [[ -z "${AGENT_SLUG}" ]]; then
      AGENT_SLUG="${DEFAULT_AGENT}"
    fi

    echo "[watch] Replaying session ${SESSION_FROM_FILE} (agent=${AGENT_SLUG}, customer=${CUSTOMER_ID})"
    (cd "${BACKEND_DIR}" && uv run bash agents/scripts/test_agent_conversation.sh "${AGENT_SLUG}" "${CUSTOMER_ID}" "${SESSION_FROM_FILE}") || true
    LATEST_SESSION="${SESSION_FROM_FILE}"
  fi

  sleep "${INTERVAL}"

done
