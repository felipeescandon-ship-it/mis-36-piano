const defaultInversions = {
  E: "root", "F#": "first", "F#m": "first", A: "first", Am: "first", "C#m": "second",
  "C#": "second", "G#m": "first", "G#": "first", D: "second", B: "root", "B/D#": "root",
};

const baseVoicings = {
  E: { l: "E2", spell: {} },
  "F#": { l: "F#2", spell: {} },
  "F#m": { l: "F#2", spell: {} },
  A: { l: "A2", spell: {} },
  Am: { l: "A2", spell: {} },
  "C#m": { l: "C#2", spell: {} },
  "C#": { l: "C#2", spell: { F: "E#" } },
  "G#m": { l: "G#2", spell: {} },
  "G#": { l: "G#2", spell: { C: "B#" } },
  D: { l: "D2", spell: {} },
  B: { l: "B1", spell: {} },
  "B/D#": { l: "D#2", spell: {} },
};

const voicingVariants = {
  E: {
    root: [["E4", 1], ["G#4", 3], ["B4", 5]],
    first: [["G#3", 1], ["B3", 2], ["E4", 5]],
    second: [["B3", 1], ["E4", 2], ["G#4", 5]],
  },
  "F#": {
    root: [["F#3", 1], ["A#3", 3], ["C#4", 5]],
    first: [["A#3", 1], ["C#4", 2], ["F#4", 5]],
    second: [["C#4", 1], ["F#4", 2], ["A#4", 5]],
  },
  "F#m": {
    root: [["F#3", 1], ["A3", 3], ["C#4", 5]],
    first: [["A3", 1], ["C#4", 2], ["F#4", 5]],
    second: [["C#4", 1], ["F#4", 2], ["A4", 5]],
  },
  A: {
    root: [["A3", 1], ["C#4", 3], ["E4", 5]],
    first: [["C#4", 1], ["E4", 2], ["A4", 5]],
    second: [["E3", 1], ["A3", 2], ["C#4", 5]],
  },
  Am: {
    root: [["A3", 1], ["C4", 3], ["E4", 5]],
    first: [["C4", 1], ["E4", 2], ["A4", 5]],
    second: [["E3", 1], ["A3", 2], ["C4", 5]],
  },
  "C#m": {
    root: [["C#4", 1], ["E4", 3], ["G#4", 5]],
    first: [["E3", 1], ["G#3", 2], ["C#4", 5]],
    second: [["G#3", 1], ["C#4", 3], ["E4", 5]],
  },
  "C#": {
    root: [["C#4", 1], ["F4", 3], ["G#4", 5]],
    first: [["F3", 1], ["G#3", 2], ["C#4", 5]],
    second: [["G#3", 1], ["C#4", 2], ["F4", 5]],
  },
  "G#m": {
    root: [["G#3", 1], ["B3", 3], ["D#4", 5]],
    first: [["B3", 1], ["D#4", 2], ["G#4", 5]],
    second: [["D#4", 1], ["G#4", 2], ["B4", 5]],
  },
  "G#": {
    root: [["G#3", 1], ["C4", 3], ["D#4", 5]],
    first: [["C4", 1], ["D#4", 2], ["G#4", 5]],
    second: [["D#3", 1], ["G#3", 2], ["C4", 5]],
  },
  D: {
    root: [["D4", 1], ["F#4", 3], ["A4", 5]],
    first: [["F#3", 1], ["A3", 2], ["D4", 5]],
    second: [["A3", 1], ["D4", 2], ["F#4", 5]],
  },
  B: {
    root: [["B3", 1], ["D#4", 3], ["F#4", 5]],
    first: [["D#4", 1], ["F#4", 2], ["B4", 5]],
    second: [["F#3", 1], ["B3", 2], ["D#4", 5]],
  },
  "B/D#": {
    root: [["B3", 1], ["D#4", 3], ["F#4", 5]],
    first: [["D#4", 1], ["F#4", 2], ["B4", 5]],
    second: [["F#3", 1], ["B3", 2], ["D#4", 5]],
  },
};

const rows = [
  ["Introducción", [
    ["Introducción instrumental", "E", "F#", "A", "E", "C#m", "F#", "Am"],
    ["Entrada: Esto no es solo un atajo", "E"],
  ]],
  ["Estrofa 1", [
    ["Esto no es solo un atajo", "E", "F#m", "A"],
    ["Para evitar la guerra que viene después", "E", "C#m"],
    ["Ni es un domingo cualquiera", "F#"],
    ["Es el previo al adiós más duro de mis 36", "Am", "E"],
    ["Te tomé la palabra", "E", "F#m", "A"],
    ["Siempre fui de ceñirme al guion", "A", "E", "C#m"],
    ["Y tú, de bailarme el agua", "C#m", "F#"],
    ["Con tal de lograr distraer mi atención", "A", "E"],
  ]],
  ["Pre-coro 1", [
    ["Y sabes cuáles son todas mis cartas", "C#m", "G#m", "A"],
    ["Y nunca sentí que peligrara nada", "A", "E"],
    ["Me enseñaste tus perfiles", "D"],
    ["Pero, de frente, siempre me faltabas", "B"],
  ]],
  ["Coro 1", [
    ["Anoche, mientras dormía", "A"],
    ["Sentí una culpa que no era mía", "B/D#", "G#"],
    ["Yo siempre te he sido muy claro", "C#m"],
    ["Cuando quería volar más alto", "C#"],
    ["No quiero hablar más de tus pactos", "F#m"],
    ["O me quieres como yo lo hago", "B"],
    ["O me marcho", "E"],
  ]],
  ["Estrofa 2", [
    ["Al final del camino", "E", "F#m", "A"],
    ["Puede que al marcharme haya menos dolor", "E", "C#m"],
    ["Y que, con distancia, el olvido", "C#m", "F#"],
    ["Nos deje el recuerdo de lo que hicimos mejor", "A", "E"],
  ]],
  ["Pre-coro 2", [
    ["Y sabes cuáles son todas mis cartas", "C#m", "G#m", "A"],
    ["Y nunca sentí que peligrara nada", "A", "E"],
    ["Me enseñaste tus perfiles", "D"],
    ["Pero, de frente, siempre me faltabas", "B"],
  ]],
  ["Coro 2", [
    ["Anoche, mientras dormía", "A"],
    ["Sentí una culpa que no era mía", "B/D#", "G#"],
    ["Yo siempre te he sido muy claro", "C#m"],
    ["Cuando quería volar más alto", "C#"],
    ["No quiero hablar más de tus pactos", "F#m"],
    ["O me quieres como yo lo hago", "B"],
  ]],
  ["Puente", [
    ["O me marchooooooooooo", "A", "B/D#", "G#", "C#m", "C#"],
    ["O me marcho", "F#m", "B"],
  ]],
  ["Pre-coro final", [
    ["Sabes cuáles son todas mis cartas", "C#m", "G#m", "A"],
    ["Y nunca sentí que peligrara nada", "A", "E"],
    ["Me enseñaste tus perfiles", "D"],
    ["Pero, de frente, siempre me faltabas", "B"],
  ]],
  ["Coro final", [
    ["Anoche, mientras dormía", "A"],
    ["Sentí una culpa que no era mía", "B/D#", "G#"],
    ["Yo siempre te he sido muy claro", "C#m"],
    ["Cuando quería volar más alto", "C#"],
    ["No quiero hablar más de tus pactos", "F#m"],
    ["O me quieres como yo lo hago", "B"],
    ["O me marcho", "E"],
  ]],
];

function buildSections() {
  return rows.map(([name, sectionRows]) => ({
    name,
    lines: sectionRows.map(([lyric]) => lyric),
    events: sectionRows.flatMap(([lyric, ...chords], line) => chords.map((chord, chordIndex) => ({
      uid: `${line}:${chordIndex}`,
      chord,
      lyric,
      line,
      beats: 4,
      inversion: defaultInversions[chord],
    }))),
  }));
}

const placements = [
  ["0:0:0", 0, 0, 4], ["0:0:1", 0, 0, 4], ["0:0:2", 0, 0, 4],
  ["0:0:3", 0, 0, 4], ["0:0:4", 0, 1, 4], ["0:0:5", 0, 1, 4],
  ["0:0:6", 0, 1, 4], ["0:1:0", 1, 0, 4],
  ["1:0:0", 0, 0, 4], ["1:0:1", 0, 5, 4], ["1:0:2", 1, 0, 4],
  ["1:1:0", 1, 6, 4], ["1:1:1", 1, 7, 4], ["1:2:0", 2, 4, 4],
  ["1:3:0", 3, 2, 4], ["1:3:1", 3, 9, 4], ["1:4:0", 4, 0, 4],
  ["1:4:1", 4, 3, 4], ["1:5:0", 5, 0, 4], ["1:5:1", 5, 5, 4],
  ["1:6:0", 6, 0, 4], ["1:6:1", 6, 3, 4], ["1:7:0", 7, 0, 4],
  ["1:7:1", 7, 6, 4],
  ["2:0:0", 0, 0, 4], ["2:0:1", 0, 6, 4], ["2:1:0", 1, 0, 4],
  ["2:1:1", 1, 5, 4], ["2:2:0", 2, 1, 4], ["2:3:0", 3, 2, 4],
  ["3:0:0", 0, 0, 4], ["3:1:0", 1, 2, 2], ["3:1:1", 1, 5, 2],
  ["3:2:0", 2, 1, 4], ["3:3:0", 3, 1, 4], ["3:4:0", 4, 1, 4],
  ["3:5:0", 5, 2, 4], ["3:6:0", 6, 2, 4],
  ["4:0:0", 0, 0, 4], ["4:0:1", 0, 3, 4], ["4:0:2", 1, 0, 4],
  ["4:1:0", 1, 5, 4], ["4:2:0", 1, 7, 4], ["4:2:1", 2, 4, 4],
  ["4:3:0", 3, 1, 4], ["4:3:1", 3, 8, 4],
  ["5:0:0", 0, 0, 4], ["5:0:1", 0, 6, 4], ["5:1:0", 1, 0, 4],
  ["5:1:1", 1, 5, 4], ["5:2:0", 2, 0, 4], ["5:3:0", 3, 2, 4],
  ["6:0:0", 0, 0, 4], ["6:1:0", 1, 2, 4], ["6:1:1", 1, 4, 4],
  ["6:2:0", 3, 1, 4], ["6:3:0", 3, 1, 4], ["6:4:0", 4, 1, 4],
  ["6:5:0", 4, 1, 4],
  ["7:0:0", 0, 0, 4], ["7:0:1", 0, 0, 4], ["7:0:2", 0, 1, 4],
  ["7:0:3", 0, 1, 4], ["7:0:4", 0, 3, 4], ["7:1:0", 1, 1, 4],
  ["7:1:1", 1, 3, 4],
  ["8:0:0", 0, 0, 4], ["8:0:1", 0, 5, 4], ["8:0:2", 0, 6, 4],
  ["8:1:0", 1, 0, 4], ["8:1:1", 1, 5, 4], ["8:2:0", 2, 0, 4],
  ["8:3:0", 3, 0, 4],
  ["9:0:0", 0, 0, 4], ["9:1:0", 1, 2, 4], ["9:1:1", 1, 4, 4],
  ["9:2:0", 2, 1, 4], ["9:3:0", 3, 1, 4], ["9:4:0", 4, 0, 4],
  ["9:5:0", 5, 0, 4], ["9:6:0", 6, 2, 4],
];

function buildSongSync(sections) {
  const positions = new Map();
  const events = {};
  for (const [key, line, anchor, beats] of placements) {
    const sectionIndex = Number.parseInt(key, 10);
    const uid = key.slice(key.indexOf(":") + 1);
    const event = sections[sectionIndex].events.find(item => item.uid === uid);
    const position = positions.get(sectionIndex) || 0;
    positions.set(sectionIndex, position + 1);
    events[key] = { chord: event.chord, inversion: event.inversion, line, anchor, beats, position };
  }
  return {
    version: 4,
    events,
    deleted: ["1:5:2", "1:4:2", "2:0:2", "4:1:1", "5:0:2"],
    added: [],
  };
}

const sections = buildSections();

export const mis36LegacyFixture = {
  format: "mis36-cloud-v1",
  revision: "d21083ad-cf4a-486b-8661-494778a2a83d",
  updatedAt: "2026-07-26T07:28:27.656Z",
  metadata: {
    title: "Mis 36",
    artist: "Pablo Alborán",
    key: "E",
    tempo: 72,
    timeSignature: [4, 4],
    notation: "es",
    tags: [],
  },
  defaults: { sections, defaultInversions, baseVoicings, voicingVariants },
  songSync: buildSongSync(sections),
};
