# Proyecto Final Integrador — Seminario de IA en el ciclo de vida del software

- **Proyecto:** Plataforma web de análisis orientativo de texto generado por IA con chatbot explicativo
- **Estudiante:** Maicol Rodriguez
- **Repositorio:** [Maicol-Rodriguez/DESARROLLO-DE-APPS](https://github.com/Maicol-Rodriguez/DESARROLLO-DE-APPS.git)
- **Rama de trabajo indicada:** `semana-8-9`
- **Fecha:** 2026-11-26

## 1. Resumen

El proyecto aborda la necesidad de explicar indicios estilísticos de texto generado por IA sin presentar una estimación como prueba de autoría.
Se implementó una aplicación web con interfaz Angular/Ionic y una API FastAPI para analizar texto y documentos PDF/DOCX.
El detector calcula perplejidad, variabilidad entre oraciones y un índice heurístico; el chat contextual usa Gemini cuando el usuario pregunta.
La IA se utilizó como apoyo en fundamentos, requisitos, diseño, implementación, pruebas y revisión operativa, con verificación humana y pruebas automatizadas.
Durante el trabajo se endurecieron validaciones, límites, sesiones, CORS y manejo de errores; también se incorporaron CI y archivos de contenedor.
La ejecución actual de `pytest -q` terminó con **104 pruebas aprobadas**, y `ruff check .` terminó sin errores.
La precisión de autoría sigue sin estar calibrada con un corpus etiquetado, por lo que el sistema es un prototipo académico, no una herramienta de decisión.

## 2. Problema y usuario

### Situación y necesidad

Los usuarios principales son profesores y estudiantes que necesitan interpretar un indicador de texto posiblemente generado por IA. Un porcentaje aislado, sin explicación ni contexto, puede inducir a una acusación injustificada: los detectores pueden equivocarse y producir falsos positivos, en particular ante textos formales o escritos en una segunda lengua. El resultado debe entenderse como una señal experimental, no como una determinación de autoría.

La propuesta es permitir que el usuario pegue texto o cargue un PDF/DOCX, reciba métricas orientativas y consulte un chatbot que explique el resultado en lenguaje sencillo. La interfaz incluye aviso sobre los límites del indicador y sobre el envío de contenido a Google Gemini al hacer una pregunta. El texto y el resultado se mantienen temporalmente en memoria para posibilitar esa interacción; no hay una base de datos ni cuentas de usuario en el MVP.

Los documentos de Semanas 1–4 ya están en `modulos/` y se revisaron para esta actualización. El banco de Semana 2 identifica la idea como un detector explicativo y registra mejoras de calidad de prompts; Semana 3 confirma que la entrevista a un profesor fue un roleplay con Gemini, no una entrevista a una persona real. Por tanto, las citas y necesidades de ese ejercicio no constituyen investigación empírica con usuarios.

- **Mapa conceptual y laboratorio de correo:** [Tarea semana 1.docx](<modulos/Tarea semana 1.docx>).
- **Banco de prompts y definición de la idea:** [Rodriguez_Hernandez_Maicol_S2_Banco_Idea.docx](modulos/Rodriguez_Hernandez_Maicol_S2_Banco_Idea.docx).
- **Requisitos, actores, historias y entrevista simulada:** [Rodriguez Hernandez_Maicol Duvan_S3_Requisitos.docx](<modulos/Rodriguez Hernandez_Maicol Duvan_S3_Requisitos.docx>).
- **Diseño, matriz, C4 y ADR:** [Rodriguez-Hernandez_Maicol_S4_Diseno.docx](modulos/Rodriguez-Hernandez_Maicol_S4_Diseno.docx).
- **Contexto y comportamiento actualmente documentados:** [README.md](README.md).

### Usuarios y alcance

El sistema implementa el flujo principal de análisis para un usuario anónimo; la sesión se representa con un identificador aleatorio que debe tratarse como credencial portadora. No implementa usuarios, roles, contraseñas ni persistencia compartida. Los documentos y sesiones expiran en el proceso que atiende la petición, por lo que la solución requiere cambios antes de operar con varios workers o réplicas.

## 3. La IA en el ciclo de vida

La tabla se basa en los cuatro documentos académicos incorporados y en los artefactos de implementación actuales. El archivo [Necesidades del negocio y clasifica.txt](<modulos/Necesidades del negocio y clasifica.txt>) trata de un minimercado y de una entrevistada llamada Marta; no corresponde a este proyecto de detección y no se usa como evidencia de sus requisitos. Los detalles de cada fase se contrastan con lo que efectivamente está implementado.

| Módulo y fase | Qué hiciste con IA | Herramienta | Evidencia (enlace) | Cómo verificaste |
|---|---|---|---|---|
| **1. Fundamentos** | Elaboraste un mapa conceptual sobre IA, ML, DL, LLM, tokens, contexto y alucinaciones, y comparaste asistentes al generar una función de validación de correo con pruebas. | Gemini Plus y Perplexity, según el documento de Semana 1. | [Tarea semana 1.docx](<modulos/Tarea semana 1.docx>). | El documento registra que ejecutaste ambos códigos en Visual Studio: Gemini informó 3 pruebas ejecutadas y Perplexity mostró 2 válidas y 1 inválida. También declara contraste de definiciones con lecturas del curso. |
| **2. Requisitos** | Evaluaste diez prompts y definiste la idea del producto. Con Gemini simulaste la entrevista, extrajiste seis necesidades y diez historias; iteraste criterios, RNF y trazabilidad. | Claude para el banco de prompts; Gemini para la entrevista y elaboración de requisitos, según los documentos. | [Banco de ideas y prompts](modulos/Rodriguez_Hernandez_Maicol_S2_Banco_Idea.docx) y [requisitos](<modulos/Rodriguez Hernandez_Maicol Duvan_S3_Requisitos.docx>). | El banco registra calificaciones de calidad y ajustes. El documento S3 declara expresamente que el entrevistado era un profesor simulado, y consigna 6 necesidades, 10 historias, 3 RNF y priorización MoSCoW; los contrasté con la API existente. |
| **3. Diseño** | Comparaste monolito, SPA/API y serverless; la matriz ponderada favoreció SPA + API REST. Usaste IA para bocetos C4, ADR, datos y endpoints; corregiste relaciones C4 largas, errores API omitidos y sobreingeniería. | ChatGPT y Gemini, según las fichas del documento de diseño. | [Documento de diseño de Semana 4](modulos/Rodriguez-Hernandez_Maicol_S4_Diseno.docx), [main.py](main.py), [api_constants.py](api_constants.py) y [servicio Angular](src/app/core/analysis.service.ts). | Revisé el documento y comparé las decisiones con el sistema real. Hay una diferencia que debe mantenerse visible: S4 describe Django REST y un modelo relacional; la implementación actual usa FastAPI y estado en memoria. |
| **4. Código** | Usaste asistencia en el IDE para construir y revisar el backend, el cliente Angular/Ionic, controles de entrada y explicaciones; evaluaste sugerencias en vez de aceptarlas automáticamente. | GitHub Copilot y asistentes de IA, según [README.md](README.md) y [bitacora_ia.md](bitacora_ia.md). | [detector.py](detector.py), [document_processing.py](document_processing.py), [chat_service.py](chat_service.py), [main.py](main.py), [home.page.ts](src/app/home/home.page.ts). | Inspección del flujo, tipos, límites y respuestas; las pruebas cubren estados y errores de API sin depender de un proveedor real. |
| **5. Pruebas** | Aplicaste particiones de equivalencia, valores límite y tablas de decisión; fortaleciste cobertura de ramas y criterios Dado/Cuando/Entonces. | GitHub Copilot como apoyo; `pytest`, `TestClient` y Ruff para verificar. | [registro_pruebas.md](registro_pruebas.md), [test_suite_semana7.py](tests/test_suite_semana7.py), [test_semana8.py](tests/test_semana8.py), [test_historias_principales.py](tests/test_historias_principales.py), [test_detector.py](test_detector.py). | En esta ejecución: `pytest -q` produjo 104 passed; `ruff check .` pasó. La bitácora registra una medición de Semana 8 de 90.62% de líneas y 85.11% de ramas; es un resultado documentado de esa ejecución, no una nueva medición de este informe. |
| **6. Operación** | Preparaste CI, contenedor, notas de despliegue y recomendaciones sobre errores de Gemini, privacidad, expiración de sesión y deriva. | GitHub Actions, Docker y revisión asistida; la ejecución remota y el build de la imagen no se verificaron en este entorno. | [ci.yml](.github/workflows/ci.yml), [Dockerfile](Dockerfile), [.dockerignore](.dockerignore), [semana9-operacion.md](docs/semana9-operacion.md), [revision_seguridad.md](revision_seguridad.md). | Revisión del contenido, comprobaciones estáticas de los requisitos de configuración, `pytest` y Ruff. El workflow no se ejecutó en GitHub y no se construyó la imagen Docker. |

## 4. Verificación: lo que la IA hizo mal y cómo lo encontraste

Los casos siguientes se basan en los entregables académicos ya presentes, la bitácora y las pruebas. Se distingue entre una limitación del ejercicio y un error de salida; una simulación, por ejemplo, no es un defecto si se presenta como simulación.

### Caso 1 — Prompts de Semana 2: primera respuesta demasiado básica

- **Fase:** Fundamentos de prompting y formulación de requisitos.
- **Qué propuso o produjo la IA:** En el ejercicio de validación de correo, el primer prompt produjo una solución que el propio registro evaluó con calidad 2/5; la iteración de VPN también partió de 2/5.
- **Qué estaba mal:** Las solicitudes iniciales eran demasiado generales para obtener el nivel de explicación, estructura y verificabilidad que se buscaba. La calificación es la evaluación consignada en el documento, no una medición independiente de corrección.
- **Cómo lo detectaste:** Comparaste cada primera salida con el objetivo del ejercicio y registraste qué instrucciones faltaban.
- **Qué hiciste:** Añadiste rol, contexto y requisitos concretos —incluidos regex, pruebas y formato de salida en el caso de correo—; las versiones iteradas quedaron calificadas 4/5 en el banco. La evidencia está en [S2](modulos/Rodriguez_Hernandez_Maicol_S2_Banco_Idea.docx).

### Caso 2 — Requisitos de Semana 3: citas y escenarios no fieles al contexto

- **Fase:** Requisitos.
- **Qué propuso o produjo la IA:** Durante la generación de requisitos, Gemini parafraseó una cita que se necesitaba literal y produjo escenarios de error orientados a hardware, aunque el alcance solicitado era una aplicación de software. En el roleplay también se omitió inicialmente la meta temporal.
- **Qué estaba mal:** La paráfrasis no servía como cita textual; los errores de hardware se salían del sistema y la respuesta simulada no recogía una restricción de tiempo relevante.
- **Cómo lo detectaste:** Revisaste las citas frente a la respuesta original del roleplay y cada escenario frente al alcance y los RNF del documento.
- **Qué hiciste:** Reiteraste que las citas fueran literales, acotaste los escenarios a errores de software y añadiste la meta de tiempo a la instrucción de simulación. El documento aclara que se trató de una entrevista simulada, no de evidencia recogida de un profesor real: [S3](<modulos/Rodriguez Hernandez_Maicol Duvan_S3_Requisitos.docx>).

### Caso 3 — Diseño de Semana 4: detalle excesivo y divergencia arquitectónica

- **Fase:** Diseño.
- **Qué propuso o produjo la IA:** El documento registra diagramas C4 cuyas relaciones tenían etiquetas demasiado largas, un modelo de datos inicialmente sobreelaborado y una tabla de API que no incluía todos los códigos de error pertinentes.
- **Qué estaba mal:** Las etiquetas dificultaban leer el diagrama; el diseño de datos excedía el MVP y la omisión de errores debilitaba el contrato de API. Además, el diseño final documenta Django REST y persistencia relacional, mientras que el código actual usa FastAPI y almacenamiento en memoria.
- **Cómo lo detectaste:** Revisaste los diagramas y la tabla contra el alcance y cotejaste el stack y el estado de datos del documento con la implementación.
- **Qué hiciste:** Acortaste las relaciones, redujiste el diseño conceptual a `DOCUMENTO` y `CHAT_MENSAJE` e incorporaste los errores. La diferencia Django/FastAPI y relacional/en memoria queda señalada como deriva entre el diseño documentado y el sistema construido, no como una migración completada: [S4](modulos/Rodriguez-Hernandez_Maicol_S4_Diseno.docx).

### Caso 4 — Pruebas: oráculos de redondeo y extracción PDF

- **Fase:** Pruebas.
- **Qué propuso o produjo la IA:** Las sugerencias iniciales asumían resultados de redondeo y extracción que no coincidían con la ejecución real.
- **Qué estaba mal:** Para los valores de frontera, el resultado esperado se había estimado como `.83` en vez del `69.82` y `34.82` que resultan con el redondeo de Python aplicado por la implementación. También se asumió que la unión de páginas PDF vacías sería una cadena vacía; el caso real produce saltos de línea entre páginas.
- **Cómo lo detectaste:** Ejecutaste las pruebas contra la fórmula y el extractor reales; las pruebas parametrizadas evidenciaron los resultados y el comportamiento del separador.
- **Qué hiciste:** Corregiste el oráculo, no la lógica para que coincidiera con una expectativa incorrecta, y conservaste las fronteras en [test_suite_semana7.py](tests/test_suite_semana7.py). La bitácora describe el ciclo de mutación manual del operador de frontera y la restauración posterior en [bitacora_ia.md](bitacora_ia.md).

### Caso 5 — Revisión de seguridad: falsos positivos y hallazgos omitidos

- **Fase:** Operación y revisión de seguridad.
- **Qué propuso o produjo la IA:** Una revisión automatizada señaló problemas en carpetas de aplicaciones hermanas que no pertenecían al alcance de este backend y omitió riesgos presentes en el flujo real.
- **Qué estaba mal:** Se mezcló evidencia de otros proyectos con `prueba`; además, la primera revisión no identificó el acceso a resultados sin validar la sesión propietaria (IDOR) ni la retención indefinida de algunas sesiones/resultados.
- **Cómo lo detectaste:** Comparaste cada afirmación con las rutas, imports y estructuras de estado del proyecto actual.
- **Qué hiciste:** Descartaste hallazgos ajenos y corregiste el acceso a resultados mediante `X-Session-Id` asociado al documento y la limpieza periódica de estado expirado. La revisión y sus límites están en [revision_seguridad.md](revision_seguridad.md).

### Defecto reproducible adicional

En Semana 8, una prueba con `TypeError` durante el análisis encontró que el documento podía quedar en `procesando`. Se añadió el manejo de ese error y una prueba de regresión; el caso y su evidencia reportada están en [D-01.md](docs/defectos/D-01.md). Este hallazgo se presenta como defecto detectado en el ciclo de pruebas; no se atribuye a una sugerencia de IA sin evidencia del prompt que lo originó.

## 5. Estado final del sistema

### Arquitectura

La interfaz Angular/Ionic consume una API FastAPI. `detector.py` carga desde Hugging Face el modelo configurado por `MODELO_ID`, cuyo valor predeterminado es `datificate/gpt2-small-spanish`; ante `OSError` o `ValueError` intenta `gpt2`. El análisis calcula perplejidad y variabilidad, aplica umbrales heurísticos y devuelve un aviso explícito. El chat es un servicio separado: Gemini recibe texto, métricas e historial cuando se envía una pregunta, con `store=False` y un timeout configurado de 90 segundos.

La API conserva documentos y sesiones en memoria durante 15 minutos, los limpia periódicamente y usa límites de solicitudes en proceso. No hay base de datos ni estado compartido entre réplicas. El diseño de Semana 4 documenta Django REST y almacenamiento relacional, mientras que el producto implementado es FastAPI con estado en memoria; esta diferencia debe resolverse actualizando el diseño *as built* o implementando y verificando explícitamente la persistencia, no suponerse resuelta.

### Funcionalidades terminadas

- Análisis de texto mediante `POST /analizar`, con validación de contenido y límites.
- Carga PDF/DOCX mediante `POST /api/v1/documentos/upload`, extracción, validación y análisis de documento.
- Consulta de estado/resultado en `GET /api/v1/documentos/{document_id}/resultado`, protegida por `X-Session-Id`.
- Chat contextual mediante `POST /api/v1/chat/mensaje`, validación de mensaje e historial acotado.
- Cliente Angular/Ionic para texto, documentos, sondeo del resultado y conversación; la interfaz advierte sobre las limitaciones del indicador y la transmisión a Gemini.
- Limitación de cuerpos y frecuencia, CORS configurable, y respuestas controladas para varios errores de validación, sesión, documento y proveedor.
- Workflow de CI y definición de imagen para el backend; no se afirma que hayan sido ejecutados en GitHub o Docker.

No forman parte de las rutas actuales `POST /api/v1/chat/señalar` ni `DELETE /api/v1/documentos/upload/{id}` mencionadas en el resumen del diseño de Semana 4. No deben presentarse como implementadas.

### Pruebas

En la ejecución actual del informe, `.\.venv\Scripts\python.exe -m pytest -q` terminó con **104 passed** y `.\.venv\Scripts\ruff.exe check .` con **All checks passed**. Las pruebas Python emplean mocks para no descargar el modelo ni requerir una clave Gemini real. La bitácora registra que la medición de cobertura de Semana 8 fue 90.62% de líneas y 85.11% de ramas.

El repositorio contiene pruebas Angular, pero no se ejecutaron en esta verificación. Tampoco se ejecutó el workflow en GitHub ni se construyó la imagen Docker; las notas de operación documentan que Docker no estaba disponible en el entorno.

### Pendientes

1. Actualizar el diseño de Semana 4 para que refleje el stack real FastAPI y el almacenamiento en memoria, o implementar y validar por separado la persistencia y sus implicaciones operativas.
2. No se identificó un entregable independiente rotulado como Semana 5. La bitácora, el código y las pruebas sí están en el árbol, pero la atribución de esos artefactos a una entrega formal de Semana 5 no queda demostrada por un documento específico; adjuntarlo si la rúbrica lo exige.
3. Obtener retroalimentación de usuarios reales; la entrevista simulada de Semana 3 no la reemplaza.
4. Evaluar y calibrar umbrales con corpus autorizado y representativo, incluidos falsos positivos/negativos por idioma, estilo y segmento. No usar la puntuación como prueba ni como fundamento único de decisiones disciplinarias.
5. Definir persistencia/compartición de estado si se despliega con varios workers o réplicas; establecer controles confiables de borde y revisar IP de cliente tras proxy.
6. Ejecutar el workflow en GitHub sobre `main`, construir/probar Docker en un entorno con Docker y dimensionar memoria/almacenamiento del modelo.
7. Diseñar health/readiness y métricas agregadas si se requieren para producción; actualmente no se verificó un endpoint de salud ni exportación de métricas.
8. Revisar privacidad, finalidad, retención y condiciones aplicables antes de enviar textos potencialmente personales a un proveedor externo.
9. Revisar los criterios de disponibilidad originales: el documento de requisitos clasifica el objetivo de 99% como *Won't*; confirmar si esa decisión sigue vigente antes de comprometer un SLA.

## 6. Reflexión ética y legal

| Tema | Riesgo y tratamiento |
|---|---|
| **Datos personales (Ley 1581 de 2012)** | Un texto o documento puede contener datos personales aunque el formulario no los solicite como campos separados. El backend guarda contenido en memoria temporalmente por 15 minutos; al preguntar al chat envía texto, métricas e historial a Google Gemini. `store=False` no significa que no haya transmisión. Debe informarse la finalidad, minimizar datos, contar con base legal y revisar medidas de seguridad, retención y atención de derechos según el contexto colombiano. La conformidad jurídica no se afirma como auditada. |
| **Sesgo** | Perplejidad y variabilidad pueden cambiar por idioma, tema, estilo formal, nivel de escritura o modelo. Sin corpus etiquetado no se conocen tasas de error ni equidad entre grupos. El sistema advierte que puede equivocarse y el pendiente es medir falsos positivos/negativos antes de usos de mayor impacto. |
| **Transparencia** | La salida se denomina índice/puntuación orientativa, no probabilidad calibrada. La API y la interfaz muestran avisos; la interfaz también comunica que la pregunta y el contexto se envían a Google Gemini. La explicación del chat tampoco debe tratarse como prueba independiente. |
| **Responsabilidad** | El sistema apoya la comprensión, no sustituye evaluación humana. Una persona responsable debe revisar el texto y el contexto; no se debe acusar, sancionar ni decidir únicamente por la cifra. El servicio requiere supervisión y respuesta ante errores. |
| **Propiedad intelectual y política de uso** | Deben respetarse derechos y condiciones de uso de los textos cargados, del modelo y del proveedor. El proyecto no debería recibir material que el usuario no esté autorizado a compartir. El README indica que la licencia del repositorio no está especificada; la licencia del modelo y los derechos de cada texto requieren verificación antes de un despliegue o redistribución. El uso académico de IA se registra en la bitácora. |

El dilema ético más importante es que un indicador aparentemente preciso puede convertirse en una acusación injusta. Se resolvió comunicando que no demuestra autoría, explicando las métricas, evitando llamarlo probabilidad y manteniendo la evaluación humana como requisito. La transmisión del documento a Gemini al preguntar constituye otro riesgo importante: se comunica al usuario y debe limitarse a contenido que esté autorizado a compartir.

## 7. Aprendizajes

Ahora puedo conectar una historia de usuario con contratos HTTP, validaciones, estado, pruebas de frontera y controles de operación; también puedo revisar código sugerido por IA contra comportamiento ejecutable y documentar un defecto reproducible. Aprendí que una prueba generada automáticamente necesita un oráculo independiente: redondeo de punto flotante, separadores de PDF y límites inclusivos no deben decidirse por intuición.

Confié demasiado en revisiones de IA que parecían completas: una revisión puede mezclar carpetas vecinas y omitir problemas reales de autorización o retención. También aprendí que una entrevista simulada sirve para ensayar preguntas, no para afirmar que se validaron necesidades con usuarios.

En una iteración futura empezaría por enlazar requisitos y evidencias originales, hacer entrevistas reales con consentimiento, definir pruebas medibles antes de generar código y separar requisitos de MVP de propuestas. Antes de producción ejecutaría CI en la rama objetivo, construiría y probaría el contenedor, verificaría controles de privacidad y evaluaría umbrales sobre datos representativos, sin convertir el indicador en una decisión automática.

## 8. Anexos

### Repositorio y ramas de trabajo

- **Repositorio principal:** [Maicol-Rodriguez/DESARROLLO-DE-APPS](https://github.com/Maicol-Rodriguez/DESARROLLO-DE-APPS.git)
- **Rama de pruebas unitarias (Semana 7):** `feature/semana-7-pruebas-unitarias` (referenciada en la entrega de Semana 7 del 22 de noviembre de 2026).
- **Rama actual de integración y cierre (Semanas 8–9):** `semana-8-9` (donde se consolidaron los ajustes recientes de seguridad, operación, CI y contenedor).

### Evidencias presentes en el repositorio

- **Documentación general y operación (Semanas 6, 8 y 9):** [README.md](README.md), [bitacora_ia.md](bitacora_ia.md), [registro_pruebas.md](registro_pruebas.md), [revision_seguridad.md](revision_seguridad.md), [docs/semana9-operacion.md](docs/semana9-operacion.md), [docs/defectos/D-01.md](docs/defectos/D-01.md) y [promtp.md](promtp.md).
- **Pruebas y verificación (Semanas 5–8):** [tests/](tests/), [tests/test_suite_semana7.py](tests/test_suite_semana7.py), [tests/test_semana8.py](tests/test_semana8.py), [tests/test_historias_principales.py](tests/test_historias_principales.py), [test_detector.py](test_detector.py), [src/app/core/analysis.service.spec.ts](src/app/core/analysis.service.spec.ts) y [src/app/home/home.page.spec.ts](src/app/home/home.page.spec.ts).
- **CI/CD y contenedor (Semana 9):** [.github/workflows/ci.yml](.github/workflows/ci.yml), [Dockerfile](Dockerfile) y [.dockerignore](.dockerignore).

### Evidencias externas pendientes de verificar o adjuntar en el repositorio

### Evidencias académicas de Semanas 1–4 incorporadas

- **Semana 1:** [Tarea semana 1.docx](<modulos/Tarea semana 1.docx>).
- **Semana 2:** [Rodriguez_Hernandez_Maicol_S2_Banco_Idea.docx](modulos/Rodriguez_Hernandez_Maicol_S2_Banco_Idea.docx).
- **Semana 3:** [Rodriguez Hernandez_Maicol Duvan_S3_Requisitos.docx](<modulos/Rodriguez Hernandez_Maicol Duvan_S3_Requisitos.docx>).
- **Semana 4:** [Rodriguez-Hernandez_Maicol_S4_Diseno.docx](modulos/Rodriguez-Hernandez_Maicol_S4_Diseno.docx).

El TXT de necesidades de minimercado también está en `modulos/`, pero no se enlaza como evidencia de esta plataforma porque su contenido corresponde a otro ejercicio. No se encontró un informe autónomo de Semana 5; el código, pruebas y bitácora vinculados al incremento sí están listados arriba, sin atribuirles una entrega formal que no se pudo verificar.