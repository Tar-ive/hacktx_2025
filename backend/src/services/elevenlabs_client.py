"""ElevenLabs Conversational AI client.

This module bridges the orchestrator-specific context with ElevenLabs' Conversational
AI SDK. It prefers the official Python SDK (WebSocket based) and gracefully falls
back to a static response if anything fails so the rest of the pipeline keeps
working.
"""

from __future__ import annotations

import asyncio
import base64
import threading
import time
from typing import Any, Dict, Optional

import httpx

from ..config import config

try:  # ElevenLabs SDK is optional in some environments
    from elevenlabs import ElevenLabs
    from elevenlabs.conversational_ai.conversation import (
        AgentChatResponsePartType,
        AudioInterface,
        ClientTools,
        Conversation,
        ConversationInitiationData,
    )
except ImportError:  # pragma: no cover - handled at runtime
    ElevenLabs = None  # type: ignore
    Conversation = None  # type: ignore
    AgentChatResponsePartType = None  # type: ignore
    AudioInterface = object  # type: ignore
    ClientTools = None  # type: ignore
    ConversationInitiationData = None  # type: ignore


class _CollectingAudioInterface(AudioInterface):  # type: ignore[misc]
    """Audio interface that captures ElevenLabs audio frames for playback."""

    def __init__(self, collector, sample_rate: int = 16000, channels: int = 1):
        self._collector = collector
        self._sample_rate = sample_rate
        self._channels = channels
        self._input_callback = None

    def start(self, input_callback):  # type: ignore[override]
        self._input_callback = input_callback

    def stop(self):  # type: ignore[override]
        pass

    def output(self, audio: bytes):  # type: ignore[override]
        if self._collector:
            wav_chunk = self._pcm16_to_wav(audio)
            self._collector(wav_chunk)

    def interrupt(self):  # type: ignore[override]
        pass

    def _pcm16_to_wav(self, pcm_data: bytes) -> bytes:
        if not pcm_data:
            return pcm_data

        import struct

        bits_per_sample = 16
        byte_rate = self._sample_rate * self._channels * (bits_per_sample // 8)
        block_align = self._channels * (bits_per_sample // 8)
        data_size = len(pcm_data)

        header = bytearray(44)
        header[0:4] = b"RIFF"
        header[4:8] = struct.pack('<I', 36 + data_size)
        header[8:12] = b"WAVE"
        header[12:16] = b"fmt "
        header[16:20] = struct.pack('<I', 16)
        header[20:22] = struct.pack('<H', 1)
        header[22:24] = struct.pack('<H', self._channels)
        header[24:28] = struct.pack('<I', self._sample_rate)
        header[28:32] = struct.pack('<I', byte_rate)
        header[32:34] = struct.pack('<H', block_align)
        header[34:36] = struct.pack('<H', bits_per_sample)
        header[36:40] = b"data"
        header[40:44] = struct.pack('<I', data_size)

        return bytes(header) + pcm_data


class ElevenLabsClient:
    """Client for calling ElevenLabs Conversational AI agents."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or config.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1"
        self._sdk_client: Optional[ElevenLabs] = None  # type: ignore[assignment]
        
    async def call_agent(
        self, 
        agent_id: str, 
        message: str,
        context: Dict[str, Any],
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call an ElevenLabs agent with pre-computed context.
        
        Args:
            agent_id: The ElevenLabs agent ID
            message: User's message
            context: Pre-computed context from tools (cached financial data)
            conversation_id: Optional conversation ID for multi-turn
        
        Returns:
            {
                "text": "Agent's text response",
                "audio": "base64 encoded audio (if available)",
                "conversation_id": "conversation ID for follow-ups"
            }
        """
        
        sdk_result: Optional[Dict[str, Any]] = None

        if ElevenLabs and Conversation:
            try:
                sdk_result = await asyncio.to_thread(
                    self._call_agent_via_sdk,
                    agent_id,
                    message,
                    context,
                    conversation_id,
                )
            except Exception as exc:  # pragma: no cover - runtime diagnostics
                print(f"⚠️  ElevenLabs SDK call failed: {exc}")

        if sdk_result and sdk_result.get("success"):
            return sdk_result

        # Fallback to legacy REST call (kept for compatibility although newer
        # accounts may return 404). Any failure still falls through to mocked
        # text so the user receives guidance instead of silence.
        return await self._call_agent_via_rest(agent_id, message, context, conversation_id)

    async def _call_agent_via_rest(
        self,
        agent_id: str,
        message: str,
        context: Dict[str, Any],
        conversation_id: Optional[str],
    ) -> Dict[str, Any]:
        """Legacy REST implementation retained as a fallback path."""

        enhanced_message = self._compose_enhanced_message(message, context)

        url = f"{self.base_url}/convai/conversation"
        headers = {"xi-api-key": self.api_key, "Content-Type": "application/json"}
        payload: Dict[str, Any] = {"agent_id": agent_id, "text": enhanced_message}
        if conversation_id:
            payload["conversation_id"] = conversation_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return {
                    "text": data.get("text", ""),
                    "conversation_id": data.get("conversation_id"),
                    "success": True,
                    "audio_chunks": [],
                }
            except httpx.HTTPStatusError as exc:  # pragma: no cover - network issues
                error_msg = f"ElevenLabs API error: {exc.response.status_code} - {exc.response.text}"
                print(f"⚠️  {error_msg}")
                return {
                    "text": self._generate_fallback_response(message, context),
                    "success": False,
                    "error": error_msg,
                    "audio_chunks": [],
                }
            except Exception as exc:  # pragma: no cover
                error_msg = f"Error calling ElevenLabs: {str(exc)}"
                print(f"⚠️  {error_msg}")
                return {
                    "text": self._generate_fallback_response(message, context),
                    "success": False,
                    "error": error_msg,
                    "audio_chunks": [],
                }

    def _call_agent_via_sdk(
        self,
        agent_id: str,
        message: str,
        context: Dict[str, Any],
        conversation_id: Optional[str],
    ) -> Dict[str, Any]:
        """Blocking helper that uses the ElevenLabs SDK to fetch a text reply."""

        if not self.api_key:
            raise RuntimeError("ElevenLabs API key is not configured")

        client = self._get_sdk_client()
        if not client:
            raise RuntimeError("ElevenLabs SDK client unavailable")

        if not agent_id:
            raise RuntimeError("Agent ID is not configured")

        context_text = self._format_context(context)
        enhanced_message = self._compose_enhanced_message(message, context)
        completion_chunks: list[str] = []
        completion_lock = threading.Lock()
        response_ready = threading.Event()
        message_sent = threading.Event()
        conversation_ref: Dict[str, Any] = {"id": conversation_id}
        last_full_response: list[str] = []
        audio_chunks: list[str] = []

        def _collect_audio_chunk(wav_bytes: bytes) -> None:
            if not wav_bytes:
                return
            encoded = base64.b64encode(wav_bytes).decode("ascii")
            audio_chunks.append(encoded)

        def _on_agent_response(text: str) -> None:
            if not message_sent.is_set():
                return
            with completion_lock:
                clean = (text or "").strip()
                if not clean:
                    return
                last_full_response[:] = [clean]
            response_ready.set()

        def _on_chat_part(text: str, part_type: AgentChatResponsePartType) -> None:  # type: ignore[valid-type]
            if not message_sent.is_set():
                return
            if not text:
                return
            with completion_lock:
                completion_chunks.append(text)
            if part_type == AgentChatResponsePartType.STOP:  # type: ignore[valid-type]
                response_ready.set()

        client_tools = self._build_client_tools(context)

        conversation = Conversation(  # type: ignore[operator]
            client=client,
            agent_id=agent_id,
            requires_auth=False,
            audio_interface=_CollectingAudioInterface(_collect_audio_chunk),
            client_tools=client_tools,
            callback_agent_response=_on_agent_response,
            callback_agent_chat_response_part=_on_chat_part,
            config=ConversationInitiationData(
                user_id=conversation_id,
                conversation_config_override={
                    "conversation": {
                        "first_message": self._compose_enhanced_message(message, context),
                        "interruptible": False,
                    }
                },
            ) if ConversationInitiationData else None,
        )

        conversation.start_session()
        try:
            if context_text:
                self._send_with_retry(conversation.send_contextual_update, context_text)
            self._send_with_retry(conversation.send_user_message, enhanced_message)
            message_sent.set()

            if not response_ready.wait(timeout=20):
                raise TimeoutError("Timed out waiting for ElevenLabs agent response")
        finally:
            try:
                conversation.end_session()
            except Exception:
                pass
            try:
                conversation_ref["id"] = conversation.wait_for_session_end()
            except Exception:
                pass

        with completion_lock:
            final_text = " ".join(chunk.strip() for chunk in completion_chunks if chunk).strip()
            if not final_text and last_full_response:
                final_text = last_full_response[0]

        if not final_text:
            raise RuntimeError("Empty response from ElevenLabs agent")

        return {
            "text": final_text,
            "conversation_id": conversation_ref.get("id"),
            "success": True,
            "audio_chunks": audio_chunks,
        }

    def _send_with_retry(self, sender, payload, attempts: int = 40, delay: float = 0.1) -> None:
        """Retry helper that waits for the WebSocket to finish initialising."""

        last_error: Optional[Exception] = None
        for _ in range(attempts):
            try:
                sender(payload)
                return
            except Exception as exc:  # pragma: no cover - depends on SDK timing
                last_error = exc
                time.sleep(delay)
        raise last_error or RuntimeError("WebSocket not ready")

    def _get_sdk_client(self) -> Optional[ElevenLabs]:  # type: ignore[valid-type]
        if not ElevenLabs:
            return None
        if self._sdk_client is None:
            self._sdk_client = ElevenLabs(api_key=self.api_key)
        return self._sdk_client

    def _build_client_tools(self, context: Dict[str, Any]):
        """Register lightweight client tools that echo precomputed context."""

        if not ClientTools:
            return None

        tools = ClientTools()

        for tool_name, result in context.items():
            if tool_name == "execution_time_ms":
                continue

            def make_handler(value):
                return lambda _params: value

            safe_name = str(tool_name)
            try:
                tools.register(safe_name, make_handler(result))
            except Exception:
                # Ignore duplicate registrations or unsupported tool names.
                pass

        return tools

    def _compose_enhanced_message(self, message: str, context: Dict[str, Any]) -> str:
        """Combine the user prompt with cached context for deterministic answers."""

        context_text = self._format_context(context)
        if not context_text:
            return message
        return (
            f"User Query: {message}\n\n"
            f"Financial Data Context (from cache):\n{context_text}\n\n"
            "Please analyze this data and respond to the user's query in a conversational, helpful manner."
        )
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """
        Format tool results into readable context for agent.
        
        This provides the cached financial data to all agents with actual numbers.
        """
        lines = []
        
        for tool_name, result in context.items():
            if tool_name == "execution_time_ms":
                continue
            
            # Handle errors
            if isinstance(result, dict) and "error" in result:
                lines.append(f"❌ {tool_name}: {result['error']}")
                continue
            
            # Format different result types
            lines.append(f"\n📊 {tool_name}:")
            
            # Special handling for spending by category (show all amounts)
            if tool_name == "get_spending_by_category" and isinstance(result, dict):
                total_spending = sum(v for v in result.values() if isinstance(v, (int, float)))
                lines.append(f"  Total Spending: ${total_spending:.2f}")
                for category, amount in result.items():
                    if isinstance(amount, (int, float)):
                        lines.append(f"  • {category.title()}: ${amount:.2f}")
                continue
            
            # Special handling for account balance
            if tool_name == "get_account_balance" and isinstance(result, dict):
                if "total_balance" in result:
                    lines.append(f"  Total Balance: ${result['total_balance']:.2f}")
                if "accounts" in result:
                    lines.append(f"  Number of Accounts: {len(result['accounts'])}")
                continue
            
            if isinstance(result, list):
                if len(result) == 0:
                    lines.append("  No data available")
                elif len(result) <= 5:
                    # Show all items if small list
                    for i, item in enumerate(result, 1):
                        lines.append(f"  {i}. {self._format_item(item)}")
                else:
                    # Show first 5 items for large lists
                    for i, item in enumerate(result[:5], 1):
                        lines.append(f"  {i}. {self._format_item(item)}")
                    lines.append(f"  ... and {len(result) - 5} more")
            
            elif isinstance(result, dict):
                # Format dict as key-value pairs with numbers
                for key, value in result.items():
                    if isinstance(value, (int, float)):
                        # Format numbers as currency if they look like amounts
                        if key.lower().find('amount') >= 0 or key.lower().find('balance') >= 0 or key.lower().find('total') >= 0:
                            lines.append(f"  • {key}: ${value:.2f}")
                        else:
                            lines.append(f"  • {key}: {value}")
                    elif isinstance(value, (str, bool)):
                        lines.append(f"  • {key}: {value}")
                    elif isinstance(value, list):
                        lines.append(f"  • {key}: {len(value)} items")
                    else:
                        lines.append(f"  • {key}: {type(value).__name__}")
            
            else:
                lines.append(f"  {result}")
        
        return "\n".join(lines)
    
    def _format_item(self, item: Any) -> str:
        """Format a single item for display."""
        if isinstance(item, dict):
            # Extract key fields
            if "description" in item and "amount" in item:
                return f"${item['amount']:.2f} - {item.get('description', 'N/A')}"
            elif "payee" in item and "payment_amount" in item:
                return f"${item['payment_amount']:.2f} to {item['payee']}"
            elif "amount" in item:
                return f"${item['amount']:.2f}"
            else:
                # Generic dict formatting
                keys = list(item.keys())[:3]
                return ", ".join(f"{k}={item[k]}" for k in keys)
        return str(item)
    
    def _generate_fallback_response(self, message: str, context: Dict[str, Any]) -> str:
        """
        Generate a fallback response if ElevenLabs call fails.
        Uses the cached data to still provide useful information.
        """
        response = "I apologize, but I'm having trouble connecting to my conversational AI service. "
        response += "However, based on the cached financial data available:\n\n"
        
        # Extract useful info from context
        if "get_account_balance" in context:
            balance_data = context["get_account_balance"]
            if not isinstance(balance_data, dict) or "error" not in balance_data:
                response += f"💰 Your total balance: ${balance_data.get('total_balance', 0):.2f}\n"
        
        if "get_recent_transactions" in context:
            transactions = context["get_recent_transactions"]
            if isinstance(transactions, list) and len(transactions) > 0:
                response += f"📊 Recent transactions: {len(transactions)} found\n"
        
        if "analyze_spending_patterns" in context:
            patterns = context["analyze_spending_patterns"]
            if isinstance(patterns, dict) and "total_last_30_days" in patterns:
                response += f"💳 Spending last 30 days: ${patterns['total_last_30_days']:.2f}\n"
        
        response += "\nPlease try again in a moment, or contact support if the issue persists."
        
        return response


# Global client instance
elevenlabs_client = ElevenLabsClient()


async def call_agent_with_context(
    agent_name: str,
    message: str, 
    context: Dict[str, Any],
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to call an agent by name.
    
    Args:
        agent_name: Agent name (nebula, atlas, sentinel, nova)
        message: User's message
        context: Pre-computed context from tools
        conversation_id: Optional conversation ID
    
    Returns:
        Agent response with text and metadata
    """
    # Map agent names to IDs from config
    agent_ids = {
        "nebula": config.AGENT_ID_NEBULA,
        "atlas": config.AGENT_ID_ATLAS,
        "sentinel": config.AGENT_ID_SENTINEL,
        "nova": config.AGENT_ID_NOVA,
    }
    
    agent_id = agent_ids.get(agent_name)
    
    if not agent_id:
        return {
            "text": f"Agent '{agent_name}' not configured. Please set {agent_name.upper()}_AGENT_ID in .env",
            "success": False,
            "error": "Agent ID not configured"
        }
    
    return await elevenlabs_client.call_agent(
        agent_id=agent_id,
        message=message,
        context=context,
        conversation_id=conversation_id
    )
