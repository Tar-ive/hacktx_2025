"""Speech-to-text service using Gemini's multimodal capabilities."""

import asyncio
import base64
import io
import json
from typing import Optional, Dict, Any
from ..config import config

try:
    import google.generativeai as genai
    from google.generativeai.types import content_types
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

try:
    import speech_recognition as sr
    HAS_SPEECH_RECOGNITION = True
except ImportError:
    HAS_SPEECH_RECOGNITION = False


class GeminiSpeechToText:
    """Speech-to-text using Gemini's multimodal model."""

    def __init__(self):
        if not HAS_GEMINI:
            raise ImportError("Google Generative AI library not installed. Run: pip install google-generativeai")

        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(config.GEMINI_MODEL)

    async def transcribe_audio(self, audio_data: bytes, audio_format: str = "wav") -> Optional[str]:
        """
        Transcribe audio data using Gemini.

        Args:
            audio_data: Raw audio bytes
            audio_format: Format of audio (wav, mp3, etc.)

        Returns:
            Transcribed text or None if failed
        """
        try:
            # Convert audio to proper format for Gemini
            audio_parts = {
                "mime_type": f"audio/{audio_format}",
                "data": base64.b64encode(audio_data).decode('utf-8')
            }

            # Create prompt for transcription
            prompt = """Please transcribe this audio. This is a conversation with a banking assistant.
            The user might be asking about:
            - Account balances
            - Recent transactions
            - Spending patterns
            - Investment advice
            - Security concerns
            - General banking questions

            Please provide only the transcribed text, without any additional commentary."""

            # Generate content
            response = await asyncio.to_thread(
                self.model.generate_content,
                [prompt, audio_parts]
            )

            if response.text:
                return response.text.strip()
            return None

        except Exception as e:
            print(f"⚠️ Gemini STT error: {e}")
            return None

    async def transcribe_with_context(self, audio_data: bytes, conversation_history: list = None) -> Dict[str, Any]:
        """
        Transcribe audio with conversation context for better accuracy.

        Args:
            audio_data: Raw audio bytes
            conversation_history: Previous conversation turns

        Returns:
            {
                "text": "Transcribed text",
                "confidence": 0.95,
                "context_used": True,
                "detected_intent": "balance_inquiry"
            }
        """
        try:
            # Build context-aware prompt
            context_prompt = "You are a banking assistant transcribing a user's speech.\n\n"

            if conversation_history:
                context_prompt += "Recent conversation:\n"
                for turn in conversation_history[-3:]:  # Last 3 turns
                    role = "User" if turn["role"] == "user" else "Assistant"
                    context_prompt += f"{role}: {turn['content']}\n"
                context_prompt += "\n"

            context_prompt += """Please transcribe the user's speech. Consider:
            - Banking terminology (account, balance, transaction, transfer)
            - Financial questions (how much, what is, show me)
            - Security concerns (fraud, suspicious, unauthorized)
            - Common financial activities (spending, saving, investing)

            Return a JSON response with:
            {
                "transcription": "the transcribed text",
                "confidence": 0.95,
                "detected_intent": "balance_inquiry | transaction_inquiry | security_alert | general_question",
                "clarification_needed": false
            }"""

            audio_parts = {
                "mime_type": "audio/wav",
                "data": base64.b64encode(audio_data).decode('utf-8')
            }

            response = await asyncio.to_thread(
                self.model.generate_content,
                [context_prompt, audio_parts]
            )

            if response.text:
                try:
                    # Try to parse as JSON
                    result = json.loads(response.text)
                    return {
                        "text": result.get("transcription", ""),
                        "confidence": result.get("confidence", 0.8),
                        "context_used": bool(conversation_history),
                        "detected_intent": result.get("detected_intent", "general_question"),
                        "clarification_needed": result.get("clarification_needed", False)
                    }
                except json.JSONDecodeError:
                    # Fallback to plain text
                    return {
                        "text": response.text.strip(),
                        "confidence": 0.8,
                        "context_used": bool(conversation_history),
                        "detected_intent": "general_question",
                        "clarification_needed": False
                    }

            return {
                "text": "",
                "confidence": 0.0,
                "context_used": False,
                "detected_intent": "error",
                "clarification_needed": False
            }

        except Exception as e:
            print(f"⚠️ Gemini STT with context error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "context_used": False,
                "detected_intent": "error",
                "clarification_needed": False
            }


class FallbackSpeechToText:
    """Fallback STT using speech_recognition library."""

    def __init__(self):
        if not HAS_SPEECH_RECOGNITION:
            raise ImportError("Speech recognition library not installed. Run: pip install SpeechRecognition")

        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 4000  # Adjust for noise
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 1.0  # 1 second of silence

    async def transcribe_audio(self, audio_data: bytes) -> Optional[str]:
        """Transcribe using Google Speech Recognition (fallback)."""
        try:
            # Convert bytes to AudioData
            audio = sr.AudioData(audio_data, 16000, 2)  # 16kHz, 2 bytes

            # Use Google Speech Recognition (free tier)
            text = await asyncio.to_thread(
                self.recognizer.recognize_google,
                audio
            )

            return text
        except Exception as e:
            print(f"⚠️ Fallback STT error: {e}")
            return None


class StreamingSpeechToText:
    """Handles streaming audio transcription."""

    def __init__(self, primary_service=None, fallback_service=None):
        self.primary_service = primary_service or GeminiSpeechToText() if config.GEMINI_API_KEY else None
        self.fallback_service = fallback_service or FallbackSpeechToText() if HAS_SPEECH_RECOGNITION else None

        if not self.primary_service and not self.fallback_service:
            raise ValueError("No speech-to-text service available. Configure Gemini API key or install speech recognition.")

    async def transcribe_stream_chunk(self, audio_chunk: bytes, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Transcribe a single chunk of streaming audio.

        Args:
            audio_chunk: Audio data chunk
            context: Conversation context for better transcription

        Returns:
            Transcription result with metadata
        """
        if not audio_chunk or len(audio_chunk) < 8000:  # ~0.25 second minimum
            return {
                "text": "",
                "confidence": 0.0,
                "is_final": False,
                "error": "Audio too short"
            }

        # Try primary service first
        if self.primary_service:
            try:
                conversation_history = context.get("conversation_history", []) if context else None
                result = await self.primary_service.transcribe_with_context(audio_chunk, conversation_history)
                result["is_final"] = True
                return result
            except Exception as e:
                print(f"⚠️ Primary STT failed, trying fallback: {e}")

        # Try fallback service
        if self.fallback_service:
            try:
                text = await self.fallback_service.transcribe_audio(audio_chunk)
                return {
                    "text": text or "",
                    "confidence": 0.7 if text else 0.0,
                    "is_final": True,
                    "service": "fallback",
                    "detected_intent": "general_question"
                }
            except Exception as e:
                print(f"⚠️ Fallback STT also failed: {e}")

        return {
            "text": "",
            "confidence": 0.0,
            "is_final": True,
            "error": "All transcription services failed"
        }

    async def process_audio_stream(self, audio_stream, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process a complete audio stream with multiple chunks.

        Args:
            audio_stream: Iterator yielding audio chunks
            context: Conversation context

        Returns:
            Best transcription result from all chunks
        """
        all_results = []
        combined_audio = b''

        async for chunk in audio_stream:
            combined_audio += chunk
            result = await self.transcribe_stream_chunk(chunk, context)
            all_results.append(result)

        # Also try the complete audio
        final_result = await self.transcribe_stream_chunk(combined_audio, context)

        # Choose the best result (highest confidence with actual text)
        best_result = final_result
        for result in all_results:
            if (result.get("confidence", 0) > best_result.get("confidence", 0) and
                result.get("text", "").strip()):
                best_result = result

        return best_result


# Global service instance
try:
    speech_to_text_service = StreamingSpeechToText()
except Exception as e:
    print(f"⚠️ Could not initialize speech-to-text service: {e}")
    speech_to_text_service = None