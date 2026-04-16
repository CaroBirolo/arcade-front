// comentarios.js - Sistema de comentarios para FreeClassicGamesOnline

const COMENTARIOS_API = "https://fcgo-api.contactoretroverse.workers.dev/api/comentarios";

class SistemaComentarios {
  constructor() {
    this.juegoId   = null;
    this.juegoSlug = null;
    this.usuarioAutenticado = false;
    this.usuarioData = null;
    this.inicializar();
  }

  inicializar() {
    this.obtenerDatosJuego();
    this.configurarEventos();
    this.verificarAutenticacion();

    // Solo carga comentarios si el slug ya está disponible en este momento.
    // Si el slug llega después (vía loadGameBySlug en script.js),
    // cargarComentarios() será llamado explícitamente desde allá.
    if (this.juegoSlug) {
      this.cargarComentarios();
    }
  }

  obtenerDatosJuego() {
    // Prioridad 1: atributos data- del contenedor en el DOM
    const container = document.getElementById("comentarios-section");
    if (container) {
      this.juegoId   = container.dataset.juegoId   || null;
      this.juegoSlug = container.dataset.juegoSlug || null;
    }

    // Prioridad 2: variable global seteada por script.js (fallback)
    if (!this.juegoId && window.JUEGO_ACTUAL) {
      this.juegoId   = window.JUEGO_ACTUAL.id;
      this.juegoSlug = window.JUEGO_ACTUAL.slug;
    }

    if (!this.juegoSlug) {
      // No es un error fatal en este punto: puede llegar después.
      console.info("SistemaComentarios: slug aún no disponible, esperando.");
    }
  }

  configurarEventos() {
    const form = document.getElementById("form-comentario");
    if (form) {
      form.addEventListener("submit", (e) => this.enviarComentario(e));
    }

    const btnLogin = document.getElementById("btn-login-google");
    if (btnLogin) {
      btnLogin.addEventListener("click", () => this.loginGoogle());
    }
  }

  verificarAutenticacion() {
    const token    = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      try {
        this.usuarioAutenticado = true;
        this.usuarioData = JSON.parse(userData);
        this.actualizarUIAutenticado();
      } catch (e) {
        console.error("Error al parsear datos de usuario:", e);
        // Datos corruptos: limpiar
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      }
    }
  }

  loginGoogle() {
    // Placeholder hasta integrar OAuth real con Google
    alert("Integración con Google Coming Soon\nPor ahora, deja tu comentario como anónimo");
  }

  actualizarUIAutenticado() {
    const loginPrompt = document.getElementById("login-prompt");
    if (!loginPrompt) return;

    loginPrompt.innerHTML = `
      <div class="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
        <span class="text-green-600 font-medium">✓ Conectado como ${this.sanitizar(this.usuarioData.nombre)}</span>
        <button type="button"
                onclick="window.sistemaComentarios.logout()"
                class="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
          Cerrar sesión
        </button>
      </div>
    `;

    const inputNombre = document.getElementById("comentario-nombre");
    const inputEmail  = document.getElementById("comentario-email");
    if (inputNombre) {
      inputNombre.value    = this.usuarioData.nombre;
      inputNombre.readOnly = true;
    }
    if (inputEmail) {
      inputEmail.value    = this.usuarioData.email;
      inputEmail.readOnly = true;
    }
  }

  logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    this.usuarioAutenticado = false;
    this.usuarioData = null;
    location.reload();
  }

  async enviarComentario(e) {
    e.preventDefault();

    // Guardar referencia al botón antes de cualquier await
    const btnEnviar = document.getElementById("btn-enviar-comentario");

    const nombre   = document.getElementById("comentario-nombre")?.value.trim();
    const email    = document.getElementById("comentario-email")?.value.trim();
    const contenido = document.getElementById("comentario-texto")?.value.trim();
    const ratingEl = document.querySelector('input[name="rating"]:checked');

    if (!ratingEl) {
      this.mostrarMensaje("Seleccioná una puntuación", "error");
      return;
    }
    const rating = ratingEl.value;

    // Validaciones
    if (!nombre || nombre.length < 2) {
      this.mostrarMensaje("El nombre debe tener al menos 2 caracteres", "error");
      return;
    }
    if (!email || !this.validarEmail(email)) {
      this.mostrarMensaje("Ingresá un email válido", "error");
      return;
    }
    if (!contenido || contenido.length < 5) {
      this.mostrarMensaje("El comentario debe tener al menos 5 caracteres", "error");
      return;
    }
    if (contenido.length > 500) {
      this.mostrarMensaje("El comentario no puede exceder 500 caracteres", "error");
      return;
    }
    if (this.detectarSpam(contenido)) {
      this.mostrarMensaje("Tu comentario contiene contenido que parece spam", "warning");
      return;
    }
    if (!this.juegoSlug) {
      this.mostrarMensaje("Error interno: no se identificó el juego. Recargá la página.", "error");
      return;
    }

    this.mostrarMensaje("Publicando comentario...", "info");
    if (btnEnviar) btnEnviar.disabled = true;

    try {
      const respuesta = await fetch(COMENTARIOS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          juego_id:   this.juegoId,
          juego_slug: this.juegoSlug,
          nombre,
          email,
          contenido,
          rating: parseInt(rating),
        }),
      });

      if (!respuesta.ok) {
        throw new Error(`Error HTTP: ${respuesta.status}`);
      }

      await respuesta.json(); // consumir respuesta aunque no la usemos

      this.mostrarMensaje(
        "✓ Comentario publicado correctamente. Aparecerá después de revisión.",
        "success"
      );

      // Limpiar formulario
      document.getElementById("form-comentario").reset();
      // Restaurar el radio por defecto (5 estrellas)
      const defaultRating = document.querySelector('input[name="rating"][value="5"]');
      if (defaultRating) defaultRating.checked = true;

      // Recargar lista después de 2 segundos
      setTimeout(() => this.cargarComentarios(), 2000);

    } catch (error) {
      console.error("Error al enviar comentario:", error);
      this.mostrarMensaje("Error al publicar comentario. Intentá de nuevo.", "error");
    } finally {
      if (btnEnviar) btnEnviar.disabled = false;
    }
  }

  async cargarComentarios() {
    if (!this.juegoSlug) {
      console.warn("cargarComentarios: slug no disponible todavía");
      return;
    }

    const listaContainer  = document.getElementById("comentarios-lista");
    const sinComentarios  = document.getElementById("sin-comentarios");
    const loadingEl       = document.getElementById("comentarios-loading");

    if (!listaContainer) return;

    // Mostrar loading
    if (loadingEl) loadingEl.classList.remove("hidden");
    listaContainer.innerHTML = "";
    if (sinComentarios) sinComentarios.classList.add("hidden");

    try {
      const respuesta = await fetch(
        `${COMENTARIOS_API}?slug=${encodeURIComponent(this.juegoSlug)}`
      );

      if (!respuesta.ok) {
        throw new Error(`Error HTTP: ${respuesta.status}`);
      }

      const comentarios = await respuesta.json();

      if (loadingEl) loadingEl.classList.add("hidden");

      if (!comentarios || comentarios.length === 0) {
        if (sinComentarios) sinComentarios.classList.remove("hidden");
        return;
      }

      comentarios.forEach((comentario) => {
        listaContainer.appendChild(this.crearElementoComentario(comentario));
      });

    } catch (error) {
      console.error("Error al cargar comentarios:", error);
      if (loadingEl) loadingEl.classList.add("hidden");
      listaContainer.innerHTML = `
        <div class="text-center py-8 text-red-600">
          Error al cargar comentarios. Intentá recargar la página.
        </div>
      `;
    }
  }

  crearElementoComentario(comentario) {
    const div = document.createElement("div");
    div.className = "comentario-card";

    const fecha = new Date(comentario.fecha_creacion).toLocaleDateString("es-ES", {
      year:  "numeric",
      month: "long",
      day:   "numeric",
    });

    // Limitar rating entre 1 y 5 por seguridad
    const starsCount = Math.min(Math.max(parseInt(comentario.rating) || 1, 1), 5);
    const stars = "⭐".repeat(starsCount);

    div.innerHTML = `
      <div class="comentario-header">
        <div>
          <div class="comentario-autor">${this.sanitizar(comentario.nombre)}</div>
          <div class="comentario-fecha">${fecha}</div>
        </div>
      </div>
      <div class="comentario-rating">${stars}</div>
      <div class="comentario-texto">${this.sanitizar(comentario.contenido)}</div>
    `;

    return div;
  }

  mostrarMensaje(texto, tipo = "info") {
    const messageDiv = document.getElementById("form-message");
    if (!messageDiv) return;

    messageDiv.textContent = texto;
    messageDiv.className = `form-message ${tipo}`;
    messageDiv.classList.remove("hidden");

    // Auto-ocultar mensajes no críticos
    if (tipo === "success" || tipo === "info") {
      clearTimeout(this._msgTimeout);
      this._msgTimeout = setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    }
  }

  validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  detectarSpam(texto) {
    const palabrasSpam = [
      "viagra", "casino", "poker", "bitcoin", "click here", "buy now",
    ];
    const textoLower = texto.toLowerCase();
    return palabrasSpam.some((palabra) => textoLower.includes(palabra));
  }

  sanitizar(texto) {
    // Escapar HTML para prevenir XSS
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }
}

// ─── Inicialización ────────────────────────────────────────────────────────
// Se crea la instancia global. Si el slug ya está en el DOM (dataset),
// el constructor lo leerá directamente.
// Si llega después (vía loadGameBySlug), ese función actualiza
// window.sistemaComentarios.juegoSlug y llama a cargarComentarios().
function _initSistemaComentarios() {
  window.sistemaComentarios = new SistemaComentarios();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _initSistemaComentarios);
} else {
  _initSistemaComentarios();
}