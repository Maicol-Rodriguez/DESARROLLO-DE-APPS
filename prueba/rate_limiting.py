"""Límite sencillo por IP para proteger la demostración local."""

import math
import time

from fastapi import HTTPException, Request

MAX_TRACKED_CLIENTS = 4096


class FixedWindowRateLimiter:
    """Limita solicitudes por cliente dentro de ventanas de tiempo fijas."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._clients: dict[str, tuple[float, int]] = {}

    async def __call__(self, request: Request) -> None:
        """Rechaza solicitudes que exceden el límite configurado."""
        address = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window = self._clients.get(address)

        if window is None or now - window[0] >= self.window_seconds:
            if len(self._clients) >= MAX_TRACKED_CLIENTS:
                self._clients = {
                    client: record
                    for client, record in self._clients.items()
                    if now - record[0] < self.window_seconds
                }
            if len(self._clients) >= MAX_TRACKED_CLIENTS:
                raise HTTPException(
                    status_code=429,
                    detail="Demasiados clientes activos; inténtalo más tarde.",
                )
            self._clients[address] = (now, 1)
            return

        if window[1] >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail="Límite de solicitudes alcanzado; inténtalo más tarde.",
                headers={
                    "Retry-After": str(
                        max(1, math.ceil(window[0] + self.window_seconds - now))
                    )
                },
            )
        self._clients[address] = (window[0], window[1] + 1)
