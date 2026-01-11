const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0ZWgVHyBlRk_nB1XxGtBMIvTd3wH_Bh9rneYgLQHpmj1JV5vVUOsVyTybUSGPkAqMYhk_55b9OE5B/pub?output=csv&cachebuster=" + Math.random();

const PUBLICIDADES = [
    "img/publicidad/banner1.jpg",
    "img/publicidad/banner2.jpg",
    "img/publicidad/banner3.jpg"
];

let datosPartidos = [];
let categoriaActual = "2013";

window.addEventListener("load", () => {
    cargarDatos();
    iniciarCarrusel();
});




function iniciarCarrusel() {
    let index = 0;
    const imgBanner = document.getElementById('img-banner');
    if (imgBanner && PUBLICIDADES.length > 1) {
        setInterval(() => {
            index = (index + 1) % PUBLICIDADES.length;
            imgBanner.style.opacity = 0;
            setTimeout(() => {
                imgBanner.src = PUBLICIDADES[index];
                imgBanner.style.opacity = 1;
            }, 800);
        }, 5000);
    }
}

async function cargarDatos() {
    try {
        const respuesta = await fetch(URL_CSV);
        const texto = await respuesta.text();
        datosPartidos = csvToJSON(texto);
        
        if (datosPartidos.length > 0) {
            const fechaManual = datosPartidos[0]["Actualizacion"];
            if (fechaManual) document.getElementById('fecha-actualizacion').innerText = "Actualizado: " + fechaManual;
        }

        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
        actualizarVista();
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

function csvToJSON(csv) {
    const lineas = csv.split('\n');
    const resultado = [];
    const cabeceras = lineas[0].split(',');
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        const obj = {};
        const filaActual = lineas[i].split(',');
        cabeceras.forEach((header, index) => {
            obj[header.trim()] = filaActual[index]?.trim();
        });
        resultado.push(obj);
    }
    return resultado;
}

function seleccionarCat(anio) {
    categoriaActual = anio;
    const botones = document.querySelectorAll('#menu-categorias button');
    botones.forEach(btn => btn.classList.remove('activo'));
    if (event && event.target) event.target.classList.add('activo');
    actualizarVista();
}

function actualizarVista() {
    const torneoEl = document.getElementById('select-torneo');
    const torneo = torneoEl ? torneoEl.value : "Apertura";
    document.getElementById('titulo-tabla').innerText = "Tabla de Posiciones";
    generarTabla(categoriaActual, torneo);
    generarFixture(categoriaActual, torneo);
}

// FUNCION PARA VALIDAR SI UN NOMBRE ES EQUIPO REAL O FECHA LIBRE
function esEquipoReal(nombre) {
    if (!nombre) return false;
    const n = nombre.toLowerCase();
    return !n.includes('libre') && n.trim() !== "";
}

function generarTabla(cat, torneo) {
    let tabla = {};
    
    // 1. Identificar clubes REALES
    datosPartidos.filter(p => p.Categoria === cat).forEach(p => {
        if (esEquipoReal(p.Local)) {
            if (!tabla[p.Local]) tabla[p.Local] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
        }
        if (esEquipoReal(p.Visitante)) {
            if (!tabla[p.Visitante]) tabla[p.Visitante] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
        }
    });

    // 2. Procesar partidos
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
    const thead = document.querySelector('#tabla-posiciones thead');
    if (!tbody || !thead) return;

    thead.innerHTML = `<tr><th>Pos</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr>`;
    
    tbody.innerHTML = datos.map((club, i) => {
        const dgClass = club.dg > 0 ? 'dg-positiva' : (club.dg < 0 ? 'dg-negativa' : '');
        const dgSigno = club.dg > 0 ? '+' + club.dg : club.dg;

        return `
        <tr>
            <td>${i+1}</td>
            <td class="escudo-td">
                <img src="img/escudos/${club.nombre}.png" onerror="this.src='img/escudos/default.png'"> 
                <span>${club.nombre}</span>
            </td>
            <td>${club.pj}</td>
            <td>${club.pg}</td>
            <td>${club.pe}</td>
            <td>${club.pp}</td>
            <td>${club.gf}</td>
            <td>${club.gc}</td>
            <td class="${dgClass}">${dgSigno}</td>
            <td><strong>${club.pts}</strong></td>
        </tr>`;
    }).join('');
}

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

    document.getElementById('titulo-tabla').innerText = "Tabla General Acumulada (Todas las Cat.)";
    dibujarTabla(ranking);
}



function generarFixture(cat, torneo) {
    const contenedor = document.getElementById('lista-partidos');
    if (!contenedor) return;
    
    const partidos = datosPartidos.filter(p => p.Categoria === cat && p.Torneo === torneo);
    
    contenedor.innerHTML = partidos.map(p => {
        const esLibreLocal = !esEquipoReal(p.Local);
        const esLibreVisitante = !esEquipoReal(p.Visitante);
        const esFechaLibre = esLibreLocal || esLibreVisitante;

        const nombreLocal = esLibreLocal ? "FECHA LIBRE" : p.Local;
        const nombreVisita = esLibreVisitante ? "FECHA LIBRE" : p.Visitante;
        
        const claseLocal = esLibreLocal ? "texto-libre" : "";
        const claseVisita = esLibreVisitante ? "texto-libre" : "";

        // Si es libre, no mostramos imagen (src vacío y estilo oculto)
        const imgLocal = esLibreLocal ? "" : `img/escudos/${p.Local}.png`;
        const imgVisita = esLibreVisitante ? "" : `img/escudos/${p.Visitante}.png`;
        
        const styleImgLocal = esLibreLocal ? "display:none" : "";
        const styleImgVisita = esLibreVisitante ? "display:none" : "";

        return `
        <div class="partido-card">
            <small>Fecha ${p.Fecha || '-'}</small>
            <div class="fixture-fila">
                <div class="equipo-col" style="${esLibreLocal ? 'justify-content:center; width:100%' : ''}">
                    <img src="${imgLocal}" onerror="this.src='img/escudos/default.png'" class="escudo-fixture" style="${styleImgLocal}">
                    <span class="equipo-nombre ${claseLocal}">${nombreLocal}</span>
                </div>
                
                ${!esFechaLibre ? `
                <div class="resultado-col">
                    <span class="resultado-nro">${p.Goles_L || '-'}</span>
                    <span class="vs">vs</span>
                    <span class="resultado-nro">${p.Goles_V || '-'}</span>
                </div>
                ` : ''}

                <div class="equipo-col" style="${esLibreVisitante ? 'justify-content:center; width:100%' : ''}">
                    <span class="equipo-nombre ${claseVisita}">${nombreVisita}</span>
                    <img src="${imgVisita}" onerror="this.src='img/escudos/default.png'" class="escudo-fixture" style="${styleImgVisita}">
                </div>
            </div>
            ${!esFechaLibre ? `<small style="color: ${p.Estado === 'Jugado' ? 'green' : 'orange'}">${p.Estado}</small>` : ''}
        </div>`;
    }).join('') || '<p>No hay partidos programados</p>';
}
