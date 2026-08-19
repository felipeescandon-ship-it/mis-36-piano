/*
 * Ejercita la app de punta a punta en un navegador real y reporta lo que se
 * rompe.
 *
 *   node scripts/smoke-test.mjs
 *
 * Existe porque check-sintaxis.mjs y diagnostico-audio-phase2.html, entre los
 * dos, no atraparon dos bugs reales: un textarea que nacía deshabilitado y
 * nunca se habilitaba, y una letra editada que se guardaba y se perdía al
 * recargar. Los dos parseaban perfecto y los dos sonaban perfecto — hacía
 * falta abrir la app y tocarla. Este script es esa mano, agarrada una vez y
 * dejada corriendo.
 *
 * No es exhaustivo. Es la red que hubiera atrapado lo que ya se rompió, más
 * las áreas más nuevas y menos ejercitadas (edición, práctica, importación).
 * Cuando aparezca un bug nuevo que esto no vio, el lugar para arreglarlo es
 * agregarle un paso, no descartar el script.
 *
 * Requiere Playwright (`npm i -D playwright && npx playwright install
 * chromium`, una vez). Si no está disponible, lo dice y sale con código 1 en
 * vez de fallar con un stack trace de import.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 8642;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch (error) {
  console.error("Playwright no está instalado. Corré: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

// --- Servidor estático mínimo, sin dependencias -----------------------------

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".css": "text/css" };

function servirEstatico() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = req.url.split("?")[0];
      const archivo = path.join(RAIZ, decodeURIComponent(url === "/" ? "/index.html" : url));
      if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
        res.writeHead(404);
        return res.end("no");
      }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
      fs.createReadStream(archivo).pipe(res);
    });
    server.listen(PUERTO, () => resolve(server));
  });
}

// --- Recolección de fallos ---------------------------------------------------

const fallos = [];
let pasos = 0;

// Sin red real ni funciones de API detrás (esto no es Vercel), /api/* da 404 y
// la fuente de Google Fonts no resuelve. Los dos imprimen un "Failed to load
// resource" genérico que NO lleva la URL en el texto del mensaje de consola —
// sólo en el evento de red — así que no hay forma confiable de filtrarlo por
// texto sin arriesgar falsos negativos. Se lo ignora entero: la señal real de
// que algo se rompió son las excepciones (siempre fuertes) y las aserciones
// explícitas de cada paso, no un recurso que no cargó en un entorno sin su API.
function instalarCaptura(page) {
  page.on("pageerror", e => fallos.push(`EXCEPCIÓN: ${e.message}`));
  page.on("console", m => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource/.test(t)) return;
    if (/googleapis\.com|ERR_CONNECTION_RESET/.test(t)) return;
    fallos.push(`console.error: ${t.slice(0, 200)}`);
  });
}

async function paso(nombre, fn) {
  pasos++;
  const antes = fallos.length;
  try {
    await fn();
  } catch (error) {
    fallos.push(`NO SE PUDO — ${nombre}: ${error.message.split("\n")[0]}`);
  }
  const nuevos = fallos.slice(antes);
  console.log((nuevos.length ? "✗ " : "· ") + nombre);
  nuevos.forEach(f => console.log("    " + f));
}

// Aserción explícita: un paso que no lanza pero deja la app en un estado
// incorrecto (el bug del textarea deshabilitado, por ejemplo) no se nota si
// sólo se mira si hubo excepciones. Esto lo vuelve un fallo del mismo tipo.
function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

// --- El recorrido -------------------------------------------------------------

async function recorrido(page) {
  await page.goto(`http://127.0.0.1:${PUERTO}/index.html`, { waitUntil: "load" });
  await page.waitForTimeout(2000);

  console.log("\n═══ Cancionero ═══");
  await paso("listar canciones", async () => {
    const n = await page.locator("#songList .song-tab:not(.song-tab-add)").count();
    afirmar(n >= 1, "el cancionero no muestra ninguna canción");
  });
  await paso("abrir la primera canción", async () => {
    await page.locator("#songList .song-tab:not(.song-tab-add)").first().click({ timeout: 4000 });
  });

  console.log("\n═══ Tocar: subvistas ═══");
  await paso("ir a Tocar", () => page.locator("#navTocar").click({ timeout: 4000 }));
  for (const [id, nombre] of [["pianoViewButton", "Teclado"], ["lyricsViewButton", "Acordes y letra"], ["structureViewButton", "Estructura"]]) {
    await paso("subvista " + nombre, () => page.locator("#" + id).click({ timeout: 4000 }));
  }

  console.log("\n═══ Tocar: transporte ═══");
  // Reproducir y detener se prueban aislados: encadenar next/prev en el medio
  // no sirve para esto porque saltar al final de una canción corta frena el
  // transporte solo, y eso no es un bug — es la canción terminándose.
  await paso("reproducir habilita detener", async () => {
    await page.locator("#auto").click({ timeout: 4000 });
    await page.waitForTimeout(300);
    afirmar(!(await page.locator("#stop").isDisabled()), "#stop sigue deshabilitado con la canción sonando");
  });
  await paso("detener deshabilita detener", async () => {
    await page.locator("#stop").click({ timeout: 4000 });
    await page.waitForTimeout(200);
    afirmar(await page.locator("#stop").isDisabled(), "#stop sigue habilitado después de detener");
  });
  await paso("siguiente acorde", () => page.locator("#next").click({ timeout: 4000 }));
  await paso("acorde anterior", () => page.locator("#prev").click({ timeout: 4000 }));
  await paso("escuchar acorde suelto", () => page.locator("#sound").click({ timeout: 4000 }));
  await paso("practicar cambio (bucle)", async () => {
    await page.locator("#transitionLoop").click({ timeout: 4000 });
    await page.waitForTimeout(1500);
    await page.locator("#stop").click({ timeout: 4000 }).catch(() => {});
  });
  await paso("alternar 2.º piano", () => page.locator("#nextPianoToggle").click({ timeout: 4000 }));
  await paso("ir al inicio de la sección", () => page.locator("#goSectionStart").click({ timeout: 4000 }));

  console.log("\n═══ Editor de acordes y letra ═══");
  await paso("abrir editor", () => page.locator("#openEditor").click({ timeout: 4000 }));
  await paso("seleccionar un acorde", async () => {
    const n = await page.locator(".song-chord").count();
    afirmar(n > 0, "no hay acordes .song-chord para seleccionar");
    await page.locator(".song-chord").first().click({ timeout: 4000 });
  });
  // Regresión directa del bug #1: el textarea nacía disabled y nadie lo
  // habilitaba al seleccionar un acorde.
  await paso("el editor de letra queda habilitado", async () => {
    afirmar(!(await page.locator("#syncLyricTextarea").isDisabled()),
      "#syncLyricTextarea sigue deshabilitado con un acorde seleccionado");
  });

  const MARCA = "línea de prueba del smoke test " + Date.now();
  await paso("editar la letra", async () => {
    await page.locator("#syncLyricTextarea").fill(MARCA);
    await page.locator("#syncLyricTextarea").dispatchEvent("change");
    await page.waitForTimeout(300);
  });
  await paso("las palabras ancla se recalculan", async () => {
    const n = await page.locator(".sync-anchor-word").count();
    afirmar(n === MARCA.split(" ").length, `hay ${n} palabras ancla, se esperaban ${MARCA.split(" ").length}`);
  });
  await paso("elegir otra palabra ancla", () => page.locator(".sync-anchor-word").last().click({ timeout: 4000 }));
  await paso("cambiar inversión", () => page.locator("#syncInversion").selectOption({ index: 1 }));
  await paso("cambiar tiempos", () => page.locator("#syncBeats").selectOption({ index: 0 }));

  // Regresión directa del bug #2: la letra se guardaba en localStorage pero
  // applyFullDocument no la releía para una sección con semilla.
  await paso("la letra editada persiste tras recargar", async () => {
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.locator("#songList .song-tab:not(.song-tab-add)").first().click({ timeout: 4000 });
    await page.locator("#navTocar").click({ timeout: 4000 });
    await page.locator("#lyricsViewButton").click({ timeout: 4000 });
    await page.waitForTimeout(400);
    const texto = await page.evaluate(() => document.body.innerText);
    afirmar(MARCA.split(" ").every(palabra => texto.includes(palabra)),
      "la letra editada no aparece tras recargar (¿volvió a la de la semilla?)");
  });

  console.log("\n═══ Practicar ═══");
  await paso("ir a Practicar", () => page.locator("#navPracticar").click({ timeout: 4000 }));
  await paso("elegir una transición", async () => {
    const opciones = await page.locator("#practiceTransitionSelect option").count();
    afirmar(opciones > 0, "el selector de transiciones está vacío");
    await page.locator("#practiceTransitionSelect").selectOption({ index: 0 });
  });
  await paso("comenzar a practicar", async () => {
    await page.locator("#practiceStart").click({ timeout: 4000 });
    await page.waitForTimeout(300);
    afirmar(!(await page.locator("#practiceGuide").isHidden()), "#practiceGuide no se muestra tras Comenzar");
  });
  await page.waitForTimeout(2000);
  await paso("cerrar la práctica", () => page.locator("#practiceClose").click({ timeout: 4000 }));
  await paso("practicar la canción completa a tempo reducido", async () => {
    await page.locator("#practiceFullSongButton").click({ timeout: 4000 });
    await page.waitForTimeout(1500);
  });

  console.log("\n═══ Importar canción ═══");
  // El tab "＋ Nueva canción" sólo existe en la pantalla Cancionero; los pasos
  // anteriores (Practicar) dejaron la app en otra pantalla.
  await paso("ir a Cancionero", () => page.locator("#navCancionero").click({ timeout: 4000 }));
  await paso("abrir Nueva canción", () => page.locator(".song-tab-add").click({ timeout: 4000 }));
  await paso("pegar letra y acordes", async () => {
    await page.locator("#importTitle").fill("Canción de prueba " + Date.now());
    await page.locator("#importText").fill("[Estrofa]\nC          G          Am         F\nUna línea de prueba con acordes arriba\n");
  });
  await paso("analizar", async () => {
    await page.locator("#importAnalyze").click({ timeout: 4000 });
    await page.waitForTimeout(300);
    afirmar(!(await page.locator("#importPreview").isHidden()), "el análisis no mostró vista previa");
    afirmar(!(await page.locator("#importSave").isDisabled()), "Guardar sigue deshabilitado tras analizar");
  });
  await paso("guardar la canción importada", async () => {
    await page.locator("#importSave").click({ timeout: 4000 });
    await page.waitForTimeout(500);
  });
  await paso("la canción importada aparece en el cancionero", async () => {
    await page.locator("#navCancionero").click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    const n = await page.locator("#songList .song-tab:not(.song-tab-add)").count();
    afirmar(n >= 2, "el cancionero no creció tras importar");
  });

  console.log("\n═══ Biblioteca y nube ═══");
  await paso("abrir panel de Biblioteca", () => page.locator("#libraryToggle").click({ timeout: 4000 }));
  await paso("botón sincronizar no revienta sin red", async () => {
    await page.locator("#cloudSyncNow").click({ timeout: 4000 });
    await page.waitForTimeout(500);
    // Sin API detrás, tiene que fallar con un mensaje de estado, no con una
    // excepción — eso ya lo captura instalarCaptura() en pageerror.
  });
  await paso("abrir menú de exportar/importar", () => page.locator("#dataMenuToggle").click({ timeout: 4000 }));
  await paso("cerrar Biblioteca", () => page.locator("#libraryToggle").click({ timeout: 4000 }));

  console.log("\n═══ Ajustes ═══");
  // Los controles de reproducción (tempo, modo, teclado) sólo se muestran con
  // una canción abierta — en Cancionero, Ajustes sólo trae "Administrar
  // biblioteca". El bloque anterior puede haber dejado la app en Cancionero.
  await paso("volver a Tocar", () => page.locator("#navTocar").click({ timeout: 4000 }));
  await paso("abrir Ajustes", () => page.locator("#settingsToggle").click({ timeout: 4000 }));
  await paso("cambiar tempo", async () => {
    await page.locator("#bpm").fill("90");
    await page.locator("#bpm").dispatchEvent("input");
  });
  await paso("cambiar modo de tocado", () => page.locator("#playMode").selectOption({ index: 1 }));
  await paso("cambiar teclado", () => page.locator("#keyboardMode").selectOption({ index: 1 }));
  await paso("cerrar Ajustes", () => page.locator("#settingsToggle").click({ timeout: 4000 }));
}

// --- Arranque -----------------------------------------------------------------

const server = await servirEstatico();
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  instalarCaptura(page);
  await recorrido(page);
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pasos} pasos, ${fallos.length} fallos.`);
if (fallos.length) {
  console.error("\nSMOKE TEST FALLÓ.");
  process.exit(1);
}
console.log("✓ Smoke test OK.");
