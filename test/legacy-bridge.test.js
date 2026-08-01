/**
 * El puente traduce el estado de `index.html` al documento heredado. Si se
 * desvía, la comprobación en vivo daría un falso negativo y nadie volvería a
 * fiarse de ella, así que se comprueba contra el fixture ya verificado.
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import { buildLegacySource } from "../src/application/legacy-bridge.js";
import { verifyLiveEquivalence } from "../src/application/verify-live-equivalence.js";
import { canonicalLegacy } from "../src/domain/canonical.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";

/**
 * Reconstruye lo que `index.html` publicaría, a partir del fixture. Las
 * estructuras sueltas son las mismas que la aplicación tiene en memoria.
 */
function snapshotFromFixture(overrides = {}) {
  return {
    revision: mis36LegacyFixture.revision,
    updatedAt: mis36LegacyFixture.updatedAt,
    metadata: mis36LegacyFixture.metadata,
    voicings: mis36LegacyFixture.defaults.baseVoicings,
    defaultInversions: mis36LegacyFixture.defaults.defaultInversions,
    voicingVariants: mis36LegacyFixture.defaults.voicingVariants,
    sections: mis36LegacyFixture.defaults.sections,
    songSync: mis36LegacyFixture.songSync,
    ...overrides,
  };
}

describe("Legacy bridge", () => {
  it("produce un documento canónicamente idéntico al fixture", () => {
    const source = buildLegacySource(snapshotFromFixture());
    assert.deepEqual(canonicalLegacy(source), canonicalLegacy(mis36LegacyFixture));
  });

  it("descarta la mano derecha y la inversión que index.html cuelga del voicing", () => {
    // En producción `voicings` lleva además `r` e `inv`. El documento heredado
    // no los admite: la mano derecha llega por `voicingVariants`.
    const voicings = {};
    for (const [chord, voicing] of Object.entries(mis36LegacyFixture.defaults.baseVoicings)) {
      voicings[chord] = { ...voicing, r: [["E4", 1]], inv: "fundamental" };
    }

    const source = buildLegacySource(snapshotFromFixture({ voicings }));

    assert.deepEqual(
      Object.keys(source.defaults.baseVoicings.E).sort(),
      ["l", "spell"]
    );
    assert.deepEqual(canonicalLegacy(source), canonicalLegacy(mis36LegacyFixture));
  });

  it("ignora los campos que el editor añade a un evento en memoria", () => {
    // `index.html` muta los eventos en sitio: les cuelga `anchor` y valores ya
    // editados. La verdad de esos cambios es `songSync`, no el evento.
    const sections = mis36LegacyFixture.defaults.sections.map(section => ({
      ...section,
      events: section.events.map(event => ({ ...event, anchor: 99, position: 7 })),
    }));

    const source = buildLegacySource(snapshotFromFixture({ sections }));

    assert.equal(source.defaults.sections[0].events[0].anchor, undefined);
    assert.deepEqual(canonicalLegacy(source), canonicalLegacy(mis36LegacyFixture));
  });

  it("rechaza una instantánea sin estado de sincronización", () => {
    assert.throws(
      () => buildLegacySource(snapshotFromFixture({ songSync: null })),
      /sincroniza|válidos/i
    );
  });
});

describe("Comprobación de equivalencia en vivo", () => {
  it("confirma la equivalencia con las mismas cifras que la migración", async () => {
    const report = await verifyLiveEquivalence(snapshotFromFixture());

    assert.equal(report.ok, true);
    assert.deepEqual(report.checks, {
      sections: true,
      lines: true,
      events: true,
      voicings: true,
      durations: true,
    });
    assert.deepEqual(report.counts, {
      events: 81,
      chords: 12,
      voicings: 36,
      deletedEvents: 5,
      customDurations: 2,
    });
    assert.equal(report.migrationStatus, "shadow");
  });

  it("informa del fallo en lugar de propagarlo", async () => {
    // Nadie debe poder romper la aplicación publicada desde aquí.
    const report = await verifyLiveEquivalence({ metadata: null });

    assert.equal(report.ok, false);
    assert.ok(report.error.message);
    assert.equal(typeof report.elapsedMs, "number");
  });
});

test("la comprobación en vivo no depende de módulos de Node", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  for (const name of ["legacy-bridge.js", "verify-live-equivalence.js"]) {
    const source = await readFile(
      fileURLToPath(new URL(`../src/application/${name}`, import.meta.url)),
      "utf8"
    );
    assert.equal(/from\s+"node:/.test(source), false, `${name} importa un módulo de Node`);
  }
});
