"""Aplicación FastAPI para la estimación de autoría de textos por IA."""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any, AsyncGenerator
from uuid import uuid4
from zipfile import BadZipFile, ZipFile

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from starlette.concurrency import run_in_threadpool

from api_constants import (
    ANALYSIS_FAILURE_MESSAGE,
    CHAT_GENERATION_FAILURE_MESSAGE,
    DEFAULT_ALLOWED_ORIGINS,
    DOCUMENT_TOO_LARGE_MESSAGE,
    EXPIRED_SESSION_MESSAGE,
    INVALID_DOCUMENT_SESSION_MESSAGE,
    GEMINI_NOT_CONFIGURED_MESSAGE,
    MAX_CHAT_HISTORY_TURNS,
    MAX_CHAT_MESSAGE_LENGTH,
    MAX_DOCUMENT_BYTES,
    ANALYSIS_REQUESTS_PER_MINUTE,
    CHAT_REQUESTS_PER_MINUTE,
    DOCUMENT_UPLOADS_PER_MINUTE,
    RESULT_REQUESTS_PER_MINUTE,
    RATE_LIMIT_WINDOW_SECONDS,
    SESSION_TTL,
    STATE_CLEANUP_INTERVAL,
    UNSUPPORTED_FORMAT_MESSAGE,
)
from chat_service import (
    GeminiConfigurationError,
    GeminiRequestError,
    generar_respuesta_chat,
)
from detector import analizar_texto, cargar_modelo
from document_processing import (
    crear_motivos,
    extraer_texto_documento,
    procesar_documento,
)
from rate_limiting import FixedWindowRateLimiter
from request_limits import RequestBodyLimitMiddleware
from text_validation import validar_texto_analisis

logger = logging.getLogger(__name__)


class AnalisisRequest(BaseModel):
    """Modelo de entrada para la petición de análisis."""
    texto: str

    @field_validator("texto")
    @classmethod
    def validar_texto(cls, valor: str) -> str:
        """Validate text length and minimum word count.

        Args:
            valor: User-provided text to validate.

        Returns:
            The original text if it satisfies the request constraints.

        Raises:
            ValueError: If the input is blank, too short, or too long.
        """
        return validar_texto_analisis(valor)


class AnalisisResponse(BaseModel):
    """Modelo de salida estructurado para la respuesta del detector."""
    session_id: str
    puntuacion: float
    nivel: str
    perplejidad: float
    variabilidad: float
    oraciones_sospechosas: list[str]
    aviso: str


class ChatMessage(BaseModel):
    """Modelo de entrada para una pregunta del chatbot."""
    session_id: str
    mensaje: str

    @field_validator("mensaje")
    @classmethod
    def validar_mensaje(cls, valor: str) -> str:
        """Limit chat input to a short, single-line question.

        Args:
            valor: User-provided chat message.

        Returns:
            The stripped message if it satisfies the size and character limits.

        Raises:
            ValueError: If the question is blank, too long, or has control characters.
        """
        limpio = valor.strip()
        if not limpio:
            raise ValueError("El mensaje no puede estar vacío.")
        if len(limpio) > MAX_CHAT_MESSAGE_LENGTH:
            raise ValueError(
                f"El mensaje no debe superar {MAX_CHAT_MESSAGE_LENGTH} caracteres."
            )
        if any(ord(caracter) < 32 or ord(caracter) == 127 for caracter in limpio):
            raise ValueError("El mensaje no puede contener caracteres de control.")
        return limpio


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Load the model and periodically remove expired in-memory state.

    Args:
        app: FastAPI application whose model and in-memory state are initialized.

    Yields:
        ``None`` while the application accepts requests.

    Raises:
        OSError, ValueError: Propagated model-loading failures.
    """
    tokenizer, model = cargar_modelo()
    app.state.tokenizer = tokenizer
    app.state.model = model
    app.state.documentos = {}
    app.state.sesiones = {}
    cleaner = asyncio.create_task(_limpiar_estado_periodicamente(app))
    try:
        yield
    finally:
        cleaner.cancel()
        try:
            await cleaner
        except asyncio.CancelledError:
            pass
        app.state.tokenizer = None
        app.state.model = None


def limpiar_estado_expirado(
    sesiones: dict[str, dict[str, Any]],
    documentos: dict[str, dict[str, Any]],
    ahora: datetime | None = None,
) -> int:
    """Remove expired sessions and finished documents from their in-memory maps.

    Args:
        sesiones: Active session records keyed by session ID.
        documentos: Document records keyed by document ID.
        ahora: Optional timezone-aware timestamp, useful for deterministic tests.

    Returns:
        Number of session and document records removed.
    """
    instante = ahora or datetime.now(timezone.utc)
    eliminados = 0
    for session_id, sesion in list(sesiones.items()):
        if sesion["expira"] <= instante:
            sesiones.pop(session_id, None)
            eliminados += 1

    for document_id, documento in list(documentos.items()):
        expira = documento.get("expira")
        if expira is not None and expira <= instante:
            documentos.pop(document_id, None)
            eliminados += 1
    return eliminados


async def _limpiar_estado_periodicamente(app: FastAPI) -> None:
    """Periodically purge expired records for the running application.

    Args:
        app: Application holding the in-memory session and document records.

    Returns:
        Never returns during normal operation; cancellation stops the task.
    """
    while True:
        await asyncio.sleep(STATE_CLEANUP_INTERVAL.total_seconds())
        limpiar_estado_expirado(app.state.sesiones, app.state.documentos)


app = FastAPI(
    title="Analizador académico de texto",
    description="API para calcular métricas e índices heurísticos no calibrados.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(RequestBodyLimitMiddleware)

limitar_analisis = FixedWindowRateLimiter(
    ANALYSIS_REQUESTS_PER_MINUTE,
    RATE_LIMIT_WINDOW_SECONDS,
)
limitar_cargas = FixedWindowRateLimiter(
    DOCUMENT_UPLOADS_PER_MINUTE,
    RATE_LIMIT_WINDOW_SECONDS,
)
limitar_chat = FixedWindowRateLimiter(
    CHAT_REQUESTS_PER_MINUTE,
    RATE_LIMIT_WINDOW_SECONDS,
)
limitar_resultados = FixedWindowRateLimiter(
    RESULT_REQUESTS_PER_MINUTE,
    RATE_LIMIT_WINDOW_SECONDS,
)


def configurar_cors(aplicacion: FastAPI) -> None:
    """Configure CORS using ALLOWED_ORIGINS or the local development origins.

    Args:
        aplicacion: FastAPI application to configure.

    Notes:
        Wildcard origins disable credentialed CORS responses.

    Returns:
        ``None`` after adding the CORS middleware.
    """
    origenes_raw = os.getenv("ALLOWED_ORIGINS")
    origenes = (
        [origen.strip() for origen in origenes_raw.split(",") if origen.strip()]
        if origenes_raw is not None
        else list(DEFAULT_ALLOWED_ORIGINS)
    )
    permite_credenciales = "*" not in origenes
    aplicacion.add_middleware(
        CORSMiddleware,
        allow_origins=origenes,
        allow_credentials=permite_credenciales,
        allow_methods=["*"],
        allow_headers=["*"],
    )


configurar_cors(app)
app.state.documentos = {}
app.state.sesiones = {}


def traducir_error_pydantic(err: dict[str, Any]) -> str:
    """Traduce un error de validación de Pydantic a un mensaje legible en español.

    Args:
        err: Diccionario de error de Pydantic.

    Returns:
        Mensaje en español claro para el cliente.
    """
    msg = str(err.get("msg", ""))
    if "Value error, " in msg:
        return msg.replace("Value error, ", "")
    err_type = err.get("type", "")
    if err_type == "missing":
        campo = err.get("loc", ["campo"])[-1]
        return f"El campo '{campo}' es obligatorio."
    if "string" in err_type:
        return "El valor proporcionado debe ser una cadena de texto válida."
    return "Error de validación en la estructura de datos."


@app.exception_handler(RequestValidationError)
async def manejador_errores_validacion(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Return HTTP 422 with Spanish messages for request validation errors.

    Args:
        _request: Incoming request required by FastAPI's exception handler.
        exc: Pydantic/FastAPI request validation exception.

    Returns:
        JSONResponse with status 422 and localized validation details.

    """
    detalles = [traducir_error_pydantic(error) for error in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"error": "Datos de entrada inválidos", "detalles": detalles},
    )


@app.post(
    "/analizar",
    response_model=AnalisisResponse,
    dependencies=[Depends(limitar_analisis)],
)
async def ruta_analizar(
    peticion: AnalisisRequest,
    request: Request,
) -> dict[str, Any]:
    """Endpoint principal para calcular métricas e índice heurístico de un texto.

    Args:
        peticion: Cuerpo validado con el texto a analizar.
        request: Petición HTTP para acceder al modelo cargado en lifespan.

    Returns:
        Métricas calculadas y aviso legal.

    Raises:
        Exceptions from model inference are propagated to FastAPI.
    """
    tokenizer = request.app.state.tokenizer
    model = request.app.state.model
    resultado = await run_in_threadpool(
        analizar_texto,
        peticion.texto,
        tokenizer,
        model,
    )
    document_id = uuid4().hex
    session_id = uuid4().hex
    expira = datetime.now(timezone.utc) + SESSION_TTL
    request.app.state.documentos[document_id] = {
        "estado": "completado",
        "resultado": resultado,
        "texto": peticion.texto,
        "expira": expira,
    }
    request.app.state.sesiones[session_id] = {
        "document_id": document_id,
        "expira": expira,
        "historial": [],
    }
    return {**resultado, "session_id": session_id}


@app.post("/api/v1/documentos/upload", status_code=201)
async def subir_documento(
    request: Request,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(...)],
    _rate_limit: Annotated[None, Depends(limitar_cargas)],
) -> dict[str, str]:
    """Validate a PDF/DOCX upload and schedule analysis.

    Args:
        request: HTTP request providing app state.
        background_tasks: FastAPI task queue used for document processing.
        file: Uploaded PDF or DOCX.

    Returns:
        Document ID, session ID, and initial processing state.

    Raises:
        HTTPException: With status 413 for oversized files or 415 for an
            unsupported/invalid file.
    """
    limpiar_estado_expirado(request.app.state.sesiones, request.app.state.documentos)
    contenido = await file.read(MAX_DOCUMENT_BYTES + 1)
    if len(contenido) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail=DOCUMENT_TOO_LARGE_MESSAGE)

    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()
    formato_valido = (
        extension == ".pdf" and contenido.startswith(b"%PDF-")
    )
    if extension == ".docx" and contenido.startswith(b"PK"):
        try:
            with ZipFile(BytesIO(contenido)) as archivo_zip:
                formato_valido = "word/document.xml" in archivo_zip.namelist()
        except BadZipFile:
            formato_valido = False
    if not formato_valido:
        raise HTTPException(status_code=415, detail=UNSUPPORTED_FORMAT_MESSAGE)

    document_id = uuid4().hex
    session_id = uuid4().hex
    expira = datetime.now(timezone.utc) + SESSION_TTL
    request.app.state.documentos[document_id] = {
        "estado": "procesando",
        "expira": expira,
    }
    request.app.state.sesiones[session_id] = {
        "document_id": document_id,
        "expira": expira,
    }
    background_tasks.add_task(
        procesar_documento,
        document_id,
        contenido,
        extension,
        request.app.state.documentos,
        request.app.state.tokenizer,
        request.app.state.model,
        extraer_texto_documento,
        analizar_texto,
    )
    return {
        "document_id": document_id,
        "session_id": session_id,
        "estado": "procesando",
    }


@app.get(
    "/api/v1/documentos/{document_id}/resultado",
    dependencies=[Depends(limitar_resultados)],
)
async def obtener_resultado(
    document_id: str,
    request: Request,
    session_id: Annotated[str | None, Header(alias="X-Session-Id")] = None,
) -> dict[str, Any]:
    """Return a document result to its active owning session.

    Args:
        document_id: Document whose result is requested.
        request: HTTP request providing session and document state.
        session_id: Owning active session from the ``X-Session-Id`` header.

    Returns:
        Public analysis metrics and derived explanatory reasons.

    Raises:
        HTTPException: With status 401 for a missing/expired session, 404 for
            an unknown or unowned document, 202 while processing, or 503 if
            analysis failed.
    """
    if session_id is None:
        raise HTTPException(status_code=401, detail=INVALID_DOCUMENT_SESSION_MESSAGE)

    sesion = request.app.state.sesiones.get(session_id)
    if sesion is None or sesion["expira"] <= datetime.now(timezone.utc):
        request.app.state.sesiones.pop(session_id, None)
        raise HTTPException(status_code=401, detail=INVALID_DOCUMENT_SESSION_MESSAGE)
    if sesion["document_id"] != document_id:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    documento = request.app.state.documentos.get(document_id)
    if documento is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if documento["estado"] == "error":
        raise HTTPException(
            status_code=503,
            detail=documento.get("error", ANALYSIS_FAILURE_MESSAGE),
        )
    if documento["estado"] != "completado":
        raise HTTPException(status_code=202, detail="El documento aún se está procesando")

    resultado = documento["resultado"]
    return {
        "document_id": document_id,
        "porcentaje_ia": resultado["puntuacion"],
        "nivel": resultado["nivel"],
        "motivos": crear_motivos(resultado),
    }


@app.post("/api/v1/chat/mensaje")
async def enviar_mensaje_chat(
    peticion: ChatMessage,
    request: Request,
    _rate_limit: Annotated[None, Depends(limitar_chat)],
) -> dict[str, Any]:
    """Respond to a question associated with an active session.

    Args:
        peticion: Validated session ID and chat question.
        request: HTTP request providing session, document, and model state.

    Returns:
        Generated explanation and the reasons derived from its analysis.

    Raises:
        HTTPException: With status 401 for an expired session or 503 if the
            document/model is unavailable.
    """
    sesion = request.app.state.sesiones.get(peticion.session_id)
    ahora = datetime.now(timezone.utc)
    if sesion is None or sesion["expira"] <= ahora:
        request.app.state.sesiones.pop(peticion.session_id, None)
        raise HTTPException(status_code=401, detail=EXPIRED_SESSION_MESSAGE)

    documento = request.app.state.documentos.get(sesion["document_id"])
    if documento is None or documento["estado"] != "completado":
        raise HTTPException(status_code=503, detail=ANALYSIS_FAILURE_MESSAGE)

    resultado = documento["resultado"]
    texto = documento.get("texto")
    if not isinstance(texto, str) or not texto:
        raise HTTPException(status_code=503, detail=ANALYSIS_FAILURE_MESSAGE)
    historial = sesion.setdefault("historial", [])
    try:
        respuesta = await run_in_threadpool(
            generar_respuesta_chat,
            peticion.mensaje,
            texto,
            resultado,
            historial[-MAX_CHAT_HISTORY_TURNS:],
        )
    except GeminiConfigurationError as error:
        raise HTTPException(
            status_code=503,
            detail=GEMINI_NOT_CONFIGURED_MESSAGE,
        ) from error
    except GeminiRequestError as error:
        logger.warning("Gemini no pudo generar una respuesta")
        raise HTTPException(
            status_code=503,
            detail=CHAT_GENERATION_FAILURE_MESSAGE,
        ) from error
    historial.append({"pregunta": peticion.mensaje, "respuesta": respuesta})
    del historial[:-MAX_CHAT_HISTORY_TURNS]
    return {
        "respuesta": respuesta,
        "razones": crear_motivos(resultado),
    }


# Angular sirve en desarrollo con `ng serve`; el build se sirve desde www.
frontend_dir = Path(__file__).resolve().parent / "www"
if frontend_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    logger.info("No se encontró el build Angular; ejecuta `npm run build` para servir la web.")
