import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { features } from "../src/config/features.js";

test("Entrega 0 mantiene desactivadas la biblioteca y sus escrituras remotas", () => {
  assert.deepEqual(features, {
    pianoLibrary: false,
    pianoLibraryCloudWrites: false,
    pianoUniversalEngine: false,
  });
  assert.equal(Object.isFrozen(features), true);
});

test("src/ no importa módulos de Node: ese código corre en el navegador", async () => {
  // Las pruebas se ejecutan en Node, donde `import ... from "node:crypto"`
  // resuelve sin problema. En Safari no existe, así que un import así pasa
  // toda la suite en verde y revienta en producción al cargar el módulo.
  const root = fileURLToPath(new URL("../src", import.meta.url));
  const offenders = [];

  const walk = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;

      const source = await readFile(path, "utf8");
      for (const [, specifier] of source.matchAll(/from\s+"(node:[^"]+)"/g)) {
        offenders.push(`${path.slice(root.length + 1)} → ${specifier}`);
      }
    }
  };

  await walk(root);
  assert.deepEqual(offenders, []);
});
