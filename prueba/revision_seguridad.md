# Informe de revisión de seguridad y calidad

## 1. Herramientas y criterios usados

- **Ruff:** `ruff check .`, reglas `E`, `F`, `B` y `S`; única excepción `S101` en pruebas, donde `assert` es el mecanismo esperado.
- **Pruebas:** `pytest -q` en un entorno limpio de Python 3.11.9.
- **Dependencias:** `pip-audit -r requirements.txt` y `pip-audit -r requirements-dev.txt`. Ambas ejecuciones terminaron con `No known vulnerabilities found`. Se corrigió `filelock` y se elevó el requisito mínimo a Python 3.11 porque la versión reparada no admite Python 3.10.
- **Secretos:** inspección de fuentes e historial Git con patrones de credenciales; no se encontraron coincidencias. `.env` no existe, está ignorado por `.gitignore:76` y se añadió `.env.example`.
- **Alcance:** API y archivos Python del proyecto `prueba`. No hay SQL ni comandos del sistema construidos con datos de usuario. El chat envía a Gemini el texto y las preguntas solo al enviar un mensaje; usa `store=False`, pero Google recibe y procesa esos datos. La clave vive en `GEMINI_API_KEY`. Las entradas se validan y serializan como JSON, aunque el *prompt injection* semántico no puede eliminarse por completo.
- **Contraseñas:** no aplica; la aplicación no crea cuentas ni almacena contraseñas. Las sesiones anónimas usan UUID aleatorios como credenciales portadoras.

## 2. Tabla de hallazgos y correcciones

| Archivo y línea | Problema | Categoría | Severidad | Corrección aplicada | Commit |
|---|---|---|---|---|---|
| `main.py:469` | `logger.exception` usaba un nombre no definido y fallaba el manejo de errores del chat. | Ejecución / F821 | Alta | Se definió un logger de módulo y se verificó con Ruff. | `a97cea24` |
| `main.py:104-125`, `chat_service.py:26-31` | Mensajes arbitrarios se insertaban en el prompt sin límites ni escape estructural. | Inyección / validación | Media | Se limitó longitud, se rechazaron caracteres de control y se codificó la pregunta como JSON con instrucciones de contexto. El riesgo semántico residual se conserva como pendiente. | `a97cea24` |
| `main.py:220-241` | CORS permitía cualquier origen junto con credenciales por defecto. | Configuración / acceso | Media | Se fijaron orígenes locales por defecto; si se configura `*`, las credenciales se desactivan. | `a97cea24` |
| `main.py:385-407` | El resultado era accesible con solo conocer `document_id` (IDOR). | Control de acceso | Alta | Ahora se requiere `X-Session-Id` vigente y asociado al documento; se responde 401/404 ante abuso. | `a97cea24` |
| `main.py:161-190, 337-344` | Sesiones y resultados expirados podían quedarse indefinidamente en memoria. | Disponibilidad | Media | Se añadió limpieza periódica; los documentos aún procesándose se conservan hasta que terminan. | `a97cea24` |
| `detector.py:47-63` | `except Exception` ocultaba fallos ajenos a la carga y cambiaba silenciosamente a otro modelo. | Excepciones / confiabilidad | Media | El fallback se limita a `OSError`/`ValueError` y registra el motivo; los demás errores se propagan. | `a97cea24` |
| `main.py:320` | `File(...)` en el valor por defecto incumplía Ruff `B008`. | Calidad | Baja | Se cambió a `Annotated[UploadFile, File(...)]`. | `a97cea24` |
| `requirements.txt:1-9`, `requirements-dev.txt:1-5` | Dependencias sin fijar; `pip-audit` encontró 17 avisos CVE de `filelock` antes de la corrección. | Dependencias | Media | Se fijaron versiones exactas, se actualizó a `filelock==4.2.1` y el requisito mínimo a Python 3.11; ambas auditorías actuales pasan. | `8737c9bb` |
| `.gitignore:76`, `.env.example:1-3` | Faltaba `.env.example`; se necesitaba evitar confundir ejemplos con secretos. | Secretos / configuración | Baja | Se añadió `.env.example` sin credenciales y se documentó que las variables se cargan desde el entorno. | `8737c9bb` |

## 3. Segunda revisión con IA y verificación manual

- **Reales, confirmados y corregidos:** IDOR del endpoint de resultados, falta de límite/escape estructural en el chat, CORS con comodín y credenciales, logger indefinido, patrón `B008`, estado expirado retenido y fallback demasiado amplio del modelo. Los cambios se verificaron contra el código y pruebas; no se alteraron pruebas para ocultar fallos, y se añadieron pruebas de sesión ausente, expirada y ajena, CORS, validación del chat y limpieza.
- **Falsos positivos o criterios no aplicables:** la sospecha de *path traversal* por `file.filename` no se reproduce: el nombre solo determina la extensión y el contenido se procesa en memoria con ID UUID. SQL injection y hashing de contraseña no aplican porque no hay SQL ni contraseñas. `S101` en pruebas se excluye solo allí.
- **Hallazgos que la primera revisión de IA omitió:** el IDOR y la retención ilimitada de resultados/sesiones; ambos se encontraron al contrastar manualmente las rutas de resultados y el estado en memoria.
- **Límite del agente:** su resultado incluyó alertas de carpetas hermanas (`Uber.WEB`, `camara_ionic` y una práctica aislada), fuera del alcance de `prueba`; no se integraron esos cambios.
- **Verificación final:** `ruff check .` sin avisos; `pytest -q`: 27 pruebas aprobadas; `pip-audit` en las dependencias de ejecución y desarrollo: sin vulnerabilidades conocidas.

## 4. Pendientes

1. Desplegar detrás de HTTPS y proteger el `session_id` como token portador. El proyecto no implementa cuentas ni roles.
2. Evaluar las respuestas del modelo frente a *prompt injection* y contenido engañoso; la serialización y el límite de entrada no garantizan resistencia semántica.
3. El almacenamiento y el límite de solicitudes son locales a un proceso; no se comparten entre workers ni sobreviven a reinicios. En despliegues públicos deben usarse controles compartidos y un proxy.
4. La bitácora mantiene cambios previos del árbol de trabajo además de las entradas nuevas; se preservó sin incluirla en los commits acotados de código y configuración.

## 5. Endurecimiento posterior para la demostración local

- Se añadieron límites de cuerpo HTTP por ruta, validación común de 50 a 5000 caracteres/palabras y máximo de 100 oraciones analizables.
- Las cargas limitan archivos a 5 MiB, PDF a 100 páginas, DOCX a 2000 entradas y 20 MiB descomprimidos; el texto extraído reutiliza los límites del análisis.
- Se añadieron límites por IP: 10 análisis, 20 cargas y 30 preguntas por minuto. Son controles de demostración en memoria, no protección contra tráfico distribuido.
- Se limitó el sondeo de resultados a 90 consultas/minuto para permitir progreso de documentos y evitar solicitudes ilimitadas.
- Se ejecuta el análisis de texto fuera del event loop y Angular marca la vista después de las respuestas asíncronas; se añadió timeout para que el indicador de carga no quede indefinido.
- Se sustituyó la interfaz estática en desuso por Angular/Ionic y se ajustó Browserslist para navegadores actuales.
- El chat usa Gemini con clave del lado del servidor; el texto completo solo se envía al preguntar y la llamada usa `store=False`. La interfaz avisa sobre el envío a Google.
- La interfaz usa términos sencillos para las métricas. No se recalibró el indicador: no existe un conjunto etiquetado para demostrar más precisión.
- Verificación de esta actualización: 32 pruebas Python, 6 pruebas Angular, Ruff, lint Angular y build de producción completados correctamente; se probó el análisis desde el navegador con respuestas reales del modelo para texto y DOCX.
