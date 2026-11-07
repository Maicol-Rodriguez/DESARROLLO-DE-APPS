"""Aplicación FastAPI para la estimación de autoría de textos por IA."""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from io import BytesIO
import logging
import os
from typing import Any, Dict, List
from uuid import uuid4
from zipfile import BadZipFile, ZipFile

import torch
from docx import Document
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError, field_validator
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from detector import analizar_texto, cargar_modelo

logger = logging.getLogger(__name__)
MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
SESSION_TTL = timedelta(minutes=15)
UNSUPPORTED_FORMAT_MESSAGE = (
    "Formato no soportado. Por favor, suba únicamente archivos PDF o Word"
)
ANALYSIS_FAILURE_MESSAGE = "Fallo de conexión con el servidor de análisis"
EXPIRED_SESSION_MESSAGE = (
    "Sesión caducada. Por favor, recargue la página para enviar mensajes"
)


class AnalisisRequest(BaseModel):
    """Modelo de entrada para la petición de análisis."""
    texto: str

    @field_validator("texto")
    @classmethod
    def validar_texto(cls, valor: str) -> str:
        """Valida que el texto no esté vacío y cumpla los límites de palabras y caracteres."""
        limpio = valor.strip()
        if not limpio:
            raise ValueError("El texto no puede estar vacío ni componerse solo de espacios.")
        palabras = limpio.split()
        if len(palabras) < 50:
            raise ValueError(f"El texto debe contener al menos 50 palabras (recibidas: {len(palabras)}).")
        if len(valor) > 5000:
            raise ValueError(f"El texto no debe superar los 5000 caracteres (recibidos: {len(valor)}).")
        return valor


class AnalisisResponse(BaseModel):
    """Modelo de salida estructurado para la respuesta del detector."""
    puntuacion: float
    nivel: str
    perplejidad: float
    variabilidad: float
    oraciones_sospechosas: List[str]
    aviso: str


class ChatMessage(BaseModel):
    """Modelo de entrada para una pregunta del chatbot."""
    session_id: str
    mensaje: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: carga el modelo una sola vez al inicio."""
    tokenizer, model = cargar_modelo()
    app.state.tokenizer = tokenizer
    app.state.model = model
    app.state.documentos = {}
    app.state.sesiones = {}
    yield
    app.state.tokenizer = None
    app.state.model = None


app = FastAPI(
    title="Detector de Textos IA",
    description="API académica para estimar probabilidad de autoría por IA.",
    version="1.0.0",
    lifespan=lifespan,
)


def configurar_cors(aplicacion: FastAPI) -> None:
    """Configura el middleware de CORS leyendo la variable ALLOWED_ORIGINS.

    Args:
        aplicacion: Instancia de FastAPI a configurar.
    """
    origenes_raw = os.getenv("ALLOWED_ORIGINS", "*")
    origenes = [o.strip() for o in origenes_raw.split(",") if o.strip()]
    aplicacion.add_middleware(
        CORSMiddleware,
        allow_origins=origenes,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


configurar_cors(app)
app.state.documentos = {}
app.state.sesiones = {}


def traducir_error_pydantic(err: Dict[str, Any]) -> str:
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
async def manejador_errores_validacion(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Retorna respuesta HTTP 422 con mensajes en español ante errores de validación.

    Args:
        request: Petición HTTP entrante.
        exc: Excepción de validación.

    Returns:
        JSONResponse con código 422 y detalles en español.
    """
    detalles = [traducir_error_pydantic(e) for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"error": "Datos de entrada inválidos", "detalles": detalles},
    )


@app.post("/analizar", response_model=AnalisisResponse)
async def ruta_analizar(peticion: AnalisisRequest, request: Request) -> Dict[str, Any]:
    """Endpoint principal para analizar la probabilidad de IA en un texto.

    Args:
        peticion: Cuerpo validado con el texto a analizar.
        request: Petición HTTP para acceder al modelo cargado en lifespan.

    Returns:
        Métricas calculadas y aviso legal.
    """
    # Privacidad: no guardamos ni imprimimos en logs el texto del usuario
    tokenizer = request.app.state.tokenizer
    model = request.app.state.model
    return analizar_texto(peticion.texto, tokenizer, model)


def extraer_texto_documento(contenido: bytes, extension: str) -> str:
    """Extrae texto de un archivo PDF o DOCX ya validado."""
    if extension == ".pdf":
        lector = PdfReader(BytesIO(contenido))
        return "\n".join(pagina.extract_text() or "" for pagina in lector.pages)
    if extension == ".docx":
        documento = Document(BytesIO(contenido))
        return "\n".join(parrafo.text for parrafo in documento.paragraphs)
    raise ValueError(f"Extensión de documento no soportada: {extension}")


def crear_motivos(resultado: Dict[str, Any]) -> List[str]:
    """Construye razones lingüísticas verificables a partir de las métricas."""
    perplejidad = float(resultado["perplejidad"])
    variabilidad = float(resultado["variabilidad"])
    motivo_perplejidad = (
        "La perplejidad baja indica que las secuencias de palabras resultan "
        "relativamente predecibles."
        if perplejidad <= 40
        else "La perplejidad observada refleja la predictibilidad de las "
        "secuencias de palabras."
    )
    motivo_variabilidad = (
        "La variabilidad reducida muestra un ritmo similar entre las oraciones."
        if variabilidad <= 10
        else "La variabilidad entre oraciones refleja cambios en el ritmo "
        "y la estructura."
    )
    return [motivo_perplejidad, motivo_variabilidad]


def procesar_documento(
    document_id: str,
    contenido: bytes,
    extension: str,
    tokenizer: Any,
    model: Any,
) -> None:
    """Analiza un documento en segundo plano y conserva explícitamente su estado."""
    try:
        texto = extraer_texto_documento(contenido, extension)
        if not texto.strip():
            raise ValueError("El documento no contiene texto extraíble")
        resultado = analizar_texto(texto, tokenizer, model)
    except (PdfReadError, BadZipFile, ValueError, ValidationError, OSError):
        logger.exception("No se pudo procesar el documento %s", document_id)
        app.state.documentos[document_id]["estado"] = "error"
        app.state.documentos[document_id]["error"] = ANALYSIS_FAILURE_MESSAGE
        return
    except Exception:
        logger.exception("Falló el análisis del documento %s", document_id)
        app.state.documentos[document_id]["estado"] = "error"
        app.state.documentos[document_id]["error"] = ANALYSIS_FAILURE_MESSAGE
        return

    app.state.documentos[document_id]["estado"] = "completado"
    app.state.documentos[document_id]["resultado"] = resultado


@app.post("/api/v1/documentos/upload", status_code=201)
async def subir_documento(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> Dict[str, str]:
    """Valida un PDF/DOCX de hasta 5 MiB y programa su análisis."""
    contenido = await file.read(MAX_DOCUMENT_BYTES + 1)
    if len(contenido) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 5 MiB")

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
    request.app.state.documentos[document_id] = {"estado": "procesando"}
    request.app.state.sesiones[session_id] = {
        "document_id": document_id,
        "expira": datetime.now(timezone.utc) + SESSION_TTL,
    }
    background_tasks.add_task(
        procesar_documento,
        document_id,
        contenido,
        extension,
        request.app.state.tokenizer,
        request.app.state.model,
    )
    return {
        "document_id": document_id,
        "session_id": session_id,
        "estado": "procesando",
    }


@app.get("/api/v1/documentos/{document_id}/resultado")
async def obtener_resultado(document_id: str, request: Request) -> Dict[str, Any]:
    """Devuelve las métricas del análisis o el estado explícito del proceso."""
    documento = request.app.state.documentos.get(document_id)
    if documento is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if documento["estado"] == "error":
        raise HTTPException(status_code=503, detail=ANALYSIS_FAILURE_MESSAGE)
    if documento["estado"] != "completado":
        raise HTTPException(status_code=202, detail="El documento aún se está procesando")

    resultado = documento["resultado"]
    return {
        "document_id": document_id,
        "porcentaje_ia": resultado["puntuacion"],
        "nivel": resultado["nivel"],
        "motivos": crear_motivos(resultado),
    }


def generar_respuesta_chat(
    mensaje: str,
    resultado: Dict[str, Any],
    tokenizer: Any,
    model: Any,
) -> str:
    """Genera una respuesta contextual usando el modelo causal configurado."""
    prompt = (
        "Explica brevemente en español una estimación estadística orientativa. "
        f"Pregunta: {mensaje}\n"
        f"Perplejidad: {resultado['perplejidad']}. "
        f"Variabilidad: {resultado['variabilidad']}. "
        f"Porcentaje estimado de IA: {resultado['puntuacion']}%.\n"
        "Respuesta:"
    )
    entradas = tokenizer(prompt, return_tensors="pt")
    with torch.no_grad():
        salida = model.generate(
            entradas["input_ids"],
            max_new_tokens=80,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
    respuesta = tokenizer.decode(
        salida[0, entradas["input_ids"].shape[1]:],
        skip_special_tokens=True,
    ).strip()
    if not respuesta:
        raise RuntimeError("El modelo no generó una explicación")
    return respuesta


@app.post("/api/v1/chat/mensaje")
async def enviar_mensaje_chat(
    peticion: ChatMessage,
    request: Request,
) -> Dict[str, Any]:
    """Responde preguntas sobre el análisis asociado a una sesión vigente."""
    sesion = request.app.state.sesiones.get(peticion.session_id)
    ahora = datetime.now(timezone.utc)
    if sesion is None or sesion["expira"] <= ahora:
        request.app.state.sesiones.pop(peticion.session_id, None)
        raise HTTPException(status_code=401, detail=EXPIRED_SESSION_MESSAGE)

    documento = request.app.state.documentos.get(sesion["document_id"])
    if documento is None or documento["estado"] != "completado":
        raise HTTPException(status_code=503, detail=ANALYSIS_FAILURE_MESSAGE)

    resultado = documento["resultado"]
    try:
        respuesta = generar_respuesta_chat(
            peticion.mensaje,
            resultado,
            request.app.state.tokenizer,
            request.app.state.model,
        )
    except Exception as error:
        logger.exception("No se pudo generar una respuesta para el chat")
        raise HTTPException(
            status_code=503,
            detail="No se pudo generar una explicación en este momento",
        ) from error
    return {
        "respuesta": respuesta,
        "razones": crear_motivos(resultado),
    }


# Montaje de la interfaz web estática en la raíz "/" tras definir la ruta /analizar
app.mount("/", StaticFiles(directory="static", html=True), name="static")
