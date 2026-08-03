// Interpreta símbolos de acorde en notación anglosajona pegados desde una
// tablatura de texto (p.ej. "Am/G", "F7M(2/4+)", "C"). No construye el
// acorde: solo extrae fundamental, cualidad y bajo alternativo para que
// `chord-auto-voicing.js` genere las notas y el taller decida si reutiliza
// un acorde existente o crea uno nuevo.

const LETTER_PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SPELLING_BY_PITCH_CLASS_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SPELLING_BY_PITCH_CLASS_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Reglas de cualidad anchoradas: cada texto de cualidad limpio solo puede
// igualar una alternativa exacta, así que el orden de la lista no importa.
const QUALITY_RULES = [
  [/^(maj7|ma7|M7|7M)$/, "maj7"],
  [/^(m7b5|min7b5|m7-5|ø)$/, "m7b5"],
  [/^(m7|min7|-7)$/, "m7"],
  [/^(m6|min6|-6)$/, "m6"],
  [/^(m|min|-)$/, "menor"],
  [/^(dim|°|o)$/, "dim"],
  [/^(aug|\+)$/, "aug"],
  [/^(sus2)$/, "sus2"],
  [/^(sus4|sus)$/, "sus4"],
  [/^(add9)$/, "add9"],
  [/^(9)$/, "9"],
  [/^(6)$/, "6"],
  [/^(7)$/, "7"],
  [/^(maj|ma|M)?$/, "Mayor"],
];

const CHORD_TOKEN_RE = /^([A-G])([#b]?)([^/]*?)(?:\/([A-G])([#b]?))?$/;

function spellingFor(pitchClass, preferFlat) {
  return (preferFlat ? SPELLING_BY_PITCH_CLASS_FLAT : SPELLING_BY_PITCH_CLASS_SHARP)[pitchClass];
}

function pitchClassFor(letter, accidental) {
  const base = LETTER_PITCH_CLASS[letter];
  if (accidental === "#") return (base + 1) % 12;
  if (accidental === "b") return (base + 11) % 12;
  return base;
}

function cleanQualityText(rawQuality) {
  return rawQuality.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").trim();
}

// Devuelve null si `raw` no tiene forma de símbolo de acorde (fundamental
// A-G seguida, opcionalmente, de cualidad y bajo alternativo). Si la
// cualidad no se reconoce, hace una mejor aproximación y marca
// `approximate: true` para que la interfaz pueda avisar que conviene
// revisarlo.
export function parseChordToken(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  // Las anotaciones decorativas ("(2/4+)") pueden contener una barra que no
  // es el separador de bajo alternativo, así que se retiran antes de aplicar
  // la forma fundamental/cualidad/bajo — de lo contrario esa barra interna
  // rompe la coincidencia del bajo real.
  const withoutDecorations = cleanQualityText(trimmed);
  if (!withoutDecorations) return null;
  const match = CHORD_TOKEN_RE.exec(withoutDecorations);
  if (!match) return null;

  const [, rootLetter, rootAccidental, rawQuality, bassLetter, bassAccidental] = match;
  const rootPitchClass = pitchClassFor(rootLetter, rootAccidental);
  const rootSpelling = spellingFor(rootPitchClass, rootAccidental === "b");

  const cleanedQuality = rawQuality.trim();
  let quality = null;
  for (const [pattern, label] of QUALITY_RULES) {
    if (pattern.test(cleanedQuality)) {
      quality = label;
      break;
    }
  }

  let approximate = false;
  if (!quality) {
    approximate = true;
    if (/7/.test(cleanedQuality) && /m/i.test(cleanedQuality)) quality = "m7";
    else if (/7/.test(cleanedQuality)) quality = "7";
    else if (/m/i.test(cleanedQuality)) quality = "menor";
    else quality = "Mayor";
  }

  let bassPitchClass = null;
  let bassSpelling = null;
  if (bassLetter) {
    bassPitchClass = pitchClassFor(bassLetter, bassAccidental);
    bassSpelling = spellingFor(bassPitchClass, bassAccidental === "b");
  }

  return {
    rawText: trimmed,
    rootPitchClass,
    rootSpelling,
    quality,
    approximate,
    bassPitchClass,
    bassSpelling,
  };
}
