Actúa como desarrollador frontend senior con buen criterio de diseño de interfaces, accesibilidad y seguridad web.

CONTEXTO
En esta carpeta ya existe el backend de un detector de texto generado por IA, hecho con FastAPI (main.py, detector.py, test_detector.py). La ruta POST /analizar recibe un JSON con el campo "texto" y devuelve: "puntuacion" (0 a 100), "nivel" (bajo, medio o alto), "perplejidad", "variabilidad", "oraciones_sospechosas" (lista) y "aviso". El backend aún no tiene interfaz gráfica. Es un proyecto académico de un seminario sobre IA en el ciclo de vida del software, así que el código debe ser claro y fácil de explicar.

PRIMER PASO
Lee main.py y detector.py antes de escribir nada, para confirmar los nombres exactos de los campos, los códigos de error y el formato de los mensajes de error. Adapta el frontend a lo que realmente devuelve el backend.

TAREA
Crea una interfaz web de una sola página que permita pegar un texto, enviarlo a POST /analizar y mostrar el resultado.

Elementos de la interfaz:
1. Encabezado sobrio con el título "Detector de texto generado por IA" y una línea corta que explique para qué sirve.
2. Área de texto grande para pegar el contenido, con contador en vivo de palabras y de caracteres (mínimo 50 palabras, máximo 5000 caracteres), y que avise visualmente cuando se pasa del límite o no llega al mínimo.
3. Botón "Analizar", desactivado mientras se cumple alguna condición inválida o la petición está en curso, con un indicador de carga discreto. Un botón secundario "Limpiar".
4. Tarjeta de resultado con: la puntuación de 0 a 100 en una barra de progreso horizontal con el valor numérico visible, el nivel (bajo, medio o alto) como etiqueta, la perplejidad y la variabilidad con una explicación corta de qué significa cada una, y la lista de oraciones sospechosas.
5. El "aviso" del backend siempre visible dentro de la tarjeta de resultado, bien legible y no escondido. Los resultados se presentan como una estimación, nunca como una prueba.
6. Una sección "Explicación del resultado" que, por ahora, genere un texto breve en lenguaje sencillo según el nivel y las métricas, usando reglas simples en el propio frontend (sin llamar a ninguna API externa). Deja un comentario claro en el código que marque dónde se conectará después el chatbot.
7. Mensajes de error claros en español cuando el backend devuelva 400 o 422, o cuando no se pueda conectar con el servidor. Nunca muestres JSON crudo ni trazas técnicas.

ESTILO VISUAL
Aspecto serio, profesional y limpio, de herramienta académica. Sin emojis, sin ilustraciones infantiles ni animaciones llamativas. Mucho espacio en blanco y bordes suaves.
- Paleta con verde pastel suave, definida como variables CSS:
  - Fondo general: #F4F8F5
  - Superficies y tarjetas: #FFFFFF con borde #D9E6DE
  - Verde pastel de acento (barra, detalles, bordes activos): #A8D5BA
  - Verde oscuro para botones, títulos y enlaces: #2F5D50
  - Texto principal: #1F2D27, texto secundario: #5B6B63
- El verde pastel claro no tiene contraste suficiente con texto blanco: el botón principal debe usar el verde oscuro con texto blanco, y sobre fondos pastel el texto debe ser oscuro. Cumple contraste mínimo WCAG AA.
- Etiquetas de nivel con tonos sobrios, no semáforo chillón: bajo en verde suave, medio en ámbar apagado y alto en rojo terroso apagado, siempre acompañadas del texto del nivel (no depender solo del color).
- Tipografía de sistema (por ejemplo system-ui, "Segoe UI", sans-serif), sin cargar fuentes externas.
- Diseño responsive: debe verse bien en computador y en celular.
- Foco visible en elementos interactivos, etiquetas asociadas a los campos y atributos de accesibilidad básicos (aria-live para el resultado y los errores).

RESTRICCIONES TÉCNICAS
- Solo HTML, CSS y JavaScript puro (vanilla). Sin frameworks, sin librerías, sin CDN ni recursos externos de ningún tipo.
- Archivos en una carpeta "static": index.html, estilos.css y app.js.
- Sirve la carpeta static desde la propia aplicación FastAPI en la ruta "/" usando StaticFiles, montándola DESPUÉS de definir las rutas de la API para no tapar /analizar. Haz el cambio mínimo en main.py y no toques la lógica de análisis ni las validaciones. Como frontend y backend quedan en el mismo origen, no hace falta CORS.
- Seguridad: muestra todo contenido que venga del texto del usuario (por ejemplo las oraciones sospechosas) usando textContent, nunca innerHTML, para evitar inyección de código.
- Privacidad: no guardes el texto del usuario en localStorage, sessionStorage ni cookies, y no lo imprimas en la consola.
- Calidad: funciones de JavaScript cortas (máximo 30 líneas), nombres claros en español o inglés pero consistentes, comentarios breves en español y sin código innecesario.

FORMA DE TRABAJO
- No me muestres el código en el chat: crea y modifica los archivos directamente.
- No borres ni modifiques nada fuera de esta carpeta, y pídeme confirmación antes de ejecutar comandos que no sean correr las pruebas o iniciar el servidor.
- Ejecuta de nuevo las pruebas existentes con unittest y confirma que siguen pasando.
- Inicia el servidor y verifica con una petición de prueba que la página carga en "/" y que /analizar sigue respondiendo.
- Al terminar, dame un resumen corto con: los archivos creados o modificados, el comando para iniciar el servidor, la dirección donde abrir la página en el navegador y cualquier limitación que debas advertirme.