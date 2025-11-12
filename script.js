$(document).ready(function () {
  const API_JUEGOS = "https://retroarcade-api.contactoretroverse.workers.dev/api/juegos";
  const API_JUEGOS_RANDOM = "https://retroarcade-api.contactoretroverse.workers.dev/api/juegos/random";
  const API_CATEGORIAS = "https://retroarcade-api.contactoretroverse.workers.dev/api/categorias";

  const $contenedor = $("#cards-container");
  const $menu = $("#menu-principal");

  // ---------------------------
  // CARGAR CATEGORÍAS
  // ---------------------------
  function cargarCategorias() {
    $.getJSON(API_CATEGORIAS)
      .done(function (categorias) {
        if (!Array.isArray(categorias) || categorias.length === 0) return;

        const principales = categorias
          .filter((cat) => cat.padre_id === null)
          .sort((a, b) => a.orden - b.orden);

        const secundarias = categorias.filter((cat) => cat.padre_id !== null);

        principales.forEach((cat) => {
          const li = $("<li></li>");
          const a = $(`<a href="index.html?categoria=${cat.id}">${cat.nombre}</a>`);
          li.append(a);

          const subs = secundarias
            .filter((sub) => sub.padre_id === cat.id)
            .sort((a, b) => a.orden - b.orden);

          if (subs.length > 0) {
            const ulSub = $('<ul class="submenu"></ul>');
            subs.forEach((sub) => {
              const liSub = $("<li></li>");
              const aSub = $(`<a href="index.html?categoria=${sub.id}">${sub.nombre}</a>`);
              liSub.append(aSub);
              ulSub.append(liSub);
            });
            li.append(ulSub);
          }

          $menu.find(".buscar").before(li);
        });
      })
      .fail(() => console.error("Error cargando categorías"));
  }

  // ---------------------------
  // BÚSQUEDA
  // ---------------------------
  const $btnBuscar = $("#btn-buscar");
  const $campoBusqueda = $(".campo-busqueda");
  const $inputBusqueda = $campoBusqueda.find("input");

  $btnBuscar.on("click", function () {
    if ($campoBusqueda.is(":visible")) {
      const termino = $inputBusqueda.val().trim();
      if (termino !== "") buscarJuegos(termino, 0);
    } else {
      $campoBusqueda.show();
      $inputBusqueda.focus();
    }
  });

  $("#btn-ejecutar-busqueda").on("click", function (e) {
    e.preventDefault();
    const termino = $inputBusqueda.val().trim();
    if (termino !== "") buscarJuegos(termino, 0);
  });

  $inputBusqueda.on("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const termino = $inputBusqueda.val().trim();
      if (termino !== "") buscarJuegos(termino, 0);
    }
  });

  // Cerrar campo si clickeas fuera
  $(document).on("click", function (e) {
    if (!$(e.target).is($btnBuscar) && !$(e.target).closest($campoBusqueda).length) {
      $campoBusqueda.hide();
    }
  });

  // ---------------------------
  // BUSCAR JUEGOS
  // ---------------------------
  function buscarJuegos(termino, pagina) {
    if (!termino || termino.trim() === "") return;

    const url = `${API_JUEGOS}/buscar?nombre=${encodeURIComponent(termino.trim())}&page=${pagina}&size=40`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const juegos = data.content || data;
        renderJuegos(juegos, $contenedor, "No se encontraron juegos.");
        $("#titulo").text(`Resultados para: "${termino}"`);

        const pagDiv = document.getElementById("pagination");
        if (data.totalPages && data.totalPages > 1) {
          mostrarPaginacion(data.totalPages, pagina, (i) => buscarJuegos(termino, i));
          pagDiv.style.display = "flex";
        } else {
          pagDiv.style.display = "none";
        }

        // Valida imágenes
        validateImagesForGames(juegos, { maxChecks: 200 }).then(reportImageProblems);
      })
      .catch((err) => console.error("Error en búsqueda:", err));
  }

  // ---------------------------
  // RENDERIZAR JUEGOS
  // ---------------------------
  function renderJuegos(juegos, $contenedor, mensajeVacio) {
    $contenedor.empty();
    if (!juegos || juegos.length === 0) {
      $contenedor.html(`<p>${mensajeVacio}</p>`);
      return;
    }

    juegos.forEach((juego) => {
      let imagen = juego.imagen;
      if (!imagen || imagen.trim() === "" || imagen === "null") imagen = "img/no-image.png";
      const cardHtml = `
        <div class="card">
          <a href='juego.html?id=${juego.id}'>
            <img src="${imagen}" alt="${juego.nombre}" onerror="this.src='img/no-image.png'; this.onerror=null;" />
          </a>
          <h3>${juego.nombre} - ${juego.plataforma}</h3>
        </div>
      `;
      $contenedor.append(cardHtml);
    });
  }

  // ---------------------------
  // VALIDAR IMÁGENES
  // ---------------------------
  async function checkImageUrl(url, timeout = 8000) {
    return new Promise((resolve) => {
      if (!url || typeof url !== "string" || url.trim() === "" || url === "null") {
        resolve({ ok: false, reason: "empty-or-null" });
        return;
      }

      const img = new Image();
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        img.src = "";
        resolve({ ok: false, reason: "timeout" });
      }, timeout);

      img.onload = function () {
        if (timedOut) return;
        clearTimeout(timer);
        resolve({ ok: true });
      };

      img.onerror = function () {
        if (timedOut) return;
        clearTimeout(timer);
        resolve({ ok: false, reason: "load-error" });
      };

      img.src = url;
    });
  }

  async function validateImagesForGames(juegos, options = {}) {
    const maxChecks = options.maxChecks || 200;
    const toCheck = Array.isArray(juegos) ? juegos.slice(0, maxChecks) : [];
    const problems = [];

    for (const juego of toCheck) {
      const res = await checkImageUrl(juego.imagen);
      if (!res.ok) {
        problems.push({
          id: juego.id,
          nombre: juego.nombre,
          imagen: juego.imagen,
          reason: res.reason,
        });
      }
    }

    return problems;
  }

  function reportImageProblems(problems) {
    if (!Array.isArray(problems)) problems = [];

    if (problems.length === 0) {
      console.log("%cTodas las imágenes comprobadas están OK ✅", "color: green; font-weight: bold;");
      return;
    }

    console.group("%cImágenes problemáticas de juegos", "color: orange; font-weight: bold;");
    problems.forEach((p, idx) => {
      console.log(`${idx + 1}. id=${p.id} | nombre="${p.nombre}" | imagen="${p.imagen}" | motivo=${p.reason}`);
    });
    console.groupEnd();

    // Crear CSV y botón para descargar
    const csvRows = [["id", "nombre", "imagen", "motivo"]]
      .concat(problems.map((p) => [p.id, p.nombre, p.imagen, p.reason]));
    const csvContent = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    let btn = document.getElementById("descargar-reporte-imagenes");
    if (!btn) {
      btn = document.createElement("a");
      btn.id = "descargar-reporte-imagenes";
      btn.textContent = "Descargar reporte de imágenes (CSV)";
      btn.href = url;
      btn.download = "reporte_imagenes_juegos.csv";
      btn.style.position = "fixed";
      btn.style.right = "12px";
      btn.style.bottom = "12px";
      btn.style.background = "#222";
      btn.style.color = "#fff";
      btn.style.padding = "8px 10px";
      btn.style.borderRadius = "6px";
      btn.style.zIndex = 9999;
      btn.style.textDecoration = "none";
      document.body.appendChild(btn);
    } else {
      btn.href = url;
    }
  }

  // ---------------------------
  // CARGAR JUEGOS (INICIAL)
  // ---------------------------
  function cargarJuegos(paginaSeleccionada) {
    let pagina = paginaSeleccionada + 1;
    let url;
    let paginacionVisible = true;

    const juegoCategoria = new URLSearchParams(window.location.search).get("categoria");

    if (juegoCategoria) {
      url = `${API_JUEGOS}/categoria/${juegoCategoria}?page=${pagina - 1}&size=40`;
    } else {
      url = `${API_JUEGOS_RANDOM}?size=20`;
      paginacionVisible = false;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const juegos = data.content || data;
        renderJuegos(juegos, $contenedor, "No hay juegos en esta categoría.");

        const pagDiv = document.getElementById("pagination");
        if (paginacionVisible && data.totalPages) {
          mostrarPaginacion(data.totalPages, pagina - 1, cargarJuegos);
          pagDiv.style.display = "flex";
        } else {
          pagDiv.style.display = "none";
        }

        // Valida imágenes
        validateImagesForGames(juegos, { maxChecks: 200 }).then(reportImageProblems);
      })
      .catch((err) => console.error("Error cargando juegos:", err));
  }

  // ---------------------------
  // PAGINACIÓN
  // ---------------------------
  function mostrarPaginacion(totalPaginas, paginaActual, callback) {
    const pagDiv = document.getElementById("pagination");
    pagDiv.innerHTML = "";
    for (let i = 0; i < totalPaginas; i++) {
      const btn = document.createElement("button");
      btn.textContent = i + 1;
      btn.classList.add("btn-pagina");
      if (i === paginaActual) btn.classList.add("activa");
      btn.addEventListener("click", () => {
        callback(i);
        window.scrollTo(0, 0);
      });
      pagDiv.appendChild(btn);
    }
  }

  // ---------------------------
  // MENÚ HAMBURGUESA
  // ---------------------------
  const $hamburger = $("#hamburger");
  const $navMenu = $("#nav-menu");
  $hamburger.on("click", () => $navMenu.toggleClass("show"));

  // ---------------------------
  // INICIALIZAR
  // ---------------------------
  cargarCategorias();
  cargarJuegos(0);


// ==========================
// 🧩 FUNCIONES DE VALIDACIÓN DE IMÁGENES
// ==========================

async function validateImagesForGames(games, { maxChecks = 100 } = {}) {
  const problems = [];
  let checked = 0;

  for (const game of games) {
    if (checked >= maxChecks) break;

    if (!game.imagen) {
      problems.push({ id: game.id, nombre: game.nombre, error: "No tiene URL de imagen" });
      continue;
    }

    try {
      const res = await fetch(game.imagen, { method: "HEAD" });
      if (!res.ok) {
        problems.push({ id: game.id, nombre: game.nombre, imagen: game.imagen, error: res.status });
      }
    } catch (err) {
      problems.push({ id: game.id, nombre: game.nombre, imagen: game.imagen, error: err.message });
    }

    checked++;
  }

  return problems;
}

function reportImageProblems(problems) {
  if (problems.length === 0) {
    console.log("%c✅ Todas las imágenes funcionan correctamente.", "color: green; font-weight: bold;");
  } else {
    console.log(`%c🚨 Se encontraron ${problems.length} problemas de imágenes:`, "color: red; font-weight: bold;");
    console.table(problems);
  }
}

// ==========================
// 🔎 VALIDAR TODAS LAS IMÁGENES (TODOS LOS JUEGOS)
// ==========================
async function validarTodasLasImagenes() {
  console.log("%cDescargando lista completa de juegos...", "color: cyan; font-weight: bold;");

  let todosLosJuegos = [];
  let page = 0;
  let totalPages = 32;

  // Traer todas las páginas de juegos (1000 por página)
  while (page < totalPages) {
    const res = await fetch(`${API_JUEGOS}?page=${page}&size=1000`);
    const data = await res.json();
    const juegos = data.content || data;

    todosLosJuegos = todosLosJuegos.concat(juegos);
    totalPages = data.totalPages || 32;
    page++;

    console.log(`Página ${page}/${totalPages} descargada (${juegos.length} juegos).`);
  }

  console.log(`✅ Se descargaron ${todosLosJuegos.length} juegos en total. Verificando imágenes...`);

  // Validar imágenes de todos los juegos con una pequeña pausa entre cada uno
  const problems = [];
  let contador = 0;

  for (const juego of todosLosJuegos) {
    contador++;

    const resultado = await checkImageUrl(juego.imagen);
    if (!resultado.ok) {
      problems.push({
        id: juego.id,
        nombre: juego.nombre,
        imagen: juego.imagen,
        reason: resultado.reason,
      });
    }

    // Pequeña pausa para no saturar el navegador (50ms)
    await new Promise((r) => setTimeout(r, 50));

    if (contador % 50 === 0) {
      console.log(`Progreso: ${contador}/${todosLosJuegos.length} juegos verificados...`);
    }
  }

  console.log(`🔍 Validación finalizada. Total de juegos verificados: ${todosLosJuegos.length}`);
  reportImageProblems(problems);
}

// Exponer la función para poder llamarla desde consola
window.validarTodasLasImagenes = validarTodasLasImagenes;



});

