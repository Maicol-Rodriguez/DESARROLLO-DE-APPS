"""Suite de pruebas unitarias formales para la Semana 7.

Diseñada con técnicas formales de caja negra:
1. Particiones de equivalencia (clases válidas e inválidas).
2. Análisis de valores límite (fronteras min-1, min, max, max+1).
3. Tablas de decisión (combinaciones de reglas de negocio).
"""

from io import BytesIO
import time
from unittest.mock import MagicMock
import pytest
from pydantic import ValidationError
from pypdf import PdfWriter

from api_constants import (
    MAX_ANALYSIS_CHARACTERS,
    MAX_ANALYSIS_SENTENCES,
    MAX_CHAT_MESSAGE_LENGTH,
    MAX_DOCUMENT_PAGES,
    MIN_ANALYSIS_WORDS,
)
from detector import (
    UMBRAL_PPL_ALTA,
    UMBRAL_PPL_BAJA,
    UMBRAL_VAR_ALTA,
    UMBRAL_VAR_BAJA,
    calcular_puntuacion_ia,
    calcular_variabilidad,
    dividir_en_oraciones,
    obtener_sospechosas,
)
from document_processing import extraer_texto_documento
from main import ChatMessage
from rate_limiting import FixedWindowRateLimiter
from text_validation import validar_texto_analisis


# ==============================================================================
# REGLA 1: VALIDACIÓN DE TEXTO DE ANÁLISIS (text_validation.py)
# ==============================================================================

class TestValidacionTextoAnalisis:
    """Casos de prueba para validar_texto_analisis según límites y particiones."""

    def test_particion_valida_texto_estandar(self) -> None:
        """Partición válida: texto con 50 palabras, oraciones estándar y longitud permitida."""
        palabras = ["palabra"] * 50
        texto = " ".join(palabras) + "."
        resultado = validar_texto_analisis(texto)
        assert resultado == texto

    @pytest.mark.parametrize(
        "texto_invalido, motivo",
        [
            ("", "cadena vacía"),
            ("   \t  \n  ", "solo espacios en blanco"),
        ],
    )
    def test_particion_invalida_texto_vacio(self, texto_invalido: str, motivo: str) -> None:
        """Partición inválida: textos vacíos o solo con caracteres de espacio en blanco."""
        with pytest.raises(ValueError, match="no puede estar vacío"):
            validar_texto_analisis(texto_invalido)

    @pytest.mark.parametrize(
        "cantidad_palabras, esperado_valido",
        [
            (MIN_ANALYSIS_WORDS - 1, False),  # 49 palabras: Límite min - 1
            (MIN_ANALYSIS_WORDS, True),       # 50 palabras: Límite min exacto
            (MIN_ANALYSIS_WORDS + 1, True),   # 51 palabras: Límite min + 1
        ],
    )
    def test_valores_limite_conteo_palabras(
        self, cantidad_palabras: int, esperado_valido: bool
    ) -> None:
        """Valores límite para el conteo mínimo de palabras (49, 50 y 51 palabras)."""
        texto = " ".join(["palabra"] * cantidad_palabras) + "."
        if esperado_valido:
            assert validar_texto_analisis(texto) == texto
        else:
            with pytest.raises(ValueError, match=f"al menos {MIN_ANALYSIS_WORDS} palabras"):
                validar_texto_analisis(texto)

    @pytest.mark.parametrize(
        "delta, esperado_valido",
        [
            (0, True),   # 5000 caracteres: Límite max exacto
            (1, False),  # 5001 caracteres: Límite max + 1
        ],
    )
    def test_valores_limite_longitud_caracteres(self, delta: int, esperado_valido: bool) -> None:
        """Valores límite de caracteres máximos (5000 y 5001 caracteres)."""
        # Base de 50 palabras para satisfacer el mínimo de palabras
        base = " ".join(["palabra"] * MIN_ANALYSIS_WORDS) + ". "
        caracteres_restantes = (MAX_ANALYSIS_CHARACTERS + delta) - len(base)
        texto = base + ("a" * caracteres_restantes)

        assert len(texto) == MAX_ANALYSIS_CHARACTERS + delta
        if esperado_valido:
            assert validar_texto_analisis(texto) == texto
        else:
            with pytest.raises(ValueError, match="superar los 5000 caracteres"):
                validar_texto_analisis(texto)

    @pytest.mark.parametrize(
        "num_oraciones, esperado_valido",
        [
            (MAX_ANALYSIS_SENTENCES, True),      # 100 oraciones válidas: Límite max exacto
            (MAX_ANALYSIS_SENTENCES + 1, False),  # 101 oraciones válidas: Límite max + 1
        ],
    )
    def test_valores_limite_oraciones_validas(
        self, num_oraciones: int, esperado_valido: bool
    ) -> None:
        """Valores límite de oraciones con >= 4 palabras (100 vs 101 oraciones)."""
        oracion_valida = "Esta es una oración."  # 4 palabras
        texto = " ".join([oracion_valida] * num_oraciones)

        if esperado_valido:
            assert validar_texto_analisis(texto) == texto
        else:
            with pytest.raises(ValueError, match="100 oraciones"):
                validar_texto_analisis(texto)

    def test_caso_dificil_caracteres_especiales_y_puntuacion_multiple(self) -> None:
        """Cubre tildes, eñes, saltos de línea, comillas y puntuación múltiple."""
        texto_complejo = (
            "¿La computación cuántica revolucionará el análisis de textos lingüísticos en español? "
            "¡Absolutamente sí! Cada año surgen nuevos métodos estadísticos y modelos de lenguaje. "
            "El niño y la niña leyeron cincuenta artículos sobre inteligencia artificial "
            "y procesamiento del lenguaje natural en la universidad. "
            "No obstante, siempre es necesario auditar la coherencia interna del mensaje. "
            "La variabilidad estilística y la perplejidad ofrecen pistas "
            "sobre la autoría probable. "
            "Por ende, consideramos que este párrafo extenso satisface plenamente las reglas."
        )
        assert len(texto_complejo.split()) >= MIN_ANALYSIS_WORDS
        resultado = validar_texto_analisis(texto_complejo)
        assert resultado == texto_complejo


# ==============================================================================
# REGLA 2: CÁLCULO DE PUNTUACIÓN Y CLASIFICACIÓN DE NIVEL IA (detector.py)
# ==============================================================================

class TestCalculoPuntuacionIA:
    """Casos de prueba para calcular_puntuacion_ia y mapeo heurístico."""

    @pytest.mark.parametrize(
        "ppl, variabilidad, num_oraciones, score_esperado, nivel_esperado",
        [
            # Partición Extrema IA: PPL mínima (<=40) y Var mínima (<=10) -> Score 100.0, Nivel alto
            (30.0, 5.0, 5, 100.0, "alto"),
            # Partición Extrema Humano: PPL alta (>=80) y Var alta (>=25) -> Score 0.0, Nivel bajo
            (90.0, 30.0, 5, 0.0, "bajo"),
            # Partición intermedia: PPL y variabilidad medias -> puntuación y nivel medios.
            (60.0, 17.5, 4, 50.0, "medio"),
        ],
    )
    def test_particiones_equivalencia_globales(
        self,
        ppl: float,
        variabilidad: float,
        num_oraciones: int,
        score_esperado: float,
        nivel_esperado: str,
    ) -> None:
        """Particiones de equivalencia representativas para alta IA, humana y mixta."""
        score, nivel = calcular_puntuacion_ia(ppl, variabilidad, num_oraciones)
        assert score == score_esperado
        assert nivel == nivel_esperado

    @pytest.mark.parametrize(
        "ppl, score_ppl_esperado",
        [
            (UMBRAL_PPL_BAJA - 0.1, 100.0),  # 39.9 -> 100.0 (clamp)
            (UMBRAL_PPL_BAJA, 100.0),        # 40.0 -> frontera baja exacta
            (60.0, 50.0),                    # 60.0 -> punto medio exacto
            (UMBRAL_PPL_ALTA, 0.0),          # 80.0 -> frontera alta exacta
            (UMBRAL_PPL_ALTA + 0.1, 0.0),    # 80.1 -> 0.0 (clamp)
        ],
    )
    def test_valores_limite_perplejidad_aislada_mono_oracion(
        self, ppl: float, score_ppl_esperado: float
    ) -> None:
        """Valores límite sobre la perplejidad cuando num_oraciones < 2 (100% peso a PPL)."""
        score, _ = calcular_puntuacion_ia(ppl, variabilidad=0.0, num_oraciones=1)
        assert score == score_ppl_esperado

    @pytest.mark.parametrize(
        "variabilidad, score_var_esperado",
        [
            (UMBRAL_VAR_BAJA - 0.1, 100.0),  # 9.9 -> 100.0 (clamp)
            (UMBRAL_VAR_BAJA, 100.0),        # 10.0 -> frontera baja exacta
            (17.5, 50.0),                    # 17.5 -> punto medio exacto
            (UMBRAL_VAR_ALTA, 0.0),          # 25.0 -> frontera alta exacta
            (UMBRAL_VAR_ALTA + 0.1, 0.0),    # 25.1 -> 0.0 (clamp)
        ],
    )
    def test_valores_limite_variabilidad_con_ppl_neutra(
        self, variabilidad: float, score_var_esperado: float
    ) -> None:
        """Valores límite de variabilidad con PPL fija en 80.0 (score_ppl = 0).

        Puntuación total = 0 * 0.7 + score_var * 0.3.
        """
        score, _ = calcular_puntuacion_ia(ppl=80.0, variabilidad=variabilidad, num_oraciones=3)
        assert score == round(score_var_esperado * 0.3, 2)

    @pytest.mark.parametrize(
        "num_oraciones, variabilidad_irrelevante, score_esperado",
        [
            (0, 5.0, 50.0),  # 0 oraciones -> solo PPL (PPL 60 = 50.0)
            (1, 5.0, 50.0),  # 1 oración -> frontera mono-oración (solo PPL)
            # Dos oraciones: 70 % de PPL y 30 % de variabilidad.
            (2, 10.0, 65.0),
        ],
    )
    def test_valores_limite_numero_de_oraciones(
        self, num_oraciones: int, variabilidad_irrelevante: float, score_esperado: float
    ) -> None:
        """Compara la puntuación con una y dos oraciones válidas."""
        score, _ = calcular_puntuacion_ia(
            ppl=60.0,
            variabilidad=variabilidad_irrelevante,
            num_oraciones=num_oraciones,
        )
        assert score == score_esperado

    @pytest.mark.parametrize(
        "ppl, variabilidad, num_oraciones, score_esperado, nivel_esperado",
        [
            # Frontera ALTO: >= 70.0
            (UMBRAL_PPL_BAJA, UMBRAL_VAR_BAJA, 3, 100.0, "alto"),
            # Justo en el umbral 70.0: score_ppl=100 (40.0), score_var=0 (25.0) -> 70.0
            (40.0, 25.0, 3, 70.0, "alto"),
            # Justo debajo del umbral 70.0: PPL 40.1, Var 25.0 -> 99.75*0.7 = 69.825 -> 69.82
            (40.1, 25.0, 3, 69.82, "medio"),
            # Justo en el umbral 35.0: PPL 60.0 (score 50), Var 25.0 (score 0) -> 50*0.7 + 0 = 35.0
            (60.0, 25.0, 3, 35.0, "medio"),
            # Justo debajo de 35.0: PPL 60.1, Var 25.0 -> 49.75*0.7 = 34.825 -> 34.82 -> bajo
            (60.1, 25.0, 3, 34.82, "bajo"),
        ],
    )
    def test_valores_limite_clasificacion_cualitativa_nivel(
        self,
        ppl: float,
        variabilidad: float,
        num_oraciones: int,
        score_esperado: float,
        nivel_esperado: str,
    ) -> None:
        """Fronteras exactas para los umbrales de nivel alto (70.0) y medio (35.0)."""
        score, nivel = calcular_puntuacion_ia(ppl, variabilidad, num_oraciones)
        assert score == score_esperado
        assert nivel == nivel_esperado


# ==============================================================================
# REGLA 3: FUNCIONES AUXILIARES DE ANÁLISIS LINGÜÍSTICO (detector.py)
# ==============================================================================

class TestFuncionesAuxiliaresDetector:
    """Pruebas unitarias para dividir_en_oraciones, calcular_variabilidad y obtener_sospechosas."""

    def test_dividir_en_oraciones_filtra_fragmentos_cortos(self) -> None:
        """Verifica que se descarten fragmentos con menos de MIN_WORDS_PER_SENTENCE (4 palabras)."""
        texto = "Hola mundo. Sí. Esta es una oración completamente válida. Ok."
        oraciones = dividir_en_oraciones(texto)
        assert len(oraciones) == 1
        assert oraciones[0] == "Esta es una oración completamente válida."

    def test_calcular_variabilidad_menos_de_dos_elementos(self) -> None:
        """Si la lista tiene 0 o 1 elementos, la variabilidad debe ser 0.0 de forma determinista."""
        assert calcular_variabilidad([]) == 0.0
        assert calcular_variabilidad([45.2]) == 0.0

    def test_calcular_variabilidad_con_muestra_suficiente(self) -> None:
        """Calcula la desviación estándar muestral con al menos dos valores."""
        # [10, 20] produce una desviación muestral de 7.07 tras redondear.
        resultado = calcular_variabilidad([10.0, 20.0])
        assert resultado == 7.07

    def test_obtener_sospechosas_retorna_hasta_tres_oraciones_con_menor_ppl(self) -> None:
        """Retorna las tres oraciones con menor PPL en orden ascendente."""
        datos = [
            ("Oración 4", 85.0),
            ("Oración 1", 12.0),
            ("Oración 5", 95.0),
            ("Oración 2", 20.5),
            ("Oración 3", 31.0),
        ]
        sospechosas = obtener_sospechosas(datos)
        assert len(sospechosas) == 3
        assert sospechosas == ["Oración 1", "Oración 2", "Oración 3"]


# ==============================================================================
# REGLA 4: EXTRACCIÓN Y VALIDACIÓN DE ARCHIVOS (document_processing.py)
# ==============================================================================

class TestProcesamientoDocumentos:
    """Pruebas de particiones e invariantes para extracción de texto."""

    def test_extraer_texto_extension_no_soportada_lanza_value_error(self) -> None:
        """Partición inválida: extensiones no reconocidas lanzan ValueError."""
        with pytest.raises(ValueError, match="no soportada"):
            extraer_texto_documento(b"contenido binario", ".exe")

    def test_extraer_texto_pdf_limite_paginas_exacto_100(self) -> None:
        """Límite superior: PDF de exactamente 100 páginas es aceptado sin error."""
        escritor = PdfWriter()
        for _ in range(MAX_DOCUMENT_PAGES):
            escritor.add_blank_page(width=72, height=72)
        stream = BytesIO()
        escritor.write(stream)

        # 100 páginas vacías deben extraerse sin excepción (solo saltos de línea de unión)
        resultado = extraer_texto_documento(stream.getvalue(), ".pdf")
        assert resultado.strip() == ""
        assert len(resultado) == MAX_DOCUMENT_PAGES - 1

    def test_extraer_texto_pdf_limite_paginas_101_lanza_value_error(self) -> None:
        """Límite superior + 1: PDF de 101 páginas es rechazado con ValueError."""
        escritor = PdfWriter()
        for _ in range(MAX_DOCUMENT_PAGES + 1):
            escritor.add_blank_page(width=72, height=72)
        stream = BytesIO()
        escritor.write(stream)

        with pytest.raises(ValueError, match=f"{MAX_DOCUMENT_PAGES} páginas"):
            extraer_texto_documento(stream.getvalue(), ".pdf")


# ==============================================================================
# REGLA 5: VALIDACIÓN DE MENSAJES DE CHAT (ChatMessage en main.py)
# ==============================================================================

class TestValidacionChatMessage:
    """Casos de prueba para el modelo ChatMessage y saneamiento de entrada."""

    def test_chat_message_valido_estandar(self) -> None:
        """Partición válida: mensaje normal dentro de longitud y sin caracteres de control."""
        msg = ChatMessage(session_id="ses-123", mensaje="¿Por qué la perplejidad es baja?")
        assert msg.mensaje == "¿Por qué la perplejidad es baja?"

    @pytest.mark.parametrize("mensaje_vacio", ["", "   ", "\t  \t"])
    def test_chat_message_vacio_lanza_validation_error(self, mensaje_vacio: str) -> None:
        """Partición inválida: mensaje vacío o con solo espacios."""
        with pytest.raises(ValidationError) as exc_info:
            ChatMessage(session_id="ses-123", mensaje=mensaje_vacio)
        assert "no puede estar vacío" in str(exc_info.value)

    @pytest.mark.parametrize(
        "longitud, esperado_valido",
        [
            (MAX_CHAT_MESSAGE_LENGTH, True),      # 500 caracteres: Límite max exacto
            (MAX_CHAT_MESSAGE_LENGTH + 1, False),  # 501 caracteres: Límite max + 1
        ],
    )
    def test_chat_message_valores_limite_longitud(
        self, longitud: int, esperado_valido: bool
    ) -> None:
        """Valores límite de 500 y 501 caracteres en el mensaje del chatbot."""
        texto = "a" * longitud
        if esperado_valido:
            msg = ChatMessage(session_id="ses-123", mensaje=texto)
            assert len(msg.mensaje) == MAX_CHAT_MESSAGE_LENGTH
        else:
            with pytest.raises(ValidationError) as exc_info:
                ChatMessage(session_id="ses-123", mensaje=texto)
            assert f"superar {MAX_CHAT_MESSAGE_LENGTH} caracteres" in str(exc_info.value)

    @pytest.mark.parametrize(
        "caracter_control",
        ["\x00", "\x07", "\x1f", "\x7f", "\n", "\r"],
    )
    def test_chat_message_caracteres_control_rechazados(self, caracter_control: str) -> None:
        """Partición inválida: rechazo de caracteres de control (ASCII < 32 o DEL 127)."""
        texto = f"Pregunta{caracter_control}con control"
        with pytest.raises(ValidationError) as exc_info:
            ChatMessage(session_id="ses-123", mensaje=texto)
        assert "caracteres de control" in str(exc_info.value)


# ==============================================================================
# REGLA 6: RATE LIMITING POR VENTANA FIJA (rate_limiting.py)
# ==============================================================================

class TestRateLimiterLogica:
    """Pruebas unitarias de valores límite y estado temporal del Rate Limiter."""

    @pytest.mark.anyio
    async def test_rate_limiter_limite_exacto_y_exceso(self) -> None:
        """Valores límite de peticiones: N solicitudes pasan, N+1 lanza HTTPException 429."""
        from fastapi import HTTPException

        limiter = FixedWindowRateLimiter(max_requests=2, window_seconds=60)
        request_mock = MagicMock()
        request_mock.client.host = "192.168.1.100"

        # Solicitud 1: Pasa (1 <= 2)
        await limiter(request_mock)

        # Solicitud 2: Pasa (2 <= 2, límite exacto)
        await limiter(request_mock)

        # Solicitud 3: Límite + 1 -> Debe lanzar 429
        with pytest.raises(HTTPException) as exc_info:
            await limiter(request_mock)
        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers
        assert int(exc_info.value.headers["Retry-After"]) > 0

    @pytest.mark.anyio
    async def test_rate_limiter_reseteo_tras_expiracion_de_ventana(self) -> None:
        """Verifica que tras expirar la ventana de tiempo, el contador se reinicie."""
        limiter = FixedWindowRateLimiter(max_requests=1, window_seconds=1)
        request_mock = MagicMock()
        request_mock.client.host = "10.0.0.1"

        # Solicitud 1: Consumida
        await limiter(request_mock)

        # Simular avance del tiempo fuera de la ventana
        limiter._clients["10.0.0.1"] = (time.monotonic() - 2.0, 1)

        # Nueva solicitud: Debe ser permitida tras reset
        await limiter(request_mock)
        registro = limiter._clients["10.0.0.1"]
        assert registro[1] == 1
