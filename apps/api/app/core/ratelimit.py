"""A small, dependency-free rate limiter.

A fixed-window counter kept in memory, keyed by ``scope:client-ip``. Used as a
FastAPI dependency on the abuse-prone endpoints (sign-in brute force, sign-up
spam, billable AI generation) so no single client can hammer them.

Deliberately in-process: it needs no Redis and no extra package, which keeps the
scaffold deployable as one container. Counts are therefore per worker — run a
single Uvicorn worker per container (scale with more containers behind the load
balancer), or swap ``_Window`` for a shared store, if you scale out.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings
from app.core.errors import RateLimitError


class _Window:
    """Sliding-window request log per key, guarded by a lock."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, times: int, seconds: float) -> float | None:
        """Record a hit. Return None if allowed, else seconds until retry."""
        now = time.monotonic()
        cutoff = now - seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= times:
                return max(seconds - (now - bucket[0]), 0.0)
            bucket.append(now)
            if len(self._hits) > 10_000:
                self._collect(cutoff)
            return None

    def _collect(self, cutoff: float) -> None:
        """Drop empty/expired buckets so memory can't grow without bound."""
        for key in list(self._hits):
            bucket = self._hits[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if not bucket:
                del self._hits[key]


_store = _Window()


def client_ip(request: Request) -> str:
    """Best-effort client IP.

    Behind Nginx / a DigitalOcean load balancer the socket peer is the proxy, so
    the real client is the first entry of ``X-Forwarded-For``. Only trust this
    when you actually run behind a proxy that sets it.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimit:
    """FastAPI dependency: allow ``times`` requests per ``seconds`` per client IP.

    Use on a route without touching its signature::

        @router.post("/sign-in", dependencies=[Depends(RateLimit(10, 60, scope="signin"))])
    """

    def __init__(self, times: int, seconds: float, *, scope: str) -> None:
        self.times = times
        self.seconds = seconds
        self.scope = scope

    async def __call__(self, request: Request) -> None:
        if not settings.rate_limit_enabled:
            return
        retry = _store.hit(f"{self.scope}:{client_ip(request)}", self.times, self.seconds)
        if retry is not None:
            raise RateLimitError(retry_after=int(retry) + 1)
