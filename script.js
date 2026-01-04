const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0ZWgVHyBlRk_nB1XxGtBMIvTd3wH_Bh9rneYgLQHpmj1JV5vVUOsVyTybUSGPkAqMYhk_55b9OE5B/pub?output=csv";

// Agrega aquí todos los banners que quieras
const PUBLICIDADES = [
    "img/publicidad/banner1.jpg",
    "img/publicidad/banner2.jpg",
    "img/publicidad/banner3.jpg",
 ];

let datosPartidos = [];
let categoriaActual = "2013";

window.onload = () => {
    cargarDatos();
    iniciarCarrusel();
};

function iniciarCarrusel() {
    let index = 0;
    const imgBanner = document.getElementById('img-banner');
    if (PUBLICIDADES.length > 1) {
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
        document.getElementById('loading').style.display = 'none';
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
    document.querySelectorAll('#menu-categorias button').forEach(btn => btn.classList.remove('activo'));
    event.target.classList.add('activo');
    actualizarVista();
}

function actualizarVista() {
    const torneo = document.getElementById('select-torneo').value;
    generarTabla(categoriaActual, torneo);
    generarFixture(categoriaActual, torneo);
}

function generarTabla(cat, torneo) {
    let tabla = {};
    const partidosFiltrados = datosPartidos.filter(p => 
        p.Categoria === cat && 
        (torneo === "Anual" ? (p.Torneo === "Apertura" || p.Torneo === "Clausura") : p.Torneo === torneo) &&
        p.Estado === "Jugado"
    );

    partidosFiltrados.forEach(p => {
        const gl = parseInt(p.Goles_L) || 0;
        const gv = parseInt(p.Goles_V) || 0;
        if (!tabla[p.Local]) tabla[p.Local] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
        if (!tabla[p.Visitante]) tabla[p.Visitante] = { pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };

        tabla[p.Local].pj++; tabla[p.Visitante].pj++;
        tabla[p.Local].gf += gl; tabla[p.Local].gc += gv;
        tabla[p.Visitante].gf += gv; tabla[p.Visitante].gc += gl;

        if (gl > gv) { tabla[p.Local].pg++; tabla[p.Local].pts += 3; tabla[p.Visitante].pp++; }
        else if (gl < gv) { tabla[p.Visitante].pg++; tabla[p.Visitante].pts += 3; tabla[p.Local].pp++; }
        else { tabla[p.Local].pe++; tabla[p.Visitante].pe++; tabla[p.Local].pts += 1; tabla[p.Visitante].pts += 1; }
    });

    const ranking = Object.keys(tabla).map(nombre => ({
        nombre, ...tabla[nombre], dg: tabla[nombre].gf - tabla[nombre].gc
    })).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

    dibujarTabla(ranking);
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('body-tabla');
    const thead = document.querySelector('#tabla-posiciones thead');
    thead.innerHTML = `<tr><th>Pos</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>`;
    tbody.innerHTML = datos.map((club, i) => `
        <tr>
            <td>${i+1}</td>
            <td class="escudo-td"><img src="img/escudos/${club.nombre}.png" onerror="this.src='img/escudos/default.png'"> ${club.nombre}</td>
            <td>${club.pj}</td><td>${club.pg}</td><td>${club.pe}</td><td>${club.pp}</td>
            <td>${club.gf}</td><td>${club.gc}</td><td>${club.dg > 0 ? '+'+club.dg : club.dg}</td><td><b>${club.pts}</b></td>
        </tr>
    `).join('');
}

function mostrarAcumuladoClubes() {
    let acumulado = {};
    datosPartidos.filter(p => p.Estado === "Jugado").forEach(p => {
        const gl = parseInt(p.Goles_L) || 0;
        const gv = parseInt(p.Goles_V) || 0;
        if (!acumulado[p.Local]) acumulado[p.Local] = { pts: 0 };
        if (!acumulado[p.Visitante]) acumulado[p.Visitante] = { pts: 0 };
        if (gl > gv) acumulado[p.Local].pts += 3;
        else if (gl < gv) acumulado[p.Visitante].pts += 3;
        else { acumulado[p.Local].pts += 1; acumulado[p.Visitante].pts += 1; }
    });
    const ranking = Object.keys(acumulado).map(nombre => ({ nombre, pts: acumulado[nombre].pts })).sort((a, b) => b.pts - a.pts);
    document.getElementById('titulo-tabla').innerText = "Tabla General de Clubes";
    const tbody = document.getElementById('body-tabla');
    const thead = document.querySelector('#tabla-posiciones thead');
    thead.innerHTML = `<tr><th>Pos</th><th>Club</th><th>Puntos Totales</th></tr>`;
    tbody.innerHTML = ranking.map((club, i) => `<tr><td>${i+1}</td><td>${club.nombre}</td><td><b>${club.pts}</b></td></tr>`).join('');
}

function generarFixture(cat, torneo) {
    const contenedor = document.getElementById('lista-partidos');
    const partidos = datosPartidos.filter(p => p.Categoria === cat && p.Torneo === torneo);
    contenedor.innerHTML = partidos.map(p => `
        <div class="partido-card">
            <span class="equipo-nombre">${p.Local}</span>
            <span class="resultado-nro">${p.Goles_L || '-'}</span>
            <span>vs</span>
            <span class="resultado-nro">${p.Goles_V || '-'}</span>
            <span class="equipo-nombre">${p.Visitante}</span>
        </div>
    `).join('') || '<p>No hay partidos programados</p>';
}
