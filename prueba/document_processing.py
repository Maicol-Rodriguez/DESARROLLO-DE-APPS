"""Extracción y análisis de documentos cargados por la API."""

from io import BytesIO
import logging
from typing import Any, Callable, Dict, List
from zipfile import BadZipFile

from docx import Document
from pydantic import ValidationError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from api_constants import ANALYSIS_FAILURE_MESSAGE
from detector import UMBRAL_PPL_BAJA, UMBRAL_VAR_BAJA

logger = logging.getLogger(__name__)


def extraer_texto_documento(contenido: bytes, extension: str) -> str:
    """Extrae texto de un archivo PDF o DOCX ya validado."""
    if extension == ".pdf":
        lector = PdfReader(BytesIO(contenido))
        return "\n".join(pagina.extract_text() or "" for pagina in lector.pages)
    if extension == ".docx":
        documento = Document(BytesIO(contenido))
        fragmentos = [parrafo.text for parrafo in documento.paragraphs]
        fragmentos.extend(
            celda.text
            for tabla in documento.tables
            for fila in tabla.rows
            for celda in fila.cells
        )
        return "\n".join(fragmentos)
    raise ValueError(f"Extensión de documento no soportada: {extension}")


def crear_motivos(resultado: Dict[str, Any]) -> List[str]:
    """Construye razones lingüísticas verificables a partir de las métricas."""
    perplejidad = float(resultado["perplejidad"])
    variabilidad = float(resultado["variabilidad"])
    motivo_perplejidad = (
        "La perplejidad baja indica que las secuencias de palabras resultan "
        "relativamente predecibles."
        if perplejidad <= UMBRAL_PPL_BAJA
        else "La perplejidad observada refleja la predictibilidad de las "
        "secuencias de palabras."
    )
    motivo_variabilidad = (
        "La variabilidad reducida muestra un ritmo similar entre las oraciones."
        if variabilidad <= UMBRAL_VAR_BAJA
        else "La variabilidad entre oraciones refleja cambios en el ritmo "
        "y la estructura."
    )
    return [motivo_perplejidad, motivo_variabilidad]


def procesar_documento(
    document_id: str,
    contenido: bytes,
    extension: str,
    documentos: Dict[str, Dict[str, Any]],
    tokenizer: Any,
    model: Any,
    extraer_texto: Callable[[bytes, str], str],
    analizar: Callable[[str, Any, Any], Dict[str, Any]],
) -> None:
    """Analiza un documento en segundo plano y conserva explícitamente su estado."""
    try:
        texto = extraer_texto(contenido, extension)
        if not texto.strip():
            raise ValueError("El documento no contiene texto extraíble")
        resultado = analizar(texto, tokenizer, model)
    except (
        BadZipFile,
        EOFError,
        KeyError,
        OSError,
        PdfReadError,
        RuntimeError,
        ValidationError,
        ValueError,
    ):
        logger.exception("No se pudo procesar el documento %s", document_id)
        documentos[document_id]["estado"] = "error"
        documentos[document_id]["error"] = ANALYSIS_FAILURE_MESSAGE
        return

    documentos[document_id]["estado"] = "completado"
    documentos[document_id]["resultado"] = resultado
