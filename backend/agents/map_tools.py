"""
Utility for mapping orchestrator tools to agent responsibilities.

Run this module to print a consolidated manifest that can be shared with
teammates wiring ElevenLabs agents. This mirrors the specification captured in
Agents.md but is executable so the manifest stays close to the codebase.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List


ORCHESTRATOR_TOOLS: Dict[str, str] = {
    "get_account_balance": "Returns aggregate balance across all accounts.",
    "get_recent_transactions": "Fetches purchases for the last 7-90 days.",
    "get_spending_by_category": "Breaks down spending by coarse category buckets.",
    "analyze_spending_patterns": "Highlights trends, averages, and comparisons.",
    "get_all_accounts": "Lists customer accounts with balances and metadata.",
    "detect_unusual_transactions": "Flags outliers based on z-score deviations.",
    "get_security_score": "Produces a risk score using recent activity.",
    "get_customer_info": "Returns profile information such as name and address.",
    "calculate_savings_rate": "Calculates net savings over a rolling window.",
    "get_deposits_history": "Returns deposit transactions for income analysis.",
}


@dataclass(frozen=True)
class AgentManifest:
    """Simple container describing an individual agent's remit."""

    title: str
    tools: List[str]
    description: str
    speech_model: str
    wake_phrases: List[str]
    theme: str


AGENT_MANIFESTS: Dict[str, AgentManifest] = {
    "nebula": AgentManifest(
        title="Nebula (Spending Coach)",
        tools=[
            "get_recent_transactions",
            "get_spending_by_category",
            "analyze_spending_patterns",
            "get_account_balance",
        ],
        description="Guides day-to-day budgets, spending habits, and category insights.",
        speech_model="eleven_flash_v2_5",
        wake_phrases=[
            "Hey Nebula",
            "Spending coach",
            "Budget check",
        ],
        theme="nebula",
    ),
    "atlas": AgentManifest(
        title="Atlas (Investment Advisor)",
        tools=[
            "get_all_accounts",
            "calculate_savings_rate",
            "get_deposits_history",
            "get_account_balance",
        ],
        description="Focuses on long-term planning, retirement, and asset allocation.",
        speech_model="eleven_turbo_v2_5",
        wake_phrases=[
            "Hey Atlas",
            "Investment coach",
            "Plan my future",
        ],
        theme="atlas",
    ),
    "sentinel": AgentManifest(
        title="Sentinel (Security Monitor)",
        tools=[
            "detect_unusual_transactions",
            "get_security_score",
            "get_recent_transactions",
            "get_all_accounts",
        ],
        description="Monitors risk, suspicious activity, and account security posture.",
        speech_model="eleven_flash_v2",
        wake_phrases=[
            "Hey Sentinel",
            "Security check",
            "Fraud alert",
        ],
        theme="sentinel",
    ),
    "nova": AgentManifest(
        title="Nova (General Assistant)",
        tools=[
            "get_account_balance",
            "get_all_accounts",
            "get_customer_info",
            "get_recent_transactions",
        ],
        description="Handles greetings, general account questions, and fallback intents.",
        speech_model="eleven_turbo_v2",
        wake_phrases=[
            "Hey Nova",
            "General help",
            "Assistant",
        ],
        theme="nova",
    ),
}


def build_manifest() -> Dict[str, Dict]:
    """Return structured manifest for downstream consumers."""
    return {
        "tools": ORCHESTRATOR_TOOLS,
        "agents": {agent: asdict(manifest) for agent, manifest in AGENT_MANIFESTS.items()},
    }


def print_manifest() -> None:
    """Pretty print manifest to stdout."""
    manifest = build_manifest()
    print("=" * 80)
    print("ORCHESTRATOR TOOLKIT")
    print("=" * 80)
    for tool, desc in manifest["tools"].items():
        print(f"- {tool}: {desc}")

    print("\n" + "=" * 80)
    print("AGENT MANIFESTS")
    print("=" * 80)
    for agent, payload in manifest["agents"].items():
        print(f"\n{payload['title']}")
        print(f"Slug: {agent}")
        print(f"Theme: {payload['theme']}")
        print(f"Speech model: {payload['speech_model']}")
        print("Wake phrases: " + ", ".join(payload["wake_phrases"]))
        print("Tools:")
        for tool in payload["tools"]:
            print(f"  • {tool} – {ORCHESTRATOR_TOOLS.get(tool, 'Unknown tool')}")
        print(f"Description: {payload['description']}")


if __name__ == "__main__":
    print_manifest()
