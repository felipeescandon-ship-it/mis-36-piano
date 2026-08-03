import { describe, it } from "node:test";
import assert from "node:assert";
import { buildAutoVoicingNotes, buildAutoChordAndVoicing } from "../src/application/song-library/chord-auto-voicing.js";
import { parseChordToken } from "../src/application/song-library/chord-text-parser.js";
import { validateNote, validateChord, validateVoicing, LOWEST_SUPPORTED_MIDI, HIGHEST_SUPPORTED_MIDI, midiNumber } from "../src/domain/validation.js";

function notesFor(symbol) {
  return buildAutoVoicingNotes(parseChordToken(symbol));
}

describe("Chord Auto Voicing", () => {
  it("builds a valid major triad within the supported register", () => {
    const notes = notesFor("C");
    notes.forEach(note => assert.doesNotThrow(() => validateNote(note)));
    assert.strictEqual(notes.length, 4); // bajo + fundamental, 3ª y 5ª
  });

  it("uses the alternate bass note for slash chords", () => {
    const notes = notesFor("Am/G");
    const bass = notes.find(note => note.hand === "left");
    assert.strictEqual(bass.pitchClass, 7);
  });

  it("stays inside Si1-Do7 for extended qualities like 9", () => {
    const notes = notesFor("D9");
    notes.forEach(note => {
      const midi = midiNumber(note);
      assert.ok(midi >= LOWEST_SUPPORTED_MIDI && midi <= HIGHEST_SUPPORTED_MIDI);
    });
  });

  it("produces distinct notes for every chord tone", () => {
    const notes = notesFor("Fmaj7");
    notes.forEach(note => assert.doesNotThrow(() => validateNote(note)));
    assert.strictEqual(notes.length, 5);
  });

  it("builds a valid chord and voicing pair, preserving the pasted symbol", () => {
    const parsed = parseChordToken("Am/G");
    const { chord, voicing } = buildAutoChordAndVoicing(parsed);
    assert.doesNotThrow(() => validateChord(chord));
    assert.doesNotThrow(() => validateVoicing(voicing));
    assert.strictEqual(chord.symbol, "Am/G");
    assert.strictEqual(chord.source, "generated");
    assert.strictEqual(chord.bass.pitchClass, 7);
    assert.strictEqual(voicing.chordId, chord.id);
    assert.strictEqual(voicing.scope, "song");
  });

  it("respects an explicit scope", () => {
    const parsed = parseChordToken("C");
    const { voicing } = buildAutoChordAndVoicing(parsed, { scope: "library" });
    assert.strictEqual(voicing.scope, "library");
  });
});
