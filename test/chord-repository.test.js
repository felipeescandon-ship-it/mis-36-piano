import { describe, it } from "node:test";
import assert from "node:assert";
import { createChordFactory } from "../src/application/chord-constructor/chord-factory.js";
import { createChordBuilder } from "../src/application/chord-constructor/chord-builder.js";
import {
  createChordRepository,
} from "../src/infrastructure/chord-repository.js";
import { createMockDatabase } from "./fixtures/mock-indexed-db.js";

const mockDatabase = () => createMockDatabase("chords");

describe("Chord Repository", () => {
  it("saves and retrieves chord by ID", async () => {
    const db = mockDatabase();
    const repo = createChordRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());

    await repo.saveChord(db, chord);
    const retrieved = await repo.getChord(db, chord.id);

    assert.deepStrictEqual(retrieved, chord);
  });

  it("returns undefined for nonexistent chord", async () => {
    const db = mockDatabase();
    const repo = createChordRepository();

    const result = await repo.getChord(db, "nonexistent-id");
    assert.strictEqual(result, undefined);
  });

  it("retrieves all chords", async () => {
    const db = mockDatabase();
    const repo = createChordRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord1 = factory.createChord(builder.state());

    builder.setQuality("menor");
    const chord2 = factory.createChord(builder.state());

    await repo.saveChord(db, chord1);
    await repo.saveChord(db, chord2);

    const all = await repo.getAllChords(db);
    assert.strictEqual(all.length, 2);
  });

  it("filters chords by source", async () => {
    const db = mockDatabase();
    const repo = createChordRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());

    // Create custom chords (simulating user-created)
    const customChord1 = { ...chord, source: "custom" };
    const customChord2 = { ...chord, source: "custom", id: "chord-2", symbol: "Re Mayor" };
    const legacyChord = { ...chord, source: "legacy", id: "chord-3", symbol: "Mi Mayor" };

    await repo.saveChord(db, customChord1);
    await repo.saveChord(db, customChord2);
    await repo.saveChord(db, legacyChord);

    const custom = await repo.getChordsBySource(db, "custom");
    const legacy = await repo.getChordsBySource(db, "legacy");

    assert.strictEqual(custom.length, 2);
    assert.strictEqual(legacy.length, 1);
  });

  it("deletes chord by ID", async () => {
    const db = mockDatabase();
    const repo = createChordRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());

    await repo.saveChord(db, chord);
    await repo.deleteChord(db, chord.id);

    const retrieved = await repo.getChord(db, chord.id);
    assert.strictEqual(retrieved, undefined);
  });

  it("updates chord revision on save", async () => {
    const db = mockDatabase();
    const repo = createChordRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord1 = factory.createChord(builder.state());

    await repo.saveChord(db, chord1);
    const retrieved1 = await repo.getChord(db, chord1.id);

    // Create new revision (simulating edit)
    const chord2 = {
      ...chord1,
      revision: "new-revision",
    };

    await repo.saveChord(db, chord2);
    const retrieved2 = await repo.getChord(db, chord1.id);

    assert.strictEqual(retrieved2.revision, "new-revision");
  });
});
