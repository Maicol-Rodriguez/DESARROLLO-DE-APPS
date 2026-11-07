"""Pruebas de contrato RED para HU-01, HU-03 y HU-04."""

from io import BytesIO
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from docx import Document

import main


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

    response = client.get(f"/api/v1/documentos/{document_id}/resultado")

    assert response.status_code == 200
    assert response.json()["porcentaje_ia"] == 80


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

    response = client.get(f"/api/v1/documentos/{document_id}/resultado")

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
