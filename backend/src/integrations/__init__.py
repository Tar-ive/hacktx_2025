"""
Integration helpers bridging the orchestrator with external providers.
"""

from .elevenlabs_integration import ElevenLabsIntegration, elevenlabs_integration

__all__ = ["ElevenLabsIntegration", "elevenlabs_integration"]
