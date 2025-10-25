"""
High-level ElevenLabs integration that wires client-side tools into agents.

This module complements the lower-level HTTP client located in
`src/services/elevenlabs_client.py` by exposing a Conversation helper for
real-time interactions where ElevenLabs executes Python callbacks on demand.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from elevenlabs import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation, ClientTools
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface

from ..config import config
from agents.tools import financial_tools


class ElevenLabsIntegration:
    """Manage ElevenLabs conversations with registered client-side tools."""

    def __init__(self) -> None:
        self.client = ElevenLabs(api_key=config.ELEVENLABS_API_KEY)
        self.conversations: Dict[str, Dict[str, object]] = {}
        self.agent_ids = {
            "nebula": config.AGENT_ID_NEBULA,
            "atlas": config.AGENT_ID_ATLAS,
            "sentinel": config.AGENT_ID_SENTINEL,
            "nova": config.AGENT_ID_NOVA,
        }

    def _create_client_tools(self, agent_name: str) -> ClientTools:
        """Register client-side tools depending on the requested agent."""
        client_tools = ClientTools()

        # Shared utilities
        client_tools.register("getCustomerProfile", financial_tools.get_customer_profile)
        client_tools.register("getAllAccounts", financial_tools.get_all_accounts_summary)
        client_tools.register("getTransactions90d", financial_tools.get_transactions_90d)

        # Reserved branch for agent-specific expansion
        if agent_name == "nebula":
            pass
        elif agent_name == "atlas":
            pass
        elif agent_name == "sentinel":
            pass
        elif agent_name == "nova":
            pass

        return client_tools

    def start_conversation(
        self,
        agent_name: str,
        customer_id: str,
        session_id: str | None = None,
        *,
        requires_auth: bool = False,
    ) -> Conversation:
        """Start a new ElevenLabs conversation for the given agent."""
        agent_id = self.agent_ids.get(agent_name)
        if not agent_id:
            raise ValueError(f"Unknown or unconfigured agent '{agent_name}'.")

        conversation = Conversation(
            client=self.client,
            agent_id=agent_id,
            client_tools=self._create_client_tools(agent_name),
            requires_auth=requires_auth,
            audio_interface=DefaultAudioInterface(),
        )

        conversation.start_session()

        key = session_id or f"{customer_id}:{agent_name}:{datetime.now().timestamp()}"
        self.conversations[key] = {
            "conversation": conversation,
            "agent_name": agent_name,
            "customer_id": customer_id,
            "started_at": datetime.utcnow().isoformat(),
        }
        return conversation

    def get_conversation(self, key: str) -> Conversation:
        """Return a previously started conversation."""
        if key not in self.conversations:
            raise KeyError(f"Conversation '{key}' not found.")
        stored = self.conversations[key]["conversation"]
        assert isinstance(stored, Conversation)
        return stored


elevenlabs_integration = ElevenLabsIntegration()

__all__ = ["elevenlabs_integration", "ElevenLabsIntegration"]
