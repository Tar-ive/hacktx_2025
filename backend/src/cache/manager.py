"""
Multi-layer cache manager with fallbacks.
Layer 1: In-memory (5 min TTL)
Layer 2: File system (1 hour TTL)
Layer 3: Source API
"""

import time
from typing import Dict, Any, Callable, Optional
from .buffer import NessieBuffer


class CacheManager:
    """
    Multi-layer cache with fallback strategy.
    """

    def __init__(self, file_cache_ttl: int = 3600):
        # Layer 1: In-memory cache
        self.memory_cache: Dict[str, tuple[Any, float]] = {}
        self.memory_ttl = 300  # 5 minutes

        # Layer 2: File cache
        self.file_buffer = NessieBuffer(ttl=file_cache_ttl)

    def _is_memory_fresh(self, key: str) -> bool:
        """Check if memory cache entry is still fresh."""
        if key not in self.memory_cache:
            return False

        _, cached_at = self.memory_cache[key]
        age = time.time() - cached_at
        return age < self.memory_ttl

    def get_from_memory(self, key: str) -> Optional[Any]:
        """Get value from memory cache if fresh."""
        if self._is_memory_fresh(key):
            value, _ = self.memory_cache[key]
            return value
        return None

    def set_in_memory(self, key: str, value: Any) -> None:
        """Store value in memory cache."""
        self.memory_cache[key] = (value, time.time())

    async def get_with_fallback(self, key: str, fetcher: Callable) -> Dict[str, Any]:
        """
        Get data with multi-layer fallback strategy.

        Args:
            key: Cache key
            fetcher: Async function to fetch fresh data

        Returns:
            Cached or fresh data with metadata
        """
        # Try Layer 1: Memory cache
        memory_data = self.get_from_memory(key)
        if memory_data is not None:
            return {
                "data": memory_data,
                "from_cache": True,
                "cache_layer": "memory"
            }

        # Try Layer 2: File cache
        if self.file_buffer.is_cache_valid():
            file_data = self.file_buffer.load_from_cache()
            if file_data:
                # Promote to memory cache
                self.set_in_memory(key, file_data)
                return {
                    "data": file_data,
                    "from_cache": True,
                    "cache_layer": "file"
                }

        # Try Layer 3: Fetch from source
        try:
            fresh_data = await fetcher()

            # Store in all cache layers
            self.file_buffer.save_to_cache(fresh_data)
            self.set_in_memory(key, fresh_data)

            return {
                "data": fresh_data,
                "from_cache": False,
                "cache_layer": "source"
            }

        except Exception as e:
            # Ultimate fallback: Return stale file cache if available
            stale_data = self.file_buffer.load_from_cache()
            if stale_data:
                print(f"⚠️  Using stale cache due to error: {e}")
                return {
                    "data": stale_data,
                    "from_cache": True,
                    "cache_layer": "file_stale",
                    "error": str(e)
                }

            # No fallback available
            raise Exception(f"Failed to fetch data and no cache available: {e}")

    def clear_all(self) -> None:
        """Clear all cache layers."""
        self.memory_cache.clear()
        self.file_buffer.clear_cache()

    def get_status(self) -> Dict[str, Any]:
        """Get status of all cache layers."""
        return {
            "memory_cache": {
                "entries": len(self.memory_cache),
                "keys": list(self.memory_cache.keys())
            },
            "file_cache": self.file_buffer.get_cache_status()
        }
