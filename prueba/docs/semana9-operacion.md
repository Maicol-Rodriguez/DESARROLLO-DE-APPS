# Semana 9 — CI, contenedor y notas operativas

- **Autor:** Maicol Rodriguez
- **Fecha:** 2026-11-26
- **Alcance:** backend FastAPI en `main.py`; CI, Docker, errores, límites y observabilidad.

## Integración continua

`.github/workflows/ci.yml` ejecuta lint y pruebas para `push` y `pull_request` a
`main`. Solicita solo `contents: read`, usa `actions/checkout@v4`,
`actions/setup-python@v5` con Python 3.11 y caché de pip, e instala
`requirements-dev.txt`. No requiere una clave Gemini ni credenciales del modelo.

## Imagen de backend

El `Dockerfile` parte de `python:3.11-slim-bookworm`, instala las dependencias de
`requirements.txt` antes de copiar los módulos Python y ejecuta Uvicorn como el
usuario sin privilegios `app`. El comando no activa recarga de desarrollo. El
`.dockerignore` omite secretos, cachés, entornos locales, pruebas y artefactos
del frontend; por ello esta imagen expone el backend API y no sirve el build
Angular/Ionic.

Construcción y ejecución local:

```text
docker build -t analizador-api .
docker run --rm -p 8000:8000 -e MODELO_ID=datificate/gpt2-small-spanish analizador-api
```

La aplicación carga el modelo en su ciclo de vida de inicio. El primer arranque
necesita conectividad al registro del modelo y memoria suficiente para PyTorch.
`HF_HOME` apunta al caché escribible bajo `/home/app`; se puede montar un volumen
en ese directorio para evitar volver a descargar los pesos. Si se habilita el
chat, suministra `GEMINI_API_KEY` al contenedor desde el almacén de secretos del
entorno de despliegue (por ejemplo, con `--env-file` local excluido de Git o
inyección del orquestador). No añadas el valor a la imagen, al workflow, a la
línea de comandos compartida ni a los logs.

La instalación de PyTorch/Transformers aumenta el tamaño de la imagen. Mide el
tamaño y el consumo de memoria en el entorno de despliegue antes de fijar sus
recursos; no se ha ejecutado un build Docker en esta máquina porque Docker no
está disponible.

## Errores, límites y datos sensibles

- `chat_service.py` define timeout de 90 segundos para la solicitud Gemini y
  convierte errores de red/API y respuestas vacías a errores de servicio. No
  hay reintento automático configurado. Planifica límites de tiempo del proxy
  compatibles y monitoriza latencia/error agregado sin registrar el texto.
- El chat envía a Gemini el texto analizado, las métricas y el historial reciente
  cuando el usuario hace una pregunta; usa `store=False`. Eso no significa que
  los datos no sean transmitidos al proveedor. Informa al usuario y no envíes
  datos personales o sensibles.
- El servicio registra errores de procesamiento con `logger.exception`; evita
  agregar al mensaje logs de texto de entrada, contenido de documentos, claves,
  cabeceras de autorización, `session_id` ni IDs que funcionen como credenciales.
  Los IDs de documento también deben tratarse como potencialmente sensibles.
  Para telemetría, prefiere ruta, clase de error, código HTTP, duración y
  contadores agregados; revisa que los traceback de dependencias no incluyan
  contenido de usuario antes de exportar logs.
- El detector requiere al menos 50 palabras, limita el análisis a 5000
  caracteres y 100 oraciones válidas. Las cargas se limitan a 5 MiB; PDF a 100
  páginas; DOCX a 2000 entradas y 20 MiB descomprimidos. Los cuerpos HTTP y los
  límites por ruta están en `api_constants.py` y `request_limits.py`.
- Las sesiones/documentos son estado en memoria con TTL de 15 minutos y limpieza
  periódica cada minuto. El reinicio elimina el estado; varios workers o réplicas
  no comparten sesiones y requieren persistencia/afinidad si se despliegan así.
- El rate limiter es por proceso, por IP observada por ASGI, y se reinicia al
  reiniciar el proceso. Tras un proxy, verifica cómo se establece `request.client`
  y no confíes en cabeceras de IP reenviadas salvo que el proxy confiable las
  gestione correctamente. Los límites actuales no reemplazan una protección de
  borde para producción.

## Observabilidad y mantenimiento del modelo

No se verificó un endpoint de salud/ready ni una exportación de métricas en el
backend. No se agregaron rutas ni cambios funcionales en esta actividad. Antes
de producción, define y prueba health/readiness sin exponer IDs, configuración
secreta o detalles internos; mide duración por etapa, fallos de extracción,
respuestas 4xx/5xx, expiraciones y errores/latencia de Gemini mediante valores
agregados.

Los umbrales de perplejidad, variabilidad y puntuación de `detector.py` son
heurísticos y no calibrados. La deriva del dominio, idioma, modelo o población
puede cambiar su comportamiento. Mantén el aviso de que la puntuación no es una
probabilidad ni una prueba de autoría. Evalúa cambios de modelo/umbrales sobre
un corpus representativo, etiquetado y autorizado; reporta precisión, falsos
positivos y falsos negativos por segmento antes de promoverlos. No recopiles
texto personal para construir métricas sin una base legal y controles de
retención apropiados.
