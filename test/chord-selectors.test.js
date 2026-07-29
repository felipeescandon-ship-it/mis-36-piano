import { describe, it } from "node:test";
import assert from "node:assert";
import { createChordBuilder } from "../src/application/chord-constructor/chord-builder.js";
import {
  selectChordName,
  selectNotes,
  selectIsComplete,
  selectCanAddNote,
  selectNoteCount,
  selectRoot,
  selectQuality,
  selectBass,
} from "../src/application/chord-constructor/chord-selectors.js";

describe("Chord Selectors", () => {
  it("selectChordName returns null when root not set", () => {
    const builder = createChordBuilder();
    assert.strictEqual(selectChordName(builder.state()), null);
  });

  it("selectChordName returns null when quality not set", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    assert.strictEqual(selectChordName(builder.state()), null);
  });

  it("selectChordName returns name without bass", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");

    assert.strictEqual(selectChordName(builder.state()), "Do Mayor");
  });

  it("selectChordName returns name with bass", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.setBass({ pitchClass: 7, spelling: "G" });

    assert.strictEqual(selectChordName(builder.state()), "Do Mayor (Sol/Do)");
  });

  it("selectNotes returns empty array initially", () => {
    const builder = createChordBuilder();
    assert.strictEqual(selectNotes(builder.state()).length, 0);
  });

  it("selectNotes includes MIDI number", () => {
    const builder = createChordBuilder();
    builder.addNote({
      pitchClass: 0,
      octave: 4,
      spelling: "C",
      hand: "right",
      finger: 1,
    });

    const notes = selectNotes(builder.state());
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].midiNumber, 60); // C4 = 60
    assert.strictEqual(notes[0].index, 0);
    assert.strictEqual(notes[0].finger, 1);
  });

  it("selectNotes calculates MIDI correctly for range", () => {
    const builder = createChordBuilder();
    builder.addNote({
      pitchClass: 0,
      octave: 2,
      spelling: "C",
      hand: "left",
    }); // C2 = 36
    builder.addNote({
      pitchClass: 0,
      octave: 7,
      spelling: "C",
      hand: "right",
    }); // C7 = 96

    const notes = selectNotes(builder.state());
    assert.strictEqual(notes[0].midiNumber, 36);
    assert.strictEqual(notes[1].midiNumber, 96);
  });

  it("selectIsComplete returns false when incomplete", () => {
    const builder = createChordBuilder();
    assert.strictEqual(selectIsComplete(builder.state()), false);

    builder.setRoot({ pitchClass: 0, spelling: "C" });
    assert.strictEqual(selectIsComplete(builder.state()), false);

    builder.setQuality("Mayor");
    assert.strictEqual(selectIsComplete(builder.state()), false);

    builder.addNote({
      pitchClass: 0,
      octave: 4,
      spelling: "C",
      hand: "right",
    });
    assert.strictEqual(selectIsComplete(builder.state()), true);
  });

  it("selectCanAddNote reflects state", () => {
    const builder = createChordBuilder();
    assert.strictEqual(selectCanAddNote(builder.state()), true);

    for (let i = 0; i < 32; i++) {
      builder.addNote({
        pitchClass: i % 12,
        octave: 2 + Math.floor(i / 12),
        spelling: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][i % 12],
        hand: i % 2 === 0 ? "left" : "right",
      });
    }
    assert.strictEqual(selectCanAddNote(builder.state()), false);
  });

  it("selectNoteCount reflects current count", () => {
    const builder = createChordBuilder();
    assert.strictEqual(selectNoteCount(builder.state()), 0);

    builder.addNote({
      pitchClass: 0,
      octave: 4,
      spelling: "C",
      hand: "right",
    });
    assert.strictEqual(selectNoteCount(builder.state()), 1);

    builder.addNote({
      pitchClass: 4,
      octave: 4,
      spelling: "E",
      hand: "right",
    });
    assert.strictEqual(selectNoteCount(builder.state()), 2);

    builder.removeNote(0);
    assert.strictEqual(selectNoteCount(builder.state()), 1);
  });

  it("selectRoot returns copy", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });

    const root1 = selectRoot(builder.state());
    const root2 = selectRoot(builder.state());

    assert.notStrictEqual(root1, root2);
    assert.deepStrictEqual(root1, root2);
  });

  it("selectRoot returns null when not set", () => {
    const builder = createChordBuilder();
    assert.strictEqual(selectRoot(builder.state()), null);
  });

  it("selectQuality reflects state", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("menor");

    assert.strictEqual(selectQuality(builder.state()), "menor");
  });

  it("selectBass returns copy", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setBass({ pitchClass: 7, spelling: "G" });

    const bass1 = selectBass(builder.state());
    const bass2 = selectBass(builder.state());

    assert.notStrictEqual(bass1, bass2);
    assert.deepStrictEqual(bass1, bass2);
  });

  it("selectBass returns null when not set", () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    assert.strictEqual(selectBass(builder.state()), null);
  });
});
