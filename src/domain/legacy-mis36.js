import { ContractError, pitchClassForSpelling } from "./validation.js";

const LEGACY_EVENT_KEY = /^\d+:(?:\d+:\d+|custom:[\w:-]+)$/;
const NOTE_NAME = /^([A-G](?:#|b)?)([0-8])$/;

function legacyError(code, message, path) {
  throw new ContractError(code, message, path);
}

export function validateLegacyMis36(source) {
  if (!source || source.format !== "mis36-cloud-v1" || typeof source.revision !== "string" ||
      !Number.isFinite(Date.parse(source.updatedAt))) {
    legacyError("invalid_legacy_document", "El documento heredado no es válido.", "legacy");
  }
  if (!source.defaults || !Array.isArray(source.defaults.sections) || !source.defaults.sections.length ||
      !source.defaults.baseVoicings || !source.defaults.voicingVariants || !source.defaults.defaultInversions) {
    legacyError("missing_legacy_defaults", "Faltan los datos predeterminados heredados.", "legacy.defaults");
  }
  const sync = source.songSync;
  if (!sync || sync.version !== 4 || !sync.events || Array.isArray(sync.events) ||
      !Array.isArray(sync.deleted) || !Array.isArray(sync.added)) {
    legacyError("invalid_legacy_sync", "Los ajustes heredados no son válidos.", "legacy.songSync");
  }
  if (sync.added.length > 500 || sync.deleted.length > 1500 || Object.keys(sync.events).length > 1500) {
    legacyError("legacy_limit_exceeded", "Los ajustes heredados superan los límites.", "legacy.songSync");
  }
  for (const [key, value] of Object.entries(sync.events)) {
    if (!LEGACY_EVENT_KEY.test(key) || !value || !Number.isInteger(value.line) ||
        !Number.isInteger(value.anchor) || !Number.isInteger(value.position) ||
        !Number.isFinite(value.beats) || value.beats <= 0 || value.beats > 32) {
      legacyError("invalid_legacy_event", "Un evento heredado no es válido.", `legacy.songSync.events.${key}`);
    }
  }
  return source;
}

export function parseLegacyNote(value, hand, finger, spellings = {}) {
  const match = NOTE_NAME.exec(value);
  if (!match) legacyError("invalid_legacy_note", `Nota heredada no reconocida: ${value}.`, "legacy.voicing");
  const rawSpelling = match[1];
  const spelling = spellings[rawSpelling] || rawSpelling;
  const note = {
    pitchClass: pitchClassForSpelling(spelling),
    octave: Number(match[2]),
    spelling,
    hand,
  };
  if (finger !== undefined) note.finger = finger;
  return note;
}

export function legacyChordParts(symbol) {
  const [main, bass = null] = symbol.split("/");
  const match = /^([A-G](?:#|b)?)(m?)$/.exec(main);
  if (!match) legacyError("invalid_legacy_chord", `Acorde heredado no reconocido: ${symbol}.`, "legacy.chord");
  const root = { pitchClass: pitchClassForSpelling(match[1]), spelling: match[1] };
  return {
    root,
    quality: match[2] === "m" ? "minor" : "major",
    bass: bass ? { pitchClass: pitchClassForSpelling(bass), spelling: bass } : null,
  };
}

export function effectiveLegacySections(source) {
  validateLegacyMis36(source);
  const { sections, baseVoicings, voicingVariants } = source.defaults;
  const deleted = new Set(source.songSync.deleted);
  const addedKeys = new Set(source.songSync.added.map(value => `${value.section}:${value.uid}`));
  const baseEvents = new Map();

  sections.forEach((section, sectionIndex) => {
    section.events.forEach(event => baseEvents.set(`${sectionIndex}:${event.uid}`, event));
  });

  return sections.map((section, sectionIndex) => {
    const events = Object.entries(source.songSync.events)
      .filter(([key]) => Number.parseInt(key, 10) === sectionIndex && !deleted.has(key))
      .map(([key, adjustment]) => {
        const original = baseEvents.get(key);
        const added = source.songSync.added.find(value => `${value.section}:${value.uid}` === key);
        const seed = original || added;
        if (!seed) legacyError("missing_legacy_event", `No existe el evento ${key}.`, `legacy.songSync.events.${key}`);
        const chord = adjustment.chord || seed.chord;
        const inversion = adjustment.inversion || seed.inversion;
        const baseVoicing = baseVoicings[chord];
        const right = voicingVariants[chord]?.[inversion];
        if (!baseVoicing || !right) {
          legacyError("missing_legacy_voicing", `No existe la posición ${chord}/${inversion}.`, `legacy.songSync.events.${key}`);
        }
        return {
          legacyKey: key,
          source: addedKeys.has(key) ? "legacy-custom" : "legacy-default",
          chord,
          inversion,
          line: adjustment.line,
          anchor: adjustment.anchor,
          beats: adjustment.beats,
          position: adjustment.position,
          notes: [
            // La interfaz heredada fija el bajo en el dedo 5 aunque `l` solo guarde la nota.
            parseLegacyNote(baseVoicing.l, "left", 5, baseVoicing.spell),
            ...right.map(([note, finger]) => parseLegacyNote(note, "right", finger, baseVoicing.spell)),
          ],
        };
      })
      .sort((left, right) => left.position - right.position);
    return { name: section.name, lines: [...section.lines], events };
  });
}
