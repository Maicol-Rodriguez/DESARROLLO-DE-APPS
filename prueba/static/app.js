/**
 * Interfaz de usuario para el Detector de Texto Generado por IA.
 * Código Vanilla JavaScript sin dependencias externas.
 */

function contarPalabras(texto) {
  const palabras = texto.trim().split(/\s+/);
  return palabras[0] === "" ? 0 : palabras.length;
}

function obtenerElementos() {
  return {
    campoTexto: document.getElementById("campo-texto"),
    contadorPalabras: document.getElementById("contador-palabras"),
    contadorCaracteres: document.getElementById("contador-caracteres"),
    avisoValidaciones: document.getElementById("aviso-validaciones"),
    btnAnalizar: document.getElementById("btn-analizar"),
    btnLimpiar: document.getElementById("btn-limpiar"),
    textoBtn: document.getElementById("texto-btn-analizar"),
    spinner: document.getElementById("spinner-carga"),
    cajaError: document.getElementById("caja-error"),
    textoError: document.getElementById("texto-error"),
    tarjetaResultado: document.getElementById("tarjeta-resultado"),
    etiquetaNivel: document.getElementById("etiqueta-nivel"),
    valorPuntuacion: document.getElementById("valor-puntuacion"),
    barraProgreso: document.getElementById("barra-progreso"),
    valorPerplejidad: document.getElementById("valor-perplejidad"),
    valorVariabilidad: document.getElementById("valor-variabilidad"),
    listaSospechosas: document.getElementById("lista-sospechosas"),
    parrafoExplicacion: document.getElementById("parrafo-explicacion"),
    parrafoAviso: document.getElementById("parrafo-aviso")
  };
}

function actualizarValidacion() {
  const el = obtenerElementos();
  const texto = el.campoTexto.value;
  const numPalabras = contarPalabras(texto);
  const numCaracteres = texto.length;
  el.contadorPalabras.textContent = `Palabras: ${numPalabras} / mín. 50`;
  el.contadorCaracteres.textContent = `Caracteres: ${numCaracteres} / máx. 5000`;
  const faltaPalabras = numPalabras < 50 && texto.trim().length > 0;
  const excesoCaracteres = numCaracteres > 5000;
  el.contadorPalabras.classList.toggle("invalido", faltaPalabras);
  el.contadorCaracteres.classList.toggle("invalido", excesoCaracteres);
  el.campoTexto.classList.toggle("campo-invalido", excesoCaracteres);
  if (excesoCaracteres) {
    el.avisoValidaciones.textContent = "El texto supera el límite permitido de 5000 caracteres.";
    el.avisoValidaciones.classList.add("error-texto");
  } else if (faltaPalabras) {
    el.avisoValidaciones.textContent = `Faltan ${50 - numPalabras} palabras para alcanzar el mínimo de 50.`;
    el.avisoValidaciones.classList.remove("error-texto");
  } else {
    el.avisoValidaciones.textContent = "";
  }
  const esValido = numPalabras >= 50 && numCaracteres <= 5000;
  el.btnAnalizar.disabled = !esValido;
}

function limpiarFormulario() {
  const el = obtenerElementos();
  el.campoTexto.value = "";
  actualizarValidacion();
  ocultarError();
  el.tarjetaResultado.hidden = true;
  el.campoTexto.focus();
}

function mostrarError(mensaje) {
  const el = obtenerElementos();
  el.textoError.textContent = mensaje;
  el.cajaError.hidden = false;
  el.tarjetaResultado.hidden = true;
}

function ocultarError() {
  const el = obtenerElementos();
  el.textoError.textContent = "";
  el.cajaError.hidden = true;
}

function establecerCargando(activo) {
  const el = obtenerElementos();
  el.btnAnalizar.disabled = activo;
  el.btnLimpiar.disabled = activo;
  el.campoTexto.disabled = activo;
  el.spinner.hidden = !activo;
  el.textoBtn.textContent = activo ? "Analizando..." : "Analizar texto";
  el.btnAnalizar.setAttribute("aria-busy", activo ? "true" : "false");
}

function generarExplicacion(datos) {
  // NOTA DE ARQUITECTURA: En este punto se integrará a futuro el chatbot explicativo.
  // Actualmente genera un resumen estático mediante heurísticas en el frontend.
  const { nivel, perplejidad, variabilidad } = datos;
  if (nivel === "alto") {
    return `El texto presenta una perplejidad baja (${perplejidad}), lo que indica alta predictibilidad secuencial, sumado a una variabilidad reducida (${variabilidad}) entre sus oraciones. Esta homogeneidad estructural es recurrente en textos generados por modelos de lenguaje.`;
  }
  if (nivel === "medio") {
    return `El análisis arrojó valores intermedios (perplejidad: ${perplejidad}, variabilidad: ${variabilidad}). Existen segmentos regulares junto a otros con mayor diversidad expresiva, por lo que podría tratarse de texto asistido o coescrito con IA.`;
  }
  return `La perplejidad calculada (${perplejidad}) y la variabilidad estilística (${variabilidad}) reflejan alternancias naturales en la construcción de las oraciones, un rasgo característico de la redacción humana espontánea.`;
}

function actualizarNivelVisual(nivel) {
  const el = obtenerElementos();
  const nombres = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
  const etiqueta = nombres[nivel.toLowerCase()] || nivel;
  el.etiquetaNivel.textContent = `Nivel: ${etiqueta}`;
  el.etiquetaNivel.className = "etiqueta-nivel";
  if (nivel === "alto") el.etiquetaNivel.classList.add("nivel-alto");
  else if (nivel === "medio") el.etiquetaNivel.classList.add("nivel-medio");
  else el.etiquetaNivel.classList.add("nivel-bajo");
}

function renderizarSospechosas(oraciones) {
  const el = obtenerElementos();
  el.listaSospechosas.innerHTML = "";
  if (!oraciones || oraciones.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No se detectaron oraciones destacables en este fragmento.";
    el.listaSospechosas.appendChild(li);
    return;
  }
  oraciones.forEach((oracion) => {
    const li = document.createElement("li");
    // Seguridad: textContent previene vulnerabilidades de inyección de código (XSS)
    li.textContent = oracion;
    el.listaSospechosas.appendChild(li);
  });
}

function mostrarResultado(datos) {
  const el = obtenerElementos();
  ocultarError();
  actualizarNivelVisual(datos.nivel);
  el.valorPuntuacion.textContent = `${datos.puntuacion}%`;
  el.barraProgreso.style.width = `${Math.min(100, Math.max(0, datos.puntuacion))}%`;
  el.barraProgreso.setAttribute("aria-valuenow", datos.puntuacion);
  el.valorPerplejidad.textContent = datos.perplejidad;
  el.valorVariabilidad.textContent = datos.variabilidad;
  renderizarSospechosas(datos.oraciones_sospechosas);
  el.parrafoExplicacion.textContent = generarExplicacion(datos);
  el.parrafoAviso.textContent = datos.aviso;
  el.tarjetaResultado.hidden = false;
  el.tarjetaResultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function extraerMensajeError(data, status) {
  if (data && Array.isArray(data.detalles) && data.detalles.length > 0) {
    return data.detalles.join(" ");
  }
  if (data && data.error) return data.error;
  if (status === 422 || status === 400) {
    return "Los datos enviados no cumplen con los requisitos de validación (50 palabras mín., 5000 car. máx.).";
  }
  return "Ocurrió un error inesperado al procesar la solicitud en el servidor.";
}

async function enviarAnalisis() {
  const el = obtenerElementos();
  const texto = el.campoTexto.value;
  ocultarError();
  establecerCargando(true);
  try {
    const respuesta = await fetch("/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: texto })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      mostrarError(extraerMensajeError(datos, respuesta.status));
    } else {
      mostrarResultado(datos);
    }
  } catch (err) {
    mostrarError("No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.");
  } finally {
    establecerCargando(false);
    actualizarValidacion();
  }
}

function iniciar() {
  const el = obtenerElementos();
  el.campoTexto.addEventListener("input", actualizarValidacion);
  el.btnAnalizar.addEventListener("click", enviarAnalisis);
  el.btnLimpiar.addEventListener("click", limpiarFormulario);
  actualizarValidacion();
}

document.addEventListener("DOMContentLoaded", iniciar);
