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
    $("#main-game-container").removeClass("hidden");
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
        const ulSub = $(`
  <ul class="submenu absolute top-full left-0 mt-1
             bg-[#090039]
             border border-[#00d2d9]
             rounded-md
             min-w-[180px]
             max-h-[300px]
             overflow-hidden
             z-[100]
             opacity-0 invisible
             -translate-y-2
             transition-all duration-300">
  </ul>
`);

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
  <div class="card-juego
              border-2 border-[#0f207f]
              rounded-lg
              p-4
              text-center
              text-[#00ffcc]
              font-['Orbitron']
              shadow-[0_0_10px_#00ffcc,_inset_0_0_20px_#00ffcc]
              w-full
              ">

    <h2 class="titulo-juego
           min-h-[60px]
           flex
           flex-col
           items-center
           justify-center
           text-xl
           mb-3
           text-center
           drop-shadow-[0_0_5px_#00ffcc]">

      ${juego.nombre}
      <<span class="plataforma
             text-sm
             text-[#f207fe]
             mt-1
             text-center
             drop-shadow-[0_0_3px_#70f207f]">
        Platform: ${juego.plataforma || "Unknown"}
      </span>
    </h2>

    ${juego.iframe ? `
      <iframe
  class="w-full
         min-h-[500px]
         lg:min-h-[600px]
         rounded-md
         border-2 border-[#00ffcc]
         shadow-[0_0_10px_#00ffcc]"
  src="${juego.iframe}"
  frameborder="0"
  allowfullscreen>
</iframe>` : ""}
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
    if ($campoBusqueda.hasClass("hidden")) {
      $campoBusqueda.removeClass("hidden");
      $inputBusqueda.focus();
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
      $campoBusqueda.addClass("hidden");
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
  <div class="bg-[#090039]
              border-2 border-[#0f207f]
              rounded-lg
              p-3
              text-center
              text-[#00ffcc]
              font-['Orbitron']
              shadow-[0_0_10px_#00ffcc,_inset_0_0_15px_#00ffcc]
              transition-all duration-300
              hover:-translate-y-1 hover:scale-105
              hover:shadow-[0_0_15px_#ff00ff,_inset_0_0_25px_#ff00ff]">

    <a href="/juego/${juego.slug}">
      <img
        src="${imagen}"
        alt="${juego.nombre}"
        onerror="this.onerror=null; this.src='imagenes/no-img-available.png';"
        class="w-full
               h-[180px]
               object-cover
               rounded-md
               mb-2"
      />
    </a>

    <h3 class="text-sm
           text-[#00ffcc]
           drop-shadow-[0_0_5px_#00ffcc]
           leading-tight
           min-h-[40px]
           flex items-center justify-center
           text-center">
      ${juego.nombre} — ${juego.plataforma}
    </h3>
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
  pagDiv.className = "flex flex-wrap justify-center gap-2 my-5 max-w-full";

  pagDiv.innerHTML = "";

  const params = new URLSearchParams(window.location.search);

  function crearEnlace(num, texto = null, extraClasses = "") {
    const a = document.createElement("a");
    a.textContent = texto || num;

    a.className = `
      font-orbitron font-extrabold text-[0.9rem] 
      border-[1.5px] border-[#ff00ff] 
      text-[#5e69fe] 
      rounded-md 
      px-2 py-1 
      cursor-pointer 
      transition-transform duration-200 ease-in-out
      hover:bg-[#00ffcc] hover:text-[#090039] hover:scale-110
      ${extraClasses}
    `.trim().replace(/\s+/g, " ");

    if (num === paginaActual) {
      a.classList.add(
        "bg-[#ff00ff]",
        "text-white",
        "border-[#00ffcc]",
        "scale-110"
      );
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
    span.className = "px-2 py-1 text-gray-400 select-none";
    return span;
  }

  function crearBotonDeshabilitado(texto) {
    const span = document.createElement("span");
    span.textContent = texto;
    span.className = `
      font-orbitron font-extrabold text-[0.9rem] 
      border-[1.5px] border-[#ff00ff] 
      text-[#5e69fe] 
      rounded-md 
      px-2 py-1 
      cursor-not-allowed 
      opacity-50 select-none
    `.trim().replace(/\s+/g, " ");
    return span;
  }

  // Botón anterior
  if (paginaActual > 1) {
    pagDiv.appendChild(crearEnlace(paginaActual - 1, "Anterior"));
  } else {
    pagDiv.appendChild(crearBotonDeshabilitado("Anterior"));
  }

  // Páginas
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

  // Botón siguiente
  if (paginaActual < totalPaginas) {
    pagDiv.appendChild(crearEnlace(paginaActual + 1, "Siguiente"));
  } else {
    pagDiv.appendChild(crearBotonDeshabilitado("Siguiente"));
  }
}

function inicializarFiltroLetras(letra) {
  const $letters = $("#letters").show();

  if ($letters.children().length === 0) {
    const baseURL = window.location.pathname;

    ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))]
      .forEach(l => {
        const href = `${baseURL}?letra=${encodeURIComponent(l)}`;
        const buttonClasses = 'font-orbitron font-extrabold text-[0.9rem] border-[1.5px] border-[#ff00ff] text-[#5e69fe] rounded-md px-2 py-1 cursor-pointer transition-transform duration-200 ease-in-out hover:bg-[#00ffcc] hover:text-[#090039] hover:scale-110';
        const classes = letra == l ? `${buttonClasses} bg-[#ff00ff] text-white border-[#00ffcc] scale-110` : buttonClasses;
        $letters.append(`<a class="${classes}" href="${href}">${l}</a>`);
      });
  }
}

function completarFichaTecnica(categoria) {
  $("#descripcion-corta").text(categoria.descripcion_corta);
  $("#anio-lanzamiento").text(categoria.anio_lanzamiento);
  $("#fabricante").text(categoria.fabricante);
  $("#region").text(categoria.region_origen);
  $("#tipo").text(categoria.tipo);
  $("#descripcion-SEO").text(categoria.descripcion);
}


