/* ================= CONFIGURACIÓN Y VARIABLES ================= */
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0ZWgVHyBlRk_nB1XxGtBMIvTd3wH_Bh9rneYgLQHpmj1JV5vVUOsVyTybUSGPkAqMYhk_55b9OE5B/pub?output=csv&cachebuster=" + Math.random();

const PUBLICIDADES = [
    "img/publicidad/banner1.jpg",
    "img/publicidad/banner2.jpg",
    "img/publicidad/banner3.jpg"
];

let datosPartidos = [];
let categoriaActual = "2013";

/* ================= INICIO ================= */
window.onload = () => {
    cargarDatos();
    iniciarCarrusel();
};

/* ================= POPUP ================= */
window.addEventListener("load", () => {
    const popup = document.getElementById("popup-overlay");
    const closeBtn = document.getElementById("popup-close");
    if (!popup || !closeBtn) return;
    if (sessionStorage.getItem("popupClosed")) {
        popup.style.display = "none";
        return;
    }
    closeBtn.addEventListener("click", () => {
        popup.style.display = "none";
        sessionStorage.setItem("popupClosed", "true");
    });
});

/* ================= BANNER ROTATIVO ================= */
function iniciarCarrusel() {
    let index = 0;
    const imgBanner = document.getElementById("img-banner");
    if (!imgBanner) return;
    setInterval(() => {
        index = (index + 1) % PUBLICIDADES.length;
        imgBanner.style.opacity = 0;
        setTimeout(() => {
            imgBanner.src = PUBLICIDADES[index];
            imgBanner.style.opacity = 1;
        }, 800);
    }, 5000);
}

/* ================= CARGA DE DATOS (CSV) ================= */
async function cargarDatos() {
    try {
        const resp = await fetch(URL_CSV);
        const text = await resp.text();
        datosPartidos = csvToJSON(text);

        // Actualizar fecha de actualización si existe la columna
        if (datosPartidos.length > 0 && datosPartidos[0]["Actualizacion"]) {
            const fechaEl = document.getElementById('fecha-actualizacion');
            if (fechaEl) fechaEl.innerText = "Actualizado: " + datosPartidos[0]["Actualizacion"];
        }

        document.getElementById("loading").style.display = "none";
        actualizarVista();
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

function csvToJSON(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || "";
        });
        result.push(obj);
    }
    return result;
}

/* ================= LÓGICA DE FILTRADO ================= */
function esEquipoReal(nombre) {
    if (!nombre) return false;
    const n = nombre.toLowerCase();
    return !n.includes('libre') && n.trim() !== "";
}

function seleccionarCat(cat) {
    categoriaActual = cat;
    const botones = document.querySelectorAll('#menu-categorias button');
    botones.forEach(btn => {
        btn.classList.remove('activo');
        if (btn.innerText === cat) btn.classList.add('activo');
    });
    actualizarVista();
}

function actualizarVista() {
    const titulo = document.getElementById("titulo-tabla");
    if (titulo) titulo.innerText = "Tabla de Posiciones " + categoriaActual;

    const torneoEl = document.getElementById('select-torneo');
    const torneo = torneoEl ? torneoEl.value : "Apertura";

    generarTabla(categoriaActual, torneo);
    generarFixture(categoriaActual, torneo);
}

/* ================= GENERAR TABLA DE POSICIONES ================= */
function generarTabla(cat, torneo) {
    let tabla = {};
    
    // 1. Identificar equipos reales en la categoría
    datosPartidos.filter(p => p.Categoria === cat).forEach(p => {
        if (esEquipoReal(p.Local) && !tabla[p.Local]) 
            tabla[p.Local] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
        if (esEquipoReal(p.Visitante) && !tabla[p.Visitante]) 
            tabla[p.Visitante] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
    });

    // 2. Procesar partidos jugados
    const partidosJugados = datosPartidos.filter(p => 
        p.Categoria === cat && 
        (torneo === "Anual" ? (p.Torneo === "Apertura" || p.Torneo === "Clausura") : p.Torneo === torneo) &&
        p.Estado === "Jugado"
    );

    partidosJugados.forEach(p => {
        if (esEquipoReal(p.Local) && esEquipoReal(p.Visitante)) {
            const gl = parseInt(p.Goles_L) || 0;
            const gv = parseInt(p.Goles_V) || 0;
            tabla[p.Local].pj++; tabla[p.Visitante].pj++;
            tabla[p.Local].gf += gl; tabla[p.Local].gc += gv;
            tabla[p.Visitante].gf += gv; tabla[p.Visitante].gc += gl;

            if (gl > gv) { tabla[p.Local].pg++; tabla[p.Local].pts += 3; tabla[p.Visitante].pp++; }
            else if (gl < gv) { tabla[p.Visitante].pg++; tabla[p.Visitante].pts += 3; tabla[p.Local].pp++; }
            else { tabla[p.Local].pe++; tabla[p.Visitante].pe++; tabla[p.Local].pts += 1; tabla[p.Visitante].pts += 1; }
        }
    });

    const ranking = Object.keys(tabla).map(nombre => ({
        nombre, ...tabla[nombre], dg: tabla[nombre].gf - tabla[nombre].gc
    })).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

    dibujarTabla(ranking);
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('body-tabla');
    if (!tbody) return;
    
    tbody.innerHTML = datos.map((club, i) => {
        const dgSigno = club.dg > 0 ? '+' + club.dg : club.dg;
        return `
        <tr>
            <td>${i+1}</td>
            <td class="escudo-td">
                <img src="img/escudos/${club.nombre}.png" onerror="this.src='img/escudos/default.png'"> 
                <span>${club.nombre}</span>
            </td>
            <td>${club.pj}</td><td>${club.pg}</td><td>${club.pe}</td><td>${club.pp}</td>
            <td>${club.gf}</td><td>${club.gc}</td>
            <td class="${club.dg > 0 ? 'dg-positiva' : 'dg-negativa'}">${dgSigno}</td>
            <td><strong>${club.pts}</strong></td>
        </tr>`;
    }).join('');
}

/* ================= GENERAR FIXTURE ================= */
function generarFixture(cat, torneo) {
    const contenedor = document.getElementById('lista-partidos');
    if (!contenedor) return;
    
    const partidos = datosPartidos.filter(p => p.Categoria === cat && p.Torneo === torneo);
    
    contenedor.innerHTML = partidos.map(p => {
        const esLibreLocal = !esEquipoReal(p.Local);
        const esLibreVisitante = !esEquipoReal(p.Visitante);
        const esFechaLibre = esLibreLocal || esLibreVisitante;

        return `
        <div class="partido-card">
            <small>Fecha ${p.Fecha || '-'}</small>
            <div class="fixture-fila">
                <div class="equipo-col" style="${esLibreLocal ? 'justify-content:center; width:100%' : ''}">
                    ${!esLibreLocal ? `<img src="img/escudos/${p.Local}.png" class="escudo-fixture" onerror="this.src='img/escudos/default.png'">` : ''}
                    <span class="equipo-nombre ${esLibreLocal ? 'texto-libre' : ''}">${esLibreLocal ? 'FECHA LIBRE' : p.Local}</span>
                </div>
                ${!esFechaLibre ? `
                <div class="resultado-col">
                    <span>${p.Goles_L || '-'}</span> vs <span>${p.Goles_V || '-'}</span>
                </div>` : ''}
                <div class="equipo-col" style="${esLibreVisitante ? 'justify-content:center; width:100%' : ''}">
                    <span class="equipo-nombre ${esLibreVisitante ? 'texto-libre' : ''}">${esLibreVisitante ? 'FECHA LIBRE' : p.Visitante}</span>
                    ${!esLibreVisitante ? `<img src="img/escudos/${p.Visitante}.png" class="escudo-fixture" onerror="this.src='img/escudos/default.png'">` : ''}
                </div>
            </div>
            ${!esFechaLibre ? `<small style="color: ${p.Estado === 'Jugado' ? 'green' : 'orange'}">${p.Estado}</small>` : ''}
        </div>`;
    }).join('') || '<p>No hay partidos programados</p>';
}

/* ================= TABLA ACUMULADA ================= */
function mostrarAcumuladoClubes() {
    let acumulado = {};
    datosPartidos.forEach(p => {
        if (esEquipoReal(p.Local)) {
            if (!acumulado[p.Local]) acumulado[p.Local] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
        }
        if (esEquipoReal(p.Visitante)) {
            if (!acumulado[p.Visitante]) acumulado[p.Visitante] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
        }
    });

    datosPartidos.filter(p => p.Estado === "Jugado").forEach(p => {
        if (esEquipoReal(p.Local) && esEquipoReal(p.Visitante)) {
            const gl = parseInt(p.Goles_L) || 0;
            const gv = parseInt(p.Goles_V) || 0;
            acumulado[p.Local].pj++; acumulado[p.Visitante].pj++;
            acumulado[p.Local].gf += gl; acumulado[p.Local].gc += gv;
            acumulado[p.Visitante].gf += gv; acumulado[p.Visitante].gc += gl;
            if (gl > gv) { acumulado[p.Local].pg++; acumulado[p.Local].pts += 3; acumulado[p.Visitante].pp++; }
            else if (gl < gv) { acumulado[p.Visitante].pg++; acumulado[p.Visitante].pts += 3; acumulado[p.Local].pp++; }
            else { acumulado[p.Local].pe++; acumulado[p.Visitante].pe++; acumulado[p.Local].pts += 1; acumulado[p.Visitante].pts += 1; }
        }
    });

    const ranking = Object.keys(acumulado).map(nombre => ({
        nombre, ...acumulado[nombre], dg: acumulado[nombre].gf - acumulado[nombre].gc
    })).sort((a, b) => b.pts - a.pts || b.dg - a.dg);

    const titulo = document.getElementById('titulo-tabla');
    if (titulo) titulo.innerText = "Tabla General Acumulada (Todas las Cat.)";
    dibujarTabla(ranking);
}
