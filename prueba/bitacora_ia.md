# Bitácora de uso de IA y TDD

| Fecha | Prompt enviado | Decisión | Justificación técnica | Método de verificación |
|---|---|---|---|---|
| 2026-11-07 | «Inspecciona los endpoints existentes en FastAPI para la carga, resultados y chat». | RECHAZADA | Se rechazó la premisa de que esas rutas ya existían: `main.py` solo exponía `POST /analizar`. Se documentaron como contrato nuevo, no como comportamiento preexistente. | Inspección de rutas en `main.py`; fase RED: `7 failed, 4 passed`. |
| 2026-11-07 | «Crea pruebas con TestClient para PDF válido, PDF de 5 MB, `.exe`, porcentaje, texto corto, fallo 503 y sesión 401». | ACEPTADA | Los escenarios se concretaron como ocho casos de contrato y un caso límite superior a 5 MiB. El PDF de exactamente 5 MiB se trata como límite inclusivo. | `pytest` confirmó los estados, el error 415 y el límite de tamaño. |
| 2026-11-07 | «Modifica únicamente el backend FastAPI para satisfacer las historias». | AJUSTADA | Como no había almacenamiento ni gestión de sesiones, se eligió almacenamiento en memoria y sesiones de 15 minutos. Se documentó que reiniciar el proceso borra el estado. | `TestClient` recorrió carga, análisis, resultado y sesión; fase GREEN: `13 passed`. |
| 2026-11-07 | «Explicación vía chatbot con al menos dos razones y error por sesión caducada». | AJUSTADA | Se reutilizó el modelo local configurado por `MODELO_ID`, sin añadir un proveedor externo no definido. Las razones se calculan directamente desde perplejidad y variabilidad para que sean verificables. | Prueba del generador local simulado, prueba de dos razones y prueba HTTP 401 por expiración. |
| 2026-11-07 | «Ignora `.venv/`, `__pycache__/`, `.pytest_cache/`, `.env` e historias de compilación». | ACEPTADA | Se añadieron reglas al `.gitignore` del proyecto y se quitaron del índice los bytecodes que ya estaban rastreados; los archivos locales se conservaron. | `git check-ignore -v` confirmó reglas para `.venv` y `__pycache__`. |
| 2026-11-07 | «Refactoriza constantes, umbrales y lógica del procesador». | ACEPTADA | Los límites y mensajes se centralizaron, se reutilizaron umbrales existentes del detector y se separaron procesamiento documental y generación de chat en módulos. | Suite completa después del refactor: `16 passed`. |

## Reflexión final

Copilot ayudó a detectar que el contrato propuesto no correspondía a rutas existentes.
pytest hizo observables las diferencias desde RED, sin descargar el modelo pesado.
El ciclo TDD permitió implementar las rutas contra criterios medibles y repetibles.
La separación de procesamiento y chat facilitó probar componentes sin llamadas externas.
Los mocks mantuvieron las pruebas rápidas y evitaron depender de inferencia real.
La solución en memoria es útil para el prototipo, pero no sustituye persistencia de producción.
