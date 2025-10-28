$(document).ready(function () {
  const API_JUEGOS = "http://localhost:8080/api/juegos";
  const API_JUEGOS_RANDOM = "http://localhost:8080/api/juegos/random";
  const API_CATEGORIAS = "http://localhost:8080/api/categoria";

  const $contenedor = $("#cards-container");
  const $menu = $("#menu-principal");

  // --- Cargar categorías ---
  function cargarCategorias() {
    $.getJSON(API_CATEGORIAS)
      .done(function (categorias) {
        if (!Array.isArray(categorias) || categorias.length === 0) return;
        const principales = categorias.filter(cat => cat.padreId === null).sort((a,b)=>a.orden-b.orden);
        const secundarias = categorias.filter(cat => cat.padreId !== null);

        principales.forEach(cat => {
          const li = $("<li></li>");
          const a = $('<a href="#"></a>').text(cat.nombre);
          li.append(a);

          const subs = secundarias.filter(sub => sub.padreId === cat.id).sort((a,b)=>a.orden-b.orden);
          if (subs.length > 0) {
            const ulSub = $('<ul class="submenu"></ul>');
            subs.forEach(sub => {
              const liSub = $("<li></li>");
              const aSub = $(`<a href="index.html?categoria=${sub.nombre}&pagina=1"></a>`).text(sub.nombre);
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

  $btnBuscar.on("click", function() {
    if ($campoBusqueda.hasClass("activo")) { 
      buscarJuegos($inputBusqueda.val(), 0);
    } else {
      $campoBusqueda.addClass("activo");
      $inputBusqueda.focus();
    }
  });

  $inputBusqueda.on("keypress", function(e) {
    if (e.key === "Enter") buscarJuegos($inputBusqueda.val(), 0);
  });

  $(document).on("click", (e) => {
    if (!$btnBuscar.is(e.target) && !$campoBusqueda.is(e.target) && $campoBusqueda.has(e.target).length === 0) {
      $campoBusqueda.removeClass("activo");
    }
  });

  function buscarJuegos(termino, pagina) {
    if (!termino || termino.trim() === "") return;
    const url = `${API_JUEGOS}/buscar?nombre=${encodeURIComponent(termino.trim())}&page=${pagina}&size=40`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
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
      .catch(err => console.error("Error en búsqueda:", err));
  }

  // --- Hamburguesa responsive ---
  const $hamburger = $("#hamburger");
  const $navMenu = $("#nav-menu");
  $hamburger.on("click", () => $navMenu.toggleClass("show"));

  // --- Obtener parámetro URL ---
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  const juegoCategoria = getQueryParam("categoria");
  let pagina = parseInt(getQueryParam("pagina")) || 1;

  // --- Renderizar juegos ---
  function renderJuegos(juegos, $contenedor, mensajeVacio) {
    $contenedor.empty();
    if (!juegos || juegos.length === 0) {
      $contenedor.html(`<p>${mensajeVacio}</p>`);
      return;
    }
    juegos.forEach(juego => {
      let imagen = juego.imagen;
      if (!imagen || imagen.trim() === "" || imagen === "null") imagen = "img/no-image.png";
      const cardHtml = `
      <div class="card">
        <a href='juego.html?id=${juego.id}'>
          <img src="${imagen}" alt="${juego.nombre}" onerror="this.src='img/no-image.png'; this.onerror=null;" />
        </a>
        <h3>${juego.nombre} - ${juego.plataforma}</h3>
      </div>`;
      $contenedor.append(cardHtml);
    });
  }

  // --- Cargar juegos ---
  function cargarJuegos(paginaSeleccionada) {
    pagina = paginaSeleccionada + 1;
    let url;
    let paginacionVisible = true;

    if (juegoCategoria) {
      url = `${API_JUEGOS}/categoria/nombre/${encodeURIComponent(juegoCategoria)}?page=${pagina-1}&size=40`;
      paginacionVisible = true;
    } else {
      url = `${API_JUEGOS_RANDOM}?size=20`;
      paginacionVisible = false;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const juegos = data.content || data;
        renderJuegos(juegos, $contenedor, "No hay juegos en esta categoría.");

        const pagDiv = document.getElementById("pagination");
        if (paginacionVisible && data.totalPages) {
          mostrarPaginacion(data.totalPages, pagina-1, cargarJuegos);
          pagDiv.style.display = "flex";
        } else {
          pagDiv.style.display = "none";
        }
      })
      .catch(err => console.error("Error cargando juegos:", err));
  }

  // --- Mostrar paginación ---
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

  

  // --- Inicial ---
  cargarCategorias();
  cargarJuegos(pagina-1);

  // --- PUBLICIDAD DINÁMICA ---
const banners = [
  {
    type: "img",
    src: "imagenes/publicidad1.png",
    url: "https://www.tu-enlace1.com"
  },
  {
    type: "img",
    src: "imagenes/publicidad2.png",
    url: "https://www.tu-enlace2.com"
  },
  {
    type: "adsense", // Banner de prueba de Google
    adClient: "ca-pub-3940256099942544",
    adSlot: "6300978111"
  }
];

let adIndex = 0;
const adSpace = document.getElementById("ad-space");

// Función para crear un div con banner
function crearBanner(banner) {
  const div = document.createElement("div");
  div.style.opacity = 0; // invisible al inicio
  div.style.position = "absolute";
  div.style.top = 0;
  div.style.left = 0;
  div.style.width = "100%";

  if (banner.type === "img") {
    const a = document.createElement("a");
    a.href = banner.url;
    a.target = "_blank";
    const img = document.createElement("img");
    img.src = banner.src;
    img.alt = "Publicidad";
    img.style.width = "100%";
    img.style.borderRadius = "5px";
    a.appendChild(img);
    div.appendChild(a);
  } else if (banner.type === "adsense") {
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    div.appendChild(script1);

    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", banner.adClient);
    ins.setAttribute("data-ad-slot", banner.adSlot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    div.appendChild(ins);

    const script2 = document.createElement("script");
    script2.innerHTML = "(adsbygoogle = window.adsbygoogle || []).push({});";
    div.appendChild(script2);
  }

  return div;
}

// Crear todos los banners y agregarlos al div
const bannerDivs = banners.map(crearBanner);
bannerDivs.forEach(d => adSpace.appendChild(d));

// Función para mostrar un banner con fade
function mostrarBanner(index) {
  bannerDivs.forEach((div, i) => {
    div.style.opacity = (i === index) ? 1 : 0;
  });
}

// Mostrar primer banner
mostrarBanner(adIndex);

// Cambiar banner cada 10 segundos
setInterval(() => {
  adIndex = (adIndex + 1) % banners.length;
  mostrarBanner(adIndex);
}, 10000);

});
