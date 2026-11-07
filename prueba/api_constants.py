"""Constantes de límites y mensajes para los contratos HTTP."""

from datetime import timedelta

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
SESSION_TTL = timedelta(minutes=15)
UNSUPPORTED_FORMAT_MESSAGE = (
    "Formato no soportado. Por favor, suba únicamente archivos PDF o Word"
)
DOCUMENT_TOO_LARGE_MESSAGE = "El archivo supera el límite de 5 MiB"
ANALYSIS_FAILURE_MESSAGE = "Fallo de conexión con el servidor de análisis"
EXPIRED_SESSION_MESSAGE = (
    "Sesión caducada. Por favor, recargue la página para enviar mensajes"
)
CHAT_GENERATION_FAILURE_MESSAGE = (
    "No se pudo generar una explicación en este momento"
)
