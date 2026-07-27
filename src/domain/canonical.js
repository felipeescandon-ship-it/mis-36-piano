import { effectiveLegacySections, legacyChordParts } from "./legacy-mis36.js";
import { stableStringify } from "./stable.js";

function canonicalNote(note) {
  return {
    pitchClass: note.pitchClass,
    octave: note.octave,
    spelling: note.spelling,
    hand: note.hand,
    finger: note.finger ?? null,
  };
}

export function canonicalLegacy(source) {
  return {
    metadata: {
      title: source.metadata.title,
      artist: source.metadata.artist || "",
      key: source.metadata.key || "",
      tempo: source.metadata.tempo,
      timeSignature: [...source.metadata.timeSignature],
      notation: source.metadata.notation,
      tags: [...source.metadata.tags],
    },
    sections: effectiveLegacySections(source).map(section => ({
      name: section.name,
      lines: [...section.lines],
      events: section.events.map(event => ({
        line: event.line,
        anchor: event.anchor,
        position: event.position,
        beats: event.beats,
        symbol: event.chord,
        bass: legacyChordParts(event.chord).bass,
        inversion: event.inversion,
        notes: event.notes.map(canonicalNote),
      })),
    })),
  };
}

export function canonicalLibrary({ song, chords, voicings }) {
  const chordById = new Map(chords.map(chord => [chord.id, chord]));
  const voicingById = new Map(voicings.map(voicing => [voicing.id, voicing]));
  const inversionByLabel = new Map([
    ["Fundamental", "root"],
    ["1.ª inversión", "first"],
    ["2.ª inversión", "second"],
  ]);
  return {
    metadata: structuredClone(song.metadata),
    sections: song.sections.map(section => {
      const lineIndexById = new Map(section.lines.map((line, index) => [line.id, index]));
      return {
        name: section.name,
        lines: section.lines.map(line => line.text),
        events: section.events.map(event => {
          const chord = chordById.get(event.chord.chordId);
          const voicing = voicingById.get(event.chord.voicingId);
          return {
            line: lineIndexById.get(event.lineId),
            anchor: event.anchor,
            position: event.position,
            beats: event.beats,
            symbol: chord.symbol,
            bass: chord.bass,
            inversion: inversionByLabel.get(voicing.pedagogy.inversionLabel) || voicing.pedagogy.inversionLabel,
            notes: voicing.notes.map(canonicalNote),
          };
        }),
      };
    }),
  };
}

export function compareCanonical(legacy, library) {
  const expected = canonicalLegacy(legacy);
  const actual = canonicalLibrary(library);
  const expectedText = stableStringify(expected);
  const actualText = stableStringify(actual);
  return {
    equal: expectedText === actualText,
    expected,
    actual,
    checks: {
      sections: stableStringify(expected.sections.map(section => section.name)) ===
        stableStringify(actual.sections.map(section => section.name)),
      lines: stableStringify(expected.sections.map(section => section.lines)) ===
        stableStringify(actual.sections.map(section => section.lines)),
      events: expected.sections.reduce((sum, section) => sum + section.events.length, 0) ===
        actual.sections.reduce((sum, section) => sum + section.events.length, 0),
      voicings: stableStringify(expected.sections.map(section => section.events.map(event => event.notes))) ===
        stableStringify(actual.sections.map(section => section.events.map(event => event.notes))),
      durations: stableStringify(expected.sections.map(section => section.events.map(event => event.beats))) ===
        stableStringify(actual.sections.map(section => section.events.map(event => event.beats))),
    },
  };
}
