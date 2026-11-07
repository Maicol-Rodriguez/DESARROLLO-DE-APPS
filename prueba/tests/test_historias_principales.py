"""Pruebas de contrato RED para HU-01, HU-03 y HU-04."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Crea un cliente sin iniciar el modelo pesado de Transformers."""
    yield TestClient(app)


def test_subir_pdf_valido_devuelve_estado_de_lectura(client: TestClient) -> None:
    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"%PDF-1.4\ncontenido", "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["document_id"]
    assert response.json()["estado"] == "procesando"


def test_subir_pdf_de_5_mib_exactos_es_aceptado(client: TestClient) -> None:
    contenido = b"%PDF-1.4\n" + b"x" * (5 * 1024 * 1024 - len(b"%PDF-1.4\n"))

    response = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("limite.pdf", contenido, "application/pdf")},
    )

    assert len(contenido) == 5 * 1024 * 1024
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


def test_resultado_devuelve_porcentaje_de_ia(client: TestClient) -> None:
    response = client.get("/api/v1/documentos/doc-80/resultado")

    assert response.status_code == 200
    assert response.json()["porcentaje_ia"] == 80


def test_scanner_rechaza_texto_demasiado_corto(client: TestClient) -> None:
    response = client.post("/analizar", json={"texto": "Texto corto."})

    assert response.status_code == 422
    assert "al menos 50 palabras" in " ".join(response.json()["detalles"])


def test_resultado_informa_fallo_del_servidor_de_analisis(client: TestClient) -> None:
    response = client.get("/api/v1/documentos/analisis-caido/resultado")

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Fallo de conexión con el servidor de análisis"
    )


def test_chat_responde_con_al_menos_dos_razones_linguisticas(
    client: TestClient,
) -> None:
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
    response = client.post(
        "/api/v1/chat/mensaje",
        json={"session_id": "sesion-caducada", "mensaje": "¿Por qué 80%?"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Sesión caducada. Por favor, recargue la página para enviar mensajes"
    )
