export class ContractError extends Error {
  constructor(code, message, path = "") {
    super(message);
    this.name = "ContractError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, message, path) {
  throw new ContractError(code, message, path);
}

function object(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("invalid_object", "Se esperaba un objeto.", path);
  }
  return value;
}

function exactKeys(value, allowed, path) {
  const extras = Object.keys(value).filter(key => !allowed.includes(key));
  if (extras.length) fail("unknown_property", `Propiedad no reconocida: ${extras[0]}.`, `${path}.${extras[0]}`);
}

function text(value, path, { min = 0, max = 200 } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    fail("invalid_text", "El texto no cumple el largo permitido.", path);
  }
}

function uuid(value, path) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail("invalid_id", "El identificador no es un UUID válido.", path);
  }
}

function isoDateOrNull(value, path) {
  if (value === null) return;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    fail("invalid_date", "La fecha no es válida.", path);
  }
}

function stringArray(value, path, max = 50) {
  if (!Array.isArray(value) || value.length > max) fail("invalid_list", "La lista no es válida.", path);
  value.forEach((item, index) => text(item, `${path}[${index}]`, { max: 80 }));
}

const SPELLINGS = new Map([
  ["C", 0], ["B#", 0], ["C#", 1], ["Db", 1], ["D", 2], ["D#", 3], ["Eb", 3],
  ["E", 4], ["Fb", 4], ["E#", 5], ["F", 5], ["F#", 6], ["Gb", 6], ["G", 7],
  ["G#", 8], ["Ab", 8], ["A", 9], ["A#", 10], ["Bb", 10], ["B", 11], ["Cb", 11],
]);

export function pitchClassForSpelling(spelling) {
  return SPELLINGS.get(spelling);
}

export function validateNote(note, path = "note") {
  object(note, path);
  exactKeys(note, ["pitchClass", "octave", "spelling", "hand", "finger"], path);
  if (!Number.isInteger(note.pitchClass) || note.pitchClass < 0 || note.pitchClass > 11) {
    fail("invalid_pitch_class", "La altura debe estar entre 0 y 11.", `${path}.pitchClass`);
  }
  if (!Number.isInteger(note.octave) || note.octave < 0 || note.octave > 8) {
    fail("invalid_octave", "La octava está fuera del registro soportado.", `${path}.octave`);
  }
  if (pitchClassForSpelling(note.spelling) !== note.pitchClass) {
    fail("invalid_spelling", "La escritura no corresponde a la altura.", `${path}.spelling`);
  }
  if (!["left", "right"].includes(note.hand)) fail("invalid_hand", "La mano no es válida.", `${path}.hand`);
  if (note.finger !== undefined && (!Number.isInteger(note.finger) || note.finger < 1 || note.finger > 5)) {
    fail("invalid_finger", "La digitación debe estar entre 1 y 5.", `${path}.finger`);
  }
  return note;
}

function validateResourceHeader(value, format, path) {
  object(value, path);
  if (value.format !== format) fail("invalid_format", `El formato debe ser ${format}.`, `${path}.format`);
  if (value.schemaVersion !== 1) fail("unsupported_schema", "La versión de esquema no está soportada.", `${path}.schemaVersion`);
  uuid(value.id, `${path}.id`);
  uuid(value.revision, `${path}.revision`);
}

export function validateChord(chord, path = "chord") {
  validateResourceHeader(chord, "piano-chord", path);
  exactKeys(chord, [
    "format", "schemaVersion", "id", "revision", "symbol", "root", "quality", "bass",
    "extensions", "alterations", "source", "tags", "archivedAt",
  ], path);
  text(chord.symbol, `${path}.symbol`, { min: 1, max: 32 });
  for (const [field, value] of [["root", chord.root], ["bass", chord.bass]]) {
    if (value === null && field === "bass") continue;
    object(value, `${path}.${field}`);
    exactKeys(value, ["pitchClass", "spelling"], `${path}.${field}`);
    if (pitchClassForSpelling(value.spelling) !== value.pitchClass) {
      fail("invalid_spelling", "La escritura no corresponde a la altura.", `${path}.${field}.spelling`);
    }
  }
  text(chord.quality, `${path}.quality`, { min: 1, max: 40 });
  stringArray(chord.extensions, `${path}.extensions`, 20);
  stringArray(chord.alterations, `${path}.alterations`, 20);
  if (!["generated", "legacy", "custom"].includes(chord.source)) fail("invalid_source", "El origen no es válido.", `${path}.source`);
  stringArray(chord.tags, `${path}.tags`);
  isoDateOrNull(chord.archivedAt, `${path}.archivedAt`);
  return chord;
}

export function validateVoicing(voicing, path = "voicing") {
  validateResourceHeader(voicing, "piano-voicing", path);
  exactKeys(voicing, [
    "format", "schemaVersion", "id", "revision", "chordId", "name", "scope", "notes",
    "pedagogy", "createdAt", "updatedAt",
  ], path);
  uuid(voicing.chordId, `${path}.chordId`);
  text(voicing.name, `${path}.name`, { min: 1, max: 120 });
  if (!["library", "song"].includes(voicing.scope)) fail("invalid_scope", "El alcance no es válido.", `${path}.scope`);
  if (!Array.isArray(voicing.notes) || !voicing.notes.length || voicing.notes.length > 32) {
    fail("invalid_notes", "El voicing debe contener entre 1 y 32 notas.", `${path}.notes`);
  }
  voicing.notes.forEach((note, index) => validateNote(note, `${path}.notes[${index}]`));
  object(voicing.pedagogy, `${path}.pedagogy`);
  exactKeys(voicing.pedagogy, ["inversionLabel", "explanation", "handSizeNote"], `${path}.pedagogy`);
  text(voicing.pedagogy.inversionLabel, `${path}.pedagogy.inversionLabel`, { max: 80 });
  text(voicing.pedagogy.explanation, `${path}.pedagogy.explanation`, { max: 1000 });
  text(voicing.pedagogy.handSizeNote, `${path}.pedagogy.handSizeNote`, { max: 500 });
  isoDateOrNull(voicing.createdAt, `${path}.createdAt`);
  isoDateOrNull(voicing.updatedAt, `${path}.updatedAt`);
  return voicing;
}

export function validateSong(song, path = "song") {
  validateResourceHeader(song, "piano-song", path);
  exactKeys(song, [
    "format", "schemaVersion", "id", "revision", "metadata", "sections", "archivedAt",
    "createdAt", "updatedAt",
  ], path);
  object(song.metadata, `${path}.metadata`);
  exactKeys(song.metadata, ["title", "artist", "key", "tempo", "timeSignature", "notation", "tags"], `${path}.metadata`);
  text(song.metadata.title, `${path}.metadata.title`, { min: 1, max: 200 });
  text(song.metadata.artist, `${path}.metadata.artist`, { max: 200 });
  text(song.metadata.key, `${path}.metadata.key`, { max: 16 });
  if (!Number.isFinite(song.metadata.tempo) || song.metadata.tempo < 20 || song.metadata.tempo > 300) {
    fail("invalid_tempo", "El tempo debe estar entre 20 y 300.", `${path}.metadata.tempo`);
  }
  if (!Array.isArray(song.metadata.timeSignature) || song.metadata.timeSignature.length !== 2 ||
      !song.metadata.timeSignature.every(item => Number.isInteger(item) && item > 0 && item <= 32)) {
    fail("invalid_time_signature", "El compás no es válido.", `${path}.metadata.timeSignature`);
  }
  if (!["es", "en"].includes(song.metadata.notation)) fail("invalid_notation", "La notación no es válida.", `${path}.metadata.notation`);
  stringArray(song.metadata.tags, `${path}.metadata.tags`);
  if (!Array.isArray(song.sections) || !song.sections.length || song.sections.length > 200) {
    fail("invalid_sections", "La canción debe contener entre 1 y 200 secciones.", `${path}.sections`);
  }
  const sectionIds = new Set();
  const lineIds = new Set();
  const eventIds = new Set();
  song.sections.forEach((section, sectionIndex) => {
    const sectionPath = `${path}.sections[${sectionIndex}]`;
    object(section, sectionPath);
    exactKeys(section, ["id", "name", "lines", "events"], sectionPath);
    uuid(section.id, `${sectionPath}.id`);
    if (sectionIds.has(section.id)) fail("duplicate_id", "La sección está duplicada.", `${sectionPath}.id`);
    sectionIds.add(section.id);
    text(section.name, `${sectionPath}.name`, { min: 1, max: 120 });
    if (!Array.isArray(section.lines) || !section.lines.length || section.lines.length > 500) {
      fail("invalid_lines", "La sección debe contener líneas.", `${sectionPath}.lines`);
    }
    const ownLineIds = new Set();
    section.lines.forEach((line, lineIndex) => {
      object(line, `${sectionPath}.lines[${lineIndex}]`);
      exactKeys(line, ["id", "text"], `${sectionPath}.lines[${lineIndex}]`);
      uuid(line.id, `${sectionPath}.lines[${lineIndex}].id`);
      if (lineIds.has(line.id)) fail("duplicate_id", "La línea está duplicada.", `${sectionPath}.lines[${lineIndex}].id`);
      lineIds.add(line.id);
      ownLineIds.add(line.id);
      text(line.text, `${sectionPath}.lines[${lineIndex}].text`, { max: 2000 });
    });
    if (!Array.isArray(section.events) || section.events.length > 2000) {
      fail("invalid_events", "La lista de eventos no es válida.", `${sectionPath}.events`);
    }
    section.events.forEach((event, eventIndex) => {
      const eventPath = `${sectionPath}.events[${eventIndex}]`;
      object(event, eventPath);
      exactKeys(event, ["id", "lineId", "anchor", "position", "beats", "chord"], eventPath);
      uuid(event.id, `${eventPath}.id`);
      if (eventIds.has(event.id)) fail("duplicate_id", "El evento está duplicado.", `${eventPath}.id`);
      eventIds.add(event.id);
      if (!ownLineIds.has(event.lineId)) fail("invalid_reference", "El evento refiere a otra sección.", `${eventPath}.lineId`);
      const line = section.lines.find(item => item.id === event.lineId);
      const maximumAnchor = line.text.trim() ? line.text.trim().split(/\s+/).length : 0;
      if (![event.anchor, event.position].every(Number.isInteger) || event.anchor < 0 || event.position < 0) {
        fail("invalid_position", "La posición del evento no es válida.", eventPath);
      }
      if (event.anchor > maximumAnchor) {
        fail("invalid_anchor", "El ancla está fuera de la línea.", `${eventPath}.anchor`);
      }
      if (!Number.isFinite(event.beats) || event.beats <= 0 || event.beats > 32) {
        fail("invalid_beats", "La duración debe estar entre 0 y 32 pulsos.", `${eventPath}.beats`);
      }
      object(event.chord, `${eventPath}.chord`);
      exactKeys(event.chord, ["chordId", "voicingId", "voicingRevision"], `${eventPath}.chord`);
      uuid(event.chord.chordId, `${eventPath}.chord.chordId`);
      uuid(event.chord.voicingId, `${eventPath}.chord.voicingId`);
      uuid(event.chord.voicingRevision, `${eventPath}.chord.voicingRevision`);
    });
  });
  isoDateOrNull(song.archivedAt, `${path}.archivedAt`);
  isoDateOrNull(song.createdAt, `${path}.createdAt`);
  isoDateOrNull(song.updatedAt, `${path}.updatedAt`);
  return song;
}

export function validateLibrary({ song, chords, voicings }) {
  validateSong(song);
  if (!Array.isArray(chords) || !Array.isArray(voicings)) fail("invalid_library", "La biblioteca no es válida.", "library");
  chords.forEach((chord, index) => validateChord(chord, `chords[${index}]`));
  voicings.forEach((voicing, index) => validateVoicing(voicing, `voicings[${index}]`));
  const chordIds = new Set(chords.map(chord => chord.id));
  const voicingById = new Map(voicings.map(voicing => [voicing.id, voicing]));
  for (const voicing of voicings) {
    if (!chordIds.has(voicing.chordId)) fail("missing_chord", "El voicing refiere a un acorde inexistente.", `voicing:${voicing.id}`);
  }
  for (const section of song.sections) {
    for (const event of section.events) {
      const voicing = voicingById.get(event.chord.voicingId);
      if (!chordIds.has(event.chord.chordId) || !voicing || voicing.chordId !== event.chord.chordId ||
          voicing.revision !== event.chord.voicingRevision) {
        fail("missing_resource", "El evento refiere a un recurso inexistente o a otra revisión.", `event:${event.id}`);
      }
    }
  }
  return { song, chords, voicings };
}
