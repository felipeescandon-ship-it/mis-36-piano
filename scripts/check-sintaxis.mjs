/*
 * Verifica que el JavaScript de la app parsee.
 *
 *   node scripts/check-sintaxis.mjs
 *
 * Existe por un incidente concreto: una línea con comillas tipográficas (”) en
 * vez de rectas como delimitador de cadena. JavaScript no las acepta ahí, así
 * que el bloque <script> entero —que es toda la aplicación— dejó de parsear.
 * La página seguía mostrando el encabezado y el título, y debajo un recuadro
 * vacío. Se publicó a producción y estuvo caída hasta que un usuario lo vio.
 *
 * Lo que lo hizo invisible: toda la verificación de esa etapa corría sobre
 * diagnostico-audio-phase2.html, que carga assets/audio-engine.js directamente
 * y nunca toca index.html. Se puede medir el motor de audio con mucho detalle
 * mientras la aplicación que lo usa no arranca.
 *
 * Un error de sintaxis no es un detalle de estilo: rompe el archivo completo,
 * no la línea. Por eso el chequeo es binario y corre sobre todo lo que se sirve.
 *
 * Sale con código 1 si algo no parsea, para poder usarlo como hook o en CI.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Todo lo que el navegador ejecuta: los <script> embebidos de cada página y los
// .js sueltos. El vendorizado queda afuera: no lo escribimos nosotros.
const PAGINAS = fs.readdirSync(RAIZ).filter(f => f.endsWith(".html"));
const SUELTOS = ["sw.js", "assets/audio-engine.js"];

const EMBEBIDO = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

let fallos = 0;
let revisados = 0;

/*
 * Se delega en `node --check` en vez de en `new Function`. Las dos detectan el
 * error, pero new Function no dice dónde está, y adivinarlo con una expresión
 * regular sale mal: el primer intento marcaba la línea 3626 —un template
 * literal que contiene “Fin de línea” como texto, perfectamente válido— en vez
 * de la 3636, que era la rota. Una pista que señala código sano hace perder más
 * tiempo del que ahorra. El parser de node da línea y columna reales.
 */
function revisar(etiqueta, codigo, lineaBase) {
  revisados++;
  const tmp = path.join(os.tmpdir(), `check-${process.pid}-${revisados}.js`);
  fs.writeFileSync(tmp, codigo);
  const r = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
  fs.unlinkSync(tmp);
  if (r.status === 0) return;

  fallos++;
  const salida = r.stderr || "";
  // node informa "<archivo>:<línea>"; se traduce a la línea del archivo real.
  const m = salida.match(new RegExp(`${tmp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(\\d+)`));
  const donde = m ? `línea ${lineaBase + Number(m[1]) - 1}` : "posición desconocida";
  const motivo = (salida.match(/^\s*(SyntaxError:.*)$/m) || [, "no parsea"])[1];
  const fragmento = (codigo.split("\n")[m ? Number(m[1]) - 1 : 0] || "").trim().slice(0, 100);
  console.error(`✗ ${etiqueta} · ${donde}: ${motivo}\n    ${fragmento}`);
}

for (const pagina of PAGINAS) {
  const html = fs.readFileSync(path.join(RAIZ, pagina), "utf8");
  let match, bloque = 0;
  EMBEBIDO.lastIndex = 0;
  while ((match = EMBEBIDO.exec(html))) {
    bloque++;
    const lineaBase = html.slice(0, match.index).split("\n").length;
    revisar(`${pagina} · bloque ${bloque}`, match[1], lineaBase);
  }
}

for (const archivo of SUELTOS) {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) continue;
  revisar(archivo, fs.readFileSync(ruta, "utf8"), 1);
}

if (fallos) {
  console.error(`\n${fallos} de ${revisados} no parsean.`);
  process.exit(1);
}
console.log(`✓ ${revisados} bloques de JavaScript parsean correctamente.`);
