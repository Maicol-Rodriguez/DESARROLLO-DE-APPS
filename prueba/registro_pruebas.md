# Registro de pruebas: tabla de casos y pruebas de la IA

Proyecto: Detector de Textos IA / Analizador Académico de Texto
Estudiante: Maicol Rodríguez
Fecha: 2026-11-22

---

## 1. Tabla de casos

### Regla 1: `validar_texto_analisis` - Validación estructural y volumétrica del texto de entrada

**Regla completa (el oráculo):** El texto enviado para análisis debe ser una cadena no vacía y que no contenga únicamente espacios en blanco. Debe contener obligatoriamente un mínimo de 50 palabras (`MIN_ANALYSIS_WORDS = 50`), no debe superar los 5000 caracteres (`MAX_ANALYSIS_CHARACTERS = 5000`) y no debe superar las 100 oraciones válidas (`MAX_ANALYSIS_SENTENCES = 100`), donde una oración válida se define como un fragmento delimitado por puntuación terminal (`.`, `!`, `?`) con al menos 4 palabras (`MIN_WORDS_PER_SENTENCE = 4`). Cualquier incumplimiento de estas condiciones debe lanzar inmediatamente una excepción `ValueError` descriptiva; en caso contrario, se retorna el texto limpio y validado.

| Técnica | Partición o límite | Entrada | Esperado | Prueba que lo cubre |
|---|---|---|---|---|
| Partición válida | Texto estándar completo | Texto de 50 palabras, <5000 caracteres, oraciones estándar | Retorna texto idéntico | `test_particion_valida_texto_estandar` |
| Partición inválida | Cadena vacía | `""` | `ValueError("El texto no puede estar vacío...")` | `test_particion_invalida_texto_vacio[-cadena vacía]` |
| Partición inválida | Solo espacios en blanco | `"   \t  \n  "` | `ValueError("El texto no puede estar vacío...")` | `test_particion_invalida_texto_vacio[solo espacios en blanco]` |
| Límite (mínimo - 1) | 49 palabras | Texto de 49 palabras | `ValueError("debe contener al menos 50 palabras (recibidas: 49)")` | `test_valores_limite_conteo_palabras[49-False]` |
| Límite (mínimo exacto) | 50 palabras | Texto de exactamente 50 palabras | Retorna texto | `test_valores_limite_conteo_palabras[50-True]` |
| Límite (mínimo + 1) | 51 palabras | Texto de 51 palabras | Retorna texto | `test_valores_limite_conteo_palabras[51-True]` |
| Límite (máximo exacto) | 5000 caracteres | Texto de >=50 palabras con longitud exacta de 5000 caracteres | Retorna texto | `test_valores_limite_longitud_caracteres[0-True]` |
| Límite (máximo + 1) | 5001 caracteres | Texto de >=50 palabras con longitud exacta de 5001 caracteres | `ValueError("no debe superar los 5000 caracteres (recibidos: 5001)")` | `test_valores_limite_longitud_caracteres[1-False]` |
| Límite (máximo exacto) | 100 oraciones válidas | 100 oraciones de 4 palabras cada una (400 palabras) | Retorna texto | `test_valores_limite_oraciones_validas[100-True]` |
| Límite (máximo + 1) | 101 oraciones válidas | 101 oraciones de 4 palabras cada una (404 palabras) | `ValueError("supera el límite de 100 oraciones...")` | `test_valores_limite_oraciones_validas[101-False]` |

**Ambigüedades encontradas:** La especificación inicial no aclaraba si las oraciones con menos de 4 palabras contaban dentro del límite máximo de oraciones. Se resolvió en la arquitectura del filtro: únicamente las oraciones que cumplen `len(oracion.split()) >= MIN_WORDS_PER_SENTENCE (4)` se contabilizan para el límite de 100 oraciones, evitando penalizar interjecciones o siglas en el texto.

#### Tabla de decisión: Validación de texto para análisis

| Condición | R1 | R2 | R3 | R4 | R5 |
|---|:---:|:---:|:---:|:---:|:---:|
| C1: Texto no vacío y no solo espacios | Sí | No | Sí | Sí | Sí |
| C2: Conteo de palabras $\ge 50$ | Sí | - | No | Sí | Sí |
| C3: Longitud en caracteres $\le 5000$ | Sí | - | - | No | Sí |
| C4: Oraciones válidas $\le 100$ | Sí | - | - | - | No |
| **Acción / Resultado esperado** | | | | | |
| **A1: Aceptar texto para análisis** | **X** | | | | |
| **A2: Lanzar ValueError ("no puede estar vacío")** | | **X** | | | |
| **A3: Lanzar ValueError ("al menos 50 palabras")** | | | **X** | | |
| **A4: Lanzar ValueError ("superar los 5000 caracteres")** | | | | **X** | |
| **A5: Lanzar ValueError ("supera el límite de 100 oraciones")** | | | | | **X** |

---

### Regla 2: `calcular_puntuacion_ia` - Cálculo de índice heurístico y clasificación cualitativa

**Regla completa (el oráculo):** La puntuación experimental de probabilidad de IA ($0.0$ a $100.0$) se calcula mediante mapeo lineal inverso de perplejidad y variabilidad.
- Para la perplejidad: $score_{ppl} = \text{clamp}(0, 100, \frac{80.0 - \text{ppl}}{40.0} \times 100)$. Si $\text{ppl} \le 40.0$, $score_{ppl} = 100.0$; si $\text{ppl} \ge 80.0$, $score_{ppl} = 0.0$.
- Para la variabilidad (desviación estándar entre oraciones): solo se pondera si el texto contiene al menos 2 oraciones válidas (`num_oraciones >= 2`). $score_{var} = \text{clamp}(0, 100, \frac{25.0 - \text{variabilidad}}{15.0} \times 100)$. Si $\text{variabilidad} \le 10.0$, $score_{var} = 100.0$; si $\text{variabilidad} \ge 25.0$, $score_{var} = 0.0$.
- Ponderación combinada: Si $\text{num\_oraciones} \ge 2$, $Puntuación = round(score_{ppl} \times 0.7 + score_{var} \times 0.3, 2)$. Si $\text{num\_oraciones} < 2$, $Puntuación = round(score_{ppl}, 2)$ (100% perplejidad).
- Nivel cualitativo:
  - $Puntuación \ge 70.0 \rightarrow$ `"alto"`
  - $35.0 \le Puntuación < 70.0 \rightarrow$ `"medio"`
  - $Puntuación < 35.0 \rightarrow$ `"bajo"`

| Técnica | Partición o límite | Entrada | Esperado | Prueba que lo cubre |
|---|---|---|---|---|
| Partición válida (IA alta) | PPL baja (<40) y Var baja (<10), multi-oración | ppl=30.0, var=5.0, oraciones=5 | `(100.0, "alto")` | `test_particiones_equivalencia_globales[30.0-5.0-5-100.0-alto]` |
| Partición válida (Humano) | PPL alta (>80) y Var alta (>25), multi-oración | ppl=90.0, var=30.0, oraciones=5 | `(0.0, "bajo")` | `test_particiones_equivalencia_globales[90.0-30.0-5-0.0-bajo]` |
| Partición válida (Intermedia) | PPL media (60.0) y Var media (17.5), multi-oración | ppl=60.0, var=17.5, oraciones=4 | `(50.0, "medio")` | `test_particiones_equivalencia_globales[60.0-17.5-4-50.0-medio]` |
| Límite (frontera inf - 0.1) | PPL 39.9 (bajo frontera de clamp inferior) | ppl=39.9, oraciones=1 | `(100.0, "alto")` | `test_valores_limite_perplejidad_aislada_mono_oracion[39.9-100.0]` |
| Límite (frontera inf exacta) | PPL 40.0 (umbral exacto PPL baja) | ppl=40.0, oraciones=1 | `(100.0, "alto")` | `test_valores_limite_perplejidad_aislada_mono_oracion[40.0-100.0]` |
| Límite (punto medio PPL) | PPL 60.0 (punto medio de escala) | ppl=60.0, oraciones=1 | `(50.0, "medio")` | `test_valores_limite_perplejidad_aislada_mono_oracion[60.0-50.0]` |
| Límite (frontera sup exacta) | PPL 80.0 (umbral exacto PPL alta) | ppl=80.0, oraciones=1 | `(0.0, "bajo")` | `test_valores_limite_perplejidad_aislada_mono_oracion[80.0-0.0]` |
| Límite (frontera sup + 0.1) | PPL 80.1 (sobre frontera de clamp superior) | ppl=80.1, oraciones=1 | `(0.0, "bajo")` | `test_valores_limite_perplejidad_aislada_mono_oracion[80.1-0.0]` |
| Límite (frontera inf var) | Variabilidad 10.0 (umbral exacto Var baja) | ppl=80.0, var=10.0, oraciones=3 | `(30.0, "bajo")` | `test_valores_limite_variabilidad_con_ppl_neutra[10.0-100.0]` |
| Límite (frontera sup var) | Variabilidad 25.0 (umbral exacto Var alta) | ppl=80.0, var=25.0, oraciones=3 | `(0.0, "bajo")` | `test_valores_limite_variabilidad_con_ppl_neutra[25.0-0.0]` |
| Límite (oraciones mono) | num_oraciones = 1 (límite mono-oración) | ppl=60.0, var=5.0, oraciones=1 | `(50.0, "medio")` | `test_valores_limite_numero_de_oraciones[1-5.0-50.0]` |
| Límite (oraciones multi) | num_oraciones = 2 (límite multi-oración) | ppl=60.0, var=10.0, oraciones=2 | `(65.0, "medio")` | `test_valores_limite_numero_de_oraciones[2-10.0-65.0]` |
| Límite (umbral alto exacto) | Puntuación = 70.0 exacto | ppl=40.0, var=25.0, oraciones=3 | `(70.0, "alto")` | `test_valores_limite_clasificacion_cualitativa_nivel[40.0-25.0-3-70.0-alto]` |
| Límite (justo bajo alto) | Puntuación = 69.82 (justo debajo de 70.0) | ppl=40.1, var=25.0, oraciones=3 | `(69.82, "medio")` | `test_valores_limite_clasificacion_cualitativa_nivel[40.1-25.0-3-69.82-medio]` |
| Límite (umbral medio exacto)| Puntuación = 35.0 exacto | ppl=60.0, var=25.0, oraciones=3 | `(35.0, "medio")` | `test_valores_limite_clasificacion_cualitativa_nivel[60.0-25.0-3-35.0-medio]` |
| Límite (justo bajo medio) | Puntuación = 34.82 (justo debajo de 35.0) | ppl=60.1, var=25.0, oraciones=3 | `(34.82, "bajo")` | `test_valores_limite_clasificacion_cualitativa_nivel[60.1-25.0-3-34.82-bajo]` |

**Ambigüedades encontradas:** En la fórmula teórica, la división con punto flotante IEEE 754 genera valores con decimales infinitos (ej. $69.825$ al evaluar $40.1$ de PPL). El oráculo definió explícitamente aplicar redondeo bancario a 2 decimales (`round(puntuacion, 2)`), resultando en `69.82` (medio) y `34.82` (bajo), lo cual quedó formalizado y validado en la suite.

#### Tabla de decisión: Determinación de nivel cualitativo

| Condición | R1 | R2 | R3 | R4 |
|---|:---:|:---:|:---:|:---:|
| C1: Puntuación calculada $\ge 70.0$ | Sí | No | No | No |
| C2: Puntuación calculada $\ge 35.0$ | - | Sí | Sí | No |
| C3: Puntuación calculada $< 35.0$ | - | No | No | Sí |
| **Acción / Nivel cualitativo emitido** | | | | |
| **A1: Nivel = "alto"** | **X** | | | |
| **A2: Nivel = "medio"** | | **X** | **X** | |
| **A3: Nivel = "bajo"** | | | | **X** |

---

### Regla 3: `extraer_texto_documento` y `subir_documento` - Reglas de ingesta y límites de archivos

**Regla completa (el oráculo):** El servicio de ingesta documental únicamente procesa archivos con extensión `.pdf` (que inicien con el número mágico `%PDF-`) o `.docx` (formato ZIP válido con estructura interna conteniendo `word/document.xml`). El tamaño máximo admitido es de 5 MiB ($5 \times 1024 \times 1024 = 5,242,880$ bytes); superar este tamaño resulta en HTTP 413. Para archivos PDF, el número máximo de páginas es 100 (`MAX_DOCUMENT_PAGES = 100`); PDFs con 101 páginas o más son rechazados con `ValueError`.

| Técnica | Partición o límite | Entrada | Esperado | Prueba que lo cubre |
|---|---|---|---|---|
| Partición inválida | Extensión no permitida | Archivo binario con extensión `.exe` | `ValueError("Extensión no soportada")` / HTTP 415 | `test_extraer_texto_extension_no_soportada_lanza_value_error` |
| Límite (máximo exacto) | PDF de exactamente 100 páginas | Archivo PDF generado con 100 páginas en blanco | Extrae texto sin error | `test_extraer_texto_pdf_limite_paginas_exacto_100` |
| Límite (máximo + 1) | PDF de 101 páginas | Archivo PDF generado con 101 páginas | `ValueError("supera el límite de 100 páginas")` | `test_extraer_texto_pdf_limite_paginas_101_lanza_value_error` |
| Límite (tamaño máx exacto) | Archivo de 5.242.880 bytes (5 MiB) | Archivo PDF de 5 MiB exactos | HTTP 201 (Aceptado y procesando) | `test_subir_pdf_de_5_mib_exactos_es_aceptado` |
| Límite (tamaño máx + 1) | Archivo de 5.242.881 bytes (5 MiB + 1B) | Archivo PDF de 5 MiB + 1 byte | HTTP 413 (`DOCUMENT_TOO_LARGE_MESSAGE`) | `test_subir_pdf_mayor_de_5_mib_devuelve_413` |

**Ambigüedades encontradas:** Algunos navegadores envían el MIME-type `application/octet-stream` para archivos `.docx` o `.pdf`. Por seguridad y robustez, el backend valida tanto la extensión como los encabezados binarios reales (números mágicos `b"%PDF-"` y estructura `ZipFile` con `word/document.xml`).

---

### Regla 4: `FixedWindowRateLimiter` - Control de flujo por cliente (Rate Limiting)

**Regla completa (el oráculo):** Para proteger la API contra saturación o ataques de denegación de servicio (DoS), cada cliente identificado por su IP tiene un límite de peticiones dentro de una ventana fija de 60 segundos (`window_seconds = 60`). Las solicitudes que no excedan el cupo configurado (`requests <= max_requests`) son despachadas normalmente. Al llegar la solicitud `max_requests + 1`, el limiter bloquea la petición lanzando una excepción `HTTPException(status_code=429)` con la cabecera `Retry-After` que indica los segundos restantes para el reinicio de la ventana. Transcurridos los 60 segundos, el contador del cliente se resetea automáticamente a 1.

| Técnica | Partición o límite | Entrada | Esperado | Prueba que lo cubre |
|---|---|---|---|---|
| Límite (cupo exacto N) | max_requests = 2, peticiones 1 y 2 | Petición 1 y 2 desde IP `192.168.1.100` | Ambas permitidas (HTTP 200/OK) | `test_rate_limiter_limite_exacto_y_exceso` |
| Límite (cupo N + 1) | max_requests = 2, petición 3 | Petición 3 desde IP `192.168.1.100` | HTTP 429 con cabecera `Retry-After` | `test_rate_limiter_limite_exacto_y_exceso` |
| Partición temporal | Transcurrida la ventana de 60s | Nueva petición tras expirar tiempo de ventana | Permitida y contador reiniciado a 1 | `test_rate_limiter_reseteo_tras_expiracion_de_ventana` |

**Ambigüedades encontradas:** Si la cabecera `Retry-After` debía ser un entero o un valor decimal. Se estandarizó como un entero positivo redondeado hacia arriba mediante `math.ceil` conforme a RFC 7231.

---

### Regla 5: `ChatMessage` - Saneamiento y validación de consultas al chatbot

**Regla completa (el oráculo):** El modelo de entrada para consultas al chatbot (`ChatMessage`) exige un identificador de sesión y una pregunta textual. La pregunta debe ser una cadena no vacía y sin caracteres de control (`ord < 32` o `ord == 127`), con una longitud máxima permitida de 500 caracteres (`MAX_CHAT_MESSAGE_LENGTH = 500`). Cualquier transgresión lanza `ValidationError` (o HTTP 422).

| Técnica | Partición o límite | Entrada | Esperado | Prueba que lo cubre |
|---|---|---|---|---|
| Partición válida | Mensaje estándar válido | `"¿Por qué la perplejidad es baja?"` | Mensaje asignado correctamente | `test_chat_message_valido_estandar` |
| Partición inválida | Mensaje vacío / espacios | `""`, `"   "`, `"\t  \t"` | `ValidationError("El mensaje no puede estar vacío.")` | `test_chat_message_vacio_lanza_validation_error` |
| Límite (máximo exacto) | 500 caracteres | Cadena de 500 caracteres `'a'` | Válido, longitud 500 | `test_chat_message_valores_limite_longitud[500-True]` |
| Límite (máximo + 1) | 501 caracteres | Cadena de 501 caracteres `'a'` | `ValidationError("no debe superar 500 caracteres")` | `test_chat_message_valores_limite_longitud[501-False]` |
| Partición inválida | Caracteres de control | Caracteres `\x00`, `\x07`, `\x1f`, `\x7f`, `\n`, `\r` | `ValidationError("caracteres de control")` | `test_chat_message_caracteres_control_rechazados` |

**Ambigüedades encontradas:** La especificación original no aclaraba si los saltos de línea (`\n`, `\r`) debían permitirse en preguntas de chat. Se confirmó que el chatbot está diseñado para consultas directas y concisas en una sola línea; por ende, los saltos de línea se consideran caracteres de control restringidos para evitar ataques de inyección de prompt multilínea.

---

## 2. Pruebas de la IA descartadas o corregidas

**Prompt usado:** Resumen en la [Bitácora de IA (Semana 7)](./bitacora_ia.md). Se solicitó a la IA generar una suite de pruebas para cubrir los valores límite de `calcular_puntuacion_ia`, la validación de `validar_texto_analisis` y la extracción de PDFs de 100 páginas.

| Prueba generada | Decisión | Por qué | En su lugar |
|---|---|---|---|
| `test_puntuacion_devuelve_algo`: `assert calcular_puntuacion_ia(50, 15, 3) is not None` | Descartada | Débil y superficial: pasa con cualquier retorno no nulo, incluso si devuelve un diccionario vacío o un tipo incorrecto. | Pruebas formales de particiones que comprueban exactamente la tupla `(score, nivel)` con valores numéricos esperados. |
| `test_puntuacion_frontera_70`: calculó que para PPL 40.1 y Var 25.0 el score esperado era `69.83` | Corregida | El modelo de IA asumió redondeo aritmético convencional ($69.825 \rightarrow 69.83$), desconociendo que Python aplica redondeo bancario IEEE 754 a pares (`round(69.825, 2) == 69.82`). | Se corrigió el valor esperado a `69.82` y se validó que clasifique en el nivel `"medio"`. |
| `test_puntuacion_frontera_35`: calculó que para PPL 60.1 y Var 25.0 el score esperado era `34.83` | Corregida | Error idéntico de redondeo de punto flotante: $49.75 \times 0.7 = 34.825$, cuyo redondeo bancario es `34.82`. | Se corrigió el valor esperado a `34.82` y se validó que clasifique en el nivel `"bajo"`. |
| `test_extraer_pdf_100_paginas`: `assert extraer_texto_documento(pdf_bytes, ".pdf") == ""` | Corregida | La IA asumió que 100 páginas en blanco generan una cadena vacía `""`, ignorando que la función une los fragmentos con `"\n"`, produciendo 99 saltos de línea. | `assert resultado.strip() == ""` y `assert len(resultado) == MAX_DOCUMENT_PAGES - 1`. |
| `test_palabras_intermedias`: prueba con 55 palabras, 60 palabras y 75 palabras de forma repetitiva | Descartada | Redundante: pertenecen a la misma partición de equivalencia válida. No aportan valor tras verificar la frontera min (50) y min+1 (51). | Conservar únicamente las fronteras formales 49 (inválida), 50 (válida) y 51 (válida). |
| `test_client_directo_sin_mock`: inicializaba `TestClient(main.app)` directamente sin mock de Transformers | Corregida | La IA no contempló que en entornos aislados o sin conexión externa, la descarga del modelo causa timeout de red en el lifespan de FastAPI. | Se introdujo la fixture `evitar_descarga_modelo` (`monkeypatch.setattr(main, "cargar_modelo", ...)`) aislando la ejecución. |
| `test_chat_message_valores_limite_longitud`: parametrización con 500 y 501 caracteres | Conservada | Excelente diseño de valores límite para longitud de pregunta con validación de excepción Pydantic. | Conservada sin alteraciones. |
| `test_valores_limite_conteo_palabras`: parametrización con 49, 50 y 51 palabras | Conservada | Cumple con la técnica de análisis de valores límite (min-1, min, min+1) de forma concisa y rigurosa. | Conservada sin alteraciones. |

---

## 3. Romper el código a propósito (Prueba de mutación manual)

Para verificar que la suite de pruebas es un oráculo protector real y no una colección de aserciones triviales, se aplicó una mutación controlada en el código de producción.

| Cambio introducido | Archivo y línea | ¿Alguna prueba falló? | Qué hice |
|---|---|---|---|
| Cambio de operador `>=` por `>` en el umbral alto de puntuación (`if puntuacion > UMBRAL_PUNTUACION_ALTA`) | `detector.py:169` | **Sí**, falló `test_valores_limite_clasificacion_cualitativa_nivel[40.0-25.0-3-70.0-alto]` | Se capturó la evidencia de consola demostrando la detección inmediata del fallo y se revirtió el cambio restaurando el operador original `>=`. |

### Evidencia de ejecución del fallo (Consola):

```text
$ .venv\Scripts\python.exe -m pytest -q tests/test_suite_semana7.py -k test_valores_limite_clasificacion_cualitativa_nivel
.F...                                                                    [100%]
=================================== FAILURES ===================================
_ TestCalculoPuntuacionIA.test_valores_limite_clasificacion_cualitativa_nivel[40.0-25.0-3-70.0-alto] _
E       AssertionError: assert 'medio' == 'alto'
E         - alto
E         + medio
=========================== short test summary info ============================
FAILED tests/test_suite_semana7.py::TestCalculoPuntuacionIA::test_valores_limite_clasificacion_cualitativa_nivel[40.0-25.0-3-70.0-alto]
1 failed, 4 passed, 48 deselected in 24.47s
```

### Evidencia de restauración y suite completa en verde:

```text
============================= test session starts =============================
platform win32 -- Python 3.10.0, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\Users\rodri\OneDrive\todo\Documentos\SEXTO SEMESTRE\DESARROLLO DE APPS\prueba
configfile: pyproject.toml
testpaths: tests, test_detector.py
plugins: anyio-4.15.1, platformdirs-4.12.4
collected 89 items

tests\test_historias_principales.py ...............................      [ 34%]
tests\test_rate_limiting.py .                                            [ 35%]
tests\test_suite_semana7.py ............................................ [ 85%]
.........                                                                [ 95%]
test_detector.py ....                                                    [100%]

============================= 89 passed in 26.87s =============================
```

---

## 4. Datos de prueba

**Origen:** Todos los datos de prueba utilizados son sintéticos, generados programáticamente en las fixtures de pruebas y mediante generadores deterministas en Python (`BytesIO`, `PdfWriter`, repetición de cadenas controladas). **Confirmo expresamente que no se utilizaron datos de personas reales ni información confidencial.**

**Casos difíciles incluidos:**
1. **Caracteres especiales y ortografía en español:** Pruebas con tildes (`á, é, í, ó, ú`), diéresis (`ü`), eñes (`ñ`), signos de apertura interrogativa y exclamativa (`¿`, `¡`) y comillas tipográficas.
2. **Caracteres de control y seguridad:** Validación contra caracteres ASCII no imprimibles (`\x00` a `\x1f`, `\x7f`), saltos de línea crudos (`\r`, `\n`) y tabuladores para mitigar inyecciones de prompt.
3. **Casos vacíos y espacios en blanco:** Combinaciones de cadenas vacías, espacios múltiples, tabulaciones y saltos de línea aislados.
4. **Fronteras numéricas exactas:** Textos con exactamente 49, 50 y 51 palabras; exactamente 5000 y 5001 caracteres; PDFs de 100 y 101 páginas; mensajes de chat de 500 y 501 caracteres; y límites de tasa en peticiones $N$ vs $N+1$.
5. **Redondeo IEEE 754 y dispersión estadística:** Textos con menos de dos oraciones (variabilidad $0.0$), y valores con decimales infinitos que exigen redondeo bancario a 2 cifras decimales.
