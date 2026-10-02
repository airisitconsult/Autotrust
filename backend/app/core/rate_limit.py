"""A small in-memory sliding-window rate limiter.

Fine for one server process. If the API ever runs as several processes or
instances, each would keep its own counts (so the effective limit multiplies)
and this should move to a shared store such as Redis.
"""

import threading
import time
from collections import defaultdict, deque


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: float) -> int | None:
        """Record an attempt. Returns None if allowed, otherwise the number of
        seconds until the caller may try again."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                return max(1, int(window_seconds - (now - hits[0])) + 1)
            hits.append(now)
            if len(self._hits) > 10_000:  # keep memory bounded
                self._purge(now, window_seconds)
            return None

    def _purge(self, now: float, window_seconds: float) -> None:
        for k in [k for k, h in self._hits.items() if not h or now - h[-1] >= window_seconds]:
            del self._hits[k]


advisor_limiter = SlidingWindowLimiter()
