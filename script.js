const BASE_URL = "https://fcgo-api.contactoretroverse.workers.dev";
const API_JUEGOS = `${BASE_URL}/api/juegos`;
const API_JUEGOS_RANDOM = `${BASE_URL}/api/juegos/random`;
const API_CATEGORIAS = `${BASE_URL}/api/categorias`;
var _categorias = [];

$(document).ready(function () {
  (async () => {
    await loadCategories();
    iniciarRedireccion();
    iniciarMenuMobile();
    InitSearchSection();

    setTimeout(loadSafeAds, 1000);
    setTimeout(loadSafeAds, 3000);
    setTimeout(loadSafeAds, 5000);

    let scrollTimeout;
    $(window).on("scroll", function () {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(loadSafeAds, 300);
    });
  })();
});

document.addEventListener("DOMContentLoaded", () => {
  checkAdBlock();

  function checkAdBlock() {
    let adScriptLoaded = false;

    const adScript = document.createElement("script");
    adScript.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    adScript.async = true;

    adScript.onload = () => {
      adScriptLoaded = true;
    };

    adScript.onerror = () => {
      showAdfBlock();
    };

    document.head.appendChild(adScript);

    setTimeout(() => {
      if (!adScriptLoaded) {
        showAdfBlock();
      }
    }, 1200);
  }

  function showAdfBlock() {
    const modal = document.getElementById("AdfBlock");
    if (!modal) return;

    modal.classList.remove("hidden");

    const btn = document.getElementById("adblockReload");
    if (!btn) return;

    btn.onclick = () => {
      modal.classList.add("hidden");
      setTimeout(() => {
        checkAdBlock();
      }, 300);
    };
  }
});

function iniciarMenuMobile() {
  const $menuMobile = $("#menuMobile");
  const $navMenu = $("#main-nav");

  $menuMobile.on("click", () => {
    $navMenu.toggleClass(
      "hidden flex bg-white border-t border-blue-200 shadow-sm"
    );
  });
}

function iniciarRedireccion() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const splitedPath = path.split("/");

  const showSection = (selector) => {
    $(selector).removeClass("hidden").addClass("bg-white");
  };

  // JUEGOS
  if (path.includes("/juego/")) {
    loadGameBySlug(splitedPath[splitedPath.length - 1]);
    showSection("#main-game-container");
    return;
  }

  // CATEGORIA
  if (path.includes("/categoria/")) {
    showSection("#gamesDiv");
    showSection("#datasheet");

    const categoria = splitedPath[splitedPath.length - 1];
    const letra = params.get("letra");
    let page = Number(params.get("page")) || 1;

    loadLetterPage(categoria, letra, page);
    initializeLetterFilter(letra);
    CompleteDataSheet(_categorias.find((c) => c.slug == categoria));
    return;
  }

  // BUSQUEDA
  if (params.get("buscar")) {
    showSection("#gamesDiv");
    let busqueda = params.get("buscar");
    let page = Number(params.get("page")) || 1;
    GameSearch(busqueda, page);
    return;
  }

  // INDEX
  showSection("#gamesDiv");
  LoadRandomGames();
}

async function loadCategories() {
  try {
    const categorias = await $.getJSON(API_CATEGORIAS);

    if (!Array.isArray(categorias) || categorias.length === 0) return;

    _categorias = categorias;

    const principales = categorias
      .filter((cat) => cat.padre_id == null)
      .sort((a, b) => a.orden - b.orden);

    const secundarias = categorias.filter((cat) => cat.padre_id != null);

    const $menu = $("#main-menu");
    const $botonBuscarLi = $menu.find("li:has(#searchButton)");

    $menu.find("li").not($botonBuscarLi).remove();

    principales.forEach((cat) => {
      const li = $("<li></li>").addClass(
        "relative w-full md:w-auto mb-2 md:mb-0"
      );

      const tieneSubmenu = secundarias.some((sec) => sec.padre_id == cat.id);

      const a = tieneSubmenu
        ? $(`<a href="javascript:void(0)"
              class="block w-full md:w-auto px-4 py-2
                     text-blue-800 font-semibold
                     hover:text-red-600 transition-colors">
              ${cat.nombre} ▾
            </a>`)
        : $(`<a href="/categoria/${cat.slug}"
              class="block w-full md:w-auto px-4 py-2
                     text-blue-800 font-semibold
                     hover:text-red-600 transition-colors">
              ${cat.nombre}
            </a>`);

      li.append(a);

      const subs = secundarias
        .filter((sub) => sub.padre_id == cat.id)
        .sort((a, b) => a.orden - b.orden);

      if (subs.length) {
        const ulSub = $(`
          <ul class="submenu
                     hidden
                     md:absolute md:top-full md:left-0 md:mt-1
                     bg-white
                     border border-blue-200
                     rounded-md
                     shadow-sm
                     w-full md:min-w-[200px] md:w-auto
                     z-[100]
                     transition-opacity duration-200
                     pl-0
                     mt-2 md:mt-1">
          </ul>
        `);

        subs.forEach((sub) => {
          ulSub.append(`
            <li class="border-b border-blue-100 last:border-b-0">
              <a href="/categoria/${sub.slug}"
                 class="block px-4 py-2 text-sm
                        text-red-700
                        hover:bg-blue-50 hover:text-blue-700
                        transition-colors">
                ${sub.nombre}
              </a>
            </li>
          `);
        });

        li.append(ulSub);
      }

      if ($botonBuscarLi.length) {
        $botonBuscarLi.before(li);
      } else {
        $menu.append(li);
      }
    });

    // Mobile: click toggle
    $menu.off("click", "a").on("click", "a", function (e) {
      const $link = $(this);
      const $submenu = $link.siblings(".submenu");
      const esMovil = window.matchMedia("(max-width: 767px)").matches;

      if (esMovil && $submenu.length) {
        e.preventDefault();
        $menu.find(".submenu").not($submenu).stop(true, true).slideUp(200);
        $submenu.stop(true, true).slideToggle(200);
        $link.toggleClass("text-red-600");
      }
    });

    // Desktop: hover
    const handleHover = () => {
      const esMovil = window.matchMedia("(max-width: 767px)").matches;

      $menu.off("mouseenter mouseleave", "> li");

      if (!esMovil) {
        $menu.on(
          {
            mouseenter: function () {
              const $submenu = $(this).find(".submenu");
              if ($submenu.length) {
                $submenu.stop(true, true).fadeIn(150);
              }
            },
            mouseleave: function () {
              const $submenu = $(this).find(".submenu");
              if ($submenu.length) {
                $submenu.stop(true, true).fadeOut(150);
              }
            },
          },
          "> li"
        );
      }
    };

    handleHover();
    $(window).on("resize", handleHover);
  } catch (err) {
    console.error("FATAL error loading categories:", err);
  }
}

async function loadBaseGames({
  url,
  pagina = 0,
  title = "",
  subtitulo = "",
  showPages = true,
}) {
  try {
    $("#gamesDiv").removeClass("hidden").addClass("bg-white");

    if (title) {
      $("#title")
        .text(title)
        .removeClass()
        .addClass("text-2xl font-semibold text-blue-700 text-center mb-2");
    }

    if (subtitulo && subtitulo.trim() !== "") {
      $("#subtitulo")
        .text(subtitulo)
        .removeClass()
        .addClass("text-sm text-red-600 text-center mb-6")
        .show();
    }

    const res = await fetch(url);
    const data = await res.json();

    const juegos = Array.isArray(data)
      ? data
      : data.content || data.juegos || [];

    renderGames(juegos, "No games available in this category.");

    if (showPages && data.totalPages) {
      showPagination(data.totalPages, pagina);
    }
  } catch (err) {
    console.error("Error loading games:", err);
  }
}

function loadLetterPage(categoria, letra, pagina) {
  const letraFilter = letra ? "&letra=" + letra : "";
  const url = `${BASE_URL}/api/juegos/categoria/slug/${categoria}?page=${pagina - 1}&size=40${letraFilter}`;

  loadBaseGames({
    url,
    pagina: pagina,
    title: _categorias.find((_cat) => _cat.slug == categoria).nombre,
    showPages: true,
  });
}

function InitSearchSection() {
  const $btnBuscar = $("#searchButton");
  const $campoBusqueda = $btnBuscar.closest("li").find(".campo-busqueda");
  const $inputBusqueda = $campoBusqueda.find("input[type='text']");

  if ($btnBuscar.length === 0 || $campoBusqueda.length === 0) {
    console.warn("Warning: Search elements not found. Initialization failed.");
    return;
  }

  function ejecutarBusqueda() {
    const termino = $inputBusqueda.val().trim();
    if (termino !== "") redirectSearch(termino, 0);
  }

  $btnBuscar.on("click", function () {
    if ($campoBusqueda.hasClass("hidden")) {
      $campoBusqueda
        .removeClass("hidden")
        .addClass("bg-white border border-blue-200 rounded-md shadow-sm p-2");

      $inputBusqueda
        .addClass(
          "w-full border border-blue-300 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        )
        .focus();
    } else {
      ejecutarBusqueda();
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
      $campoBusqueda
        .addClass("hidden")
        .removeClass(
          "bg-white border border-blue-200 rounded-md shadow-sm p-2"
        );
    }
  });
}

function redirectSearch(termino) {
  window.location.href = `/?buscar=${termino}`;
}

function GameSearch(termino, pagina = 1) {
  if (!termino || termino.trim() === "") return;

  const url = `${API_JUEGOS}/buscar?nombre=${encodeURIComponent(
    termino.trim()
  )}&page=${pagina - 1}&size=40`;

  loadBaseGames({
    url,
    pagina,
    title: `Search results for "${termino}"`,
    showPages: true,
  });
}

function renderGames(juegos, mensajeVacio) {
  const $contenedor = $("#cards-holder");
  $contenedor.empty();

  if (!juegos || juegos.length === 0) {
    $contenedor.html(`
      <p class="text-center text-sm text-gray-500 py-8">
        ${mensajeVacio}
      </p>
    `);
    return;
  }

  juegos.forEach((juego) => {
    let imagen = juego.imagen;
    if (!imagen || imagen.trim() === "" || imagen === "null") {
      imagen = "imagenes/no-img-available.png";
    }

    const cardHtml = `
      <div class="
        group
        bg-white
        border border-gray-200
        rounded-xl
        p-4
        text-center
        transition-all duration-200
        hover:shadow-lg
        hover:-translate-y-1
        relative
      ">
        <div class="absolute top-0 left-0 w-full h-1 bg-red-600 rounded-t-xl"></div>

        <a href="/juego/${juego.slug}">
          <img
            src="${imagen}"
            alt="${juego.nombre}"
            onerror="this.onerror=null; this.src='imagenes/no-img-available.png';"
            class="
              w-full
              h-[180px]
              object-cover
              rounded-lg
              mb-4
              transition-transform duration-200
              group-hover:scale-[1.02]
            "
          />
        </a>

        <h3 class="
          text-sm
          text-gray-900
          leading-tight
          min-h-[48px]
          flex flex-col items-center justify-center
          font-semibold
        ">
          ${juego.nombre}
          <span class="block text-xs text-blue-700 mt-1 font-medium">
            ${juego.plataforma}
          </span>
        </h3>
      </div>
    `;

    $contenedor.append(cardHtml);
  });
}

function LoadRandomGames(paginaSeleccionada = 0) {
  const url = `${API_JUEGOS_RANDOM}/42?noCache=${Date.now()}`;

  loadBaseGames({
    url,
    pagina: paginaSeleccionada,
    title: "FREE CLASSIC GAMES ONLINE",
    subtitulo:
      "Explore 42 random arcade games from our full online collection",
    showPages: false,
  });
}

function showPagination(totalPaginas, paginaActual) {
  const pagDiv = document.getElementById("paginacion");
  pagDiv.style.display = "flex";
  pagDiv.className = "flex flex-wrap justify-center gap-2 my-6 max-w-full";
  pagDiv.innerHTML = "";

  const params = new URLSearchParams(window.location.search);

  function crearEnlace(num, texto = null, extraClasses = "") {
    const a = document.createElement("a");
    a.textContent = texto || num;

    a.className = `
      text-sm font-medium
      border border-blue-500
      text-blue-600
      rounded-md
      px-3 py-1
      transition-colors duration-150
      hover:bg-blue-50 hover:text-blue-700
      ${extraClasses}
    `
      .trim()
      .replace(/\s+/g, " ");

    if (num === paginaActual) {
      a.classList.add("bg-red-500", "text-white", "border-red-500");
      a.style.pointerEvents = "none";
    }

    const newParams = new URLSearchParams(params);
    newParams.set("page", num);
    a.href = `${window.location.pathname}?${newParams.toString()}`;

    return a;
  }

  function crearSpan(texto) {
    const span = document.createElement("span");
    span.textContent = texto;
    span.className = "px-3 py-1 text-gray-400 select-none";
    return span;
  }

  function crearBotonDeshabilitado(texto) {
    const span = document.createElement("span");
    span.textContent = texto;
    span.className = `
      text-sm font-medium
      border border-gray-300
      text-gray-400
      rounded-md
      px-3 py-1
      cursor-not-allowed
      select-none
    `
      .trim()
      .replace(/\s+/g, " ");
    return span;
  }

  if (paginaActual > 1) {
    pagDiv.appendChild(crearEnlace(paginaActual - 1, "Previous"));
  } else {
    pagDiv.appendChild(crearBotonDeshabilitado("Previous"));
  }

  if (totalPaginas <= 10) {
    for (let i = 1; i <= totalPaginas; i++) {
      pagDiv.appendChild(crearEnlace(i));
    }
  } else {
    pagDiv.appendChild(crearEnlace(1));

    let startPage, endPage;

    if (paginaActual <= 5) {
      startPage = 2;
      endPage = 7;
      for (let i = startPage; i <= endPage; i++) {
        pagDiv.appendChild(crearEnlace(i));
      }
      if (endPage < totalPaginas - 3) {
        pagDiv.appendChild(crearSpan("..."));
      }
    } else if (paginaActual >= totalPaginas - 4) {
      if (2 < totalPaginas - 7) {
        pagDiv.appendChild(crearSpan("..."));
      }
      startPage = totalPaginas - 6;
      endPage = totalPaginas - 1;
      for (let i = startPage; i <= endPage; i++) {
        pagDiv.appendChild(crearEnlace(i));
      }
    } else {
      if (2 < paginaActual - 2) {
        pagDiv.appendChild(crearSpan("..."));
      }
      startPage = paginaActual - 2;
      endPage = paginaActual + 2;
      for (let i = startPage; i <= endPage; i++) {
        pagDiv.appendChild(crearEnlace(i));
      }
      if (endPage < totalPaginas - 1) {
        pagDiv.appendChild(crearSpan("..."));
      }
    }

    pagDiv.appendChild(crearEnlace(totalPaginas));
  }

  if (paginaActual < totalPaginas) {
    pagDiv.appendChild(crearEnlace(paginaActual + 1, "Next"));
  } else {
    pagDiv.appendChild(crearBotonDeshabilitado("Next"));
  }
}

function initializeLetterFilter(letra) {
  const $letters = $("#letters").show();

  if ($letters.children().length === 0) {
    const baseURL = window.location.pathname;

    [
      "#",
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    ].forEach((l) => {
      const href = `${baseURL}?letra=${encodeURIComponent(l)}`;

      const baseClasses = `
        text-sm font-medium
        border border-blue-500
        text-blue-600
        rounded-md
        px-3 py-1
        transition-colors duration-150
        hover:bg-blue-50 hover:text-blue-700
      `
        .trim()
        .replace(/\s+/g, " ");

      const activeClasses =
        "bg-red-500 text-white border-red-500 pointer-events-none";

      const classes =
        letra == l ? `${baseClasses} ${activeClasses}` : baseClasses;

      $letters.append(`<a class="${classes}" href="${href}">${l}</a>`);
    });
  }
}

function CompleteDataSheet(categoria) {
  if (!categoria) return;

  $("#descripcion-corta")
    .addClass("text-blue-800 text-sm leading-relaxed")
    .text(categoria.descripcion_corta || "");

  $("#anio-lanzamiento")
    .addClass("text-red-500 font-medium")
    .text(categoria.anio_lanzamiento || "");

  $("#fabricante")
    .addClass("text-red-500 font-medium")
    .text(categoria.fabricante || "");

  $("#region").addClass("text-red-500").text(categoria.region_origen || "");
  $("#tipo").addClass("text-red-500").text(categoria.tipo || "");
  $("#descripcion-SEO")
    .addClass("text-red-500 text-sm leading-relaxed mt-2")
    .text(categoria.descripcion || "");

  $("#platform-chips").html(`
    ${categoria.cpu ? `
      <div class="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
        <span class="text-xs text-blue-600">CPU:</span>
        <span class="text-red-500">${categoria.cpu}</span>
      </div>` : ""}
    ${categoria.screen ? `
      <div class="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
        <span class="text-xs text-blue-600">Screen:</span>
        <span class="text-red-500">${categoria.screen}</span>
      </div>` : ""}
    ${categoria.battery_life ? `
      <div class="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
        <span class="text-xs text-blue-600">Battery life:</span>
        <span class="text-red-500">${categoria.battery_life}</span>
      </div>` : ""}
    ${categoria.backward_compatible ? `
      <div class="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
        <span class="text-xs text-blue-600">Backward compatible:</span>
        <span class="text-red-500">${categoria.backward_compatible}</span>
      </div>` : ""}
    ${categoria.discontinued ? `
      <div class="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
        <span class="text-xs text-blue-600">Discontinued:</span>
        <span class="text-red-500">${categoria.discontinued}</span>
      </div>` : ""}
    ${categoria.units_sold ? `
      <div class="px-3 py-1 bg-blue-50 border border-blue-200 rounded">
        <span class="text-xs text-blue-600">Units sold:</span>
        <span class="text-red-500">${categoria.units_sold}</span>
      </div>` : ""}
  `);

  const $profile = $("#platform-profile");
  if ($profile.length === 0) return;

  const tieneNuevosDatos =
    categoria.what_it_was ||
    categoria.why_it_matters ||
    categoria.what_youll_find ||
    categoria.top_games;

  if (!tieneNuevosDatos) {
    $profile.addClass("hidden");
    return;
  }

  $profile.removeClass("hidden").html(`
    ${categoria.what_it_was ? `
      <div class="pt-3 border-t border-blue-200">
        <strong class="block mb-2 text-xs uppercase tracking-widest text-blue-600">
          What it was
        </strong>
        <div class="text-sm text-red-500 leading-relaxed text-justify">
          ${categoria.what_it_was}
        </div>
      </div>` : ""}

    ${categoria.why_it_matters ? `
      <div class="pt-3 border-t border-blue-200">
        <strong class="block mb-2 text-xs uppercase tracking-widest text-blue-600">
          Why it matters
        </strong>
        <div class="text-sm text-red-500 leading-relaxed text-justify">
          ${categoria.why_it_matters}
        </div>
      </div>` : ""}

    ${categoria.what_youll_find ? `
      <div class="pt-3 border-t border-blue-200">
        <strong class="block mb-2 text-xs uppercase tracking-widest text-blue-600">
          What you'll find here
        </strong>
        <div class="text-sm text-red-500 leading-relaxed text-justify">
          ${categoria.what_youll_find}
        </div>
      </div>` : ""}

    ${categoria.top_games ? `
      <div class="pt-3 border-t border-blue-200">
        <strong class="block mb-2 text-xs uppercase tracking-widest text-blue-600">
          Top games
        </strong>
        <div class="text-sm text-red-500 leading-relaxed">
          ${categoria.top_games}
        </div>
      </div>` : ""}
  `);
}

function CompleteGameDetails(datos) {
  if (!datos) return;

  $("#jd-descripcion-corta").text(datos.descripcion_corta || "");
  $("#jd-plataforma").text(datos.plataforma || "");
  $("#jd-anio").text(datos.anio || "");
  $("#jd-genero").text(datos.genero || "");
  $("#jd-desarrollador").text(datos.desarrollador || "");
  $("#jd-jugadores").text(datos.jugadores || "");
  $("#jd-estilo").text(datos.estilo || "");
  $("#jd-gameplay").text(datos.gameplay || "");
  $("#jd-objetivo").text(datos.objetivo || "");
  $("#jd-descripcion-larga").text(datos.descripcion_larga || "");

  if (datos.also_known_as) {
    $("#jd-also-known-as").text(datos.also_known_as);
    $("#jd-also-known-as-wrap").removeClass("hidden");
  }

  if (datos.region) {
    $("#jd-region").text(datos.region);
    $("#jd-region-wrap").removeClass("hidden");
  }
}

async function loadGameBySlug(slug) {
  try {
    const resp = await fetch(`${BASE_URL}/api/juegos/slug/${slug}`);
    const juego = await resp.json();

    if (!juego || juego.error) {
      console.error("Game not found");
      $("#game-cards-holder").html(
        "<p class='text-gray-600 text-center'>Game not found.</p>"
      );
      return;
    }

    // Título y meta description dinámicos
    document.title = `${juego.nombre} – Play Free Classic Game Online | FreeClassicGamesOnline`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        `Play ${juego.nombre} free online. Classic ${juego.plataforma || ""} game playable instantly in your browser — no downloads, no registration required.`
      );
    }

    const cardHtml = `
      <div class="card-juego bg-white w-full max-w-5xl mx-auto">

        <h2 class="text-2xl font-semibold text-blue-700 text-center mb-1">
          ${juego.nombre}
        </h2>
        <p class="text-sm text-red-500 text-center mb-4">
          ${juego.plataforma || "Unknown"}
        </p>

        ${juego.iframe ? `
          <iframe
            class="w-full min-h-[500px] lg:min-h-[600px] rounded-lg border border-gray-200"
            src="${juego.iframe}"
            frameborder="0"
            allowfullscreen>
          </iframe>
        ` : ""}

        <div class="text-xs text-gray-400 border-t border-gray-100 pt-4 text-justify">
            <strong>Source:</strong> This game is embedded from retrogames.cc.
            All rights and content belong to their respective owners.
            We do not host or modify the original files.
          </div>

        <div class="mt-8 max-w-7xl mx-auto space-y-6 text-gray-700 text-sm leading-relaxed">

          <p id="jd-descripcion-corta" class="text-base text-red-600 font-medium text-justify"></p>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs border border-gray-100 rounded-lg p-4 bg-red-50">
            <div><span class="text-blue-700 font-semibold">Platform:</span> <span id="jd-plataforma" class="text-red-600"></span></div>
            <div><span class="text-blue-700 font-semibold">Released:</span> <span id="jd-anio" class="text-red-600"></span></div>
            <div><span class="text-blue-700 font-semibold">Category:</span> <span id="jd-genero" class="text-red-600"></span></div>
            <div><span class="text-blue-700 font-semibold">Made by:</span> <span id="jd-desarrollador" class="text-red-600"></span></div>
            <div><span class="text-blue-700 font-semibold">Players supported:</span> <span id="jd-jugadores" class="text-red-600"></span></div>
            <div><span class="text-blue-700 font-semibold">Playstyle:</span> <span id="jd-estilo" class="text-red-600"></span></div>
            <div id="jd-also-known-as-wrap" class="hidden col-span-2 md:col-span-3">
              <span class="text-blue-700 font-semibold">Also known as:</span>
              <span id="jd-also-known-as" class="text-red-600"></span>
            </div>
            <div id="jd-region-wrap" class="hidden">
              <span class="text-blue-700 font-semibold">Region:</span>
              <span id="jd-region" class="text-red-600"></span>
            </div>
          </div>

          <div>
            <h3 class="text-blue-700 font-semibold mb-1">Gameplay breakdown</h3>
            <p id="jd-gameplay" class="text-red-600 text-justify"></p>
          </div>

          <div>
            <h3 class="text-blue-700 font-semibold mb-1">Win condition</h3>
            <p id="jd-objetivo" class="text-red-600 text-justify"></p>
          </div>

          <div>
            <h3 class="text-blue-700 font-semibold mb-1">About</h3>
            <p id="jd-descripcion-larga" class="text-red-600 text-justify"></p>
          </div>

        </div>
      </div>
    `;

    $("#game-cards-holder").html(cardHtml);
    CompleteGameDetails(juego);

    const seccionComentarios = document.getElementById("comentarios-section");
    if (seccionComentarios) {
      seccionComentarios.dataset.juegoId   = juego.id;
      seccionComentarios.dataset.juegoSlug = juego.slug;
      seccionComentarios.classList.remove("hidden");
    }

    if (window.sistemaComentarios) {
      window.sistemaComentarios.juegoId   = juego.id;
      window.sistemaComentarios.juegoSlug = juego.slug;
      window.sistemaComentarios.cargarComentarios();
    }

    setTimeout(() => { loadSafeAds(); }, 1500);
    setTimeout(() => { loadSafeAds(); }, 3000);

  } catch (e) {
    console.error("Error loading game:", e);
    $("#game-cards-holder").html(
      "<p class='text-gray-600 text-center'>Error connecting to server.</p>"
    );
  }
}

function loadSafeAds() {
  if (typeof adsbygoogle === "undefined") {
    console.warn("AdSense aún no está disponible");
    return;
  }

  document.querySelectorAll(".adsbygoogle").forEach((ad) => {
    if (ad.dataset.adsbygoogleStatus) return;

    const computedStyle = window.getComputedStyle(ad);
    if (computedStyle.display === "none") return;

    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
      console.log("✓ Anuncio cargado");
    } catch (e) {
      console.error("✗ Error:", e.message);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(loadSafeAds, 300);
  });
} else {
  setTimeout(loadSafeAds, 300);
}