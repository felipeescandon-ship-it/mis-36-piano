import { validateLibrary } from "../../domain/validation.js";
import { playbackError } from "./errors.js";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function readonlyMap(entries) {
  const map = new Map(entries);
  return Object.freeze({
    get size() {
      return map.size;
    },
    get: key => map.get(key),
    has: key => map.has(key),
    keys: () => map.keys(),
    values: () => map.values(),
    entries: () => map.entries(),
    forEach: callback => map.forEach((value, key) => callback(value, key)),
    [Symbol.iterator]: () => map[Symbol.iterator](),
  });
}

export function voicingRevisionKey(voicingId, revision) {
  return `${voicingId}:${revision}`;
}

export function createPlaybackDocument(library) {
  if (!library || typeof library !== "object") {
    throw playbackError("invalid_playback_document", "El documento de reproducción no es válido.");
  }

  let cloned;
  try {
    cloned = {
      song: cloneJson(library.song),
      chords: cloneJson(library.chords),
      voicings: cloneJson(library.voicings),
    };
    validateLibrary(cloned);
  } catch (error) {
    if (["missing_resource", "missing_chord"].includes(error?.code)) {
      throw playbackError("missing_resource", "El documento refiere a un acorde o voicing inexistente.", {
        causeCode: error.code,
        path: error.path || "",
      });
    }
    throw playbackError("invalid_playback_document", "El documento de reproducción no cumple el contrato.", {
      causeCode: error?.code || "validation_failed",
      path: error?.path || "",
    });
  }

  deepFreeze(cloned.song);
  deepFreeze(cloned.chords);
  deepFreeze(cloned.voicings);

  const chordsById = readonlyMap(cloned.chords.map(chord => [chord.id, chord]));
  const voicingsByRevision = readonlyMap(
    cloned.voicings.map(voicing => [voicingRevisionKey(voicing.id, voicing.revision), voicing]),
  );
  const sectionEntries = [];
  const lineEntries = [];
  const eventEntries = [];

  for (const [sectionIndex, section] of cloned.song.sections.entries()) {
    sectionEntries.push([section.id, Object.freeze({ section, sectionIndex })]);
    for (const [lineIndex, line] of section.lines.entries()) {
      lineEntries.push([line.id, Object.freeze({ line, lineIndex, sectionId: section.id, sectionIndex })]);
    }
    for (const event of section.events) {
      const chord = chordsById.get(event.chord.chordId);
      const voicing = voicingsByRevision.get(
        voicingRevisionKey(event.chord.voicingId, event.chord.voicingRevision),
      );
      if (!chord || !voicing) {
        throw playbackError("missing_resource", "Un evento refiere a un recurso inexistente.", {
          eventId: event.id,
          chordId: event.chord.chordId,
          voicingId: event.chord.voicingId,
          voicingRevision: event.chord.voicingRevision,
        });
      }
      eventEntries.push([event.id, Object.freeze({
        event,
        sectionId: section.id,
        sectionIndex,
        chord,
        voicing,
      })]);
    }
  }

  return Object.freeze({
    song: cloned.song,
    chords: cloned.chords,
    voicings: cloned.voicings,
    chordsById,
    voicingsByRevision,
    sectionsById: readonlyMap(sectionEntries),
    linesById: readonlyMap(lineEntries),
    eventsById: readonlyMap(eventEntries),
  });
}
