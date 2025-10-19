"""WebSocket handler for real-time audio streaming and conversation management."""

import asyncio
import json
import base64
import time
from typing import Dict, Any, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
from ..services.elevenlabs_client import call_agent_with_context
from ..services.speech_to_text import speech_to_text_service
from ..orchestrator.tool_executor import ToolExecutor, determine_tools_for_agent
from ..orchestrator.router import route_to_agent
from ..tools.nessie import TOOLS_REGISTRY
from ..config import config


class WebSocketConnectionManager:
    """Manages active WebSocket connections and conversation state."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.conversation_sessions: Dict[str, Dict] = {}
        self.audio_buffers: Dict[str, List[bytes]] = {}

    async def connect(self, websocket: WebSocket, customer_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[customer_id] = websocket
        self.audio_buffers[customer_id] = []

        # Initialize conversation session
        self.conversation_sessions[customer_id] = {
            "session_id": f"session_{int(time.time())}",
            "conversation_history": [],
            "current_agent": None,
            "last_activity": time.time(),
            "context_cache": {}
        }

        print(f"✅ WebSocket connected for customer: {customer_id}")

    def disconnect(self, customer_id: str):
        """Handle WebSocket disconnection."""
        if customer_id in self.active_connections:
            del self.active_connections[customer_id]
        if customer_id in self.audio_buffers:
            del self.audio_buffers[customer_id]
        if customer_id in self.conversation_sessions:
            del self.conversation_sessions[customer_id]
        print(f"❌ WebSocket disconnected for customer: {customer_id}")

    def get_session(self, customer_id: str) -> Optional[Dict]:
        """Get conversation session for customer."""
        return self.conversation_sessions.get(customer_id)

    def add_audio_chunk(self, customer_id: str, audio_data: bytes):
        """Add audio chunk to buffer for streaming STT."""
        if customer_id in self.audio_buffers:
            self.audio_buffers[customer_id].append(audio_data)

    def get_audio_buffer(self, customer_id: str) -> List[bytes]:
        """Get and clear audio buffer for processing."""
        if customer_id in self.audio_buffers:
            buffer = self.audio_buffers[customer_id]
            self.audio_buffers[customer_id] = []
            return buffer
        return []

    async def send_to_client(self, customer_id: str, message: Dict[str, Any]):
        """Send message to specific client."""
        if customer_id in self.active_connections:
            websocket = self.active_connections[customer_id]
            await websocket.send_text(json.dumps(message))

    async def send_audio_to_client(self, customer_id: str, audio_data: bytes):
        """Send audio data to client."""
        if customer_id in self.active_connections:
            websocket = self.active_connections[customer_id]
            await websocket.send_bytes(audio_data)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients."""
        for websocket in self.active_connections.values():
            await websocket.send_text(json.dumps(message))


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

    async def process_audio_stream(self, customer_id: str, audio_chunks: List[bytes]) -> Dict[str, Any]:
        """Process audio chunks and return transcribed text with metadata."""
        if not audio_chunks:
            return {"text": "", "confidence": 0.0, "error": "No audio data"}

        # Combine audio chunks
        combined_audio = b''.join(audio_chunks)

        # Check if audio is long enough to process
        if len(combined_audio) < 16000:  # ~0.5 second at 16kHz
            return {"text": "", "confidence": 0.0, "error": "Audio too short"}

        # Get conversation session for context
        session = connection_manager.get_session(customer_id)
        context = {
            "conversation_history": session["conversation_history"] if session else []
        }

        # Transcribe audio using configured service
        try:
            if speech_to_text_service:
                # Use real STT service
                result = await speech_to_text_service.transcribe_stream_chunk(combined_audio, context)
                return result
            else:
                # Fallback to mock service
                mock_service = self._setup_stt_service()
                transcription = await mock_service.transcribe(combined_audio)
                return {
                    "text": transcription or "",
                    "confidence": 0.8 if transcription else 0.0,
                    "service": "mock",
                    "detected_intent": "general_question"
                }
        except Exception as e:
            print(f"⚠️ STT error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "error": str(e),
                "service": "error"
            }

    async def process_conversation_turn(self, customer_id: str, transcription_result: Dict[str, Any]) -> Dict[str, Any]:
        """Process a complete conversation turn."""

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

        # Step 1: Route to agent
        routing = route_to_agent(transcribed_text)
        selected_agent = routing["agent"]
        session["current_agent"] = selected_agent

        # Step 2: Execute tools in parallel
        tool_calls = determine_tools_for_agent(selected_agent, customer_id)
        tool_executor = ToolExecutor(TOOLS_REGISTRY)
        context = await tool_executor.execute_parallel(tool_calls)

        # Step 3: Call agent
        if config.has_elevenlabs_agents():
            agent_response = await call_agent_with_context(
                agent_name=selected_agent,
                message=transcribed_text,
                context=context,
                conversation_id=session["session_id"]
            )
            response_text = agent_response.get("text", "")
            success = agent_response.get("success", True)
        else:
            response_text = f"I'm {selected_agent.title()}, and I'd be happy to help with that! "
            response_text += f"Based on the cached data I can see, here's my response to: '{transcribed_text}'"
            success = False

        # Update session with response
        session["conversation_history"].append({
            "role": "assistant",
            "content": response_text,
            "agent": selected_agent,
            "timestamp": time.time()
        })

        return {
            "transcribed_text": transcribed_text,
            "selected_agent": selected_agent,
            "routing_reasoning": routing["reasoning"],
            "response_text": response_text,
            "session_id": session["session_id"],
            "context_summary": {
                "tools_called": [k for k in context.keys() if k != "execution_time_ms"],
                "execution_time_ms": context.get("execution_time_ms", 0),
                "using_real_agent": config.has_elevenlabs_agents()
            },
            "success": success,
            "transcription_metadata": {
                "confidence": transcription_result.get("confidence", 0.0),
                "service": transcription_result.get("service", "unknown"),
                "detected_intent": transcription_result.get("detected_intent", "general_question")
            }
        }


class MockSTTService:
    """Mock speech-to-text service for testing.
    Replace with Gemini STT or other real service."""

    async def transcribe(self, audio_data: bytes) -> str:
        """Mock transcription - returns a test message."""
        # In real implementation, this would call Gemini STT API
        await asyncio.sleep(0.1)  # Simulate processing time

        # For demo, return a test message
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

        # Main audio processing loop
        audio_buffer = []
        last_audio_time = time.time()

        while True:
            try:
                # Receive message (could be text or binary audio)
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    break

                elif message["type"] == "websocket.receive_text":
                    # Handle text messages (JSON commands)
                    data = json.loads(message["text"])

                    if data.get("type") == "start_conversation":
                        await connection_manager.send_to_client(customer_id, {
                            "type": "listening_started",
                            "message": "Listening... Speak now"
                        })

                    elif data.get("type") == "text_message":
                        # Process text message directly
                        result = await audio_processor.process_conversation_turn(
                            customer_id, data["message"]
                        )

                        await connection_manager.send_to_client(customer_id, {
                            "type": "conversation_turn_complete",
                            **result
                        })

                elif message["type"] == "websocket.receive_bytes":
                    # Handle binary audio data
                    audio_data = message["bytes"]
                    current_time = time.time()

                    # Add to buffer
                    audio_buffer.append(audio_data)
                    last_audio_time = current_time

                    # Check for silence (simulate with timing)
                    if current_time - last_audio_time > audio_processor.silence_threshold and audio_buffer:
                        # Process accumulated audio
                        transcription_result = await audio_processor.process_audio_stream(
                            customer_id, audio_buffer
                        )

                        if transcription_result and transcription_result.get("text"):
                            # Send transcription back to client with metadata
                            await connection_manager.send_to_client(customer_id, {
                                "type": "transcription_result",
                                "text": transcription_result.get("text", ""),
                                "confidence": transcription_result.get("confidence", 0.0),
                                "service": transcription_result.get("service", "unknown"),
                                "detected_intent": transcription_result.get("detected_intent", "general_question")
                            })

                            # Process conversation turn
                            result = await audio_processor.process_conversation_turn(
                                customer_id, transcription_result
                            )

                            # Send complete response
                            await connection_manager.send_to_client(customer_id, {
                                "type": "conversation_turn_complete",
                                **result
                            })

                            # Ask if user wants to continue
                            await connection_manager.send_to_client(customer_id, {
                                "type": "listening_started",
                                "message": "I'm listening for your next question..."
                            })

                        audio_buffer = []

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