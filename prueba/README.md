# Qué es

Analizador académico de texto en español que calcula métricas orientativas con un modelo local. Expone una API FastAPI y una interfaz Angular/Ionic para texto, documentos PDF/DOCX y preguntas contextuales a Gemini. El indicador **no es una probabilidad calibrada** ni demuestra quién escribió un texto.

## Requisitos

- Windows, macOS o Linux.
- Python 3.11 de 64 bits.
- Node.js y npm compatibles con la versión de Angular fijada en `package.json`.
- Acceso a Internet en el primer inicio para descargar los pesos del modelo Hugging Face.
- Memoria suficiente para ejecutar PyTorch y el modelo seleccionado.

## Instalación

Desde la carpeta del proyecto, crea un entorno limpio e instala las dependencias fijadas:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm ci
```

`.env.example` documenta las variables de configuración; no se carga automáticamente como archivo `.env`. Para activar el chat:

1. Crea una clave en [Google AI Studio](https://aistudio.google.com/apikey).
2. En la terminal donde iniciarás FastAPI, configura la clave y el modelo:

```powershell
$env:MODELO_ID = "datificate/gpt2-small-spanish"
$env:ALLOWED_ORIGINS = "http://localhost:4200,http://localhost:8100"
$env:GEMINI_API_KEY = "tu-clave-de-AI-Studio"
$env:GEMINI_MODEL = "gemini-4-hydrogen"
```

No pegues la clave en Angular, en el código ni en el chat de esta conversación. La clave se lee solo desde el entorno del backend. El `.env` local está excluido por Git y no debe contener valores compartidos ni subirse al repositorio. Sin `GEMINI_API_KEY`, el análisis local seguirá funcionando, pero el chat indicará que falta configurarla.

## Ejecución en desarrollo

Inicia FastAPI en una terminal:
```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Inicia Angular/Ionic en otra terminal:
```powershell
npm start
```

Abre `http://localhost:4200`; la API se encuentra en `http://127.0.0.1:8000`.
Para compilar Angular y servir el build desde FastAPI:
```powershell
npm run build
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```
El build se sirve desde `http://127.0.0.1:8000`. El valor de `apiUrl` en
`src/environments/` está dirigido a una demostración local; cámbialo antes de
desplegar en otro host.

Los endpoints principales son:

| Método y ruta | Solicitud y control |
|---|---|
| `POST /analizar` | JSON con `texto` (50 palabras como mínimo, 5000 caracteres y 100 oraciones analizables como máximo); cuerpo hasta 32 KiB y 10 solicitudes/minuto por IP. |
| `POST /api/v1/documentos/upload` | `multipart/form-data`, campo `file`; PDF/DOCX hasta 5 MiB, 100 páginas PDF, 20 MiB descomprimidos DOCX y texto extraído de 50 palabras a 5000 caracteres. |
| `GET /api/v1/documentos/{document_id}/resultado` | Requiere `X-Session-Id` de la sesión vigente propietaria del documento. |
| `POST /api/v1/chat/mensaje` | JSON con `session_id` y `mensaje`; la sesión debe estar vigente; 30 solicitudes/minuto por IP. |

El texto analizado se conserva temporalmente en memoria local durante 15 minutos para dar contexto al chat. **Al enviar una pregunta**, se envían a Google Gemini el texto completo, las métricas y el historial reciente de esa sesión. No se envían a Gemini al analizar. La petición usa `store=false` para no guardar una conversación en la API de Interactions; Google sigue recibiendo y procesando los datos conforme a sus condiciones. No incluyas información sensible.

Los cuerpos HTTP se limitan a 32 KiB para texto, 8 KiB para chat, 5 MiB más la envoltura multipart para documentos y 64 KiB para otras rutas. El resultado de documento admite hasta 90 consultas/minuto por IP para permitir el sondeo de progreso. El frontend permite hasta 3 minutos por análisis de texto y 6 minutos para el procesamiento de documentos. Los límites de frecuencia son por proceso y se reinician al reiniciar el servidor; no sustituyen un proxy ni una protección para un despliegue público. Las sesiones anónimas son credenciales portadoras: conserva el `session_id` privado. CORS permite por defecto los orígenes locales documentados; ajusta `ALLOWED_ORIGINS` para otros despliegues.

## Alcance del índice

El valor de 0 a 100 es un **indicador experimental**, no un porcentaje de probabilidad. La API conserva el campo `puntuacion` por compatibilidad. Los umbrales no se han calibrado contra un conjunto representativo de textos humanos y generados; sin esos datos no es posible afirmar que el indicador sea más preciso ni evaluar sus errores. Por eso un texto generado por IA puede obtener una cifra baja y uno humano una alta. No uses el resultado para acusaciones o decisiones académicas, laborales o disciplinarias.

El resultado `29.77` del ejemplo se debe a la fórmula actual: la previsibilidad `62.99` aporta `42.53` puntos; los cambios entre oraciones (`164`) superan el límite `25` y aportan `0`; al combinar esos valores, el resultado queda en `29.77`. **No significa que haya un 29.77 % de probabilidad de IA.** Se necesitarían ejemplos etiquetados de textos humanos y generados para ajustar y evaluar la fórmula sin sesgarla.

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
chat_service.py                 Respuestas contextuales con Gemini
api_constants.py                Límites y configuración común
text_validation.py              Validación compartida de textos
request_limits.py               Límites de tamaño HTTP por ruta
rate_limiting.py                Límites de frecuencia por IP
src/app/                         Interfaz Angular/Ionic
src/app/core/analysis.service.ts Cliente HTTP para la API
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
