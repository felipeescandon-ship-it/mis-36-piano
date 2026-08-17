/*
 * Rehace assets/piano-samples/ desde el origen.
 *
 * Las muestras están commiteadas en el repo a propósito (autohospedaje: es lo
 * que permite cachearlas offline con el service worker), así que este script no
 * hace falta para desplegar. Sirve para reproducir la carpeta si hay que
 * regenerarla, y para dejar documentado de dónde salió cada archivo.
 *
 *   node scripts/fetch-piano-samples.mjs
 *
 * La lista de muestras NO está escrita a mano: se extrae del propio LAYERS de
 * smplr vendorizado, así que el mapa de muestras nunca se desincroniza de la
 * librería. Los nombres se guardan como slug ASCII ("PP D#0" → "pp_ds0") porque
 * el '#' de una URL es delimitador de fragmento; el motor reescribe la URL en su
 * capa de storage.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = path.join(ROOT, "assets/vendor/smplr.mjs");
const OUT = path.join(ROOT, "assets/piano-samples");
const FORMATS = ["ogg", "m4a"];

// Se bajan los dos formatos porque smplr elige uno en tiempo de ejecución según
// el navegador (Safari no reproduce ogg; Firefox sin códecs del sistema puede no
// reproducir m4a). Ocupa el doble en el repo, pero cada usuario descarga solo
// el formato que su navegador usa.
const BASE = "https://raw.githubusercontent.com/smpldsnds/sfzinstruments-splendid-grand-piano/main/samples";

const slug = name => name.replace(/#/g, "s").replace(/ /g, "_").toLowerCase();

async function sampleNames() {
  const source = await fs.readFile(VENDOR, "utf8");
  const start = source.indexOf("var LAYERS = [");
  if (start < 0) throw new Error("No se encontró LAYERS en el bundle de smplr");
  const end = source.indexOf("\nvar ", start + 10);
  const block = source.slice(start, end);
  const names = [...block.matchAll(/\[\d+,\s*"([^"]+)"\]/g)].map(match => match[1]);
  return [...new Set(names)];
}

async function download(name, format) {
  const url = `${BASE}/${encodeURIComponent(name)}.${format}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} en ${url}`);
  const target = path.join(OUT, format, `${slug(name)}.${format}`);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
}

const names = await sampleNames();
console.log(`${names.length} muestras × ${FORMATS.length} formatos`);

const map = {};
for (const format of FORMATS) {
  await fs.mkdir(path.join(OUT, format), { recursive: true });
  let done = 0;
  // De a tandas, para no abrir 226 conexiones a la vez.
  for (let i = 0; i < names.length; i += 12) {
    const batch = names.slice(i, i + 12);
    await Promise.all(batch.map(name => download(name, format)));
    done += batch.length;
    process.stdout.write(`\r  ${format}: ${done}/${names.length}`);
  }
  console.log("");
}
names.forEach(name => {
  map[name] = slug(name);
});

await fs.writeFile(
  path.join(OUT, "index.json"),
  JSON.stringify(
    {
      instrument: "SplendidGrandPiano",
      source: "https://github.com/smpldsnds/sfzinstruments-splendid-grand-piano",
      formats: FORMATS,
      count: names.length,
      map
    },
    null,
    1
  ) + "\n"
);
console.log("listo");
