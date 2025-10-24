"""WebSocket handler for real-time audio streaming and conversation management."""

import asyncio
import base64
import json
import time
from typing import Dict, Any, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
from ..services.adk_agent_service import adk_agent_service
from ..services.speech_to_text import speech_to_text_service
from ..services.conversation_store import conversation_store
from ..services.audio_processor import AudioAnalyzer, AudioBuffer
from ..orchestrator.tool_executor import ToolExecutor
from ..orchestrator.llm_orchestrator import llm_orchestrator
from ..tools.nessie import TOOLS_REGISTRY
from ..config import config


class WebSocketConnectionManager:
    """Manages active WebSocket connections and conversation state."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.conversation_sessions: Dict[str, Dict] = {}
        self.audio_buffers: Dict[str, AudioBuffer] = {}
        self.audio_analyzers: Dict[str, AudioAnalyzer] = {}

    def _parse_wav_header(self, audio_data: bytes) -> Optional[Dict[str, int]]:
        """Extract audio format metadata from WAV header if present."""
        if len(audio_data) < 44:
            return None
        if audio_data[:4] != b"RIFF" or audio_data[8:12] != b"WAVE":
            return None

        # Default PCM header size is 44 bytes but handle additional chunks
        idx = 12
        data_offset = 44
        while idx + 8 <= len(audio_data):
            chunk_id = audio_data[idx:idx + 4]
            chunk_size = int.from_bytes(audio_data[idx + 4:idx + 8], "little")
            next_idx = idx + 8 + chunk_size
            if chunk_id == b"data":
                data_offset = idx + 8
                break
            idx = next_idx

        sample_rate = int.from_bytes(audio_data[24:28], "little")
        bits_per_sample = int.from_bytes(audio_data[34:36], "little")
        channels = int.from_bytes(audio_data[22:24], "little")

        return {
            "sample_rate": sample_rate,
            "bits_per_sample": bits_per_sample,
            "channels": channels,
            "data_offset": data_offset,
        }

    def _ensure_analyzer_format(self, customer_id: str, format_info: Dict[str, int]):
        """Ensure analyzer/buffer use the provided audio format."""
        analyzer = self.audio_analyzers.get(customer_id)
        sample_width_bytes = max(1, format_info["bits_per_sample"] // 8)
        channels = max(1, format_info["channels"])
        sample_rate = max(8000, format_info["sample_rate"])

        if analyzer:
            analyzer.sample_rate = sample_rate
            analyzer.sample_width = sample_width_bytes
            analyzer.channels = channels
            analyzer.reset()
            self.audio_buffers[customer_id].analyzer = analyzer
        else:
            analyzer = AudioAnalyzer(
                sample_rate=sample_rate,
                sample_width=sample_width_bytes,
                channels=channels,
                silence_threshold=500.0,
                silence_duration=1.0,
            )
            self.audio_analyzers[customer_id] = analyzer
            self.audio_buffers[customer_id] = AudioBuffer(analyzer)

    def _build_wav_from_pcm(self, customer_id: str, pcm_data: bytes) -> bytes:
        """Construct a valid WAV payload from raw PCM bytes for STT ingestion."""
        if not pcm_data:
            return b""

        session = self.conversation_sessions.get(customer_id)
        analyzer = self.audio_analyzers.get(customer_id)

        format_info = session.get("audio_format") if session else None
        if not format_info and analyzer:
            format_info = {
                "sample_rate": analyzer.sample_rate,
                "bits_per_sample": analyzer.sample_width * 8,
                "channels": analyzer.channels,
            }
        if not format_info:
            format_info = {"sample_rate": 16000, "bits_per_sample": 16, "channels": 1}

        sample_rate = max(8000, format_info.get("sample_rate", 16000))
        channels = max(1, format_info.get("channels", 1))
        bits_per_sample = max(8, format_info.get("bits_per_sample", 16))
        bytes_per_sample = bits_per_sample // 8
        byte_rate = sample_rate * channels * bytes_per_sample
        block_align = channels * bytes_per_sample
        data_size = len(pcm_data)

        header = bytearray(44)
        header[0:4] = b"RIFF"
        header[4:8] = (36 + data_size).to_bytes(4, "little")
        header[8:12] = b"WAVE"
        header[12:16] = b"fmt "
        header[16:20] = (16).to_bytes(4, "little")
        header[20:22] = (1).to_bytes(2, "little")
        header[22:24] = channels.to_bytes(2, "little")
        header[24:28] = sample_rate.to_bytes(4, "little")
        header[28:32] = byte_rate.to_bytes(4, "little")
        header[32:34] = block_align.to_bytes(2, "little")
        header[34:36] = bits_per_sample.to_bytes(2, "little")
        header[36:40] = b"data"
        header[40:44] = data_size.to_bytes(4, "little")

        return bytes(header) + pcm_data

    async def connect(self, websocket: WebSocket, customer_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[customer_id] = websocket

        # Initialize audio analyzer and buffer for silence detection
        analyzer = AudioAnalyzer(
            sample_rate=16000,
            sample_width=2,  # 16-bit
            channels=1,  # mono
            silence_threshold=500.0,  # RMS threshold
            silence_duration=1.0  # 1 second of silence
        )
        self.audio_analyzers[customer_id] = analyzer
        self.audio_buffers[customer_id] = AudioBuffer(analyzer)

        # Generate unique session ID
        session_id = f"session_{customer_id}_{int(time.time())}"
        
        # Initialize conversation session in memory
        self.conversation_sessions[customer_id] = {
            "session_id": session_id,
            "conversation_history": [],
            "current_agent": None,
            "last_activity": time.time(),
            "context_cache": {},
            "agent_conversation_id": None,
        }
        
        # Persist session to conversation store
        await conversation_store.initialize_session(
            session_id=session_id,
            customer_id=customer_id,
            metadata={"connection_type": "websocket", "user_agent": "mobile_app"}
        )

        print(f"✅ WebSocket connected for customer: {customer_id}, session: {session_id}")

    def disconnect(self, customer_id: str):
        """Handle WebSocket disconnection."""
        if customer_id in self.active_connections:
            del self.active_connections[customer_id]
        if customer_id in self.audio_buffers:
            del self.audio_buffers[customer_id]
        if customer_id in self.audio_analyzers:
            del self.audio_analyzers[customer_id]
        if customer_id in self.conversation_sessions:
            del self.conversation_sessions[customer_id]
        print(f"❌ WebSocket disconnected for customer: {customer_id}")

    def get_session(self, customer_id: str) -> Optional[Dict]:
        """Get conversation session for customer."""
        return self.conversation_sessions.get(customer_id)

    def add_audio_chunk(self, customer_id: str, audio_data: bytes) -> tuple:
        """Add audio chunk to buffer and check for speech completion.

        Returns:
            Tuple of (should_process, audio_segments)
        """
        if customer_id not in self.audio_buffers:
            return False, []

        session = self.conversation_sessions.get(customer_id)
        if not session:
            return False, []

        header_info = self._parse_wav_header(audio_data)
        pcm_payload = audio_data

        if header_info:
            data_offset = header_info.pop("data_offset", 44)
            pcm_payload = audio_data[data_offset:]
            session["audio_format"] = {
                "sample_rate": header_info["sample_rate"],
                "bits_per_sample": header_info["bits_per_sample"],
                "channels": header_info["channels"],
            }
            self._ensure_analyzer_format(customer_id, session["audio_format"])
        else:
            if "audio_format" not in session:
                analyzer = self.audio_analyzers.get(customer_id)
                if analyzer:
                    session["audio_format"] = {
                        "sample_rate": analyzer.sample_rate,
                        "bits_per_sample": analyzer.sample_width * 8,
                        "channels": analyzer.channels,
                    }

        if not pcm_payload:
            return False, []

        audio_buffer = self.audio_buffers[customer_id]
        return audio_buffer.add_chunk(pcm_payload)

    def get_audio_buffer(self, customer_id: str) -> bytes:
        """Get combined audio buffer."""
        if customer_id in self.audio_buffers:
            pcm_data = self.audio_buffers[customer_id].get_combined_audio()
            return self._build_wav_from_pcm(customer_id, pcm_data)
        return b''

    def clear_audio_buffer(self, customer_id: str):
        """Clear audio buffer for customer."""
        if customer_id in self.audio_buffers:
            self.audio_buffers[customer_id].clear()

    async def send_to_client(self, customer_id: str, message: Dict[str, Any]):
        """Send message to specific client."""
        if customer_id in self.active_connections:
            websocket = self.active_connections[customer_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to {customer_id}: {e}")
                # Remove dead connection
                await self.disconnect(customer_id)

    async def send_audio_to_client(self, customer_id: str, audio_data: bytes):
        """Send audio data to client."""
        if customer_id in self.active_connections:
            websocket = self.active_connections[customer_id]
            try:
                await websocket.send_bytes(audio_data)
            except Exception as e:
                logger.error(f"Failed to send audio to {customer_id}: {e}")
                # Remove dead connection
                await self.disconnect(customer_id)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients."""
        for websocket in self.active_connections.values():
            await websocket.send_text(json.dumps(message))

    def build_wav_from_segments(self, customer_id: str, segments: List[bytes]) -> bytes:
        """Convert stored PCM segments into a single WAV payload."""
        pcm_data = b"".join(segments)
        return self._build_wav_from_pcm(customer_id, pcm_data)


# Global manager instance
connection_manager = WebSocketConnectionManager()


class AudioStreamProcessor:
    """Processes incoming audio streams and handles conversation flow."""

    def __init__(self):
        self.silence_threshold = 1.0  # seconds of silence to consider speech ended
        self.min_audio_length = 0.5   # minimum audio length to process

    def _setup_stt_service(self):
        """Setup speech-to-text service. Use configured service."""
        if speech_to_text_service:
            return speech_to_text_service
        return MockSTTService()

    def validate_wav(self, audio_data: bytes) -> bool:
        """Validate if audio data is a proper WAV file."""
        if len(audio_data) < 44:
            print("⚠️ Audio too short to be valid WAV")
            return False
        if audio_data[:4] != b'RIFF' or audio_data[8:12] != b'WAVE':
            print(f"⚠️ Invalid WAV header: {audio_data[:12]}")
            return False
        return True

    async def process_audio_stream(self, customer_id: str, audio_chunks: List[bytes]) -> Dict[str, Any]:
        """Process audio chunks and return transcribed text with metadata."""
        if not audio_chunks:
            return {"text": "", "confidence": 0.0, "error": "No audio data"}

        # Combine audio chunks
        combined_audio = b''.join(audio_chunks)
        print(f"🔊 Processing audio: {len(combined_audio)} bytes")

        # Validate WAV format
        if not self.validate_wav(combined_audio):
            return {"text": "", "confidence": 0.0, "error": "Invalid WAV format"}

        # Check if audio is long enough to process
        if len(combined_audio) < 8000:  # ~0.5 second at 16kHz
            return {"text": "", "confidence": 0.0, "error": "Audio too short"}

        # Get conversation session for context
        session = connection_manager.get_session(customer_id)
        context = {
            "conversation_history": session["conversation_history"] if session else []
        }

        # Transcribe audio with timeout
        try:
            async with asyncio.timeout(10):  # 10s timeout
                if speech_to_text_service:
                    # Use real STT service
                    start_time = time.time()
                    result = await speech_to_text_service.transcribe_stream_chunk(combined_audio, context)
                    print(f"✓ STT completed in {time.time() - start_time:.2f}s")
                    return result
                else:
                    # Fallback to mock service
                    mock_service = self._setup_stt_service()
                    start_time = time.time()
                    transcription = await mock_service.transcribe(combined_audio)
                    print(f"✓ Mock STT completed in {time.time() - start_time:.2f}s")
                    return {
                        "text": transcription or "",
                        "confidence": 0.8 if transcription else 0.0,
                        "service": "mock",
                        "detected_intent": "general_question"
                    }
        except asyncio.TimeoutError:
            print("⚠️ STT timeout after 10s")
            return {"text": "", "confidence": 0.0, "error": "Speech-to-text timeout"}
        except Exception as e:
            print(f"⚠️ STT error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "error": f"STT failed: {str(e)}",
                "service": "error"
            }

    async def process_conversation_turn(self, customer_id: str, transcription_result: Dict[str, Any]) -> Dict[str, Any]:
        """Process a complete conversation turn."""
        start_time = time.time()
        transcribed_text = transcription_result.get("text", "").strip()
        if not transcribed_text:
            return {
                "error": "No transcribed text available",
                "transcription_result": transcription_result
            }

        # Get conversation session
        session = connection_manager.get_session(customer_id)
        if not session:
            raise ValueError(f"No session found for customer: {customer_id}")

        # Update session
        session["last_activity"] = time.time()
        session["conversation_history"].append({
            "role": "user",
            "content": transcribed_text,
            "timestamp": time.time()
        })
        
        # Persist user message to conversation store
        await conversation_store.append_message(
            session_id=session["session_id"],
            role="user",
            content=transcribed_text,
            extras={"transcription_metadata": transcription_result}
        )

        # Step 1: Route to agent using LLM orchestrator
        try:
            async with asyncio.timeout(15):  # 15s timeout for routing
                routing = await llm_orchestrator.route(
                    user_message=transcribed_text,
                    conversation_history=session["conversation_history"]
                )
        except asyncio.TimeoutError:
            print("⚠️ LLM routing timeout after 15s")
            return {"error": "Routing timeout", "transcription_result": transcription_result}
        
        selected_agent = routing["agent"]
        session["current_agent"] = selected_agent

        # Step 2: Execute tools
        tool_calls = llm_orchestrator.tools_to_calls(routing["tools"], customer_id)
        tool_executor = ToolExecutor(TOOLS_REGISTRY)
        try:
            async with asyncio.timeout(10):  # 10s timeout for tool execution
                context = await tool_executor.execute_parallel(tool_calls)
        except asyncio.TimeoutError:
            print("⚠️ Tool execution timeout after 10s")
            return {"error": "Tool execution timeout", "transcription_result": transcription_result}
        
        # Store context snapshot
        await conversation_store.add_context_snapshot(
            session_id=session["session_id"],
            context=context
        )

        # Step 3: Call agent
        response_text = ""
        success = False
        audio_chunks: List[str] = []
        try:
            async with asyncio.timeout(15):  # 15s timeout for agent call
                convo_id = session.get("agent_conversation_id")
                agent_response = await adk_agent_service.respond(
                    agent_name=selected_agent,
                    message=transcribed_text,
                    context=context,
                    customer_id=customer_id,
                    conversation_id=convo_id,
                    conversation_history=session["conversation_history"],
                )
                using_real_agent = agent_response.get("success", False)
                if using_real_agent:
                    response_text = agent_response.get("text", "")
                    success = True
                    audio_chunks = agent_response.get("audio_chunks", []) or []
                else:
                    response_text = adk_agent_service.build_context_fallback(
                        agent_name=selected_agent,
                        message=transcribed_text,
                        context=context,
                    )
                    error_hint = agent_response.get("error") or adk_agent_service.disabled_reason
                    if error_hint:
                        response_text += f"\n\n(Note: {error_hint})"
                    success = False
                returned_convo_id = agent_response.get("conversation_id")
                if returned_convo_id:
                    session["agent_conversation_id"] = returned_convo_id
        except asyncio.TimeoutError:
            print("⚠️ Agent call timeout after 15s")
            return {"error": "Agent response timeout", "transcription_result": transcription_result}

        # Update session with response
        session["conversation_history"].append({
            "role": "assistant",
            "content": response_text,
            "agent": selected_agent,
            "timestamp": time.time()
        })
        
        # Persist agent response to conversation store
        await conversation_store.append_message(
            session_id=session["session_id"],
            role="assistant",
            content=response_text,
            agent=selected_agent,
            extras={
                "routing_reasoning": routing["reasoning"],
                "using_real_agent": agent_response.get("success", False)
            }
        )

        print(f"✓ Conversation turn completed in {time.time() - start_time:.2f}s")
        return {
            "transcribed_text": transcribed_text,
            "selected_agent": selected_agent,
            "routing_reasoning": routing["reasoning"],
            "response_text": response_text,
            "session_id": session["session_id"],
            "context_summary": {
                "tools_called": [k for k in context.keys() if k != "execution_time_ms"],
                "execution_time_ms": context.get("execution_time_ms", 0),
                "using_real_agent": agent_response.get("success", False)
            },
            "success": success,
            "transcription_metadata": {
                "confidence": transcription_result.get("confidence", 0.0),
                "service": transcription_result.get("service", "unknown"),
                "detected_intent": transcription_result.get("detected_intent", "general_question")
            },
            "audio_chunks": audio_chunks,
        }


class MockSTTService:
    """Mock speech-to-text service for testing.
    Replace with Gemini STT or other real service."""

    async def transcribe(self, audio_data: bytes) -> str:
        """Mock transcription - returns a test message."""
        await asyncio.sleep(0.1)  # Simulate processing time
        mock_responses = [
            "How much did I spend on groceries last month?",
            "What's my account balance?",
            "I think there's a suspicious charge on my card",
            "How much should I invest for retirement?",
            "Show me my recent transactions"
        ]
        import random
        return random.choice(mock_responses)

    async def stream_transcribe(self, audio_stream) -> str:
        """Mock streaming transcription."""
        return await self.transcribe(b''.join(audio_stream))


# Global processor instance
audio_processor = AudioStreamProcessor()


async def handle_websocket_audio_stream(websocket: WebSocket, customer_id: str):
    """Handle WebSocket audio streaming for voice conversations."""

    await connection_manager.connect(websocket, customer_id)
    session = connection_manager.get_session(customer_id)

    try:
        # Send initial connection acknowledgment
        await connection_manager.send_to_client(customer_id, {
            "type": "connection_established",
            "session_id": session["session_id"],
            "message": "Ready for audio streaming"
        })

        async def send_agent_audio_chunks(result_payload: Dict[str, Any]) -> None:
            chunks = result_payload.get("audio_chunks") or []
            if not chunks:
                return
            for chunk in chunks:
                if not chunk:
                    continue
                await connection_manager.send_to_client(customer_id, {
                    "type": "agent_audio_chunk",
                    "payload": chunk,
                    "agent": result_payload.get("selected_agent"),
                    "session_id": result_payload.get("session_id")
                })

        # Main audio processing loop with amplitude-based silence detection
        while True:
            try:
                # Receive message (could be text or binary audio)
                async with asyncio.timeout(30):  # 30s timeout for receiving messages
                    message = await websocket.receive()

                message_type = message.get("type")
                print(f"📨 Raw WebSocket frame from {customer_id}: {message_type}")

                if message_type == "websocket.disconnect":
                    break

                async def process_audio_chunk_bytes(audio_bytes: bytes):
                    should_process, audio_segments = connection_manager.add_audio_chunk(
                        customer_id, audio_bytes
                    )

                    print(
                        f"📥 Buffered audio chunk ({len(audio_bytes)} bytes) -> should_process={should_process}, segments={len(audio_segments)}"
                    )

                    if should_process and audio_segments:
                        wav_payload = connection_manager.build_wav_from_segments(
                            customer_id, audio_segments
                        )
                        print(
                            f"🔊 Processing audio segment ({len(wav_payload)} bytes) after silence detected"
                        )

                        transcription_result = await audio_processor.process_audio_stream(
                            customer_id, [wav_payload]
                        )

                        if transcription_result and transcription_result.get("text"):
                            await connection_manager.send_to_client(customer_id, {
                                "type": "transcription_result",
                                "text": transcription_result.get("text", ""),
                                "confidence": transcription_result.get("confidence", 0.0),
                                "service": transcription_result.get("service", "unknown"),
                                "detected_intent": transcription_result.get("detected_intent", "general_question")
                            })

                            result = await audio_processor.process_conversation_turn(
                                customer_id, transcription_result
                            )

                            result_payload = {
                                key: value
                                for key, value in result.items()
                                if key != "audio_chunks"
                            }

                            await connection_manager.send_to_client(customer_id, {
                                "type": "conversation_turn_complete",
                                **result_payload
                            })
                            await send_agent_audio_chunks(result)

                            await connection_manager.send_to_client(customer_id, {
                                "type": "listening_started",
                                "message": "I'm listening for your next question..."
                            })

                if message_type in {"websocket.receive", "websocket.receive_text"} and message.get("text") is not None:
                    # Handle text messages (JSON commands)
                    data = json.loads(message["text"])
                    print(f"📝 Received text message: {data.get('type')} from {customer_id}")

                    if data.get("type") == "start_conversation":
                        # Clear any existing buffer
                        connection_manager.clear_audio_buffer(customer_id)
                        await connection_manager.send_to_client(customer_id, {
                            "type": "listening_started",
                            "message": "Listening... Speak now"
                        })

                    elif data.get("type") == "stop_conversation":
                        # Process any remaining audio when stop is triggered
                        combined_audio = connection_manager.get_audio_buffer(customer_id)
                        print(f"🛑 Stop conversation - processing buffer ({len(combined_audio)} bytes)")

                        if combined_audio and len(combined_audio) > 8000:
                            print(f"🔊 Processing final audio segment...")
                            transcription_result = await audio_processor.process_audio_stream(
                                customer_id, [combined_audio]
                            )

                            if transcription_result and transcription_result.get("text"):
                                print(f"✓ Transcription: {transcription_result.get('text')}")
                                await connection_manager.send_to_client(customer_id, {
                                    "type": "transcription_result",
                                    "text": transcription_result.get("text", ""),
                                    "confidence": transcription_result.get("confidence", 0.0),
                                    "service": transcription_result.get("service", "unknown"),
                                    "detected_intent": transcription_result.get("detected_intent", "general_question")
                                })

                                result = await audio_processor.process_conversation_turn(
                                    customer_id, transcription_result
                                )

                                result_payload = {
                                    key: value
                                    for key, value in result.items()
                                    if key != "audio_chunks"
                                }

                                await connection_manager.send_to_client(customer_id, {
                                    "type": "conversation_turn_complete",
                                    **result_payload
                                })
                                await send_agent_audio_chunks(result)
                            else:
                                print(f"⚠️ No transcription result")
                                await connection_manager.send_to_client(customer_id, {
                                    "type": "error",
                                    "message": "Could not transcribe audio. Please try again."
                                })
                        else:
                            print(f"⚠️ Audio buffer too small: {len(combined_audio)} bytes")
                            await connection_manager.send_to_client(customer_id, {
                                "type": "error",
                                "message": "Audio too short to process."
                            })

                        connection_manager.clear_audio_buffer(customer_id)

                    elif data.get("type") == "text_message":
                        # Process text message directly
                        result = await audio_processor.process_conversation_turn(
                            customer_id, {"text": data["message"], "confidence": 1.0}
                        )
                        result_payload = {
                            key: value
                            for key, value in result.items()
                            if key != "audio_chunks"
                        }
                        await connection_manager.send_to_client(customer_id, {
                            "type": "conversation_turn_complete",
                            **result_payload
                        })
                        await send_agent_audio_chunks(result)

                    elif data.get("type") == "audio_chunk_base64":
                        payload = data.get("payload") or data.get("data")
                        if not payload:
                            continue
                        try:
                            audio_bytes = base64.b64decode(payload)
                            print(f"📦 Decoded base64 audio chunk ({len(audio_bytes)} bytes)")
                        except Exception as exc:
                            print(f"⚠️ Failed to decode base64 audio chunk: {exc}")
                            continue
                        await process_audio_chunk_bytes(audio_bytes)

                elif message_type in {"websocket.receive", "websocket.receive_bytes"} and message.get("bytes") is not None:
                    # Handle binary audio data with amplitude-based silence detection
                    audio_data = message["bytes"]
                    print(f"🔊 Received audio chunk: {len(audio_data)} bytes")
                    if len(audio_data) >= 4:
                        print(f"   First 4 bytes: {audio_data[:4]} (Expected: b'RIFF' for WAV)")

                    await process_audio_chunk_bytes(audio_data)

            except asyncio.TimeoutError:
                print(f"⚠️ WebSocket receive timeout for customer: {customer_id}")
                await connection_manager.send_to_client(customer_id, {
                    "type": "error",
                    "message": "No data received for 30 seconds. Please try again."
                })
                break
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"⚠️ WebSocket error: {e}")
                await connection_manager.send_to_client(customer_id, {
                    "type": "error",
                    "message": f"Processing error: {str(e)}"
                })

    finally:
        connection_manager.disconnect(customer_id)
