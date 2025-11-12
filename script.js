$(document).ready(function () {
  const API_JUEGOS = "https://retroarcade-api.contactoretroverse.workers.dev/api/juegos";
  const API_JUEGOS_RANDOM = "https://retroarcade-api.contactoretroverse.workers.dev/api/juegos/random";
  const API_CATEGORIAS = "https://retroarcade-api.contactoretroverse.workers.dev/api/categorias";

  const $contenedor = $("#cards-container");
  const $menu = $("#menu-principal");

  // --- Cargar categorías ---
  function cargarCategorias() {
    $.getJSON(API_CATEGORIAS)
      .done(function (categorias) {
        if (!Array.isArray(categorias) || categorias.length === 0) return;
        const principales = categorias.filter((cat) => cat.padre_id === null).sort((a, b) => a.orden - b.orden);
        const secundarias = categorias.filter((cat) => cat.padre_id !== null);

        principales.forEach((cat) => {
          const li = $("<li></li>");
          const a = $(`<a href="index.html?categoria=${cat.id}">${cat.nombre}</a>`);
          li.append(a);

          const subs = secundarias.filter((sub) => sub.padre_id === cat.id).sort((a, b) => a.orden - b.orden);
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

  // --- Botón búsqueda ---
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
    if (termino !== "") {
      buscarJuegos(termino, 0);
    }
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

  // --- Función de búsqueda ---
  function buscarJuegos(termino, pagina) {
    if (!termino || termino.trim() === "") return;
    console.log("Buscando:", termino, pagina);

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
      })
      .catch((err) => console.error("Error en búsqueda:", err));
  }

  // --- Renderizar juegos ---
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

  // --- Otras funciones que tenías (paginación, categorías, etc) ---
  // ... (puedes dejar todo lo que tenías igual, solo asegurate de no duplicar eventos)

  // --- Inicializar ---
  cargarCategorias();
  cargarJuegos(0);

  // --- Cargar juegos random o por categoría ---
  function cargarJuegos(paginaSeleccionada) {
    let pagina = paginaSeleccionada + 1;
    let url;
    let paginacionVisible = true;

    const juegoCategoria = new URLSearchParams(window.location.search).get("categoria");
    const nombreCategoria = new URLSearchParams(window.location.search).get("nombreCategoria");

    if (juegoCategoria) {
      url = `${API_JUEGOS}/categoria/${juegoCategoria}?page=${pagina - 1}&size=40`;
      paginacionVisible = true;
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
      })
      .catch((err) => console.error("Error cargando juegos:", err));
  }

  // --- Paginación ---
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

  // --- Menú hamburguesa ---
  const $hamburger = $("#hamburger");
  const $navMenu = $("#nav-menu");
  $hamburger.on("click", () => $navMenu.toggleClass("show"));

});
