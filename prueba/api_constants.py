"""Constantes de límites y mensajes para los contratos HTTP."""

from datetime import timedelta

MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
MAX_DOCUMENT_PAGES = 100
MAX_DOCX_ARCHIVE_ENTRIES = 2000
MAX_DOCX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024
MIN_ANALYSIS_WORDS = 50
MAX_ANALYSIS_CHARACTERS = 5000
MAX_ANALYSIS_SENTENCES = 100
MIN_WORDS_PER_SENTENCE = 4
MAX_CHAT_MESSAGE_LENGTH = 500
MAX_CHAT_HISTORY_TURNS = 6
MAX_ANALYSIS_REQUEST_BYTES = 32 * 1024
MAX_CHAT_REQUEST_BYTES = 8 * 1024
MAX_UPLOAD_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 128 * 1024
DEFAULT_REQUEST_BYTES = 64 * 1024
ANALYSIS_REQUESTS_PER_MINUTE = 10
DOCUMENT_UPLOADS_PER_MINUTE = 20
CHAT_REQUESTS_PER_MINUTE = 30
RESULT_REQUESTS_PER_MINUTE = 90
RATE_LIMIT_WINDOW_SECONDS = 60
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
ANALYSIS_FAILURE_MESSAGE = "No se pudo procesar el documento"
EXPIRED_SESSION_MESSAGE = (
    "Sesión caducada. Por favor, recargue la página para enviar mensajes"
)
INVALID_DOCUMENT_SESSION_MESSAGE = (
    "Sesión inválida o caducada. Por favor, vuelva a cargar el documento"
)
CHAT_GENERATION_FAILURE_MESSAGE = (
    "Gemini no pudo responder. Revisa la conexión, la clave y los límites de uso."
)
GEMINI_NOT_CONFIGURED_MESSAGE = (
    "Falta configurar GEMINI_API_KEY en el servidor. Sigue las instrucciones del README."
)
