"""Constantes de límites y mensajes para los contratos HTTP."""

from datetime import timedelta

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
MIN_ANALYSIS_WORDS = 50
MAX_ANALYSIS_CHARACTERS = 5000
MAX_CHAT_MESSAGE_LENGTH = 500
SESSION_TTL = timedelta(minutes=15)
STATE_CLEANUP_INTERVAL = timedelta(minutes=1)
DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://localhost:8100",
    "http://127.0.0.1:8100",
)
UNSUPPORTED_FORMAT_MESSAGE = (
    "Formato no soportado. Por favor, suba únicamente archivos PDF o Word"
)
DOCUMENT_TOO_LARGE_MESSAGE = "El archivo supera el límite de 5 MiB"
ANALYSIS_FAILURE_MESSAGE = "Fallo de conexión con el servidor de análisis"
EXPIRED_SESSION_MESSAGE = (
    "Sesión caducada. Por favor, recargue la página para enviar mensajes"
)
INVALID_DOCUMENT_SESSION_MESSAGE = (
    "Sesión inválida o caducada. Por favor, vuelva a cargar el documento"
)
CHAT_GENERATION_FAILURE_MESSAGE = (
    "No se pudo generar una explicación en este momento"
)
