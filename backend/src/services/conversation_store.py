"""
Persistent conversation storage backed by JSON files.

This helper centralizes session creation, message persistence, and webhook event
logging so the mobile client can retrieve a full conversation summary.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import config


class ConversationStore:
    """Lightweight JSON-backed persistence for conversation sessions."""

    def __init__(self, base_dir: str):
        self.base_path = Path(base_dir)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self._locks: Dict[str, asyncio.Lock] = {}
        self._locks_lock = asyncio.Lock()

    async def initialize_session(
        self,
        session_id: str,
        customer_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new session file if it does not already exist."""
        path = self._session_path(session_id)
        metadata = metadata or {}

        lock = await self._lock_for(session_id)
        async with lock:
            if path.exists():
                return await self._read_json(path)

            session = {
                "session_id": session_id,
                "customer_id": customer_id,
                "created_at": self._now_iso(),
                "updated_at": self._now_iso(),
                "metadata": metadata,
                "messages": [],
                "events": [],
                "context_snapshots": [],
                "summary_bundle": None,
            }
            await self._write_json(path, session)
            return session

    async def append_message(
        self,
        session_id: str,
        role: str,
        content: str,
        agent: Optional[str] = None,
        extras: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Persist a conversation message."""
        path = self._session_path(session_id)
        extras = extras or {}

        lock = await self._lock_for(session_id)
        async with lock:
            session = await self._read_json(path)
            if session is None:
                raise ValueError(f"Session '{session_id}' not initialized")

            entry = {
                "role": role,
                "content": content,
                "agent": agent,
                "timestamp": self._now_iso(),
                **extras,
            }
            session["messages"].append(entry)
            session["updated_at"] = self._now_iso()
            await self._write_json(path, session)
            return entry

    async def append_event(
        self,
        session_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Persist an ElevenLabs webhook or orchestrator event."""
        path = self._session_path(session_id)

        lock = await self._lock_for(session_id)
        async with lock:
            session = await self._read_json(path)
            if session is None:
                raise ValueError(f"Session '{session_id}' not initialized")

            entry = {
                "event": event_type,
                "payload": payload,
                "timestamp": self._now_iso(),
            }
            session["events"].append(entry)
            session["updated_at"] = self._now_iso()
            await self._write_json(path, session)
            return entry

    async def set_summary_bundle(
        self,
        session_id: str,
        summary_bundle: Dict[str, Any],
    ) -> None:
        """Persist the latest structured summary bundle for a session."""
        path = self._session_path(session_id)

        lock = await self._lock_for(session_id)
        async with lock:
            session = await self._read_json(path)
            if session is None:
                raise ValueError(f"Session '{session_id}' not initialized")

            session["summary_bundle"] = summary_bundle
            session["updated_at"] = self._now_iso()
            await self._write_json(path, session)

    async def add_context_snapshot(
        self,
        session_id: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Store a snapshot of the tool context used for an agent response."""
        path = self._session_path(session_id)

        lock = await self._lock_for(session_id)
        async with lock:
            session = await self._read_json(path)
            if session is None:
                raise ValueError(f"Session '{session_id}' not initialized")

            snapshot = {
                "context": context,
                "timestamp": self._now_iso(),
            }
            session["context_snapshots"].append(snapshot)
            session["updated_at"] = self._now_iso()
            await self._write_json(path, session)
            return snapshot

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Return the full session payload."""
        path = self._session_path(session_id)
        return await self._read_json(path)

    async def get_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Produce a summary tailored for the UI."""
        session = await self.get_session(session_id)
        if not session:
            return None

        messages = session.get("messages", [])
        user_messages: List[Dict[str, Any]] = [
            msg for msg in messages if msg.get("role") == "user"
        ]
        agent_messages: List[Dict[str, Any]] = [
            msg for msg in messages if msg.get("role") == "assistant"
        ]

        summary = {
            "session_id": session["session_id"],
            "customer_id": session["customer_id"],
            "created_at": self._parse_iso(session["created_at"]),
            "updated_at": self._parse_iso(session["updated_at"]),
            "turns": len(agent_messages),
            "user_messages": user_messages,
            "agent_messages": agent_messages,
            "events": session.get("events", []),
            "context_snapshots": session.get("context_snapshots", []),
            "metadata": session.get("metadata", {}),
            "summary_bundle": session.get("summary_bundle"),
        }

        return summary

    async def list_sessions(self) -> List[str]:
        """Return session IDs currently stored on disk."""
        return [
            path.stem
            for path in self.base_path.glob("*.json")
            if path.is_file()
        ]

    def _session_path(self, session_id: str) -> Path:
        return self.base_path / f"{session_id}.json"

    async def _lock_for(self, session_id: str) -> asyncio.Lock:
        """Return a lock scoped to a specific session file."""
        async with self._locks_lock:
            if session_id not in self._locks:
                self._locks[session_id] = asyncio.Lock()
            return self._locks[session_id]

    async def _read_json(self, path: Path) -> Optional[Dict[str, Any]]:
        def _read() -> Optional[Dict[str, Any]]:
            if not path.exists():
                return None
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)

        return await asyncio.to_thread(_read)

    async def _write_json(self, path: Path, payload: Dict[str, Any]) -> None:
        def _write() -> None:
            with path.open("w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)

        await asyncio.to_thread(_write)

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _parse_iso(value: str) -> datetime:
        return datetime.fromisoformat(value)


# Global store instance
conversation_store = ConversationStore(config.CONVERSATION_DATA_DIR)
