// Genera una posición de piano razonable a partir de fundamental + cualidad,
// sin pasar por el teclado del constructor. Se usa solo cuando el taller
// importa acordes desde texto pegado y ninguno existente coincide: el
// registro se elige para caer siempre dentro de Si1–Do7 (ver
// `domain/validation.js`), y el resultado es un punto de partida editable,
// no una digitación pedagógica curada.

const QUALITY_INTERVALS = {
  Mayor: [0, 4, 7],
  menor: [0, 3, 7],
  7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  9: [0, 4, 7, 10, 14],
  add9: [0, 4, 7, 14],
};

const SPELLING_BY_PITCH_CLASS_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SPELLING_BY_PITCH_CLASS_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function spellingFor(pitchClass, preferFlat) {
  return (preferFlat ? SPELLING_BY_PITCH_CLASS_FLAT : SPELLING_BY_PITCH_CLASS_SHARP)[pitchClass];
}

export function buildAutoVoicingNotes({ rootPitchClass, rootSpelling, quality, bassPitchClass, bassSpelling }) {
  const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS.Mayor;
  const preferFlat = /b$/.test(rootSpelling || "");

  const bassNote = bassPitchClass !== null && bassPitchClass !== undefined
    ? { pitchClass: bassPitchClass, octave: 2, spelling: bassSpelling, hand: "left", finger: 1 }
    : { pitchClass: rootPitchClass, octave: 3, spelling: rootSpelling, hand: "left", finger: 1 };

  const notes = [bassNote];
  let rightFinger = 1;
  for (const interval of intervals) {
    const absolute = rootPitchClass + interval;
    const pitchClass = ((absolute % 12) + 12) % 12;
    const octave = 4 + Math.floor(absolute / 12);
    notes.push({
      pitchClass,
      octave,
      spelling: spellingFor(pitchClass, preferFlat),
      hand: "right",
      finger: Math.min(rightFinger, 5),
    });
    rightFinger += 1;
  }

  return notes;
}

// Ensambla un Chord + Voicing completos (mismas formas que
// `chord-factory.js`) a partir de un token ya interpretado por
// `parseChordToken`. El símbolo conserva el texto tal como se pegó — no el
// nombre en español del constructor manual — para que la persona reconozca
// el acorde contra la tablatura de origen.
export function buildAutoChordAndVoicing(parsedToken, { scope = "song" } = {}) {
  const chordId = crypto.randomUUID();
  const chordRevision = crypto.randomUUID();
  const voicingId = crypto.randomUUID();
  const voicingRevision = crypto.randomUUID();
  const now = new Date().toISOString();

  const chord = {
    format: "piano-chord",
    schemaVersion: 1,
    id: chordId,
    revision: chordRevision,
    symbol: parsedToken.rawText.slice(0, 32),
    root: { pitchClass: parsedToken.rootPitchClass, spelling: parsedToken.rootSpelling },
    quality: parsedToken.quality,
    bass: parsedToken.bassPitchClass !== null && parsedToken.bassPitchClass !== undefined
      ? { pitchClass: parsedToken.bassPitchClass, spelling: parsedToken.bassSpelling }
      : null,
    extensions: [],
    alterations: [],
    source: "generated",
    tags: [],
    archivedAt: null,
  };

  const voicing = {
    format: "piano-voicing",
    schemaVersion: 1,
    id: voicingId,
    revision: voicingRevision,
    chordId,
    name: chord.symbol,
    scope,
    notes: buildAutoVoicingNotes(parsedToken),
    pedagogy: { inversionLabel: "", explanation: "", handSizeNote: "" },
    createdAt: now,
    updatedAt: now,
  };

  return { chord, voicing };
}
