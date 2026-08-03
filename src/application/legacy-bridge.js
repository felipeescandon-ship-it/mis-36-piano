/**
 * Puente entre la aplicación publicada y el modelo nuevo.
 *
 * `index.html` guarda la canción en cuatro estructuras sueltas —`voicings`,
 * `defaultInversions`, `voicingVariants` y `sections`— más el estado de
 * sincronización. El modelo nuevo espera un único documento heredado. Este
 * módulo hace esa traducción y nada más: no toca el DOM, no lee `window` y no
 * decide cuándo se le llama.
 *
 * Existe para que la equivalencia canónica pueda comprobarse contra los datos
 * que sirve producción, y no solo contra el fixture congelado de las pruebas.
 * Esa distinción importa: el fixture no cambia nunca, mientras que la canción
 * publicada sí, porque el editor y la nube la reescriben.
 */

import { validateLegacyMis36 } from "../domain/legacy-mis36.js";

/**
 * Los voicings de `index.html` llevan la mano derecha y la etiqueta de
 * inversión pegadas al mismo objeto. El documento heredado solo admite la nota
 * de bajo y la escritura enarmónica; el resto llega por `voicingVariants`.
 */
function baseVoicingsFrom(voicings) {
  const result = {};
  for (const [chord, voicing] of Object.entries(voicings)) {
    result[chord] = { l: voicing.l, spell: { ...(voicing.spell || {}) } };
  }
  return result;
}

/**
 * Las secciones se reducen a los campos que el documento heredado define. Los
 * valores que el usuario haya cambiado no viajan aquí: llegan por `songSync`,
 * que es la única fuente de anclas, duraciones e inversiones editadas.
 */
function sectionsFrom(sections) {
  return sections.map(section => ({
    name: section.name,
    lines: [...section.lines],
    events: section.events.map(event => ({
      uid: event.uid,
      chord: event.chord,
      lyric: event.lyric,
      line: event.line,
      beats: event.beats,
      inversion: event.inversion,
    })),
  }));
}

export function buildLegacySource(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new TypeError("buildLegacySource requiere una instantánea del estado heredado.");
  }

  const { revision, updatedAt, metadata, voicings, defaultInversions, voicingVariants, sections, songSync } = snapshot;

  return validateLegacyMis36({
    format: "mis36-cloud-v1",
    revision,
    updatedAt,
    metadata: {
      title: metadata.title,
      artist: metadata.artist || "",
      key: metadata.key || "",
      tempo: metadata.tempo,
      timeSignature: [...metadata.timeSignature],
      notation: metadata.notation,
      tags: [...(metadata.tags || [])],
    },
    defaults: {
      sections: sectionsFrom(sections),
      defaultInversions: { ...defaultInversions },
      baseVoicings: baseVoicingsFrom(voicings),
      voicingVariants,
    },
    songSync,
  });
}
