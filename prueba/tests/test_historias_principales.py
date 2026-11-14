"""Pruebas de contrato para HU-01, HU-03 y HU-04."""

from datetime import datetime, timedelta, timezone
from io import BytesIO

import pytest
import torch
from docx import Document
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pypdf import PdfWriter

import main
from chat_service import generar_respuesta_chat
from document_processing import extraer_texto_documento


@pytest.fixture
def client() -> TestClient:
    """Crea un cliente aislado sin iniciar el modelo pesado de Transformers."""
    main.app.state.documentos = {}
    main.app.state.sesiones = {}
    main.app.state.tokenizer = None
    main.app.state.model = None
    return TestClient(main.app)


@pytest.fixture
def analisis_simulado(monkeypatch: pytest.MonkeyPatch) -> None:
    """Evita descargar el modelo y permite probar los contratos de las rutas."""
    monkeypatch.setattr(
        main,
        "extraer_texto_documento",
        lambda contenido, extension: "Texto de prueba para analizar el documento.",
    )
    monkeypatch.setattr(
        main,
        "analizar_texto",
        lambda texto, tokenizer, model: {
            "puntuacion": 80.0,
            "nivel": "alto",
            "perplejidad": 30.0,
            "variabilidad": 5.0,
            "oraciones_sospechosas": [],
            "aviso": "Estimación orientativa.",
        },
    )


def test_subir_pdf_valido_devuelve_estado_de_lectura(
    client: TestClient,
    analisis_simulado: None,
) -> None:
    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"%PDF-1.4\ncontenido", "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["document_id"]
    assert response.json()["estado"] == "procesando"


def test_subir_pdf_de_5_mib_exactos_es_aceptado(
    client: TestClient,
    analisis_simulado: None,
) -> None:
    contenido = b"%PDF-1.4\n" + b"x" * (5 * 1024 * 1024 - len(b"%PDF-1.4\n"))

    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("limite.pdf", contenido, "application/pdf")},
    )

    assert len(contenido) == 5 * 1024 * 1024
    assert response.status_code == 201


def test_subir_pdf_mayor_de_5_mib_devuelve_413(client: TestClient) -> None:
    contenido = b"%PDF-1.4\n" + b"x" * (5 * 1024 * 1024)

    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("sobre-limite.pdf", contenido, "application/pdf")},
    )

    assert response.status_code == 413


def test_subir_word_docx_valido_es_aceptado(
    client: TestClient,
    analisis_simulado: None,
) -> None:
    documento = Document()
    documento.add_paragraph("Contenido de Word para la prueba.")
    contenido = BytesIO()
    documento.save(contenido)

    response = client.post(
        "/api/v1/documentos/upload",
        files={
            "file": (
                "informe.docx",
                contenido.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 201


def test_extraer_texto_docx_incluye_parrafos_y_tablas() -> None:
    documento = Document()
    documento.add_paragraph("Texto del párrafo.")
    tabla = documento.add_table(rows=1, cols=1)
    tabla.cell(0, 0).text = "Texto de la tabla."
    contenido = BytesIO()
    documento.save(contenido)

    texto = extraer_texto_documento(contenido.getvalue(), ".docx")

    assert "Texto del párrafo." in texto
    assert "Texto de la tabla." in texto


def test_extraer_texto_pdf_valido() -> None:
    escritor = PdfWriter()
    escritor.add_blank_page(width=72, height=72)
    contenido = BytesIO()
    escritor.write(contenido)

    assert extraer_texto_documento(contenido.getvalue(), ".pdf") == ""


def test_chat_service_genera_respuesta_con_el_modelo_local() -> None:
    class TokenizadorSimulado:
        eos_token_id = 0

        def __call__(self, prompt: str, return_tensors: str) -> dict:
            self.prompt = prompt
            return {"input_ids": torch.tensor([[1, 2]])}

        def decode(self, tokens: torch.Tensor, skip_special_tokens: bool) -> str:
            return "La estimación se basa en los patrones medidos."

    class ModeloSimulado:
        def generate(self, input_ids: torch.Tensor, **kwargs: object) -> torch.Tensor:
            return torch.tensor([[1, 2, 3]])

    tokenizer = TokenizadorSimulado()
    response = generar_respuesta_chat(
        '¿Por qué "este trabajo" tiene 80%?',
        {"puntuacion": 80, "perplejidad": 30, "variabilidad": 5},
        tokenizer,
        ModeloSimulado(),
    )

    assert response == "La estimación se basa en los patrones medidos."
    assert r'\"este trabajo\"' in tokenizer.prompt


@pytest.mark.parametrize(
    "mensaje",
    ["", " " * 3, "a" * 501, "primera línea\nsegunda línea"],
)
def test_chat_rechaza_mensaje_vacio_largo_o_con_control(mensaje: str) -> None:
    with pytest.raises(ValidationError):
        main.ChatMessage(session_id="sesion-valida", mensaje=mensaje)


def test_chat_acepta_mensaje_corto_de_una_linea() -> None:
    assert main.ChatMessage(
        session_id="sesion-valida",
        mensaje="  ¿Por qué este resultado?  ",
    ).mensaje == "¿Por qué este resultado?"


def test_cors_usa_origenes_locales_y_credenciales_por_defecto(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi import FastAPI

    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    test_app = FastAPI()

    main.configurar_cors(test_app)

    options = test_app.user_middleware[0].kwargs
    assert options["allow_origins"] == [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:8100",
        "http://127.0.0.1:8100",
    ]
    assert options["allow_credentials"] is True


def test_cors_desactiva_credenciales_con_origen_comodin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi import FastAPI

    monkeypatch.setenv("ALLOWED_ORIGINS", "*")
    test_app = FastAPI()

    main.configurar_cors(test_app)

    options = test_app.user_middleware[0].kwargs
    assert options["allow_origins"] == ["*"]
    assert options["allow_credentials"] is False


def test_limpieza_elimina_sesiones_y_documentos_expirados() -> None:
    ahora = datetime.now(timezone.utc)
    sesiones = {
        "sesion-expirada": {
            "document_id": "doc-expirado",
            "expira": ahora - timedelta(seconds=1),
        },
        "sesion-vigente": {
            "document_id": "doc-vigente",
            "expira": ahora + timedelta(minutes=1),
        },
    }
    documentos = {
        "doc-expirado": {
            "estado": "completado",
            "expira": ahora - timedelta(seconds=1),
        },
        "doc-procesando": {
            "estado": "procesando",
            "expira": ahora - timedelta(seconds=1),
        },
        "doc-vigente": {
            "estado": "completado",
            "expira": ahora + timedelta(minutes=1),
        },
    }

    eliminados = main.limpiar_estado_expirado(sesiones, documentos, ahora)

    assert eliminados == 2
    assert "sesion-expirada" not in sesiones
    assert "doc-expirado" not in documentos
    assert "doc-procesando" in documentos
    assert "doc-vigente" in documentos


def test_subir_archivo_exe_devuelve_error_415(client: TestClient) -> None:
    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("programa.exe", b"MZ", "application/octet-stream")},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == (
        "Formato no soportado. Por favor, suba únicamente archivos PDF o Word"
    )


def test_resultado_devuelve_porcentaje_de_ia(
    client: TestClient,
    analisis_simulado: None,
) -> None:
    carga = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"%PDF-1.4\ncontenido", "application/pdf")},
    )
    document_id = carga.json()["document_id"]
    session_id = carga.json()["session_id"]

    response = client.get(
        f"/api/v1/documentos/{document_id}/resultado",
        headers={"X-Session-Id": session_id},
    )

    assert response.status_code == 200
    assert response.json()["porcentaje_ia"] == 80


def test_resultado_rechaza_solicitud_sin_sesion(
    client: TestClient,
) -> None:
    main.app.state.documentos["doc-privado"] = {"estado": "completado", "resultado": {}}

    response = client.get("/api/v1/documentos/doc-privado/resultado")

    assert response.status_code == 401


def test_resultado_rechaza_sesion_caducada(
    client: TestClient,
) -> None:
    main.app.state.documentos["doc-caducado"] = {"estado": "completado", "resultado": {}}
    main.app.state.sesiones["sesion-caducada"] = {
        "document_id": "doc-caducado",
        "expira": datetime.now(timezone.utc) - timedelta(seconds=1),
    }

    response = client.get(
        "/api/v1/documentos/doc-caducado/resultado",
        headers={"X-Session-Id": "sesion-caducada"},
    )

    assert response.status_code == 401
    assert "sesion-caducada" not in main.app.state.sesiones


def test_resultado_no_expone_documento_de_otra_sesion(
    client: TestClient,
) -> None:
    main.app.state.documentos["doc-ajeno"] = {"estado": "completado", "resultado": {}}
    main.app.state.sesiones["sesion-propia"] = {
        "document_id": "doc-propio",
        "expira": datetime.now(timezone.utc) + timedelta(minutes=15),
    }

    response = client.get(
        "/api/v1/documentos/doc-ajeno/resultado",
        headers={"X-Session-Id": "sesion-propia"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado"


def test_scanner_rechaza_texto_demasiado_corto(client: TestClient) -> None:
    response = client.post("/analizar", json={"texto": "Texto corto."})

    assert response.status_code == 422
    assert "al menos 50 palabras" in " ".join(response.json()["detalles"])


def test_resultado_informa_fallo_del_servidor_de_analisis(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        main,
        "extraer_texto_documento",
        lambda contenido, extension: "Texto para provocar el fallo de análisis.",
    )

    def fallar_analisis(texto: str, tokenizer: object, model: object) -> dict:
        raise RuntimeError("Modelo de análisis no disponible")

    monkeypatch.setattr(main, "analizar_texto", fallar_analisis)
    carga = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"%PDF-1.4\ncontenido", "application/pdf")},
    )
    document_id = carga.json()["document_id"]
    session_id = carga.json()["session_id"]

    response = client.get(
        f"/api/v1/documentos/{document_id}/resultado",
        headers={"X-Session-Id": session_id},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Fallo de conexión con el servidor de análisis"
    )


def test_chat_responde_con_al_menos_dos_razones_linguisticas(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    main.app.state.documentos["doc-chat"] = {
        "estado": "completado",
        "resultado": {
            "puntuacion": 80.0,
            "nivel": "alto",
            "perplejidad": 30.0,
            "variabilidad": 5.0,
        },
    }
    main.app.state.sesiones["sesion-activa"] = {
        "document_id": "doc-chat",
        "expira": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    monkeypatch.setattr(main, "generar_respuesta_chat", lambda *args: "Respuesta generada.")

    response = client.post(
        "/api/v1/chat/mensaje",
        json={
            "session_id": "sesion-activa",
            "mensaje": "¿Por qué este trabajo tiene 80%?",
        },
    )

    assert response.status_code == 200
    assert len(response.json()["razones"]) >= 2
    assert all(razon.strip() for razon in response.json()["razones"])


def test_chat_rechaza_sesion_caducada_con_401(client: TestClient) -> None:
    main.app.state.sesiones["sesion-caducada"] = {
        "document_id": "doc-caducado",
        "expira": datetime.now(timezone.utc) - timedelta(seconds=1),
    }

    response = client.post(
        "/api/v1/chat/mensaje",
        json={"session_id": "sesion-caducada", "mensaje": "¿Por qué 80%?"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Sesión caducada. Por favor, recargue la página para enviar mensajes"
    )
