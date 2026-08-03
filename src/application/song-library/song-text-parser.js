// Convierte una tablatura de texto pegada (acordes sobre la letra, más
// encabezados de sección entre corchetes) en una propuesta de secciones y
// líneas. No crea IDs ni acordes reales: `token` queda como lo devuelve
// `parseChordToken`, y quien llama decide si reutiliza un acorde existente o
// pide uno nuevo a `chord-auto-voicing.js`. El objetivo es una propuesta
// razonable que la persona ajusta después en el editor normal — no una
// alineación musicalmente exacta, que el formato de texto libre no garantiza.

import { parseChordToken } from "./chord-text-parser.js";

const SECTION_HEADER_RE = /^\s*\[(.+?)\]\s*$/;

function isBlank(line) {
  return !line.trim();
}

function tokenizeWithColumns(line) {
  const tokens = [];
  const re = /\S+/g;
  let match;
  while ((match = re.exec(line))) {
    tokens.push({ text: match[0], column: match.index });
  }
  return tokens;
}

function isChordLine(line) {
  if (isBlank(line)) return false;
  const tokens = tokenizeWithColumns(line);
  if (!tokens.length) return false;
  return tokens.every(token => parseChordToken(token.text) !== null);
}

function isParenChordLine(line) {
  const trimmed = line.trim();
  if (!/^\(.*\)$/.test(trimmed)) return false;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return false;
  return inner.split(/\s+/).every(token => parseChordToken(token) !== null);
}

// Un acorde en el hueco entre dos palabras se asigna a la palabra
// siguiente (convención habitual de cifrado); uno dentro del rango de una
// palabra se asigna a esa palabra.
function columnToAnchor(column, words, wordColumns) {
  for (let i = 0; i < words.length; i++) {
    const end = wordColumns[i] + words[i].length;
    if (column < end) return i;
  }
  return words.length;
}

function instrumentalLine(tokens) {
  const words = tokens.map(() => "·");
  return {
    text: words.join(" "),
    chords: tokens.map((token, index) => ({ anchor: index, token: parseChordToken(token.text ?? token) })),
  };
}

export function parseSongText(rawText) {
  const rawLines = (rawText || "").replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = null;
  const startSection = name => {
    current = { name: name || "Letra", lines: [] };
    sections.push(current);
  };
  startSection("Letra");

  let index = 0;
  while (index < rawLines.length) {
    const line = rawLines[index];
    const headerMatch = SECTION_HEADER_RE.exec(line);
    if (headerMatch) {
      startSection(headerMatch[1].trim());
      index += 1;
      continue;
    }
    if (isBlank(line)) {
      index += 1;
      continue;
    }

    if (isParenChordLine(line)) {
      const inner = line.trim().slice(1, -1).trim();
      const tokens = inner.split(/\s+/).map(text => ({ text }));
      current.lines.push(instrumentalLine(tokens));
      index += 1;
      continue;
    }

    if (isChordLine(line)) {
      const chordTokens = tokenizeWithColumns(line);
      const next = rawLines[index + 1];
      const hasLyricPartner = next !== undefined && !isBlank(next) &&
        !SECTION_HEADER_RE.test(next) && !isChordLine(next) && !isParenChordLine(next);

      if (hasLyricPartner) {
        const wordTokens = tokenizeWithColumns(next);
        const words = wordTokens.map(token => token.text);
        const wordColumns = wordTokens.map(token => token.column);
        current.lines.push({
          text: words.join(" "),
          chords: chordTokens.map(chordToken => ({
            anchor: columnToAnchor(chordToken.column, words, wordColumns),
            token: parseChordToken(chordToken.text),
          })),
        });
        index += 2;
        continue;
      }

      current.lines.push(instrumentalLine(chordTokens));
      index += 1;
      continue;
    }

    current.lines.push({ text: line.trim(), chords: [] });
    index += 1;
  }

  return { sections: sections.filter(section => section.lines.length > 0) };
}
