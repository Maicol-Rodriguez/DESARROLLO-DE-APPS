"""Criterios de aceptación y pruebas de API para la Semana 8."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
import torch
from fastapi.testclient import TestClient

import detector
import document_processing
import main
from api_constants import (
    ANALYSIS_FAILURE_MESSAGE,
    MAX_ANALYSIS_CHARACTERS,
    MAX_DOCX_ARCHIVE_ENTRIES,
    MAX_DOCX_UNCOMPRESSED_BYTES,
    MIN_ANALYSIS_WORDS,
)
from detector import calcular_perplejidad, cargar_modelo
from document_processing import extraer_texto_documento

TEXTO_VALIDO = " ".join(["palabra"] * MIN_ANALYSIS_WORDS)
RESULTADO = {
    "puntuacion": 65.5,
    "nivel": "medio",
    "perplejidad": 45.0,
    "variabilidad": 12.0,
    "oraciones_sospechosas": ["Oración sospechosa."],
    "aviso": "Estimación orientativa.",
}


def _simular_archivo_docx(
    monkeypatch: pytest.MonkeyPatch,
    tamanos: list[int],
) -> None:
    archivo = MagicMock()
    archivo.__enter__.return_value = archivo
    archivo.__exit__.return_value = None
    archivo.infolist.return_value = [
        SimpleNamespace(file_size=tamano) for tamano in tamanos
    ]
    monkeypatch.setattr(
        document_processing,
        "ZipFile",
        lambda *_args, **_kwargs: archivo,
    )


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Aísla el estado HTTP y evita cargar el modelo local."""
    monkeypatch.setattr(main, "cargar_modelo", lambda: (None, None))
    main.app.state.documentos = {}
    main.app.state.sesiones = {}
    main.app.state.tokenizer = None
    main.app.state.model = None
    for limiter in (
        main.limitar_analisis,
        main.limitar_cargas,
        main.limitar_chat,
        main.limitar_resultados,
    ):
        limiter._clients.clear()
    return TestClient(main.app)


def test_modelo_usa_gpt2_si_falla_el_modelo_configurado(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    llamadas: list[tuple[str, str]] = []
    model = MagicMock()

    def cargar_tokenizador(nombre: str) -> object:
        llamadas.append(("tokenizer", nombre))
        return object()

    def cargar_modelo_configurado(nombre: str) -> MagicMock:
        llamadas.append(("model", nombre))
        if nombre == "modelo-ausente":
            raise OSError("modelo no disponible")
        return model

    monkeypatch.setattr(detector.AutoTokenizer, "from_pretrained", cargar_tokenizador)
    monkeypatch.setattr(
        detector.AutoModelForCausalLM,
        "from_pretrained",
        cargar_modelo_configurado,
    )

    tokenizador, cargado = cargar_modelo("modelo-ausente")

    assert tokenizador is not None
    assert cargado is model
    assert llamadas == [
        ("tokenizer", "modelo-ausente"),
        ("model", "modelo-ausente"),
        ("tokenizer", "gpt2"),
        ("model", "gpt2"),
    ]
    model.eval.assert_called_once_with()


def test_perplejidad_trunca_tokens_al_contexto_del_modelo() -> None:
    tokenizer = MagicMock(
        return_value=SimpleNamespace(input_ids=torch.tensor([[10, 11, 12, 13, 14]]))
    )
    model = MagicMock()
    model.config = SimpleNamespace(n_positions=3)
    model.return_value.loss = torch.tensor(0.0)

    perplejidad = calcular_perplejidad("texto extenso", tokenizer, model)

    assert perplejidad == 1.0
    assert model.call_args.args[0].tolist() == [[10, 11, 12]]
    assert model.call_args.kwargs["labels"].tolist() == [[10, 11, 12]]


def test_perplejidad_no_trunca_contexto_en_el_limite_exacto() -> None:
    class TokensEnLimite:
        shape = (1, 3)

        def __getitem__(self, _indice: object) -> None:
            raise AssertionError("no se debe truncar una secuencia del tamaño exacto")

    tokens = TokensEnLimite()
    tokenizer = MagicMock(return_value=SimpleNamespace(input_ids=tokens))
    model = MagicMock()
    model.config = SimpleNamespace(n_positions=3)
    model.return_value.loss = torch.tensor(0.0)

    assert calcular_perplejidad("texto exacto", tokenizer, model) == 1.0
    assert model.call_args.args[0] is tokens


@pytest.mark.parametrize(
    ("longitud", "debe_fallar"),
    [(MAX_ANALYSIS_CHARACTERS, False), (MAX_ANALYSIS_CHARACTERS + 1, True)],
)
def test_extraccion_pdf_respeta_frontera_de_caracteres(
    monkeypatch: pytest.MonkeyPatch,
    longitud: int,
    debe_fallar: bool,
) -> None:
    """La extracción acepta el límite inclusivo y rechaza el primer carácter extra."""
    pagina = SimpleNamespace(extract_text=lambda: "x" * longitud)
    monkeypatch.setattr(
        document_processing,
        "PdfReader",
        lambda _stream: SimpleNamespace(pages=[pagina]),
    )

    if debe_fallar:
        with pytest.raises(ValueError, match="supera el límite"):
            extraer_texto_documento(b"pdf de prueba", ".pdf")
    else:
        assert extraer_texto_documento(b"pdf de prueba", ".pdf") == "x" * longitud


def test_extraccion_docx_rechaza_demasiadas_entradas(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _simular_archivo_docx(
        monkeypatch,
        [0] * (MAX_DOCX_ARCHIVE_ENTRIES + 1),
    )

    with pytest.raises(ValueError, match="demasiados elementos"):
        extraer_texto_documento(b"docx de prueba", ".docx")


def test_extraccion_docx_rechaza_contenido_descomprimido_excesivo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _simular_archivo_docx(
        monkeypatch,
        [MAX_DOCX_UNCOMPRESSED_BYTES + 1],
    )

    with pytest.raises(ValueError, match="contenido descomprimido"):
        extraer_texto_documento(b"docx de prueba", ".docx")


def test_extraccion_docx_rechaza_texto_sobre_el_limite(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _simular_archivo_docx(monkeypatch, [1])
    monkeypatch.setattr(
        document_processing,
        "Document",
        lambda _stream: SimpleNamespace(
            paragraphs=[SimpleNamespace(text="x" * (MAX_ANALYSIS_CHARACTERS + 1))],
            tables=[],
        ),
    )

    with pytest.raises(ValueError, match="supera el límite"):
        extraer_texto_documento(b"docx de prueba", ".docx")


def test_analisis_api_crea_documento_y_sesion_con_resultado(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Dado: un texto válido y un análisis determinista.
    # Cuando: se solicita /analizar.
    # Entonces: HTTP, cuerpo y estado persistido coinciden con el contrato.
    monkeypatch.setattr(main, "analizar_texto", lambda *_args: RESULTADO)

    response = client.post("/analizar", json={"texto": TEXTO_VALIDO})

    assert response.status_code == 200
    cuerpo = response.json()
    assert cuerpo == {**RESULTADO, "session_id": cuerpo["session_id"]}
    session_id = cuerpo["session_id"]
    assert session_id in main.app.state.sesiones
    session = main.app.state.sesiones[session_id]
    assert session["historial"] == []
    document = main.app.state.documentos[session["document_id"]]
    assert document["estado"] == "completado"
    assert document["texto"] == TEXTO_VALIDO
    assert document["resultado"] == RESULTADO


def test_analisis_api_rechaza_entrada_invalida_sin_mutar_estado(
    client: TestClient,
) -> None:
    # Dado: una entrada inferior al mínimo.
    # Cuando: se envía a /analizar.
    # Entonces: HTTP 422 describe la validación y no se crean registros.
    response = client.post("/analizar", json={"texto": "palabra " * 3})

    assert response.status_code == 422
    assert response.json() == {
        "error": "Datos de entrada inválidos",
        "detalles": ["El texto debe contener al menos 50 palabras (recibidas: 3)."],
    }
    assert main.app.state.sesiones == {}
    assert main.app.state.documentos == {}


def test_carga_rechazada_no_crea_sesion_ni_documento(client: TestClient) -> None:
    # Dado: un PDF con extensión válida pero firma incorrecta.
    # Cuando: se carga en la API.
    # Entonces: HTTP 415 informa el rechazo sin modificar el estado.
    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"no es un PDF", "application/pdf")},
    )

    assert response.status_code == 415
    assert response.json() == {
        "detail": "Formato no soportado. Por favor, suba únicamente archivos PDF o Word"
    }
    assert main.app.state.sesiones == {}
    assert main.app.state.documentos == {}


def test_documento_en_proceso_devuelve_202_sin_cambiar_estado(
    client: TestClient,
) -> None:
    # Dado: sesión propietaria vigente y documento procesándose.
    # Cuando: se consulta el resultado con X-Session-Id.
    # Entonces: HTTP 202 indica espera y ambos registros siguen intactos.
    ahora = datetime.now(timezone.utc)
    session_id = "sesion-espera"
    document_id = "documento-espera"
    main.app.state.sesiones[session_id] = {
        "document_id": document_id,
        "expira": ahora + timedelta(minutes=5),
    }
    main.app.state.documentos[document_id] = {
        "estado": "procesando",
        "expira": ahora + timedelta(minutes=5),
    }

    response = client.get(
        f"/api/v1/documentos/{document_id}/resultado",
        headers={"X-Session-Id": session_id},
    )

    assert response.status_code == 202
    assert response.json() == {"detail": "El documento aún se está procesando"}
    assert main.app.state.documentos[document_id]["estado"] == "procesando"
    assert main.app.state.sesiones[session_id]["document_id"] == document_id


def test_error_de_tipo_en_analisis_finaliza_documento_y_api_informa_503(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Dado: análisis documental que falla con TypeError.
    # Cuando: se carga y luego se consulta con X-Session-Id.
    # Entonces: el documento termina en error y la API responde 503.
    monkeypatch.setattr(main, "extraer_texto_documento", lambda *_args: TEXTO_VALIDO)

    def fallar_analisis(*_args: object) -> dict[str, object]:
        raise TypeError("tipo de salida inesperado")

    monkeypatch.setattr(main, "analizar_texto", fallar_analisis)
    carga = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"%PDF-1.4\ncontenido", "application/pdf")},
    )

    assert carga.status_code == 201
    datos = carga.json()
    assert datos["estado"] == "procesando"
    document_id = datos["document_id"]
    session_id = datos["session_id"]
    assert main.app.state.documentos[document_id]["estado"] == "error"
    assert main.app.state.documentos[document_id]["error"] == ANALYSIS_FAILURE_MESSAGE

    response = client.get(
        f"/api/v1/documentos/{document_id}/resultado",
        headers={"X-Session-Id": session_id},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": ANALYSIS_FAILURE_MESSAGE}


def test_rate_limit_api_expone_retry_after_sin_crear_estado(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Dado: límite de una solicitud y análisis determinista.
    # Cuando: se envía una segunda solicitud al endpoint.
    # Entonces: HTTP 429 incluye Retry-After y no crea estado adicional.
    monkeypatch.setattr(main.limitar_analisis, "max_requests", 1)
    monkeypatch.setattr(main, "analizar_texto", lambda *_args: RESULTADO)

    primera = client.post("/analizar", json={"texto": TEXTO_VALIDO})
    sesiones_antes = dict(main.app.state.sesiones)
    documentos_antes = dict(main.app.state.documentos)
    segunda = client.post("/analizar", json={"texto": TEXTO_VALIDO})

    assert primera.status_code == 200
    assert segunda.status_code == 429
    assert segunda.json() == {
        "detail": "Límite de solicitudes alcanzado; inténtalo más tarde."
    }
    assert int(segunda.headers["Retry-After"]) > 0
    assert main.app.state.sesiones == sesiones_antes
    assert main.app.state.documentos == documentos_antes
