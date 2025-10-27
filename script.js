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

                const principales = categorias
                    .filter(cat => cat.padreId === null)
                    .sort((a, b) => a.orden - b.orden);

                const secundarias = categorias.filter(cat => cat.padreId !== null);

                principales.forEach((cat) => {
                    const li = $("<li></li>");
                    const a = $('<a href="#"></a>').text(cat.nombre);
                    li.append(a);

                    const subs = secundarias
                        .filter(sub => sub.padreId === cat.id)
                        .sort((a, b) => a.orden - b.orden);

                    if (subs.length > 0) {
                        const ulSub = $('<ul class="submenu"></ul>');
                        subs.forEach((sub) => {
                            const liSub = $("<li></li>");
                            const aSub = $('<a href="#"></a>').text(sub.nombre);
                            liSub.append(aSub);
                            ulSub.append(liSub);
                        });
                        li.append(ulSub);
                    }

                    // Insertar antes del botón de búsqueda
                    $menu.find(".buscar").before(li);
                });
            })
            .fail(function () {
                console.error("Error cargando categorías");
            });
    }

    // --- Búsqueda ---
    const $btnBuscar = $("#btn-buscar");
    const $campoBusqueda = $(".campo-busqueda");

    $btnBuscar.on("click", () => {
        $campoBusqueda.toggleClass("activo");
    });

    $(document).on("click", (e) => {
        if (
            !$btnBuscar.is(e.target) &&
            !$campoBusqueda.is(e.target) &&
            $campoBusqueda.has(e.target).length === 0
        ) {
            $campoBusqueda.removeClass("activo");
        }
    });

    // --- HAMBURGUESA ---
    const $hamburger = $("#hamburger");
    const $navMenu = $("#nav-menu");

    $hamburger.on("click", () => {
        $navMenu.toggleClass("show");
    });

    // --- Cargar 20 juegos random ---
    // --- Cargar 20 juegos random ---
fetch(API_JUEGOS_RANDOM)
    .then(response => response.json())
    .then(juegos => {
        $contenedor.empty();
        if (!juegos || juegos.length === 0) {
            $contenedor.html("<p>No hay juegos cargados.</p>");
            return;
        }

        juegos.forEach(juego => {
            // Si no tiene imagen o no es válida, usamos una por defecto
            let imagen = juego.imagen;
            if (!imagen || imagen.trim() === "" || imagen === "null") {
                imagen = "img/no-image.png"; // 👈 poné acá tu imagen por defecto
            }

            const cardHtml = `
                <div class="card">
                    <img src="${imagen}" alt="${juego.nombre}" 
                         onerror="this.src='img/no-image.png'; this.onerror=null;" />
                    <h3>${juego.nombre} - ${juego.plataforma}</h3>
                </div>
            `;
            $contenedor.append(cardHtml);
        });
    })
    .catch(error => console.error("Error cargando juegos:", error));


    // --- Ejecutar carga ---
    cargarCategorias();
});
