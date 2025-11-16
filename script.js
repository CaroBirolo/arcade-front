/*
arreglar la tarjeta del juego cuando se hace una busqueda y solo muestra 1 se ve raro
la base readonly y cors
otro banner
*/

const BASE_URL = "https://retroarcade-api.contactoretroverse.workers.dev";
const API_JUEGOS =
  "https://retroarcade-api.contactoretroverse.workers.dev/api/juegos";
const API_JUEGOS_RANDOM =
  "https://retroarcade-api.contactoretroverse.workers.dev/api/juegos/random";
const API_CATEGORIAS =
  "https://retroarcade-api.contactoretroverse.workers.dev/api/categorias";

const $contenedor = $("#cards-container");
const $menu = $("#menu-principal");
const lettersDiv = $("#letters");
const $btnBuscar = $("#btn-buscar");
const $campoBusqueda = $(".campo-busqueda");
const $inputBusqueda = $campoBusqueda.find("input");
const $hamburger = $("#hamburger");
const $navMenu = $("#nav-menu");
$hamburger.on("click", () => $navMenu.toggleClass("show"));

function initBusqueda() {
  const params = new URLSearchParams(window.location.search);
  const terminoBusqueda = params.get("buscar");

  if (terminoBusqueda) {
    buscarJuegos(terminoBusqueda, 0);
  } else {
    cargarJuegos(0);
  }
}

function InitSeccionBusqueda() {
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
  window.document.location = `index.html?buscar=${termino}`;
}

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
        let a = null;

        if (
          cat.padre_id == null &&
          !secundarias.find((sec) => sec.padre_id == cat.id)
        ) {
          a = $(`<a href="index.html?categoria=${cat.id}">${cat.nombre}</a>`);
        } else {
          a = $(`<a href="javascript:void(0)">${cat.nombre}</a>`);
        }

        li.append(a);

        const subs = secundarias
          .filter((sub) => sub.padre_id === cat.id)
          .sort((a, b) => a.orden - b.orden);

        if (subs.length > 0) {
          const ulSub = $('<ul class="submenu"></ul>');
          subs.forEach((sub) => {
            const liSub = $("<li></li>");
            const aSub = $(
              `<a href="index.html?categoria=${sub.id}">${sub.nombre}</a>`
            );
            liSub.append(aSub);
            ulSub.append(liSub);
          });
          li.append(ulSub);
        }

        $menu.find(".buscar").before(li);
      });

      const catId = getQueryParam("categoria");
      if (catId) {
        $("#titulo").html(categorias.find((cat) => cat.id == catId).nombre);
      } else {
        $("#titulo").html("-- P o p u l a r - G a m e s --");
      }
    })
    .fail(() => console.error("Error cargando categorías"));
}

function buscarJuegos(termino, pagina) {
  if (!termino || termino.trim() === "") return;

  const url = `${API_JUEGOS}/buscar?nombre=${encodeURIComponent(
    termino.trim()
  )}&page=${pagina}&size=40`;

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
    if (!imagen || imagen.trim() === "" || imagen === "null")
      imagen = "img/no-image.png";

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

  inicializarFiltroLetras(); // ahora se inicializa SIEMPRE después de renderizar juegos
}

function cargarJuegos(paginaSeleccionada) {
  let pagina = paginaSeleccionada + 1;
  let url;
  let paginacionVisible = true;

  const juegoCategoria = new URLSearchParams(window.location.search).get(
    "categoria"
  );

  if (juegoCategoria) {
    url = `${API_JUEGOS}/categoria/${juegoCategoria}?page=${
      pagina - 1
    }&size=40`;
  } else {
    url = `${API_JUEGOS_RANDOM}?size=40&noCache=${Date.now()}`;
    paginacionVisible = false;
  }

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const juegos = Array.isArray(data) ? data : data.content || [];
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

function inicializarFiltroLetras() {
  const categoria = new URLSearchParams(window.location.search).get(
    "categoria"
  );
  if (!categoria) {
    lettersDiv.hide();
    return;
  }
  lettersDiv.show();

  // Crear botones una sola vez
  if (!lettersDiv.children().length) {
    const letters = ["#"].concat(
      Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
    );
    letters.forEach((letter) => {
      lettersDiv.append(`<button class="letter-btn">${letter}</button>`);
    });
  }

  let juegosFiltradosLetra = []; // ⭐ guardamos el array filtrado
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

  lettersDiv.off("click");

  lettersDiv.on("click", ".letter-btn", function () {
    const letra = $(this).text().toUpperCase();

    lettersDiv.find(".letter-btn").removeClass("activa");
    $(this).addClass("activa");

    // Reiniciamos página
    paginaActual = 0;

    // Fetch juegos por letra (sin paginación del back)
    const url = `${BASE_URL}/api/juegos/categoria/id/${encodeURIComponent(
      categoria
    )}/letra/${encodeURIComponent(letra)}?page=0&size=5000`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        juegosFiltradosLetra = data.content || data || [];

        renderPaginaLetra();
        renderPaginacionLetra(); // ⭐ ahora la paginación usa los juegos filtrados
      })
      .catch((err) => {
        console.error("Error cargando juegos por letra:", err);
        $contenedor.html(`<p>Error al cargar juegos.</p>`);
      });
  });
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
