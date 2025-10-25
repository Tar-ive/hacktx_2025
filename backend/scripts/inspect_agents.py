"""
Inspect ElevenLabs agents and persist a discovery report.

Usage:
    python scripts/inspect_agents.py

The script calls the ElevenLabs API (requires ELEVENLABS_API_KEY) and dumps a
JSON manifest to backend/agents/logs/agent_discovery.json so the orchestrator
and frontend can stay aligned.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List

from elevenlabs.client import ElevenLabs

OUTPUT_PATH = Path(__file__).resolve().parents[1] / "agents" / "logs" / "agent_discovery.json"


async def inspect_agents(client: ElevenLabs) -> List[Dict[str, Any]]:
    """Return structured metadata for every agent in the workspace."""
    agents = await client.agents.list()
    details: List[Dict[str, Any]] = []

    for agent in agents:
        detailed = await client.agents.get(agent_id=agent.agent_id)
        payload = {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "language": getattr(detailed, "language", None),
            "description": getattr(detailed, "description", None),
            "voice_id": getattr(detailed, "voice_id", None),
            "wake_words": getattr(detailed, "wake_words", None),
            "metadata": getattr(detailed, "metadata", {}),
            "tools": [
                {
                    "name": tool.name,
                    "type": getattr(tool, "type", "unknown"),
                    "description": getattr(tool, "description", None),
                }
                for tool in getattr(detailed, "tools", []) or []
            ],
        }
        details.append(payload)

    return details


async def main() -> None:
    """Entry point for asynchronous execution."""
    client = ElevenLabs()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        manifest = await inspect_agents(client)
    except Exception as exc:  # pragma: no cover - network failure surfaced to user
        print(f"❌ Failed to inspect agents: {exc}")
        return

    OUTPUT_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"✅ Discovery complete. Saved {len(manifest)} agents to {OUTPUT_PATH}.")


if __name__ == "__main__":
    asyncio.run(main())
