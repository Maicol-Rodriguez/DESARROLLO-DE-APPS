"""Pruebas de contrato para HU-01, HU-03 y HU-04."""

import json
from datetime import datetime, timedelta, timezone
from io import BytesIO

import pytest
from docx import Document
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pypdf import PdfWriter

import main
import chat_service
from chat_service import generar_respuesta_chat
from chat_service import GeminiConfigurationError
from document_processing import extraer_texto_documento, procesar_documento


@pytest.fixture(autouse=True)
def evitar_descarga_modelo(monkeypatch: pytest.MonkeyPatch) -> None:
    """Evita la descarga y carga del modelo pesado durante las pruebas."""
    monkeypatch.setattr(main, "cargar_modelo", lambda *args, **kwargs: (None, None))


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
        lambda contenido, extension: " ".join(["palabra"] * 50),
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


def test_extraer_texto_pdf_rechaza_mas_de_100_paginas() -> None:
    escritor = PdfWriter()
    for _ in range(101):
        escritor.add_blank_page(width=72, height=72)
    contenido = BytesIO()
    escritor.write(contenido)

    with pytest.raises(ValueError, match="100 páginas"):
        extraer_texto_documento(contenido.getvalue(), ".pdf")


def test_chat_service_sends_text_and_history_without_storing_interaction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    llamadas: list[dict[str, object]] = []

    class InteraccionesFalsas:
        def create(self, **kwargs: object) -> object:
            llamadas.append(kwargs)
            return type("Interaccion", (), {"output_text": "Respuesta contextual."})()

    class ClienteFalso:
        def __init__(self, *, api_key: str) -> None:
            assert api_key == "clave-de-prueba"
            self.interactions = InteraccionesFalsas()

        def close(self) -> None:
            pass

    monkeypatch.setenv("GEMINI_API_KEY", "clave-de-prueba")
    monkeypatch.setattr(chat_service.genai, "Client", ClienteFalso)
    texto = "Texto completo que no se envía hasta que se hace una pregunta."
    historial = [{"pregunta": "¿Qué dice?", "respuesta": "Habla de una idea."}]

    respuesta = generar_respuesta_chat(
        "¿Puedes resumirlo?",
        texto,
        {"puntuacion": 45, "nivel": "medio", "perplejidad": 62, "variabilidad": 164},
        historial,
    )

    assert respuesta == "Respuesta contextual."
    assert llamadas[0]["store"] is False
    assert llamadas[0]["system_instruction"]
    entrada = json.loads(str(llamadas[0]["input"]))
    assert entrada["texto_analizado"] == texto
    assert entrada["conversacion_anterior"] == historial
    assert entrada["pregunta"] == "¿Puedes resumirlo?"


def test_chat_service_requires_an_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(GeminiConfigurationError):
        generar_respuesta_chat("Pregunta", "Texto de contexto", {}, [])


def test_analizar_texto_crea_sesion_temporal_con_contexto(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    texto = " ".join(["palabra"] * 50)
    resultado = {
        "puntuacion": 45.0,
        "nivel": "medio",
        "perplejidad": 62.0,
        "variabilidad": 164.0,
        "oraciones_sospechosas": [],
        "aviso": "Indicador orientativo.",
    }
    monkeypatch.setattr(main, "analizar_texto", lambda *args: resultado)

    response = client.post("/analizar", json={"texto": texto})

    assert response.status_code == 200
    session_id = response.json()["session_id"]
    session = main.app.state.sesiones[session_id]
    document = main.app.state.documentos[session["document_id"]]
    assert document["texto"] == texto
    assert document["resultado"] == resultado
    assert session["historial"] == []


def test_procesar_documento_guarda_el_texto_extraido_para_el_chat() -> None:
    texto = " ".join(["contenido"] * 50)
    documentos = {"documento-1": {"estado": "procesando"}}

    procesar_documento(
        "documento-1",
        b"contenido",
        ".pdf",
        documentos,
        None,
        None,
        lambda contenido, extension: texto,
        lambda contenido, tokenizer, model: {"puntuacion": 50.0},
    )

    assert documentos["documento-1"]["texto"] == texto


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

    assert eliminados == 3
    assert "sesion-expirada" not in sesiones
    assert "doc-expirado" not in documentos
    assert "doc-procesando" not in documentos
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


def test_scanner_rechaza_cuerpo_http_demasiado_grande(client: TestClient) -> None:
    response = client.post("/analizar", json={"texto": "x" * (32 * 1024)})

    assert response.status_code == 413


def test_documento_rechaza_texto_extraido_demasiado_corto(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        main,
        "extraer_texto_documento",
        lambda contenido, extension: "Solo siete palabras para este documento corto.",
    )
    carga = client.post(
        "/api/v1/documentos/upload",
        files={"file": ("informe.pdf", b"%PDF-1.4\ncontenido", "application/pdf")},
    )

    response = client.get(
        f"/api/v1/documentos/{carga.json()['document_id']}/resultado",
        headers={"X-Session-Id": carga.json()["session_id"]},
    )

    assert response.status_code == 503
    assert "al menos 50 palabras" in response.json()["detail"]


def test_resultado_informa_fallo_del_servidor_de_analisis(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        main,
        "extraer_texto_documento",
        lambda contenido, extension: " ".join(["palabra"] * 50),
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
        "No se pudo procesar el documento"
    )


def test_chat_responde_con_al_menos_dos_razones_linguisticas(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    texto = "Este es el texto del documento que Gemini debe leer."
    main.app.state.documentos["doc-chat"] = {
        "estado": "completado",
        "texto": texto,
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
    argumentos: list[tuple[object, ...]] = []

    def responder(*args: object) -> str:
        argumentos.append(args)
        return "Respuesta generada."

    monkeypatch.setattr(main, "generar_respuesta_chat", responder)

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
    assert argumentos[0][1] == texto
    assert argumentos[0][3] == []
    assert main.app.state.sesiones["sesion-activa"]["historial"] == [
        {
            "pregunta": "¿Por qué este trabajo tiene 80%?",
            "respuesta": "Respuesta generada.",
        }
    ]

    segunda_respuesta = client.post(
        "/api/v1/chat/mensaje",
        json={
            "session_id": "sesion-activa",
            "mensaje": "¿Puedes explicarlo de otra forma?",
        },
    )

    assert segunda_respuesta.status_code == 200
    assert argumentos[1][3] == [
        {
            "pregunta": "¿Por qué este trabajo tiene 80%?",
            "respuesta": "Respuesta generada.",
        }
    ]


def test_chat_informa_si_falta_la_clave_de_gemini(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    main.app.state.documentos["doc-sin-clave"] = {
        "estado": "completado",
        "texto": "Texto de contexto",
        "resultado": {
            "puntuacion": 50.0,
            "nivel": "medio",
            "perplejidad": 50.0,
            "variabilidad": 12.0,
        },
    }
    main.app.state.sesiones["sesion-sin-clave"] = {
        "document_id": "doc-sin-clave",
        "expira": datetime.now(timezone.utc) + timedelta(minutes=15),
    }

    response = client.post(
        "/api/v1/chat/mensaje",
        json={"session_id": "sesion-sin-clave", "mensaje": "¿Qué significa?"},
    )

    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


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
