/**
 * Comprobación de equivalencia contra los datos vivos de producción.
 *
 * `test/migration.test.js` ya prueba que la migración conserva la canción, pero
 * lo hace contra un fixture congelado. La canción publicada no está congelada:
 * el editor la reescribe y la nube la sincroniza, de modo que puede alejarse
 * del fixture sin que ninguna prueba se entere.
 *
 * Este módulo ejecuta la misma comparación contra lo que el navegador tiene
 * delante. No reproduce audio, no toca el DOM y no modifica nada: migra en
 * memoria, compara y devuelve el resultado.
 */

import { buildLegacySource } from "./legacy-bridge.js";
import { migrateMis36ToLibrary } from "../domain/migrations/mis36-v1.js";
import { compareCanonical } from "../domain/canonical.js";
import { validateLibrary } from "../domain/validation.js";

export async function verifyLiveEquivalence(snapshot) {
  const startedAt = Date.now();

  try {
    const source = buildLegacySource(snapshot);
    const library = await migrateMis36ToLibrary(source);
    const comparison = compareCanonical(source, library);

    validateLibrary(library);

    const events = library.song.sections.flatMap(section => section.events);

    return {
      ok: comparison.equal,
      checks: comparison.checks,
      counts: {
        events: events.length,
        chords: library.chords.length,
        voicings: library.voicings.length,
        deletedEvents: library.migration.audit.deletedEventKeys.length,
        customDurations: events.filter(event => event.beats !== 4).length,
      },
      sourceHash: library.migration.sourceHash,
      migrationStatus: library.migration.status,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    // Un fallo aquí no puede afectar a la aplicación publicada: se informa y se
    // devuelve. Quien llama decide qué hacer, y por ahora nadie hace nada.
    return {
      ok: false,
      error: {
        code: error?.code || "unexpected_error",
        message: error?.message || String(error),
        path: error?.path || null,
      },
      elapsedMs: Date.now() - startedAt,
    };
  }
}
