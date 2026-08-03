import { midiNumber } from "../../domain/validation.js";

const PITCH_CLASS_TO_ENGLISH = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PITCH_CLASS_TO_SPANISH = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

const QUALITY_SUFFIX = {
  Mayor: "",
  menor: "m",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  sus4: "sus4",
  dim: "dim",
  m7b5: "m7b5",
  aug: "aug",
};

function legacyNoteString(note) {
  return `${PITCH_CLASS_TO_ENGLISH[note.pitchClass]}${note.octave}`;
}

/**
 * `index.html` no conoce el modelo Chord/Voicing del constructor: sus vistas
 * leen un símbolo de texto como clave de `voicings`/`voicingVariants` y una
 * mano izquierda de una sola nota más una derecha en tuplas [nota, dedo]. Este
 * adaptador traduce en esa dirección, la contraria a `legacy-bridge.js`.
 */
export function toLegacyChord({ root, quality, bass, notes }) {
  if (!root || !quality) {
    throw new Error("Falta fundamental o cualidad para construir el acorde.");
  }
  const suffix = QUALITY_SUFFIX[quality];
  if (suffix === undefined) {
    throw new Error(`Cualidad no reconocida: ${quality}.`);
  }

  const rootEn = PITCH_CLASS_TO_ENGLISH[root.pitchClass];
  const rootEs = PITCH_CLASS_TO_SPANISH[root.pitchClass];
  const bassEn = bass ? PITCH_CLASS_TO_ENGLISH[bass.pitchClass] : null;
  const bassEs = bass ? PITCH_CLASS_TO_SPANISH[bass.pitchClass] : null;

  // Solo nombres para mostrar: el símbolo generado aquí puede coincidir por
  // casualidad con uno de los 12 acordes fijos (p. ej. "Re Mayor" produce el
  // mismo "D" que ya existe). No debe usarse como clave de `voicings` — quien
  // llama identifica cada acorde por su UUID, nunca por este texto.
  const englishName = bassEn ? `${rootEn}${suffix}/${bassEn}` : `${rootEn}${suffix}`;
  const spanishName = bassEs
    ? `${rootEs} ${quality} (${bassEs}/${rootEs})`
    : `${rootEs} ${quality}`;

  const leftNotes = (notes || [])
    .filter(note => note.hand === "left")
    .sort((a, b) => midiNumber(a) - midiNumber(b));
  const rightNotes = (notes || [])
    .filter(note => note.hand === "right")
    .sort((a, b) => midiNumber(a) - midiNumber(b));

  if (!leftNotes.length) {
    throw new Error("Falta una nota en la mano izquierda para el bajo.");
  }
  if (!rightNotes.length) {
    throw new Error("Falta al menos una nota en la mano derecha.");
  }

  const l = legacyNoteString(leftNotes[0]);
  // El dedo es opcional en el constructor; si no se eligió, se numera en
  // orden ascendente para que el teclado heredado tenga algo que mostrar.
  const r = rightNotes.map((note, index) => [legacyNoteString(note), note.finger ?? Math.min(5, index + 1)]);

  return { englishName, spanishName, l, r };
}
