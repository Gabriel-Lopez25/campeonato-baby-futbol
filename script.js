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

/* ================= DATOS ================= */
const URL_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0ZWgVHyBlRk_nB1XxGtBMIvTd3wH_Bh9rneYgLQHpmj1JV5vVUOsVyTybUSGPkAqMYhk_55b9OE5B/pub?output=csv&cachebuster=" +
  Math.random();

const PUBLICIDADES = [
  "img/publicidad/banner1.jpg",
  "img/publicidad/banner2.jpg",
  "img/publicidad/banner3.jpg"
];

let datosPartidos = [];
let categoriaActual = "2013";

window.onload = () => {
  cargarDatos();
  iniciarCarrusel();
};

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

/* ================= CSV ================= */
async function cargarDatos() {
  const resp = await fetch(URL_CSV);
  const text = await resp.text();
  datosPartidos = csvToJSON(text);

  document.getElementById("loading").style.display = "none";
  actualizarVista();
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


/* ================= LÓGICA ================= */
function seleccionarCat(cat) {
  categoriaActual = cat;
  actualizarVista();
}

function actualizarVista() {
  document.getElementById("titulo-tabla").innerText =
    "Tabla de Posiciones " + categoriaActual;
}
