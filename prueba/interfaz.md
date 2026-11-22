# Interfaz actual

La aplicación principal usa Angular/Ionic. La página está en `src/app/home/` y
`src/app/core/analysis.service.ts` conecta la interfaz con FastAPI.

La pantalla permite analizar texto o cargar PDF/DOCX, muestra métricas y
observaciones, y habilita preguntas locales para resultados de documentos. La
validación del texto en la interfaz refleja los límites del backend: 50 palabras
mínimo, 5000 caracteres y 100 oraciones analizables como máximo.

El valor de 0 a 100 se presenta como **índice heurístico**, no como una
probabilidad calibrada ni como prueba de autoría. La aplicación no debe usarse
para tomar decisiones disciplinarias.

En desarrollo, inicia FastAPI con `python -m uvicorn main:app --reload` y
Angular con `npm start`; abre `http://localhost:4200`. Para servir el build
Angular desde FastAPI, ejecuta `npm run build` antes de iniciar el backend.