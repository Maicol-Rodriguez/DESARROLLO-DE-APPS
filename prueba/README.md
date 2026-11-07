# Detector de texto generado por IA

Proyecto académico con una API FastAPI para analizar texto y una interfaz web estática en `static/`. La API existente expone `POST /analizar`; las rutas de las historias de usuario de esta sección describen el contrato RED que se implementará y probará con TDD.

## Funcionalidades Principales (HU-01, HU-03, HU-04)

### Criterios de aceptación

```gherkin
Característica: Carga de documentos (HU-01)
  Escenario: Cargar un PDF válido de hasta 5 MiB
    Dado un archivo PDF válido de tamaño menor o igual a 5 MiB
    Cuando se envía a POST /api/v1/documentos/upload
    Entonces la API responde 201 con un identificador y estado "procesando"
  Escenario: Rechazar un formato no soportado
    Dado un archivo con extensión .exe
    Cuando se envía a POST /api/v1/documentos/upload
    Entonces la API responde 415 con el mensaje de formato no soportado

Característica: Resultado del análisis (HU-03)
  Escenario: Consultar el porcentaje de detección
    Dado un documento cuyo análisis está disponible
    Cuando se consulta GET /api/v1/documentos/{id}/resultado
    Entonces la respuesta incluye el porcentaje estimado de IA
  Escenario: Fallo del servidor de análisis
    Dado que el servidor de análisis no está disponible
    Cuando se consulta el resultado
    Entonces la API responde 503 y comunica el fallo de conexión
  Escenario: Texto demasiado corto en el scanner existente
    Cuando se envía a POST /analizar un texto de menos de 50 palabras
    Entonces la API responde 422 con el requisito mínimo

Característica: Explicación vía chatbot (HU-04)
  Escenario: Explicar el resultado con razones lingüísticas
    Dado un mensaje en una sesión activa sobre el porcentaje obtenido
    Cuando se envía a POST /api/v1/chat/mensaje
    Entonces la respuesta incluye al menos dos razones lingüísticas
  Escenario: Rechazar una sesión caducada
    Cuando se envía un mensaje desde una sesión caducada
    Entonces la API responde 401 y solicita recargar la página
```

### Contratos de la API

| Método y ruta | Solicitud | Respuesta esperada |
|---|---|---|
| `POST /api/v1/documentos/upload` | `multipart/form-data`, campo `file` | `201`, `document_id` y estado `procesando` |
| `GET /api/v1/documentos/{id}/resultado` | Identificador en la ruta | `200` con `porcentaje_ia` y `motivos`; `503` si falla el análisis |
| `POST /api/v1/chat/mensaje` | JSON con `session_id` y `mensaje` | `200` con respuesta y razones; `401` si expiró la sesión |

Los errores de estas rutas usan un objeto JSON con `detail`. El endpoint existente `POST /analizar` conserva su formato de validación actual.

### Ejemplos JSON

Respuesta al cargar un documento:

```json
{
  "document_id": "doc-123",
  "estado": "procesando"
}
```

Respuesta al consultar un resultado:

```json
{
  "document_id": "doc-123",
  "porcentaje_ia": 80,
  "nivel": "alto",
  "motivos": [
    "Perplejidad baja en la secuencia de palabras.",
    "Variabilidad reducida entre las oraciones."
  ]
}
```

Solicitud y respuesta del chatbot:

```json
{
  "session_id": "sesion-activa",
  "mensaje": "¿Por qué este trabajo tiene 80%?"
}
```

```json
{
  "respuesta": "La estimación se basa en patrones observados en el texto.",
  "razones": [
    "Perplejidad baja en la secuencia de palabras.",
    "Variabilidad reducida entre las oraciones."
  ]
}
```

### Supuestos y casos límite

- El límite de carga es inclusivo: se aceptan hasta `5 * 1024 * 1024` bytes (5 MiB); un tamaño mayor debe rechazarse.
- El formulario utiliza el campo `file`; se aceptan PDF y Word. La extensión no reemplaza la validación del tipo real del documento.
- La respuesta `procesando` permite que una interfaz muestre progreso mientras se prepara el análisis; no implica que esta API ya reporte progreso porcentual.
- Los resultados consultables y la duración de las sesiones requieren persistencia y vencimiento definidos al implementar estas rutas; no existen actualmente en el proyecto.
- El scanner `POST /analizar` existente rechaza entradas con menos de 50 palabras o más de 5000 caracteres con HTTP 422.
- La estimación estadística no demuestra la autoría humana o por IA; se debe comunicar como orientativa.

## Pruebas

Instala las dependencias de desarrollo y ejecuta la suite desde esta carpeta:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest
```

La suite de contrato para las historias se encuentra en `tests/test_historias_principales.py`. Durante la fase RED, las pruebas de las rutas aún no implementadas deben fallar.
