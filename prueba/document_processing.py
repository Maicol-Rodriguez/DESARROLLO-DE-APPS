"""Extracción y análisis de documentos cargados por la API."""

from io import BytesIO
import logging
from typing import Any, Callable
from zipfile import BadZipFile, ZipFile

from docx import Document
from pydantic import ValidationError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from api_constants import (
    ANALYSIS_FAILURE_MESSAGE,
    MAX_ANALYSIS_CHARACTERS,
    MAX_DOCX_ARCHIVE_ENTRIES,
    MAX_DOCX_UNCOMPRESSED_BYTES,
    MAX_DOCUMENT_PAGES,
)
from detector import UMBRAL_PPL_BAJA, UMBRAL_VAR_BAJA
from text_validation import validar_texto_analisis

logger = logging.getLogger(__name__)


def extraer_texto_documento(contenido: bytes, extension: str) -> str:
    """Extract text from validated PDF or DOCX bytes.

    Args:
        contenido: Binary file contents.
        extension: Lowercase file extension (``.pdf`` or ``.docx``).

    Returns:
        Extracted paragraphs joined with newline characters.

    Raises:
        ValueError: If the extension is unsupported.
        OSError, BadZipFile, PdfReadError: If the file cannot be parsed.
    """
    if extension == ".pdf":
        lector = PdfReader(BytesIO(contenido))
        if len(lector.pages) > MAX_DOCUMENT_PAGES:
            raise ValueError(
                f"El PDF supera el límite de {MAX_DOCUMENT_PAGES} páginas."
            )
        fragmentos: list[str] = []
        total_caracteres = 0
        for pagina in lector.pages:
            fragmento = pagina.extract_text() or ""
            total_caracteres += len(fragmento) + bool(fragmentos)
            if total_caracteres > MAX_ANALYSIS_CHARACTERS:
                raise ValueError(
                    f"El texto extraído supera el límite de "
                    f"{MAX_ANALYSIS_CHARACTERS} caracteres."
                )
            fragmentos.append(fragmento)
        return "\n".join(fragmentos)
    if extension == ".docx":
        with ZipFile(BytesIO(contenido)) as archivo_zip:
            entradas = archivo_zip.infolist()
            if len(entradas) > MAX_DOCX_ARCHIVE_ENTRIES:
                raise ValueError("El documento Word contiene demasiados elementos.")
            if sum(entrada.file_size for entrada in entradas) > MAX_DOCX_UNCOMPRESSED_BYTES:
                raise ValueError("El documento Word excede el límite de contenido descomprimido.")
        documento = Document(BytesIO(contenido))
        fragmentos = [parrafo.text for parrafo in documento.paragraphs]
        fragmentos.extend(
            celda.text
            for tabla in documento.tables
            for fila in tabla.rows
            for celda in fila.cells
        )
        texto = "\n".join(fragmentos)
        if len(texto) > MAX_ANALYSIS_CHARACTERS:
            raise ValueError(
                f"El texto extraído supera el límite de "
                f"{MAX_ANALYSIS_CHARACTERS} caracteres."
            )
        return texto
    raise ValueError(f"Extensión de documento no soportada: {extension}")


def crear_motivos(resultado: dict[str, Any]) -> list[str]:
    """Build explanatory reasons from analysis metrics.

    Args:
        resultado: Analysis result with ``perplejidad`` and ``variabilidad``.

    Returns:
        Two reasons derived from those metrics.

    Raises:
        KeyError, TypeError, ValueError: If metrics are missing or invalid.
    """
    perplejidad = float(resultado["perplejidad"])
    variabilidad = float(resultado["variabilidad"])
    motivo_perplejidad = (
        "El modelo pudo anticipar con facilidad varias combinaciones de palabras."
        if perplejidad <= UMBRAL_PPL_BAJA
        else "El modelo tuvo más dificultad para anticipar algunas combinaciones "
        "de palabras."
    )
    motivo_variabilidad = (
        "Las oraciones tienen cambios pequeños en su forma y ritmo."
        if variabilidad <= UMBRAL_VAR_BAJA
        else "Las oraciones cambian bastante en su forma y ritmo."
    )
    return [motivo_perplejidad, motivo_variabilidad]


def procesar_documento(
    document_id: str,
    contenido: bytes,
    extension: str,
    documentos: dict[str, dict[str, Any]],
    tokenizer: Any,
    model: Any,
    extraer_texto: Callable[[bytes, str], str],
    analizar: Callable[[str, Any, Any], dict[str, Any]],
) -> None:
    """Analyze a document and store its success or error state.

    Args:
        document_id: Document record identifier.
        contenido: File bytes to parse.
        extension: Validated file extension.
        documentos: Shared document records.
        tokenizer: Loaded model tokenizer.
        model: Loaded causal model.
        extraer_texto: File-to-text extraction function.
        analizar: Text analysis function.

    Returns:
        ``None``; updates the document record in place.

    Raises:
        KeyError: If the shared document entry was removed unexpectedly.
    """
    try:
        texto = extraer_texto(contenido, extension)
        validar_texto_analisis(texto)
        resultado = analizar(texto, tokenizer, model)
    except ValueError as error:
        logger.exception("No se pudo procesar el documento %s", document_id)
        documento = documentos.get(document_id)
        if documento is not None:
            documento["estado"] = "error"
            documento["error"] = str(error)
        return
    except (
        BadZipFile,
        EOFError,
        KeyError,
        OSError,
        PdfReadError,
        RuntimeError,
        ValidationError,
    ):
        logger.exception("No se pudo procesar el documento %s", document_id)
        documento = documentos.get(document_id)
        if documento is not None:
            documento["estado"] = "error"
            documento["error"] = ANALYSIS_FAILURE_MESSAGE
        return

    documento = documentos.get(document_id)
    if documento is not None:
        documento["estado"] = "completado"
        documento["resultado"] = resultado
        documento["texto"] = texto
