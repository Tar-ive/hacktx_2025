"""Audio processing utilities for silence detection and audio analysis."""

import struct
import math
from typing import List, Tuple


class AudioAnalyzer:
    """Analyzes audio data for silence detection and quality metrics."""

    def __init__(
        self,
        sample_rate: int = 16000,
        sample_width: int = 2,  # 2 bytes = 16-bit
        channels: int = 1,  # mono
        silence_threshold: float = 500.0,  # RMS threshold
        silence_duration: float = 1.0,  # seconds of silence needed
    ):
        """
        Initialize audio analyzer.

        Args:
            sample_rate: Audio sample rate in Hz
            sample_width: Bytes per sample (2 for 16-bit)
            channels: Number of audio channels (1 for mono)
            silence_threshold: RMS amplitude below which is considered silence
            silence_duration: How long silence must persist to trigger
        """
        self.sample_rate = sample_rate
        self.sample_width = sample_width
        self.channels = channels
        self.silence_threshold = silence_threshold
        self.silence_duration = silence_duration

        # Track silence duration
        self.silence_chunks = 0
        self.chunks_needed_for_silence = int(
            (silence_duration * sample_rate) / (sample_rate * 0.1)  # 100ms chunks
        )

    def calculate_rms(self, audio_data: bytes) -> float:
        """
        Calculate Root Mean Square (RMS) amplitude of audio data.

        Args:
            audio_data: Raw PCM audio bytes

        Returns:
            RMS amplitude value
        """
        if not audio_data or len(audio_data) < self.sample_width:
            return 0.0

        # Unpack audio data based on sample width
        fmt = {1: "b", 2: "h", 4: "i"}.get(self.sample_width, "h")
        count = len(audio_data) // self.sample_width

        try:
            # Unpack all samples
            samples = struct.unpack(f"<{count}{fmt}", audio_data[: count * self.sample_width])

            # Calculate RMS
            sum_squares = sum(s * s for s in samples)
            rms = math.sqrt(sum_squares / count) if count > 0 else 0.0

            return rms
        except struct.error:
            return 0.0

    def is_silence(self, audio_data: bytes) -> bool:
        """
        Check if audio chunk is silence based on RMS threshold.

        Args:
            audio_data: Raw PCM audio bytes

        Returns:
            True if audio is below silence threshold
        """
        rms = self.calculate_rms(audio_data)
        return rms < self.silence_threshold

    def check_silence_duration(self, audio_data: bytes) -> Tuple[bool, float]:
        """
        Check if current audio is silent and if silence threshold is met.

        Args:
            audio_data: Raw PCM audio bytes

        Returns:
            Tuple of (is_current_chunk_silent, silence_duration_seconds)
        """
        is_silent = self.is_silence(audio_data)

        if is_silent:
            self.silence_chunks += 1
        else:
            self.silence_chunks = 0  # Reset on any sound

        # Calculate actual silence duration
        chunk_duration = len(audio_data) / (self.sample_rate * self.sample_width * self.channels)
        total_silence_duration = self.silence_chunks * chunk_duration

        # Check if we've met the threshold
        silence_threshold_met = total_silence_duration >= self.silence_duration

        return silence_threshold_met, total_silence_duration

    def reset(self):
        """Reset silence tracking."""
        self.silence_chunks = 0

    def get_audio_metrics(self, audio_data: bytes) -> dict:
        """
        Get comprehensive audio metrics for debugging/monitoring.

        Args:
            audio_data: Raw PCM audio bytes

        Returns:
            Dictionary of audio metrics
        """
        rms = self.calculate_rms(audio_data)
        is_silent = rms < self.silence_threshold
        duration = len(audio_data) / (self.sample_rate * self.sample_width * self.channels)

        return {
            "rms_amplitude": round(rms, 2),
            "is_silence": is_silent,
            "duration_seconds": round(duration, 3),
            "sample_rate": self.sample_rate,
            "sample_width_bytes": self.sample_width,
            "data_size_bytes": len(audio_data),
            "silence_threshold": self.silence_threshold,
        }


class AudioBuffer:
    """Buffer for accumulating audio chunks with silence-based segmentation."""

    def __init__(self, analyzer: AudioAnalyzer):
        """
        Initialize audio buffer.

        Args:
            analyzer: AudioAnalyzer instance for silence detection
        """
        self.analyzer = analyzer
        self.buffer: List[bytes] = []
        self.total_duration = 0.0

    def add_chunk(self, audio_data: bytes) -> Tuple[bool, List[bytes]]:
        """
        Add audio chunk to buffer and check for speech segment completion.

        Args:
            audio_data: Raw PCM audio bytes

        Returns:
            Tuple of (should_process, complete_audio_segments)
            - should_process: True if a complete speech segment is ready
            - complete_audio_segments: List of audio byte chunks to process
        """
        self.buffer.append(audio_data)

        chunk_duration = len(audio_data) / (
            self.analyzer.sample_rate
            * self.analyzer.sample_width
            * self.analyzer.channels
        )
        self.total_duration += chunk_duration

        # Check if this chunk triggers silence threshold
        silence_met, silence_duration = self.analyzer.check_silence_duration(audio_data)

        if silence_met and self.buffer:
            # Return accumulated buffer and reset
            complete_segments = self.buffer.copy()
            self.clear()
            return True, complete_segments

        return False, []

    def clear(self):
        """Clear buffer and reset tracking."""
        self.buffer = []
        self.total_duration = 0.0
        self.analyzer.reset()

    def get_combined_audio(self) -> bytes:
        """Get all buffered audio as single bytes object."""
        return b"".join(self.buffer)

    def is_empty(self) -> bool:
        """Check if buffer is empty."""
        return len(self.buffer) == 0

    def get_duration(self) -> float:
        """Get total duration of buffered audio in seconds."""
        return self.total_duration


def validate_audio_format(
    audio_data: bytes, expected_sample_rate: int = 16000, expected_sample_width: int = 2
) -> dict:
    """
    Validate audio format matches expected parameters.

    Args:
        audio_data: Raw audio bytes
        expected_sample_rate: Expected sample rate
        expected_sample_width: Expected sample width in bytes

    Returns:
        Validation result with details
    """
    data_size = len(audio_data)

    # Check minimum size (at least 0.1 second)
    min_size = int(expected_sample_rate * expected_sample_width * 0.1)

    return {
        "valid": data_size >= min_size,
        "data_size_bytes": data_size,
        "min_required_bytes": min_size,
        "duration_seconds": data_size / (expected_sample_rate * expected_sample_width),
        "meets_minimum": data_size >= min_size,
    }
