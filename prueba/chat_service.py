"""Generación local de explicaciones para el chatbot."""

from typing import Any, Dict

import torch


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
