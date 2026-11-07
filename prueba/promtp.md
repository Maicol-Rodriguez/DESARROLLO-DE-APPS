ROL:
Actúa como desarrollador backend senior en Python, con experiencia en FastAPI, procesamiento de lenguaje natural y buenas prácticas de seguridad en APIs.

CONTEXTO
Estoy construyendo una página web que detecta texto generado por IA y tiene un chatbot explicativo (el chatbot se conectará después; en esta tarea solo hacemos el backend de análisis). El usuario pega un texto en español, el backend estima qué tan probable es que lo haya escrito una IA, y luego se explicará el resultado. Los detectores de IA fallan con frecuencia (falsos positivos, sobre todo en textos formales o escritos en un segundo idioma), así que el resultado siempre debe presentarse como una estimación, nunca como prueba. Es un proyecto académico de un seminario sobre IA en el ciclo de vida del software: el código debe ser claro y fácil de explicar.

TAREA
Crea el backend de la ruta POST /analizar con FastAPI, trabajando en la carpeta actual.

Requisitos funcionales:
1. Recibe un JSON con el campo "texto".
2. Valida la entrada: no vacío, mínimo 50 palabras y máximo 5000 caracteres. Los errores deben devolver HTTP 400 o 422 con mensajes claros en español (incluye también los errores de validación de Pydantic, que por defecto salen en inglés: personalízalos).
3. Calcula la perplejidad del texto con un modelo GPT-2 de Hugging Face Transformers, y la variabilidad entre oraciones (burstiness) como la desviación estándar de la perplejidad por oración.
4. Combina ambas métricas en una puntuación de 0 a 100 de "probabilidad estimada de IA". Explica en un comentario la lógica y los umbrales, déjalos como constantes con nombre al inicio del archivo y aclara que son heurísticos, sin validación científica.
5. Devuelve un JSON con: "puntuacion", "nivel" (bajo, medio o alto), "perplejidad", "variabilidad", "oraciones_sospechosas" (las 3 oraciones más predecibles, es decir, con menor perplejidad) y "aviso" (texto fijo que aclare que es una estimación y no una prueba definitiva).

Decisiones técnicas obligatorias:
- Idioma: los textos están en español. Busca en Hugging Face un GPT-2 entrenado en español, verifica que exista y que cargue correctamente, y úsalo. El nombre del modelo debe ser una constante configurable mediante la variable de entorno MODELO_ID. Si no encuentras un modelo en español que funcione, usa "gpt2" como respaldo y avísame claramente en el resumen final, porque la precisión será menor.
- Carga el modelo UNA sola vez al iniciar la aplicación, con el evento lifespan de FastAPI.
- Si el texto excede el contexto máximo del modelo, trunca los tokens y documéntalo en un comentario.
- Si el texto tiene menos de 2 oraciones válidas, la variabilidad es 0.0 y debe quedar documentado. Ignora las oraciones demasiado cortas para medir perplejidad de forma útil.
- Si la aplicación necesita permitir CORS para un frontend separado, lee los orígenes permitidos de la variable de entorno ALLOWED_ORIGINS.

Restricciones:
- Librerías permitidas: fastapi, uvicorn, pydantic, transformers, torch y la librería estándar de Python.
- Privacidad: no guardes los textos de los usuarios en disco ni en base de datos, y no los imprimas en logs.
- Seguridad: cualquier clave o configuración sensible se lee de variables de entorno, nunca se escribe en el código.
- Calidad: funciones de máximo 30 líneas, sin código innecesario ni sobreingeniería. Comentarios breves en español, docstrings en cada función y type hints.

ARCHIVOS A CREAR
- main.py (aplicación FastAPI, ruta y validación)
- detector.py (cálculo de perplejidad, variabilidad y puntuación)
- test_detector.py
- requirements.txt (con las dependencias necesarias)

PRUEBAS
Escribe tres pruebas unitarias con unittest: texto válido, texto vacío y texto demasiado corto. Las pruebas NO deben descargar el modelo real: usa unittest.mock para simular el cálculo.

FORMA DE TRABAJO
- Crea un entorno virtual dentro de la carpeta e instala las dependencias ahí. Avísame que la instalación y la primera descarga del modelo pueden tardar.
- No borres ni modifiques nada fuera de esta carpeta, y pídeme confirmación antes de ejecutar comandos que no sean instalar dependencias, correr pruebas o iniciar el servidor.
- No me muestres el código en el chat: crea los archivos directamente.
- Ejecuta las pruebas, corrige cualquier fallo y repítelas hasta que pasen.
- Al terminar, dame un resumen corto con: qué modelo usaste, el comando para iniciar el servidor, el comando para correr las pruebas, un ejemplo de petición para probar /analizar y cualquier limitación que debas advertirme.