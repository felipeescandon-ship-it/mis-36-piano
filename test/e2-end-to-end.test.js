import { describe, it } from "node:test";
import assert from "node:assert";
import { createChordBuilder } from "../src/application/chord-constructor/chord-builder.js";
import { createChordFactory } from "../src/application/chord-constructor/chord-factory.js";
import { createChordRepository } from "../src/infrastructure/chord-repository.js";
import { createVoicingRepository } from "../src/infrastructure/voicing-repository.js";
import { createChordPreviewPlayer } from "../src/application/chord-constructor/chord-preview-player.js";
import { validateChord, validateVoicing } from "../src/domain/validation.js";

import { createMockDatabase } from "./fixtures/mock-indexed-db.js";

const mockDatabase = () => createMockDatabase("chords", "voicings");

const mockAudio = () => {
  const played = [];
  return {
    playVoicing(voicing, at, duration, generation) {
      played.push({ voicing, at, duration, generation });
    },
    stopGeneration(generation) {
      // no-op for test
    },
    getPlayed() {
      return played;
    },
  };
};

describe("E2 End-to-End: Construct → Persist → Preview", () => {
  it("constructs Do Mayor, saves to DB, loads, and previews", async () => {
    // 1. CONSTRUCT
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right", finger: 1 });
    builder.addNote({ pitchClass: 4, octave: 4, spelling: "E", hand: "right", finger: 3 });
    builder.addNote({ pitchClass: 7, octave: 4, spelling: "G", hand: "right", finger: 5 });

    // 2. FACTORY
    const factory = createChordFactory();
    const chordState = builder.state();
    const chord = factory.createChord(chordState);
    const voicing = factory.createVoicing(
      chord.id,
      chordState,
      "library",
      "Posición abierta"
    );

    // Validate contracts
    validateChord(chord);
    validateVoicing(voicing);

    // 3. PERSIST
    const db = mockDatabase();
    const chordRepo = createChordRepository();
    const voicingRepo = createVoicingRepository();

    await chordRepo.saveChord(db, chord);
    await voicingRepo.saveVoicing(db, voicing);

    // 4. LOAD
    const loadedChord = await chordRepo.getChord(db, chord.id);
    const loadedVoicing = await voicingRepo.getVoicing(db, voicing.id);

    assert.deepStrictEqual(loadedChord, chord);
    assert.deepStrictEqual(loadedVoicing, voicing);

    // 5. PREVIEW
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    player.play(loadedVoicing, 0, 1.0);

    const state = player.state();
    assert.strictEqual(state.isPlaying, true);
    assert.strictEqual(state.voicingId, voicing.id);

    // Audio received the voicing
    const played = audio.getPlayed();
    assert.strictEqual(played.length, 1);
    assert.strictEqual(played[0].voicing.id, voicing.id);

    player.stop();
    assert.strictEqual(player.state().isPlaying, false);
  });

  it("saves multiple voicings of same chord", async () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chordState = builder.state();
    const chord = factory.createChord(chordState);

    // Create 3 different voicings of same chord
    const voicing1 = factory.createVoicing(chord.id, chordState, "library", "Posición 1");
    const voicing2 = factory.createVoicing(chord.id, chordState, "library", "Posición 2");
    const voicing3 = factory.createVoicing(chord.id, chordState, "song", "Posición canción");

    const db = mockDatabase();
    const chordRepo = createChordRepository();
    const voicingRepo = createVoicingRepository();

    await chordRepo.saveChord(db, chord);
    await voicingRepo.saveVoicing(db, voicing1);
    await voicingRepo.saveVoicing(db, voicing2);
    await voicingRepo.saveVoicing(db, voicing3);

    // All voicings reference same chord
    const allVoicings = await voicingRepo.getAllVoicings(db);
    assert.strictEqual(allVoicings.length, 3);
    assert(allVoicings.every(v => v.chordId === chord.id));

    // Filter by scope
    const library = await voicingRepo.getVoicingsByScope(db, "library");
    const song = await voicingRepo.getVoicingsByScope(db, "song");

    assert.strictEqual(library.length, 2);
    assert.strictEqual(song.length, 1);
  });

  it("prevents duplicate chord by ID", async () => {
    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());

    const db = mockDatabase();
    const chordRepo = createChordRepository();

    await chordRepo.saveChord(db, chord);

    // Saving again overwrites with same ID (expected behavior)
    const updatedChord = { ...chord, revision: "new-revision" };
    await chordRepo.saveChord(db, updatedChord);

    const all = await chordRepo.getAllChords(db);
    assert.strictEqual(all.length, 1); // Still one chord, not two
    assert.strictEqual(all[0].revision, "new-revision");
  });
});
