"""Módulo para el cálculo de perplejidad, variabilidad y puntuación de probabilidad estimada de IA."""
import os
import re
import statistics
from typing import Any, Dict, List, Tuple
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

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
MIN_PALABRAS_ORACION: int = 4
AVISO_LEGAL: str = (
    "Esta puntuación es solo una estimación estadística heurística y "
    "no constituye una prueba definitiva de autoría humana o por IA."
)


def cargar_modelo(nombre_modelo: str = MODELO_ID) -> Tuple[Any, Any]:
    """Carga el tokenizador y el modelo causal de Hugging Face.

    Args:
        nombre_modelo: Identificador del modelo en Hugging Face.

    Returns:
        Tupla con (tokenizer, model) configurados para inferencia.
    """
    try:
        tokenizer = AutoTokenizer.from_pretrained(nombre_modelo)
        model = AutoModelForCausalLM.from_pretrained(nombre_modelo)
    except Exception:
        # Fallback a 'gpt2' si el modelo en español no está disponible
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
    """
    encodings = tokenizer(texto, return_tensors="pt")
    input_ids = encodings.input_ids
    # Si el texto excede el contexto máximo del modelo, truncamos los tokens
    max_len = getattr(model.config, "n_positions", 1024)
    if input_ids.shape[1] > max_len:
        input_ids = input_ids[:, :max_len]
    with torch.no_grad():
        outputs = model(input_ids, labels=input_ids)
        loss = outputs.loss
    return round(float(torch.exp(loss).item()), 2)


def dividir_en_oraciones(texto: str) -> List[str]:
    """Divide un texto en oraciones válidas ignorando fragmentos demasiado cortos.

    Args:
        texto: Texto original a dividir.

    Returns:
        Lista de oraciones con al menos MIN_PALABRAS_ORACION palabras.
    """
    partes = re.split(r"(?<=[.!?])\s+", texto.strip())
    oraciones: List[str] = []
    for parte in partes:
        oracion = parte.strip()
        # Ignora oraciones demasiado cortas para medir perplejidad útil
        if len(oracion.split()) >= MIN_PALABRAS_ORACION:
            oraciones.append(oracion)
    return oraciones


def calcular_variabilidad(perplejidades: List[float]) -> float:
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


def calcular_puntuacion_ia(ppl: float, variabilidad: float, num_oraciones: int) -> Tuple[float, str]:
    """Calcula la puntuación (0-100) y nivel de probabilidad estimada de IA.

    Args:
        ppl: Perplejidad global del texto.
        variabilidad: Desviación estándar de perplejidad entre oraciones.
        num_oraciones: Cantidad de oraciones válidas procesadas.

    Returns:
        Tupla con la puntuación calculada y el nivel cualitativo.
    """
    # Mapeo heurístico inverso: menor perplejidad implica mayor probabilidad IA
    score_ppl = max(0.0, min(100.0, (UMBRAL_PPL_ALTA - ppl) / (UMBRAL_PPL_ALTA - UMBRAL_PPL_BAJA) * 100.0))
    if num_oraciones >= 2:
        score_var = max(0.0, min(100.0, (UMBRAL_VAR_ALTA - variabilidad) / (UMBRAL_VAR_ALTA - UMBRAL_VAR_BAJA) * 100.0))
        puntuacion = (score_ppl * 0.7) + (score_var * 0.3)
    else:
        # Menos de 2 oraciones válidas: se basa solo en perplejidad
        puntuacion = score_ppl
    puntuacion = round(puntuacion, 2)
    nivel = "alto" if puntuacion >= 70.0 else ("medio" if puntuacion >= 35.0 else "bajo")
    return puntuacion, nivel


def obtener_sospechosas(oraciones_ppl: List[Tuple[str, float]]) -> List[str]:
    """Retorna las 3 oraciones más predecibles (menor perplejidad).

    Args:
        oraciones_ppl: Lista de tuplas (oración, perplejidad).

    Returns:
        Lista de hasta 3 textos de oraciones más sospechosas.
    """
    ordenadas = sorted(oraciones_ppl, key=lambda x: x[1])
    return [oracion for oracion, _ in ordenadas[:3]]


def analizar_texto(texto: str, tokenizer: Any, model: Any) -> Dict[str, Any]:
    """Ejecuta el análisis completo de perplejidad, burstiness y estimación de IA.

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
