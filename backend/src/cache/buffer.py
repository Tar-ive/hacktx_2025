"""
Nessie API buffer with 1-hour TTL cache to file.
"""

import json
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from ..config import config


class NessieBuffer:
    """
    Cache layer for Nessie API with 1-hour TTL.
    Stores data in JSON file for persistence across restarts.
    """

    def __init__(self, cache_path: str = None, ttl: int = None):
        self.cache_path = Path(cache_path or config.CACHE_FILE_PATH)
        self.ttl = ttl or config.CACHE_TTL_SECONDS
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)

    def is_cache_valid(self) -> bool:
        """Check if cache file exists and is still fresh."""
        if not self.cache_path.exists():
            return False

        try:
            with open(self.cache_path, 'r') as f:
                data = json.load(f)

            cached_at = data.get("cached_at")
            if not cached_at:
                return False

            # Parse cached_at timestamp
            from datetime import timezone
            # Ensure cached_time is timezone-aware
            cached_time = datetime.fromisoformat(cached_at.replace('Z', '+00:00'))
            if cached_time.tzinfo is None:
                cached_time = cached_time.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            age_seconds = (now - cached_time).total_seconds()

            return age_seconds < self.ttl

        except (json.JSONDecodeError, KeyError, ValueError):
            return False

    def load_from_cache(self) -> Optional[Dict[str, Any]]:
        """Load data from cache file."""
        if not self.cache_path.exists():
            return None

        try:
            with open(self.cache_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return None

    def save_to_cache(self, data: Dict[str, Any]) -> None:
        """Save data to cache file with metadata."""
        cache_data = {
            "cached_at": datetime.now().isoformat(),
            "ttl": self.ttl,
            **data
        }

        with open(self.cache_path, 'w') as f:
            json.dump(cache_data, f, indent=2)

    def get_cache_age(self) -> Optional[int]:
        """Get cache age in seconds, or None if cache doesn't exist."""
        if not self.cache_path.exists():
            return None

        try:
            with open(self.cache_path, 'r') as f:
                data = json.load(f)

            cached_at = data.get("cached_at")
            if not cached_at:
                return None

            cached_time = datetime.fromisoformat(cached_at.replace('Z', '+00:00'))
            return int((datetime.now().astimezone() - cached_time).total_seconds())

        except (json.JSONDecodeError, KeyError, ValueError):
            return None

    def get_ttl_remaining(self) -> Optional[int]:
        """Get remaining TTL in seconds."""
        age = self.get_cache_age()
        if age is None:
            return None

        remaining = self.ttl - age
        return max(0, remaining)

    def clear_cache(self) -> None:
        """Clear the cache file."""
        if self.cache_path.exists():
            self.cache_path.unlink()

    def get_cache_status(self) -> Dict[str, Any]:
        """Get cache status information."""
        return {
            "exists": self.cache_path.exists(),
            "age_seconds": self.get_cache_age(),
            "ttl_remaining": self.get_ttl_remaining(),
            "is_valid": self.is_cache_valid(),
            "path": str(self.cache_path)
        }
