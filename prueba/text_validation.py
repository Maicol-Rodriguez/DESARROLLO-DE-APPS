"""Validación compartida para los textos que entran al análisis."""

import re

from api_constants import (
    MAX_ANALYSIS_CHARACTERS,
    MAX_ANALYSIS_SENTENCES,
    MIN_ANALYSIS_WORDS,
    MIN_WORDS_PER_SENTENCE,
)


def validar_texto_analisis(texto: str) -> str:
    """Valida que un texto tenga contenido y respete los límites del análisis."""
    limpio = texto.strip()
    if not limpio:
        raise ValueError("El texto no puede estar vacío ni componerse solo de espacios.")

    palabras = limpio.split()
    if len(palabras) < MIN_ANALYSIS_WORDS:
        raise ValueError(
            f"El texto debe contener al menos {MIN_ANALYSIS_WORDS} palabras "
            f"(recibidas: {len(palabras)})."
        )

    if len(texto) > MAX_ANALYSIS_CHARACTERS:
        raise ValueError(
            f"El texto no debe superar los {MAX_ANALYSIS_CHARACTERS} caracteres "
            f"(recibidos: {len(texto)})."
        )

    oraciones = re.split(r"(?<=[.!?])\s+", limpio)
    oraciones_validas = sum(
        len(oracion.split()) >= MIN_WORDS_PER_SENTENCE
        for oracion in oraciones
    )
    if oraciones_validas > MAX_ANALYSIS_SENTENCES:
        raise ValueError(
            f"El texto supera el límite de {MAX_ANALYSIS_SENTENCES} oraciones "
            f"con {MIN_WORDS_PER_SENTENCE} palabras o más."
        )

    return texto
