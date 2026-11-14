# Qué es

Detector académico de textos que estima, mediante métricas de un modelo causal, la probabilidad heurística de autoría por IA. Expone una API FastAPI para analizar texto, cargar archivos PDF/DOCX y explicar resultados. La puntuación no demuestra quién escribió un texto.

## Requisitos

- Windows, macOS o Linux.
- Python 3.11 de 64 bits.
- Acceso a Internet en el primer inicio para descargar los pesos del modelo Hugging Face.
- Memoria suficiente para ejecutar PyTorch y el modelo seleccionado.

## Instalación

Desde la carpeta del proyecto, crea un entorno limpio e instala las dependencias fijadas:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

`.env.example` documenta las variables `MODELO_ID` y `ALLOWED_ORIGINS`; no se carga automáticamente como archivo `.env`. En PowerShell, configura las variables necesarias antes de iniciar la aplicación:

```powershell
$env:MODELO_ID = "datificate/gpt2-small-spanish"
$env:ALLOWED_ORIGINS = "http://localhost:4200,http://localhost:8100"
```

El `.env` local está excluido por Git y no debe contener valores compartidos ni subirse al repositorio.

## Ejecución

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

La interfaz estática se sirve en `http://127.0.0.1:8000`. Los endpoints principales son:

| Método y ruta | Solicitud y control |
|---|---|
| `POST /analizar` | JSON con `texto` (50 palabras como mínimo, 5000 caracteres como máximo). |
| `POST /api/v1/documentos/upload` | `multipart/form-data`, campo `file`; admite PDF/DOCX de hasta 5 MiB. Devuelve `document_id` y `session_id`. |
| `GET /api/v1/documentos/{document_id}/resultado` | Requiere `X-Session-Id` de la sesión vigente propietaria del documento. |
| `POST /api/v1/chat/mensaje` | JSON con `session_id` y `mensaje`; la sesión debe estar vigente. |

Las sesiones anónimas son credenciales portadoras: conserva el `session_id` privado. CORS permite por defecto los orígenes locales documentados; ajusta `ALLOWED_ORIGINS` para otros despliegues.

## Pruebas

Desde una instalación limpia, instala las dependencias de desarrollo y ejecuta:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\ruff.exe check .
.\.venv\Scripts\pip-audit.exe -r requirements.txt
.\.venv\Scripts\pip-audit.exe -r requirements-dev.txt
```

Las pruebas usan modelos simulados y no descargan pesos. Ruff omite `S101` solo en archivos de pruebas, donde `assert` es la forma normal de pytest/unittest. `pip-audit` consulta el índice de vulnerabilidades al ejecutarse.

## Estructura

```text
main.py                         API, validación, sesiones y CORS
detector.py                     Carga del modelo y métricas
document_processing.py          Extracción PDF/DOCX y análisis
chat_service.py                 Generación de explicaciones locales
api_constants.py                Límites y configuración común
static/                         Interfaz web servida por FastAPI
tests/                           Pruebas de contrato de la API
test_detector.py                 Pruebas unitarias del detector
requirements*.txt                Dependencias con versiones fijadas
pyproject.toml                   Configuración de Ruff
revision_seguridad.md             Revisión AppSec y calidad
bitacora_ia.md                    Registro de decisiones y asistencia
```

El almacenamiento de documentos y sesiones es temporal y está en memoria; se limpian sesiones y resultados expirados periódicamente. No es persistencia compartida para despliegues con varios workers.

## Uso de IA

GitHub Copilot se utilizó como apoyo para revisar el código, proponer pruebas de abuso y refactorizaciones y redactar documentación. Las sugerencias se contrastaron con el código, las pruebas, Ruff y `pip-audit`; las conclusiones de seguridad y sus limitaciones se registran en `revision_seguridad.md` y `bitacora_ia.md`.

## Autor y licencia

- **Autor:** Maicol Rodriguez (según el repositorio del proyecto).
- **Licencia:** No especificada en este repositorio.
