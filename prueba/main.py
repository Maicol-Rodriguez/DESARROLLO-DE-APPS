"""Aplicación FastAPI para la estimación de autoría de textos por IA."""
from contextlib import asynccontextmanager
import os
from typing import Any, Dict, List
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from detector import analizar_texto, cargar_modelo


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: carga el modelo una sola vez al inicio."""
    tokenizer, model = cargar_modelo()
    app.state.tokenizer = tokenizer
    app.state.model = model
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


# Montaje de la interfaz web estática en la raíz "/" tras definir la ruta /analizar
app.mount("/", StaticFiles(directory="static", html=True), name="static")
