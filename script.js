const BASE_URL = "https://retroarcade-api.contactoretroverse.workers.dev";
const API_JUEGOS = `${BASE_URL}/api/juegos`;
const API_JUEGOS_RANDOM = `${BASE_URL}/api/juegos/random`;
const API_CATEGORIAS = `${BASE_URL}/api/categorias`;

const $contenedor = $("#cards-container");
const lettersDiv = $("#letters");

const $hamburger = $("#hamburger");
const $menu = $("#menu-principal");
const $navMenu = $("#nav-menu");

$hamburger.on("click", () => {
  $navMenu.toggleClass("show");
});

const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);

const IS_GAME_PAGE = path.startsWith("/juego/");

var categoriaSlug = null;
var juegoSlug = null;

if (path.startsWith("/juego/")) {
  juegoSlug = path.replace("/juego/", "")
    .replace(/\/$/, "")
    .trim();
}
// Corregido: Capturar el slug de la categoría del parámetro 'categoria' si existe
if (params.get("categoria")) {
  categoriaSlug = params.get("categoria");
}

$(document).ready(function () {

  InitSeccionBusqueda();
  cargarCategorias();

  if (IS_GAME_PAGE && juegoSlug && juegoSlug.length > 0) {
    // cargamos sólo el juego y salimos
    cargarJuegoPorSlug(juegoSlug);

  } else {
    initBusqueda();
  }
});

async function cargarJuegoPorSlug(slug) {
  try {
    const resp = await fetch(`${BASE_URL}/api/juegos/slug/${slug}`);
    const juego = await resp.json();

    if (!juego || juego.error) {
      console.error("Juego no encontrado");
      $("#game-cards-container").html("<p>Juego no encontrado.</p>");
      return;
    }

    const cardHtml = `
      <div class="card-juego">
         <h2 class="titulo-juego">
      ${juego.nombre} — <span class="plataforma">Plataforma: ${juego.plataforma || "Desconocida"}</span>
    </h2>
      
        ${juego.iframe ? `<iframe src="${juego.iframe}" frameborder="0" allowfullscreen></iframe>` : ""}
      </div>
    `;

    $("#game-cards-container").html(cardHtml);
    if (juego.iframe) {
      $("#iframe-preview").html(`<span> Embed Code: &lt;iframe src="${juego.iframe}" frameborder="0" allowfullscreen&gt;&lt;/iframe&gt;</span> 
         <span id="source">**Fuente: retrogames.cc. El contenido se muestra mediante iframe y pertenece exclusivamente a sus respectivos propietarios. No almacenamos ni distribuimos dicho contenido y no asumimos responsabilidad por el mismo.**</span>`);
    }

  } catch (e) {
    console.error("Error al cargar juego:", e); // Cambié el mensaje de error
  }
}

async function obtenerNombreCategoria(slug) {
  try {
    const resp = await fetch(API_CATEGORIAS);
    const categorias = await resp.json();

    if (!Array.isArray(categorias)) return "Juegos de Categoría";

    const categoriaEncontrada = categorias.find(cat => cat.slug === slug);

    return categoriaEncontrada ? categoriaEncontrada.nombre : "Juegos de Consola";

  } catch (e) {
    console.error("Error al obtener nombre de categoría:", e);
    return "Juegos de Consola";
  }
}

function initBusqueda() {
  const params = new URLSearchParams(window.location.search);
  const terminoBusqueda = params.get("buscar");
  const page = params.get("page");

  if (terminoBusqueda) {
    buscarJuegos(terminoBusqueda, page);
  } else {
    cargarJuegos(page);
  }
}

function InitSeccionBusqueda() {

  const $btnBuscar = $("#btn-buscar");
  const $campoBusqueda = $btnBuscar.closest('li').find(".campo-busqueda");
  const $inputBusqueda = $campoBusqueda.find("input[type='text']");

  if ($btnBuscar.length === 0 || $campoBusqueda.length === 0) {
    console.warn("Advertencia: No se encontraron los elementos de búsqueda. La inicialización falló.");
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
  //window.document.location = `index.html?buscar=${termino}`;
  window.location.href = `/?buscar=${termino}`;
}

function cargarCategorias() {
  console.log("1. Iniciando carga de categorías...");

  $.getJSON(API_CATEGORIAS)
    .done(function (categorias) {
      console.log("2. Datos recibidos:", categorias.length, "categorías.");

      if (!Array.isArray(categorias) || categorias.length === 0) return;

      // Filtramos las principales (padres)
      // Usamos '==' para que capture tanto null como undefined
      const principales = categorias
        .filter((cat) => cat.padre_id == null)
        .sort((a, b) => a.orden - b.orden);

      const secundarias = categorias.filter((cat) => cat.padre_id != null);

      console.log(`3. Se encontraron ${principales.length} categorías principales.`);

      // Referencias al DOM
      const $menu = $("#menu-principal");
      const $botonBuscar = $menu.find(".buscar");

      // Limpiar categorías previas antes de renderizar (opcional pero recomendado)
      $menu.find('li').not('.buscar').remove();

      // Iteramos las principales
      principales.forEach((cat) => {
        console.log(`   -> Generando HTML para: ${cat.nombre}`); // ESTO DEBE SALIR EN CONSOLA

        const li = $("<li></li>");
        let a = null;

        // Verificamos si tiene hijos
        const tieneSubmenu = secundarias.some((sec) => sec.padre_id == cat.id);

        // Creamos el enlace
        if (!tieneSubmenu) {
          a = $(`<a href="/index.html?categoria=${cat.slug}">${cat.nombre}</a>`);
        } else {
          // El '▾' sirve como indicador visual de submenú
          a = $(`<a href="javascript:void(0)">${cat.nombre} ▾</a>`);
        }

        li.append(a);

        // Lógica del submenú
        const subs = secundarias
          .filter((sub) => sub.padre_id == cat.id)
          .sort((a, b) => a.orden - b.orden);

        if (subs.length > 0) {
          const ulSub = $('<ul class="submenu"></ul>');
          subs.forEach((sub) => {
            const liSub = $("<li></li>");
            const aSub = $(`<a href="/index.html?categoria=${sub.slug}">${sub.nombre}</a>`);
            liSub.append(aSub);
            ulSub.append(liSub);
          });
          li.append(ulSub);
        }

        // --- MOMENTO DE INSERTAR EN EL HTML ---
        if ($botonBuscar.length > 0) {
          $botonBuscar.before(li); // Insertar antes del buscador
        } else {
          $menu.append(li); // Si no hay buscador, agregar al final
        }
      });

      console.log("4. Proceso de renderizado finalizado.");

      // 5. AGREGAR MANEJADOR DE EVENTOS PARA DESPLIEGUE MÓVIL (¡NUEVO CÓDIGO!)

      // Usamos delegación de eventos para capturar clics en los enlaces recién creados
      $menu.off('click', 'a').on('click', 'a', function (e) {
        const $link = $(this);
        const $submenu = $link.siblings('.submenu');

        // Comprueba si estamos en vista móvil (ancho <= 900px, según tu CSS)
        // Y si el elemento tiene un submenú
        const esMovil = window.matchMedia("(max-width: 900px)").matches;

        if (esMovil && $submenu.length) {
          e.preventDefault(); // Evita que navegue

          // Oculta otros submenús abiertos para mantener un solo submenú activo
          $menu.find('.submenu').not($submenu).slideUp(300);

          // Muestra/oculta el submenú del elemento actual con animación
          $submenu.slideToggle(300);

          // Opcional: Cambia la clase para rotar el ícono si usas CSS para ello
          $link.toggleClass('active');
        }
      });

    })
    .fail((jqxhr, textStatus, error) => {
      console.error("Error FATAL cargando categorías:", textStatus, error);
    });
}

function buscarJuegos(termino, pagina) {
  if (!termino || termino.trim() === "") return;

  const url = `${API_JUEGOS}/buscar?nombre=${encodeURIComponent(
    termino.trim()
  )}&page=${(pagina || 0)}&size=40`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const juegos = data.content || data;
      renderJuegos(juegos, $contenedor, "No se encontraron juegos.");
      $("#titulo").text(`Resultados para: "${termino}"`);

      const pagDiv = document.getElementById("pagination");
      if (data.totalPages && data.totalPages > 1) {
        mostrarPaginacion(data.totalPages, pagina, (i) =>
          buscarJuegos(termino, i)
        );
        pagDiv.style.display = "flex";
      } else {
        pagDiv.style.display = "none";
      }
    })
    .catch((err) => console.error("Error en búsqueda:", err));
}

function renderJuegos(juegos, $contenedor, mensajeVacio) {
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

  inicializarFiltroLetras();
}

async function cargarJuegos(paginaSeleccionada) {

  if (IS_GAME_PAGE) return;

  let pagina = paginaSeleccionada; 
  let url;
  let paginacionVisible = true;

  const $tituloH2 = $("#titulo");

  if (categoriaSlug) {
    url = `${API_JUEGOS}/categoria/slug/${categoriaSlug}?page=${(pagina || 0)}&size=40`;
    const nombreCategoria = await obtenerNombreCategoria(categoriaSlug);
    $tituloH2.text(nombreCategoria || "Juegos de Consola");

  } else {
    url = `${API_JUEGOS_RANDOM}/40?&noCache=${Date.now()}`;
    paginacionVisible = false;
    $tituloH2.text("Random Games");
  }

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const juegos = Array.isArray(data) ? data : data.juegos || [];
      renderJuegos(juegos, $contenedor, "No hay juegos en esta categoría.");

      const pagDiv = document.getElementById("pagination");

      if (paginacionVisible && data.totalPages) {
        mostrarPaginacion(data.totalPages, pagina, cargarJuegos);
        pagDiv.style.display = "flex";
      } else {
        pagDiv.style.display = "none";
      }
    })
    .catch((err) => console.error("Error cargando juegos:", err));
}

function mostrarPaginacion(totalPaginas, paginaActual) {
  const pagDiv = document.getElementById("pagination");
  pagDiv.innerHTML = "";

  // Tomamos los parámetros actuales de la URL
  const params = new URLSearchParams(window.location.search);

  for (let i = 0; i < totalPaginas; i++) {
    const a = document.createElement("a");
    a.textContent = i + 1;
    a.classList.add("btn-pagina");

    if (i == (paginaActual || 0)) {
      a.classList.add("activa");
    }

    // Clonamos los params para no pisarlos
    const newParams = new URLSearchParams(params);
    newParams.set("page", i);

    a.href = `${window.location.pathname}?${newParams.toString()}`;

    pagDiv.appendChild(a);
  }
}

/*function mostrarPaginacion(totalPaginas, paginaActual, callback) {
  const pagDiv = document.getElementById("pagination");
  pagDiv.innerHTML = "";
  for (let i = 0; i < totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i + 1;
    btn.classList.add("btn-pagina");
    if (i === paginaActual) btn.classList.add("activa");
    btn.addEventListener("click", () => {
      callback(i);            // Cambia la página
      mostrarPaginacion(totalPaginas, i, callback);  // 🔥 vuelve a dibujar los botones
      window.scrollTo(0, 0);
    });

    pagDiv.appendChild(btn);
  }
}*/

function obtenerCategoriaSlugDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("categoria") || null;
}

function inicializarFiltroLetras() {
  const categoriaSlug = obtenerCategoriaSlugDesdeURL();
  if (!categoriaSlug) {
    lettersDiv.hide();
    return;
  }

  lettersDiv.show();
  InitSeccionBusqueda();

  if (lettersDiv.children().length === 0) {
    const letters = ["#"].concat(
      Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
    );
    letters.forEach((letter) => {
      lettersDiv.append(`<button class="letter-btn">${letter}</button>`);
    });
  }

  let juegosFiltradosLetra = [];
  let paginaActual = 0;
  const size = 40;

  function renderPaginacionLetra() {
    const totalPaginas = Math.ceil(juegosFiltradosLetra.length / size);
    mostrarPaginacion(totalPaginas, paginaActual, (p) => {
      paginaActual = p;
      renderPaginaLetra();
    });
  }

  function renderPaginaLetra() {
    const inicio = paginaActual * size;
    const fin = inicio + size;
    const juegosPagina = juegosFiltradosLetra.slice(inicio, fin);

    renderJuegos(juegosPagina, $contenedor, "No hay juegos para esta letra.");
  }

  // Reset de eventos para evitar duplicados
  lettersDiv.off("click", ".letter-btn");

  lettersDiv.on("click", ".letter-btn", function () {
    const letra = $(this).text().toUpperCase();

    // marcar la letra activa
    lettersDiv.find(".letter-btn").removeClass("activa");
    $(this).addClass("activa");

    paginaActual = 0;

    const url = `${BASE_URL}/api/juegos/categoria/slug/${encodeURIComponent(
      categoriaSlug
    )}/letra/${encodeURIComponent(letra)}?page=0&size=5000`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        juegosFiltradosLetra = data.content || data || [];

        renderPaginaLetra();
        renderPaginacionLetra();
      })
      .catch((err) => {
        console.error("Error cargando juegos por letra:", err);
        $contenedor.html(`<p>Error al cargar juegos.</p>`);
      });
  });
}

async function cargarJuego(id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/juegos/${id}`);
    const juego = await resp.json();

    if (!juego || juego.error) {
      console.error("Juego no encontrado");
      return;
    }

    $("#titulo-juego").text(juego.nombre);
    $("#imagen-juego").attr(
      "src",
      juego.imagen || "imagenes/no-img-available.png"
    );
    $("#descripcion-juego").text(juego.descripcion || "Sin descripción.");
    $("#iframe-juego").attr("src", juego.iframe || "");
  } catch (err) {
    console.error("Error cargando juego:", err);
  }
}
