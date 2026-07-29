import { describe, it } from "node:test";
import assert from "node:assert";
import { createChordBuilder } from "../src/application/chord-constructor/chord-builder.js";
import { createChordFactory } from "../src/application/chord-constructor/chord-factory.js";
import { validateChord, validateVoicing } from "../src/domain/validation.js";

const PITCH_TO_SPELLING = {
  0: "C", 1: "C#", 2: "D", 3: "D#", 4: "E", 5: "F",
  6: "F#", 7: "G", 8: "G#", 9: "A", 10: "A#", 11: "B",
};

describe("Chord Constructor", () => {
  describe("ChordBuilder state machine", () => {
    it("starts with empty state", () => {
      const builder = createChordBuilder();
      assert.strictEqual(builder.state().root, null);
      assert.strictEqual(builder.state().quality, null);
      assert.strictEqual(builder.state().notes.length, 0);
    });

    it("sets root and quality", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");

      const state = builder.state();
      assert.strictEqual(state.root.pitchClass, 0);
      assert.strictEqual(state.quality, "Mayor");
    });

    it("rejects invalid root", () => {
      const builder = createChordBuilder();
      assert.throws(
        () => builder.setRoot({ pitchClass: 12, spelling: "C" }),
        /altura/i
      );
    });

    it("sets optional bass", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setBass({ pitchClass: 7, spelling: "G" });

      assert.strictEqual(builder.state().bass.pitchClass, 7);
    });

    it("clears bass when set to null", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setBass({ pitchClass: 7, spelling: "G" });
      builder.setBass(null);

      assert.strictEqual(builder.state().bass, null);
    });

    it("adds note with hand and optional finger", () => {
      const builder = createChordBuilder();
      builder.addNote({
        pitchClass: 0,
        octave: 4,
        spelling: "C",
        hand: "right",
        finger: 1,
      });

      const notes = builder.state().notes;
      assert.strictEqual(notes.length, 1);
      assert.strictEqual(notes[0].octave, 4);
      assert.strictEqual(notes[0].finger, 1);
    });

    it("adds note without finger", () => {
      const builder = createChordBuilder();
      builder.addNote({
        pitchClass: 0,
        octave: 4,
        spelling: "C",
        hand: "right",
      });

      const note = builder.state().notes[0];
      assert.strictEqual(note.finger, undefined);
    });

    it("rejects invalid note (out of range)", () => {
      const builder = createChordBuilder();
      assert.throws(
        () => builder.addNote({
          pitchClass: 0,
          octave: 9,
          spelling: "C",
          hand: "right",
        }),
        /octava|registro/i
      );
    });

    it("removes note by index", () => {
      const builder = createChordBuilder();
      builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });
      builder.addNote({ pitchClass: 4, octave: 4, spelling: "E", hand: "right" });

      builder.removeNote(0);

      const notes = builder.state().notes;
      assert.strictEqual(notes.length, 1);
      assert.strictEqual(notes[0].pitchClass, 4);
    });

    it("clears all notes", () => {
      const builder = createChordBuilder();
      builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });
      builder.addNote({ pitchClass: 4, octave: 4, spelling: "E", hand: "right" });

      builder.clearNotes();

      assert.strictEqual(builder.state().notes.length, 0);
    });

    it("rejects if at least one note is required", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");

      assert.throws(
        () => builder.build("library", "Do Mayor, posición abierta"),
        /nota/i
      );
    });
  });

  describe("ChordFactory", () => {
    it("creates immutable Chord from builder state", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");
      builder.setBass({ pitchClass: 7, spelling: "G" });

      const factory = createChordFactory();
      const chord = factory.createChord(builder.state());

      validateChord(chord);
      assert.strictEqual(chord.symbol, "Do Mayor (Sol/Do)");
      assert.strictEqual(chord.root.pitchClass, 0);
      assert.strictEqual(chord.bass.pitchClass, 7);
      assert.strictEqual(chord.source, "custom");
    });

    it("creates symbol without bass when not set", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");

      const factory = createChordFactory();
      const chord = factory.createChord(builder.state());

      assert.strictEqual(chord.symbol, "Do Mayor");
    });

    it("creates immutable Voicing from builder state", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");
      builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "left" });
      builder.addNote({ pitchClass: 4, octave: 4, spelling: "E", hand: "right", finger: 3 });

      const factory = createChordFactory();
      const chordState = builder.state();
      const chord = factory.createChord(chordState);
      const voicing = factory.createVoicing(chord.id, chordState, "library", "Posición abierta");

      validateVoicing(voicing);
      assert.strictEqual(voicing.chordId, chord.id);
      assert.strictEqual(voicing.scope, "library");
      assert.strictEqual(voicing.notes.length, 2);
      assert.strictEqual(voicing.notes[1].finger, 3);
    });

    it("creates Voicing with song scope", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");
      builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

      const factory = createChordFactory();
      const chordState = builder.state();
      const chord = factory.createChord(chordState);
      const voicing = factory.createVoicing(chord.id, chordState, "song", "Do Mayor");

      assert.strictEqual(voicing.scope, "song");
    });

    it("creates distinct revisions for successive calls", () => {
      const factory = createChordFactory();
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      builder.setQuality("Mayor");

      const chord1 = factory.createChord(builder.state());
      const chord2 = factory.createChord(builder.state());

      assert.notStrictEqual(chord1.revision, chord2.revision);
    });
  });

  describe("Quality options", () => {
    it("accepts base qualities", () => {
      const qualities = ["Mayor", "menor", "7", "maj7", "m7", "sus4"];
      qualities.forEach(quality => {
        const builder = createChordBuilder();
        builder.setRoot({ pitchClass: 0, spelling: "C" });
        assert.doesNotThrow(() => builder.setQuality(quality));
      });
    });

    it("accepts extended qualities", () => {
      const qualities = ["dim", "m7b5", "aug"];
      qualities.forEach(quality => {
        const builder = createChordBuilder();
        builder.setRoot({ pitchClass: 0, spelling: "C" });
        assert.doesNotThrow(() => builder.setQuality(quality));
      });
    });

    it("rejects unknown quality", () => {
      const builder = createChordBuilder();
      builder.setRoot({ pitchClass: 0, spelling: "C" });
      assert.throws(() => builder.setQuality("9sus2"), /cualidad/i);
    });
  });

  describe("Range validation", () => {
    it("accepts Do2 (octave 2, MIDI 36)", () => {
      const builder = createChordBuilder();
      assert.doesNotThrow(() => builder.addNote({
        pitchClass: 0,
        octave: 2,
        spelling: "C",
        hand: "left",
      }));
    });

    it("accepts Do7 (octave 7, MIDI 84)", () => {
      const builder = createChordBuilder();
      assert.doesNotThrow(() => builder.addNote({
        pitchClass: 0,
        octave: 7,
        spelling: "C",
        hand: "right",
      }));
    });

    it("rejects Do1 (too low for E2)", () => {
      const builder = createChordBuilder();
      assert.throws(() => builder.addNote({
        pitchClass: 0,
        octave: 1,
        spelling: "C",
        hand: "left",
      }), /octava|rango/i);
    });

    it("rejects Do8 (too high for E2)", () => {
      const builder = createChordBuilder();
      assert.throws(() => builder.addNote({
        pitchClass: 0,
        octave: 8,
        spelling: "C",
        hand: "right",
      }), /octava|rango/i);
    });
  });

  describe("Note limit", () => {
    it("allows up to 32 notes", () => {
      const builder = createChordBuilder();
      for (let i = 0; i < 32; i++) {
        const pitchClass = i % 12;
        builder.addNote({
          pitchClass,
          octave: 2 + Math.floor(i / 12),
          spelling: PITCH_TO_SPELLING[pitchClass],
          hand: i % 2 === 0 ? "left" : "right",
        });
      }
      assert.strictEqual(builder.state().notes.length, 32);
    });

    it("rejects 33rd note", () => {
      const builder = createChordBuilder();
      for (let i = 0; i < 32; i++) {
        const pitchClass = i % 12;
        builder.addNote({
          pitchClass,
          octave: 2 + Math.floor(i / 12),
          spelling: PITCH_TO_SPELLING[pitchClass],
          hand: i % 2 === 0 ? "left" : "right",
        });
      }
      assert.throws(() => builder.addNote({
        pitchClass: 0,
        octave: 7,
        spelling: "C",
        hand: "right",
      }), /notas/i);
    });
  });
});
