"""Google ADK-backed agent service for conversational responses.

This module builds lightweight agents with the Agent Development Kit (ADK)
so we can replace the previous ElevenLabs integration with a local
implementation that still leverages Gemini models. When ADK is unavailable or
disabled, the service gracefully falls back to cached-context summaries so the
rest of the application continues to function.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, Dict, Optional

from ..config import config

try:  # ADK is optional at runtime
    from google.adk.agents.llm_agent import Agent
    from google.adk.agents.run_config import RunConfig
    from google.adk.runners import InMemoryRunner
    from google.genai import types as genai_types

    _ADK_IMPORT_ERROR: Optional[Exception] = None
except ImportError as exc:  # pragma: no cover - environment dependent
    Agent = None  # type: ignore[assignment]
    RunConfig = None  # type: ignore[assignment]
    InMemoryRunner = None  # type: ignore[assignment]
    genai_types = None  # type: ignore[assignment]
    _ADK_IMPORT_ERROR = exc

MAX_CONTEXT_CHARS = 4000
MAX_LIST_ITEMS = 5
MAX_STRING_CHARS = 500


class ADKAgentService:
    """Manage ADK agents and provide text responses for the orchestrator."""

    def __init__(self) -> None:
        self._adk_available = _ADK_IMPORT_ERROR is None
        self._enabled = (
            self._adk_available
            and config.adk_agents_enabled()
        )
        self._disabled_reason = self._compute_disabled_reason()

        self._agent_definitions = self._build_agent_definitions()
        self._runners: Dict[str, InMemoryRunner] = {}  # type: ignore[type-arg]
        self._locks: Dict[str, asyncio.Lock] = {}
        self._app_names: Dict[str, str] = {}
        self._sessions: Dict[str, Dict[str, Any]] = {}

        if self._enabled:
            self._initialize_agents()

    @property
    def is_available(self) -> bool:
        """Return True when ADK agents can be used."""
        return self._enabled

    @property
    def disabled_reason(self) -> str:
        """Expose the reason ADK is unavailable for diagnostics."""
        return self._disabled_reason

    def _compute_disabled_reason(self) -> str:
        if not self._adk_available:
            return (
                "google-adk package is not installed."
            )
        if not config.ENABLE_ADK_AGENTS:
            return "ENABLE_ADK_AGENTS is disabled."
        if not config.GEMINI_API_KEY:
            return "Missing GEMINI_API_KEY environment variable."
        return ""

    def _initialize_agents(self) -> None:
        assert Agent is not None and InMemoryRunner is not None

        for agent_name, meta in self._agent_definitions.items():
            agent = Agent(
                name=meta["name"],
                model=config.GEMINI_MODEL,
                instruction=meta["instruction"],
                description=meta["description"],
            )
            app_name = f"adk_{agent_name}_app"
            runner = InMemoryRunner(agent=agent, app_name=app_name)
            self._runners[agent_name] = runner
            self._locks[agent_name] = asyncio.Lock()
            self._app_names[agent_name] = app_name

    def _build_agent_definitions(self) -> Dict[str, Dict[str, str]]:
        shared_context = (
            "Always ground your answers in the structured context provided. "
            "Cite concrete numbers when available and be concise."
        )

        return {
            "nebula": {
                "name": "nebula",
                "description": "Daily spending and budgeting coach",
                "instruction": (
                    "You are Nebula, a spending coach. Help customers understand "
                    "recent purchases, budgets, and savings opportunities. "
                    f"{shared_context}"
                ),
            },
            "atlas": {
                "name": "atlas",
                "description": "Investment and long-term planning advisor",
                "instruction": (
                    "You are Atlas, an investment advisor. Offer guidance on "
                    "retirement, investment allocations, and wealth planning. "
                    f"{shared_context}"
                ),
            },
            "sentinel": {
                "name": "sentinel",
                "description": "Security and fraud monitoring assistant",
                "instruction": (
                    "You are Sentinel, focused on account security. Identify "
                    "suspicious activity, fraud indicators, and security steps. "
                    f"{shared_context}"
                ),
            },
            "nova": {
                "name": "nova",
                "description": "General banking assistant",
                "instruction": (
                    "You are Nova, a helpful banking assistant. Provide clear, "
                    "friendly answers to general financial questions. "
                    f"{shared_context}"
                ),
            },
        }

    def _normalize_agent(self, agent_name: str) -> str:
        return agent_name.lower()

    async def ensure_session(
        self,
        agent_name: str,
        customer_id: Optional[str],
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Ensure an ADK session exists for the requested agent."""
        agent_key = self._normalize_agent(agent_name)

        if not self._enabled:
            return {
                "success": False,
                "conversation_id": conversation_id,
                "reason": self._disabled_reason,
            }

        if agent_key not in self._runners:
            return {
                "success": False,
                "conversation_id": conversation_id,
                "reason": f"Unknown agent '{agent_name}'.",
            }

        convo_id = conversation_id or str(uuid.uuid4())
        if convo_id in self._sessions:
            return {"success": True, "conversation_id": convo_id}

        runner = self._runners[agent_key]
        app_name = self._app_names[agent_key]
        user_label = customer_id or "guest"

        session = await runner.session_service.create_session(
            app_name=app_name,
            user_id=user_label,
        )

        self._sessions[convo_id] = {
            "session_id": session.id,
            "agent": agent_key,
            "user_id": user_label,
        }

        return {"success": True, "conversation_id": convo_id}

    async def respond(
        self,
        agent_name: str,
        message: str,
        context: Dict[str, Any],
        customer_id: Optional[str],
        conversation_id: Optional[str] = None,
        conversation_history: Optional[list[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generate a text response for the selected agent."""

        session_info = await self.ensure_session(
            agent_name=agent_name,
            customer_id=customer_id,
            conversation_id=conversation_id,
        )

        if not session_info.get("success", False):
            return {
                "text": "",
                "success": False,
                "conversation_id": session_info.get("conversation_id"),
                "error": session_info.get("reason"),
                "audio_chunks": [],
            }

        agent_key = self._normalize_agent(agent_name)
        convo_id = session_info["conversation_id"]
        runner = self._runners[agent_key]
        lock = self._locks[agent_key]
        session_meta = self._sessions[convo_id]

        prompt = self._build_prompt(
            agent_key,
            message,
            context,
            conversation_history or [],
        )

        try:
            async with lock:
                response_text = await self._run_agent(
                    runner=runner,
                    user_id=session_meta["user_id"],
                    session_id=session_meta["session_id"],
                    prompt=prompt,
                )
        except Exception as exc:  # pragma: no cover - network/runtime issues
            return {
                "text": "",
                "success": False,
                "conversation_id": convo_id,
                "error": str(exc),
                "audio_chunks": [],
            }

        return {
            "text": response_text.strip(),
            "success": bool(response_text.strip()),
            "conversation_id": convo_id,
            "audio_chunks": [],
        }

    async def _run_agent(
        self,
        runner: InMemoryRunner,
        user_id: str,
        session_id: str,
        prompt: str,
    ) -> str:
        assert genai_types is not None and RunConfig is not None

        content = genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=prompt)],
        )

        final_response: list[str] = []
        async for event in runner.run_async(  # type: ignore[attr-defined]
            user_id=user_id,
            session_id=session_id,
            new_message=content,
            run_config=RunConfig(save_input_blobs_as_artifacts=False),
        ):
            if not event.content or not event.content.parts:
                continue
            if event.author == "user":
                continue
            text = "".join(part.text or "" for part in event.content.parts)
            if text:
                final_response.append(text)

        return "".join(final_response)

    def _build_prompt(
        self,
        agent_name: str,
        message: str,
        context: Dict[str, Any],
        conversation_history: list[Dict[str, Any]],
    ) -> str:
        context_section = self._format_context(context)
        history_section = self._format_history(conversation_history)

        sections = [
            "User message:",
            message.strip(),
        ]

        if history_section:
            sections.insert(0, "Recent conversation:")
            sections.insert(1, history_section)

        if context_section:
            sections.append("Structured financial context:")
            sections.append(context_section)

        sections.append(
            "Respond as the specified agent. Provide actionable guidance and keep "
            "the reply under 200 words."
        )

        return "\n\n".join(sections)

    def _format_context(self, context: Dict[str, Any]) -> str:
        if not context:
            return ""

        cleaned: Dict[str, Any] = {}
        for key, value in context.items():
            if key == "execution_time_ms":
                continue
            cleaned[key] = self._truncate_value(value)

        try:
            serialized = json.dumps(
                cleaned,
                indent=2,
                ensure_ascii=False,
                default=str,
            )
        except (TypeError, ValueError):
            serialized = str(cleaned)

        if len(serialized) > MAX_CONTEXT_CHARS:
            serialized = serialized[: MAX_CONTEXT_CHARS - 3] + "..."

        return serialized

    def _format_history(self, history: list[Dict[str, Any]]) -> str:
        if not history:
            return ""

        recent = history[-4:]
        lines = []
        for turn in recent:
            role = turn.get("role", "user")
            content = turn.get("content", "").strip()
            if not content:
                continue
            agent = turn.get("agent")
            prefix = f"{role}"
            if agent:
                prefix += f" ({agent})"
            lines.append(f"- {prefix}: {content}")

        return "\n".join(lines)

    def _truncate_value(self, value: Any) -> Any:
        if isinstance(value, list):
            truncated = value[:MAX_LIST_ITEMS]
            if len(value) > MAX_LIST_ITEMS:
                truncated.append(f"... (+{len(value) - MAX_LIST_ITEMS} more)")
            return truncated

        if isinstance(value, dict):
            truncated_dict = {}
            for idx, (key, val) in enumerate(value.items()):
                truncated_dict[key] = self._truncate_value(val)
                if idx + 1 >= MAX_LIST_ITEMS:
                    truncated_dict[
                        "_note"
                    ] = f"truncated after {MAX_LIST_ITEMS} keys"
                    break
            return truncated_dict

        if isinstance(value, str) and len(value) > MAX_STRING_CHARS:
            return value[: MAX_STRING_CHARS - 3] + "..."

        return value

    @staticmethod
    def build_context_fallback(
        agent_name: str,
        message: str,
        context: Dict[str, Any],
    ) -> str:
        """Generate a deterministic fallback response using cached context."""

        intro = (
            f"I'm {agent_name.title()}, and I'm here to help! Based on the cached "
            "data available right now, here's what I can see:\n\n"
        )

        bullet_lines = []
        for tool_name, result in context.items():
            if tool_name == "execution_time_ms":
                continue
            if isinstance(result, dict) and "error" not in result:
                bullet_lines.append(f"• {tool_name}: Available")
            elif isinstance(result, list) and result:
                bullet_lines.append(f"• {tool_name}: {len(result)} items")

        if not bullet_lines:
            bullet_lines.append("• No cached data available yet")

        outro = (
            f"\nYour question was: {message}\n"
            "\n(Set ENABLE_ADK_AGENTS=true and provide GEMINI_API_KEY to enable "
            "live ADK responses.)"
        )

        return intro + "\n".join(bullet_lines) + outro


adk_agent_service = ADKAgentService()

__all__ = ["adk_agent_service", "ADKAgentService"]

