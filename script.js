const BASE_URL = "https://retroarcade-api.contactoretroverse.workers.dev";
const API_JUEGOS = `${BASE_URL}/api/juegos`;
const API_JUEGOS_RANDOM = `${BASE_URL}/api/juegos/random`;
const API_CATEGORIAS = `${BASE_URL}/api/categorias`;
var _categorias = [];



$(document).ready(function () {

  setTimeout(() => {
    (adsbygoogle = window.adsbygoogle || []).push({});
  }, 50);

  (async () => {
    await cargarCategorias();
    initRedirect();
    initHamburguer();
    InitSeccionBusqueda();
  })();

});

function initHamburguer() {
  const $hamburger = $("#hamburger");
  const $navMenu = $("#nav-menu");

  $hamburger.on("click", () => {
    $navMenu.toggleClass("show");
  });
}

function initRedirect() {

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  splitedPath = path.split('/');

  // JUEGOS
  if (path.includes("/juego/")) {
    cargarJuegoPorSlug(splitedPath[splitedPath.length - 1]);
    $("#main-game-container").removeClass("oculto-al-inicio");
    return;
  }

  // CATEGORIA
  if (path.includes("/categoria/")) {
    $("#games-section").removeClass("oculto-al-inicio");
    $(".ficha-tecnica").removeClass("oculto-al-inicio");

    const categoria = splitedPath[splitedPath.length - 1];
    const letra = params.get("letra");     // puede ser null
    let page = Number(params.get("page")) || 1;

    cargarCategoriaLetraPagina(categoria, letra, page);
    inicializarFiltroLetras(letra);
    completarFichaTecnica(_categorias.find(c => c.slug == categoria));
    return;
  }

  if (params.get('buscar')) {
    $("#games-section").removeClass("oculto-al-inicio");
    let busqueda = params.get('buscar');
    let page = Number(params.get("page")) || 1;
    buscarJuegos(busqueda, page);
    return;
  }

  //INDEX
  $("#games-section").removeClass("oculto-al-inicio");
  cargarJuegosRandom();

}

async function cargarCategorias() {
  try {
    const categorias = await $.getJSON(API_CATEGORIAS);

    if (!Array.isArray(categorias) || categorias.length === 0) return;

    _categorias = categorias;

    const principales = categorias
      .filter(cat => cat.padre_id == null)
      .sort((a, b) => a.orden - b.orden);

    const secundarias = categorias.filter(cat => cat.padre_id != null);

    const $menu = $("#menu-principal");
    const $botonBuscar = $menu.find(".buscar");

    $menu.find("li").not(".buscar").remove();

    principales.forEach(cat => {
      const li = $("<li></li>");

      const tieneSubmenu = secundarias.some(sec => sec.padre_id == cat.id);

      const a = tieneSubmenu
        ? $(`<a href="javascript:void(0)">${cat.nombre} ▾</a>`)
        : $(`<a href="/categoria/${cat.slug}">${cat.nombre}</a>`);

      li.append(a);

      const subs = secundarias
        .filter(sub => sub.padre_id == cat.id)
        .sort((a, b) => a.orden - b.orden);

      if (subs.length) {
        const ulSub = $('<ul class="submenu"></ul>');

        subs.forEach(sub => {
          ulSub.append(`
            <li>
              <a href="/categoria/${sub.slug}">${sub.nombre}</a>
            </li>
          `);
        });

        li.append(ulSub);
      }

      $botonBuscar.length ? $botonBuscar.before(li) : $menu.append(li);
    });

    // eventos (igual que antes)
    $menu.off("click", "a").on("click", "a", function (e) {
      const $link = $(this);
      const $submenu = $link.siblings(".submenu");
      const esMovil = window.matchMedia("(max-width: 900px)").matches;

      if (esMovil && $submenu.length) {
        e.preventDefault();
        $menu.find(".submenu").not($submenu).slideUp(300);
        $submenu.slideToggle(300);
        $link.toggleClass("active");
      }
    });

  } catch (err) {
    console.error("FATAL error loading categories:", err);
  }
}

async function cargarJuegoPorSlug(slug) {
  try {
    const resp = await fetch(`${BASE_URL}/api/juegos/slug/${slug}`);
    const juego = await resp.json();

    if (!juego || juego.error) {
      console.error("Game not found");
      $("#game-cards-container").html("<p>Game not found.</p>");
      return;
    }

    const cardHtml = `
      <div class="card-juego">
         <h2 class="titulo-juego">
      ${juego.nombre} — <span class="plataforma">Platform: ${juego.plataforma || "Unknown"}</span>
    </h2>
      
        ${juego.iframe ? `<iframe src="${juego.iframe}" frameborder="0" allowfullscreen></iframe>` : ""}
      </div>
    `;

    $("#game-cards-container").html(cardHtml);
    if (juego.iframe) {
      $("#iframe-preview").html(`<span> Embed Code: &lt;iframe src="${juego.iframe}" frameborder="0" allowfullscreen&gt;&lt;/iframe&gt;</span> 
         <span id="source">**Source: retrogames.cc. All content is embedded via iframe and remains the property of its respective owners. We do not host, store, or distribute this content and are not responsible for it.**</span>`);
    }

  } catch (e) {
    console.error("Error loading games:", e); // Cambié el mensaje de error
  }
}

async function cargarJuegosBase({
  url,
  pagina = 0,
  titulo = "",
  showPages = true
}) {
  try {
    if (titulo) {
      $("#titulo").text(titulo);
    }

    const res = await fetch(url);
    const data = await res.json();

    const juegos = Array.isArray(data)
      ? data
      : data.content || data.juegos || [];
    renderJuegos(juegos, "No games available in this category.");

    if (showPages && data.totalPages) {
      mostrarPaginacion(data.totalPages, pagina);
    }

  } catch (err) {
    console.error("Error loading games:", err);
  }
}

function cargarCategoriaLetraPagina(categoria, letra, pagina) {
  const letraFilter = letra ? "&letra=" + letra : '';
  const url = `${BASE_URL}/api/juegos/categoria/slug/${categoria}?page=${pagina - 1}&size=40${letraFilter}`;

  cargarJuegosBase({
    url,
    pagina: pagina,
    titulo: _categorias.find(_cat => _cat.slug == categoria).nombre,
    showPages: true,
  });
}

function InitSeccionBusqueda() {

  const $btnBuscar = $("#btn-buscar");
  const $campoBusqueda = $btnBuscar.closest('li').find(".campo-busqueda");
  const $inputBusqueda = $campoBusqueda.find("input[type='text']");

  if ($btnBuscar.length === 0 || $campoBusqueda.length === 0) {
    console.warn("Warning: Search elements not found. Initialization failed.");
    return;
  }

  function ejecutarBusqueda() {
    const termino = $inputBusqueda.val().trim();
    if (termino !== "") redirigirBusqueda(termino, 0);
  }

  $btnBuscar.on("click", function () {
    if ($campoBusqueda.is(":visible")) {
      ejecutarBusqueda();
    } else {
      $campoBusqueda.show();
      $inputBusqueda.focus();
    }
  });

  $("#btn-ejecutar-busqueda").on("click", function (e) {
    e.preventDefault();
    ejecutarBusqueda();
  });

  $inputBusqueda.on("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      ejecutarBusqueda();
    }
  });

  $(document).on("click", function (e) {
    if (
      !$(e.target).is($btnBuscar) &&
      !$(e.target).closest($campoBusqueda).length
    ) {
      $campoBusqueda.hide();
    }
  });
}

function redirigirBusqueda(termino) {
  window.location.href = `/?buscar=${termino}`;
}

function buscarJuegos(termino, pagina = 1) {
  if (!termino || termino.trim() === "") return;

  const url = `${API_JUEGOS}/buscar?nombre=${encodeURIComponent(
    termino.trim()
  )}&page=${pagina - 1}&size=40`; // 👈 CLAVE

  cargarJuegosBase({
    url,
    pagina,
    titulo: `Search results for "${termino}"`,
    showPages: true,
  });
}

function renderJuegos(juegos, mensajeVacio) {
  const $contenedor = $("#cards-container");
  $contenedor.empty();

  if (!juegos || juegos.length === 0) {
    $contenedor.html(`<p>${mensajeVacio}</p>`);
    return;
  }

  juegos.forEach((juego) => {
    let imagen = juego.imagen;
    if (!imagen || imagen.trim() === "" || imagen === "null") {
      imagen = "imagenes/no-img-available.png";
    }

    const cardHtml = `
      <div class="card">
        <a href='/juego/${juego.slug}'>
          <img src="${imagen}" alt="${juego.nombre}"
               onerror="this.onerror=null; this.src='imagenes/no-img-available.png';" />
        </a>
        <h3>${juego.nombre} - ${juego.plataforma}</h3>
      </div>
    `;
    $contenedor.append(cardHtml);
  });

}

function cargarJuegosRandom(paginaSeleccionada = 0) {
  const url = `${API_JUEGOS_RANDOM}/40?noCache=${Date.now()}`;

  cargarJuegosBase({
    url,
    pagina: paginaSeleccionada,
    titulo: "Random Games",
    showPages: false,
  });
}

function mostrarPaginacion(totalPaginas, paginaActual) {
  const pagDiv = document.getElementById("pagination");
  pagDiv.style.display = "flex";
  pagDiv.innerHTML = "";

  // Tomamos los parámetros actuales de la URL
  const params = new URLSearchParams(window.location.search);

  for (let i = 0; i < totalPaginas; i++) {
    const a = document.createElement("a");
    a.textContent = i + 1;
    a.classList.add("btn-pagina");

    if (i + 1 == paginaActual) {
      a.classList.add("activa");
    }

    // Clonamos los params para no pisarlos
    const newParams = new URLSearchParams(params);
    newParams.set("page", i + 1);

    a.href = `${window.location.pathname}?${newParams.toString()}`;

    pagDiv.appendChild(a);
  }
}

function inicializarFiltroLetras(letra) {
  const $letters = $("#letters").show();

  if ($letters.children().length === 0) {
    const baseURL = window.location.pathname;

    ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))]
      .forEach(l => {
        const href = `${baseURL}?letra=${encodeURIComponent(l)}`;
        const classes = letra == l ? 'letter-btn activa' : 'letter-btn'
        $letters.append(`<a class="${classes}" href="${href}">${l}</a>`);
      });
  }
}

function completarFichaTecnica(categoria){
  $("#descripcion-corta").html(categoria.descripcion_corta);
  $("#anio-lanzamiento").html(`Release year: ${categoria.anio_lanzamiento}`);
  $("#fabricante").html(`Manufacturer: ${categoria.fabricante}`);
  $("#region").html(`Origin region: ${categoria.region_origen}`);
  $("#tipo").html(`Plataform tipe: ${categoria.tipo}`);
  $("#descripcion-SEO").html(`Description: ${categoria.descripcion}`);
}

