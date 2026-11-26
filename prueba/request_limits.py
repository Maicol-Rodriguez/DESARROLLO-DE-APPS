"""Límites de tamaño de cuerpo HTTP para la demostración académica."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from api_constants import (
    DEFAULT_REQUEST_BYTES,
    MAX_ANALYSIS_REQUEST_BYTES,
    MAX_CHAT_REQUEST_BYTES,
    MAX_UPLOAD_REQUEST_BYTES,
)


class _BodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    """Rechaza cuerpos demasiado grandes antes de su análisis o extracción."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path_limits = {
            "/analizar": MAX_ANALYSIS_REQUEST_BYTES,
            "/api/v1/documentos/upload": MAX_UPLOAD_REQUEST_BYTES,
            "/api/v1/chat/mensaje": MAX_CHAT_REQUEST_BYTES,
        }
        max_bytes = path_limits.get(scope["path"], DEFAULT_REQUEST_BYTES)
        content_length = next(
            (
                value
                for name, value in scope.get("headers", [])
                if name.lower() == b"content-length"
            ),
            None,
        )
        if content_length is not None:
            try:
                if int(content_length) > max_bytes:
                    await self._send_too_large(scope, receive, send)
                    return
            except ValueError:
                pass

        total_bytes = 0

        async def receive_with_limit() -> Message:
            nonlocal total_bytes
            message = await receive()
            if message["type"] == "http.request":
                total_bytes += len(message.get("body", b""))
                if total_bytes > max_bytes:
                    raise _BodyTooLarge
            return message

        try:
            await self.app(scope, receive_with_limit, send)
        except _BodyTooLarge:
            await self._send_too_large(scope, receive, send)

    async def _send_too_large(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        response = JSONResponse(
            status_code=413,
            content={"detail": "El cuerpo de la solicitud supera el límite permitido."},
        )
        await response(scope, receive, send)
