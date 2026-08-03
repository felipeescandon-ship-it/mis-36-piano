import { validateLibrary } from "../../domain/validation.js";

const EXPORT_FORMAT = "piano-library-export";
const EXPORT_SCHEMA_VERSION = 1;

/**
 * Une la canción con solo los acordes y voicings que sus eventos referencian,
 * para que el archivo exportado sea autocontenido y `validateLibrary` pueda
 * comprobarlo sin depender del resto de la biblioteca local.
 */
export function buildExportBundle({ song, chords, voicings }) {
  const referencedChordIds = new Set();
  const referencedVoicingIds = new Set();
  for (const section of song.sections) {
    for (const event of section.events) {
      referencedChordIds.add(event.chord.chordId);
      referencedVoicingIds.add(event.chord.voicingId);
    }
  }

  const bundle = {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    song,
    chords: chords.filter(chord => referencedChordIds.has(chord.id)),
    voicings: voicings.filter(voicing => referencedVoicingIds.has(voicing.id)),
  };
  validateLibrary(bundle);
  return bundle;
}

export function parseExportBundle(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
}

function remapReferences(bundle) {
  const chordIdMap = new Map(bundle.chords.map(chord => [chord.id, crypto.randomUUID()]));
  const voicingIdMap = new Map(bundle.voicings.map(voicing => [voicing.id, crypto.randomUUID()]));

  const chords = bundle.chords.map(chord => ({
    ...chord,
    id: chordIdMap.get(chord.id),
    revision: crypto.randomUUID(),
  }));

  const voicings = bundle.voicings.map(voicing => ({
    ...voicing,
    id: voicingIdMap.get(voicing.id),
    revision: crypto.randomUUID(),
    chordId: chordIdMap.get(voicing.chordId),
  }));
  const voicingById = new Map(voicings.map(voicing => [voicing.id, voicing]));

  const sections = bundle.song.sections.map(section => {
    const lineIdMap = new Map(section.lines.map(line => [line.id, crypto.randomUUID()]));
    return {
      id: crypto.randomUUID(),
      name: section.name,
      lines: section.lines.map(line => ({ id: lineIdMap.get(line.id), text: line.text })),
      events: section.events.map(event => {
        const voicing = voicingById.get(voicingIdMap.get(event.chord.voicingId));
        return {
          id: crypto.randomUUID(),
          lineId: lineIdMap.get(event.lineId),
          anchor: event.anchor,
          position: event.position,
          beats: event.beats,
          chord: {
            chordId: chordIdMap.get(event.chord.chordId),
            voicingId: voicing.id,
            voicingRevision: voicing.revision,
          },
        };
      }),
    };
  });

  const song = { ...bundle.song, id: crypto.randomUUID(), revision: crypto.randomUUID(), sections };
  return { song, chords, voicings };
}

/**
 * Importa siempre como copia nueva: todo identificador (canción, secciones,
 * líneas, eventos, acordes, voicings) se regenera. Conservar los IDs
 * originales arriesgaría el mismo choque silencioso que D-021 corrigió para
 * acordes construidos — aquí el riesgo es peor, porque el archivo puede venir
 * de otro dispositivo con una biblioteca local completamente distinta.
 */
export function importExportBundle(bundle) {
  if (bundle?.format !== EXPORT_FORMAT || bundle?.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new Error("El archivo no tiene el formato de exportación esperado.");
  }
  validateLibrary(bundle);
  return remapReferences(bundle);
}
