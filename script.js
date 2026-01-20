const BASE_URL = "https://retroarcade-api.contactoretroverse.workers.dev";
const API_JUEGOS = `${BASE_URL}/api/juegos`;
const API_JUEGOS_RANDOM = `${BASE_URL}/api/juegos/random`;
const API_CATEGORIAS = `${BASE_URL}/api/categorias`;
var _categorias = [];

$(document).ready(function () {
  setTimeout(() => {
    cargarAdsSeguro(".ad-space");
  }, 300);

  (async () => {
    await cargarCategorias();
    initRedirect();
    initHamburguer();
    InitSeccionBusqueda();
  })();
});

function cargarAdsSeguro(selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  const width = el.offsetWidth;
  if (width === 0) return; // ⛔ no lo cargues si está oculto

  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.warn("Ads no cargado aún");
  }
}

function initHamburguer() {
  const $hamburger = $("#hamburger");
  const $navMenu = $("#nav-menu");

  $hamburger.on("click", () => {
    $navMenu.toggleClass("hidden flex");
  });
}
function initRedirect() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  splitedPath = path.split("/");

  // JUEGOS
  if (path.includes("/juego/")) {
    cargarJuegoPorSlug(splitedPath[splitedPath.length - 1]);
    $("#main-game-container").removeClass("hidden");
    return;
  }

  // CATEGORIA
  if (path.includes("/categoria/")) {
    $("#games-section").removeClass("hidden");
    $("#ficha-tecnica").removeClass("hidden");

    const categoria = splitedPath[splitedPath.length - 1];
    const letra = params.get("letra"); // puede ser null
    let page = Number(params.get("page")) || 1;

    cargarCategoriaLetraPagina(categoria, letra, page);
    inicializarFiltroLetras(letra);
    completarFichaTecnica(_categorias.find((c) => c.slug == categoria));
    return;
  }

  if (params.get("buscar")) {
    $("#games-section").removeClass("hidden");
    let busqueda = params.get("buscar");
    let page = Number(params.get("page")) || 1;
    buscarJuegos(busqueda, page);
    return;
  }

  //INDEX
  $("#games-section").removeClass("hidden");
  cargarJuegosRandom();
}

async function cargarCategorias() {
  try {
    const categorias = await $.getJSON(API_CATEGORIAS);

    if (!Array.isArray(categorias) || categorias.length === 0) return;

    _categorias = categorias;

    const principales = categorias
      .filter((cat) => cat.padre_id == null)
      .sort((a, b) => a.orden - b.orden);

    const secundarias = categorias.filter((cat) => cat.padre_id != null);

    const $menu = $("#menu-principal");
    // Buscar el <li> que contiene el botón de búsqueda
    const $botonBuscarLi = $menu.find("li:has(#btn-buscar)");

    // Remover solo los items de categorías (no el de búsqueda)
    $menu.find("li").not($botonBuscarLi).remove();

    principales.forEach((cat) => {
      const li = $("<li></li>").addClass("relative w-full md:w-auto mb-2 md:mb-0");

      const tieneSubmenu = secundarias.some((sec) => sec.padre_id == cat.id);

      const a = tieneSubmenu
        ? $(`<a href="javascript:void(0)" class="block w-full md:w-auto px-4 py-2 text-[#00d2d9] hover:text-[#f207fe] transition-colors font-bold">${cat.nombre} ▾</a>`)
        : $(`<a href="/categoria/${cat.slug}" class="block w-full md:w-auto px-4 py-2 text-[#00d2d9] hover:text-[#f207fe] transition-colors font-bold">${cat.nombre}</a>`);

      li.append(a);

      const subs = secundarias
        .filter((sub) => sub.padre_id == cat.id)
        .sort((a, b) => a.orden - b.orden);

      if (subs.length) {
        const ulSub = $(`
          <ul class="submenu
                     hidden
                     md:absolute md:top-full md:left-0 md:mt-1
                     bg-[#090039]
                     border border-[#00d2d9]
                     rounded-md
                     shadow-lg
                     w-full md:min-w-[200px] md:w-auto
                     z-[100]
                     transition-all duration-300
                     pl-0 md:pl-0
                     mt-2 md:mt-1">
          </ul>
        `);

        subs.forEach((sub) => {
          ulSub.append(`
            <li class="border-b border-[#00d2d9]/30 last:border-b-0">
              <a href="/categoria/${sub.slug}" class="block px-4 py-2.5 md:py-2 text-sm text-[#00d2d9] hover:text-[#f207fe] hover:bg-[#f207fe]/10 transition-colors">${sub.nombre}</a>
            </li>
          `);
        });

        li.append(ulSub);
      }

      // Insertar ANTES del botón de búsqueda
      if ($botonBuscarLi.length) {
        $botonBuscarLi.before(li);
      } else {
        $menu.append(li);
      }
    });

    // Eventos para mobile (click toggle con slideToggle)
    $menu.off("click", "a").on("click", "a", function (e) {
      const $link = $(this);
      const $submenu = $link.siblings(".submenu");
      const esMovil = window.matchMedia("(max-width: 767px)").matches;

      if (esMovil && $submenu.length) {
        e.preventDefault();
        
        // Cerrar otros submenús abiertos
        $menu.find(".submenu").not($submenu).stop(true, true).slideUp(200);
        
        // Toggle el actual
        $submenu.stop(true, true).slideToggle(200);
        
        $link.toggleClass("active");
      }
    });

    // Eventos para desktop (hover)
    const handleHover = () => {
      const esMovil = window.matchMedia("(max-width: 767px)").matches;
      
      // Limpiar eventos previos
      $menu.off("mouseenter mouseleave", "> li");
      
      if (!esMovil) {
        $menu.on({
          mouseenter: function() {
            const $submenu = $(this).find(".submenu");
            if ($submenu.length) {
              $submenu.stop(true, true).fadeIn(200);
            }
          },
          mouseleave: function() {
            const $submenu = $(this).find(".submenu");
            if ($submenu.length) {
              $submenu.stop(true, true).fadeOut(200);
            }
          }
        }, "> li");
      }
    };
    
    handleHover();
    $(window).on("resize", handleHover);

  } catch (err) {
    console.error("FATAL error loading categories:", err);
  }
}

async function cargarJuegoPorSlug(slug) {
  try {
    const resp = await fetch(`${BASE_URL}/api/juegos/slug/${slug}`);
    const juego = await resp.json();

    // Validar si el juego existe
    if (!juego || juego.error) {
      console.error("Game not found");
      $("#game-cards-container").html(
        "<p class='text-white text-center'>Game not found.</p>",
      );
      return;
    }

    // 1. Construir el HTML de la Card
    const cardHtml = `
      <div class="card-juego 
                  border-2 border-[#0f207f] 
                  rounded-lg 
                  p-4 
                  text-center 
                  text-[#00ffcc] 
                  font-['Orbitron'] 
                  shadow-[0_0_10px_#00ffcc,_inset_0_0_20px_#00ffcc] 
                  w-full">

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
          <span class="plataforma text-sm text-[#f207fe] mt-1">
            Platform: ${juego.plataforma || "Unknown"}
          </span>
        </h2>

      <div id="ficha-juego-detalle" class="text-sm text-purple-900 font-mono">

        <h3 id="jd-descripcion-corta"
        class="mb-6 text-center font-semibold text-purple-950 tracking-widest">
        </h3>

       <div class="flex flex-wrap gap-x-4 gap-y-3 justify-center mb-6 text-purple-950">
       <div class="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">
          <span class="text-purple-800 text-xs font-medium">Platform:</span>
          <span id="jd-plataforma"></span>
        </div>

        <div class="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">
          <span class="text-purple-800 text-xs font-medium">Year:</span>
          <span id="jd-anio"></span>
        </div>

    <div class="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">
      <span class="text-purple-800 text-xs font-medium">Genre:</span>
      <span id="jd-genero"></span>
    </div>

    <div class="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">
      <span class="text-purple-800 text-xs font-medium">Developer:</span>
      <span id="jd-desarrollador"></span>
    </div>

    <div class="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">
      <span class="text-purple-800 text-xs font-medium">Players:</span>
      <span id="jd-jugadores"></span>
    </div>

    <div class="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">
      <span class="text-purple-800 text-xs font-medium">Style:</span>
      <span id="jd-estilo"></span>
    </div>

  </div>
  <div class="w-full pt-4 border-t border-purple-500/30">
    <strong
      class="block mb-2 text-purple-800 text-xs uppercase tracking-widest text-center">
      Gameplay:
    </strong>

    <div id="jd-gameplay"
      class="text-purple-800 text-sm leading-relaxed text-center
             whitespace-pre-wrap break-words">
    </div>
  </div>

  <div class="w-full pt-4 border-t border-purple-500/30">
    <strong
      class="block mb-2 text-purple-800 text-xs uppercase tracking-widest text-center">
      Objective:
    </strong>

    <div id="jd-objetivo"
      class="text-purple-800 text-sm leading-relaxed text-center
             whitespace-pre-wrap break-words">
    </div>
  </div>

  <div class="w-full pt-4 border-t border-purple-500/30">
    <strong
      class="block mb-2 text-purple-800 text-xs uppercase tracking-widest text-center">
      About this game:
    </strong>

    <div id="jd-descripcion-larga"
      class="text-purple-800 text-sm leading-relaxed text-center
             whitespace-pre-wrap break-words">
    </div>
  </div>

</div>

        ${juego.iframe
        ? `
          <iframe 
            class="w-full min-h-[500px] lg:min-h-[600px] 
                   mt-4 rounded-md border-2 border-[#00ffcc] 
                   shadow-[0_0_10px_#00ffcc]" 
            src="${juego.iframe}" 
            frameborder="0" 
            allowfullscreen>
          </iframe>
        `
        : ""
      }
      </div>
    `;

    // 2. Inyectar el HTML en el contenedor
    $("#game-cards-container").html(cardHtml);

    // 3. Rellenar los datos en los IDs recién creados
    // Nota: Pasamos 'juego' completo. Si tu API anida los datos en 'detalle', cambia a completarFichaJuegoDetalle(juego.detalle)
    completarFichaJuegoDetalle(juego);

    // 4. Mostrar el bloque de "Embed Code" si hay iframe
    if (juego.iframe) {
      $("#iframe-preview").removeClass("hidden").html(`
          <div class="mt-4 max-w-7xl mx-auto border border-[#f207fe] bg-[whitesmoke] rounded-xl p-4 font-mono text-sm text-[#551a8b] leading-relaxed shadow-[0_0_4px_#00ffcc,_inset_0_0_3px_#f207fe] space-y-3">
            <div class="break-all text-xs opacity-80">
  <span class="font-bold text-[#f207fe]">Embed code:</span>
  &lt;iframe src="${juego.iframe}" frameborder="0" allowfullscreen&gt;&lt;/iframe&gt;
</div>
            <div id="source" class="text-xs opacity-80"> <strong class="text-[#f207fe]">Source:</strong> retrogames.cc. All content is embedded via iframe and remains the property of its respective owners. We do not host, store, or distribute this content and are not responsible for it. </div>
          </div>
        `);
    }
  } catch (e) {
    console.error("Error loading game:", e);
    $("#game-cards-container").html(
      "<p class='text-white text-center'>Error connecting to server.</p>",
    );
  }
}

async function cargarJuegosBase({
  url,
  pagina = 0,
  titulo = "",
  showPages = true,
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
  const letraFilter = letra ? "&letra=" + letra : "";
  const url = `${BASE_URL}/api/juegos/categoria/slug/${categoria}?page=${pagina - 1}&size=40${letraFilter}`;

  cargarJuegosBase({
    url,
    pagina: pagina,
    titulo: _categorias.find((_cat) => _cat.slug == categoria).nombre,
    showPages: true,
  });
}

function InitSeccionBusqueda() {
  const $btnBuscar = $("#btn-buscar");
  const $campoBusqueda = $btnBuscar.closest("li").find(".campo-busqueda");
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
    termino.trim(),
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
    `
      .trim()
      .replace(/\s+/g, " ");

    if (num === paginaActual) {
      a.classList.add(
        "bg-[#ff00ff]",
        "text-white",
        "border-[#00ffcc]",
        "scale-110",
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
    `
      .trim()
      .replace(/\s+/g, " ");
    return span;
  }

  // Botón anterior
  if (paginaActual > 1) {
    pagDiv.appendChild(crearEnlace(paginaActual - 1, "Previous"));
  } else {
    pagDiv.appendChild(crearBotonDeshabilitado("Previous"));
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
    pagDiv.appendChild(crearEnlace(paginaActual + 1, "Next"));
  } else {
    pagDiv.appendChild(crearBotonDeshabilitado("Next"));
  }
}

function inicializarFiltroLetras(letra) {
  const $letters = $("#letters").show();

  if ($letters.children().length === 0) {
    const baseURL = window.location.pathname;

    [
      "#",
      ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    ].forEach((l) => {
      const href = `${baseURL}?letra=${encodeURIComponent(l)}`;
      const buttonClasses =
        "font-orbitron font-extrabold text-[0.9rem] border-[1.5px] border-[#ff00ff] text-[#5e69fe] rounded-md px-2 py-1 cursor-pointer transition-transform duration-200 ease-in-out hover:bg-[#00ffcc] hover:text-[#090039] hover:scale-110";
      const classes =
        letra == l
          ? `${buttonClasses} bg-[#ff00ff] text-white border-[#00ffcc] scale-110`
          : buttonClasses;
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

function completarFichaJuegoDetalle(datos) {
  if (!datos) {
    console.warn("No se recibieron datos para completar la ficha");
    return;
  }

  console.log("Llenando ficha con:", datos);

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

  // Esto es clave si el div empieza oculto
  $("#ficha-juego-detalle").show();
}
