"""Cálculo de métricas e indicador experimental de texto."""
import logging
import os
import re
import statistics
from typing import Any

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from api_constants import MIN_WORDS_PER_SENTENCE

logger = logging.getLogger(__name__)

# Configuración del modelo: se puede sobreescribir mediante variable de entorno.
# Si el modelo en español falla o no está disponible, se puede usar 'gpt2' como respaldo.
MODELO_ID: str = os.getenv("MODELO_ID", "datificate/gpt2-small-spanish")

# UMBRALES HEURÍSTICOS (SIN VALIDACIÓN CIENTÍFICA):
# Estos valores son aproximaciones experimentales. Los modelos de IA suelen generar
# texto más uniforme (baja variabilidad) y más predecible (baja perplejidad).
UMBRAL_PPL_BAJA: float = 40.0
UMBRAL_PPL_ALTA: float = 80.0
UMBRAL_VAR_BAJA: float = 10.0
UMBRAL_VAR_ALTA: float = 25.0
MIN_PALABRAS_ORACION: int = MIN_WORDS_PER_SENTENCE
LONGITUD_CONTEXTO_MODELO_POR_DEFECTO = 1024
PESO_PUNTUACION_PERPLEJIDAD = 0.7
PESO_PUNTUACION_VARIABILIDAD = 0.3
UMBRAL_PUNTUACION_ALTA = 70.0
UMBRAL_PUNTUACION_MEDIA = 35.0
MAX_ORACIONES_SOSPECHOSAS = 3
AVISO_LEGAL: str = (
    "Es una guía experimental, no una prueba: puede dar una cifra baja a un texto "
    "de IA o alta a uno escrito por una persona."
)


def cargar_modelo(nombre_modelo: str = MODELO_ID) -> tuple[Any, Any]:
    """Carga el tokenizador y el modelo causal de Hugging Face.

    Args:
        nombre_modelo: Identificador del modelo en Hugging Face.

    Returns:
        Tupla con (tokenizer, model) configurados para inferencia.

    Raises:
        OSError, ValueError: If the selected model and the GPT-2 fallback
            cannot be loaded.
    """
    try:
        tokenizer = AutoTokenizer.from_pretrained(nombre_modelo)
        model = AutoModelForCausalLM.from_pretrained(nombre_modelo)
    except (OSError, ValueError) as error:
        logger.warning(
            "No se pudo cargar el modelo %s; se intentará usar GPT-2: %s",
            nombre_modelo,
            error,
        )
        tokenizer = AutoTokenizer.from_pretrained("gpt2")
        model = AutoModelForCausalLM.from_pretrained("gpt2")
    model.eval()
    return tokenizer, model


def calcular_perplejidad(texto: str, tokenizer: Any, model: Any) -> float:
    """Calcula la perplejidad de un fragmento de texto usando GPT-2.

    Args:
        texto: Texto a evaluar.
        tokenizer: Tokenizador Hugging Face.
        model: Modelo GPT-2.

    Returns:
        Valor de perplejidad como número de punto flotante.

    Raises:
        Exceptions raised by the tokenizer or model: Propagated if inference fails.
    """
    encodings = tokenizer(texto, return_tensors="pt")
    input_ids = encodings.input_ids
    # Si el texto excede el contexto máximo del modelo, truncamos los tokens
    max_len = getattr(
        model.config,
        "n_positions",
        LONGITUD_CONTEXTO_MODELO_POR_DEFECTO,
    )
    if input_ids.shape[1] > max_len:
        input_ids = input_ids[:, :max_len]
    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)
        loss = outputs.loss
    return round(float(torch.exp(loss).item()), 2)


def dividir_en_oraciones(texto: str) -> list[str]:
    """Divide un texto en oraciones válidas ignorando fragmentos demasiado cortos.

    Args:
        texto: Texto original a dividir.

    Returns:
        Lista de oraciones con al menos MIN_PALABRAS_ORACION palabras.
    """
    partes = re.split(r"(?<=[.!?])\s+", texto.strip())
    oraciones: list[str] = []
    for parte in partes:
        oracion = parte.strip()
        # Ignora oraciones demasiado cortas para medir perplejidad útil
        if len(oracion.split()) >= MIN_PALABRAS_ORACION:
            oraciones.append(oracion)
    return oraciones


def calcular_variabilidad(perplejidades: list[float]) -> float:
    """Calcula la variabilidad (burstiness) como la desviación estándar.

    Si el texto tiene menos de 2 oraciones válidas, la variabilidad es 0.0
    y queda documentado porque no hay muestra suficiente para dispersión.

    Args:
        perplejidades: Lista de perplejidades por oración.

    Returns:
        Desviación estándar de las perplejidades.
    """
    if len(perplejidades) < 2:
        return 0.0
    return round(float(statistics.stdev(perplejidades)), 2)


def calcular_puntuacion_ia(
    ppl: float,
    variabilidad: float,
    num_oraciones: int,
) -> tuple[float, str]:
    """Calcula un índice heurístico (0-100) y su nivel cualitativo.

    Args:
        ppl: Perplejidad global del texto.
        variabilidad: Desviación estándar de perplejidad entre oraciones.
        num_oraciones: Cantidad de oraciones válidas procesadas.

    Returns:
        Tupla con la puntuación calculada y el nivel cualitativo.
    """
    # Mapeo heurístico inverso: menor perplejidad implica mayor probabilidad IA
    rango_ppl = UMBRAL_PPL_ALTA - UMBRAL_PPL_BAJA
    score_ppl = max(
        0.0,
        min(100.0, (UMBRAL_PPL_ALTA - ppl) / rango_ppl * 100.0),
    )
    if num_oraciones >= 2:
        rango_var = UMBRAL_VAR_ALTA - UMBRAL_VAR_BAJA
        score_var = max(
            0.0,
            min(100.0, (UMBRAL_VAR_ALTA - variabilidad) / rango_var * 100.0),
        )
        puntuacion = (
            score_ppl * PESO_PUNTUACION_PERPLEJIDAD
            + score_var * PESO_PUNTUACION_VARIABILIDAD
        )
    else:
        # Menos de 2 oraciones válidas: se basa solo en perplejidad
        puntuacion = score_ppl
    puntuacion = round(puntuacion, 2)
    nivel = (
        "alto"
        if puntuacion >= UMBRAL_PUNTUACION_ALTA
        else "medio"
        if puntuacion >= UMBRAL_PUNTUACION_MEDIA
        else "bajo"
    )
    return puntuacion, nivel


def obtener_sospechosas(oraciones_ppl: list[tuple[str, float]]) -> list[str]:
    """Retorna las 3 oraciones más predecibles (menor perplejidad).

    Args:
        oraciones_ppl: Lista de tuplas (oración, perplejidad).

    Returns:
        Lista de hasta 3 textos de oraciones más sospechosas.
    """
    ordenadas = sorted(oraciones_ppl, key=lambda x: x[1])
    return [
        oracion
        for oracion, _ in ordenadas[:MAX_ORACIONES_SOSPECHOSAS]
    ]


def analizar_texto(texto: str, tokenizer: Any, model: Any) -> dict[str, Any]:
    """Calcula perplejidad, variabilidad e índice heurístico para un texto.

    Args:
        texto: Texto a analizar.
        tokenizer: Tokenizador Hugging Face.
        model: Modelo GPT-2.

    Returns:
        Diccionario con las métricas y aviso legal del resultado.
    """
    ppl_global = calcular_perplejidad(texto, tokenizer, model)
    oraciones = dividir_en_oraciones(texto)
    ppl_oraciones = [(o, calcular_perplejidad(o, tokenizer, model)) for o in oraciones]
    variabilidad = calcular_variabilidad([p for _, p in ppl_oraciones])
    puntuacion, nivel = calcular_puntuacion_ia(ppl_global, variabilidad, len(ppl_oraciones))
    return {
        "puntuacion": puntuacion,
        "nivel": nivel,
        "perplejidad": ppl_global,
        "variabilidad": variabilidad,
        "oraciones_sospechosas": obtener_sospechosas(ppl_oraciones),
        "aviso": AVISO_LEGAL,
    }
