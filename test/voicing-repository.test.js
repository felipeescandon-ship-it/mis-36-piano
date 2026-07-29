import { describe, it } from "node:test";
import assert from "node:assert";
import { createChordBuilder } from "../src/application/chord-constructor/chord-builder.js";
import { createChordFactory } from "../src/application/chord-constructor/chord-factory.js";
import {
  createVoicingRepository,
} from "../src/infrastructure/voicing-repository.js";
import { createMockDatabase } from "./fixtures/mock-indexed-db.js";

const mockDatabase = () => createMockDatabase("voicings");

describe("Voicing Repository", () => {
  it("saves and retrieves voicing by ID", async () => {
    const db = mockDatabase();
    const repo = createVoicingRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());
    const voicing = factory.createVoicing(chord.id, builder.state(), "library", "Do Mayor");

    await repo.saveVoicing(db, voicing);
    const retrieved = await repo.getVoicing(db, voicing.id);

    assert.deepStrictEqual(retrieved, voicing);
  });

  it("returns null for nonexistent voicing", async () => {
    const db = mockDatabase();
    const repo = createVoicingRepository();

    const result = await repo.getVoicing(db, "nonexistent-id");
    assert.strictEqual(result, undefined);
  });

  it("retrieves all voicings", async () => {
    const db = mockDatabase();
    const repo = createVoicingRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());
    const voicing1 = factory.createVoicing(chord.id, builder.state(), "library", "Voicing 1");
    const voicing2 = factory.createVoicing(chord.id, builder.state(), "song", "Voicing 2");

    await repo.saveVoicing(db, voicing1);
    await repo.saveVoicing(db, voicing2);

    const all = await repo.getAllVoicings(db);
    assert.strictEqual(all.length, 2);
  });

  it("filters voicings by scope", async () => {
    const db = mockDatabase();
    const repo = createVoicingRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());
    const libraryVoicing = factory.createVoicing(
      chord.id,
      builder.state(),
      "library",
      "Biblioteca"
    );
    const songVoicing = factory.createVoicing(
      chord.id,
      builder.state(),
      "song",
      "Canción"
    );

    await repo.saveVoicing(db, libraryVoicing);
    await repo.saveVoicing(db, songVoicing);

    const library = await repo.getVoicingsByScope(db, "library");
    const song = await repo.getVoicingsByScope(db, "song");

    assert.strictEqual(library.length, 1);
    assert.strictEqual(song.length, 1);
    assert.strictEqual(library[0].scope, "library");
    assert.strictEqual(song[0].scope, "song");
  });

  it("deletes voicing by ID", async () => {
    const db = mockDatabase();
    const repo = createVoicingRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());
    const voicing = factory.createVoicing(chord.id, builder.state(), "library", "Do Mayor");

    await repo.saveVoicing(db, voicing);
    await repo.deleteVoicing(db, voicing.id);

    const retrieved = await repo.getVoicing(db, voicing.id);
    assert.strictEqual(retrieved, undefined);
  });

  it("updates voicing revision on save", async () => {
    const db = mockDatabase();
    const repo = createVoicingRepository();

    const builder = createChordBuilder();
    builder.setRoot({ pitchClass: 0, spelling: "C" });
    builder.setQuality("Mayor");
    builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

    const factory = createChordFactory();
    const chord = factory.createChord(builder.state());
    const voicing1 = factory.createVoicing(chord.id, builder.state(), "library", "V1");

    await repo.saveVoicing(db, voicing1);
    const retrieved1 = await repo.getVoicing(db, voicing1.id);

    // Create new revision (simulating edit).
    // La marca de tiempo se deriva de voicing1 en lugar de leer el reloj: la
    // prueba entera corre en menos de un milisegundo, así que dos llamadas
    // seguidas a new Date().toISOString() devuelven la misma cadena y la
    // comparación de abajo pasaría o fallaría según se cruce o no un borde de
    // milisegundo.
    const voicing2 = {
      ...voicing1,
      revision: "new-revision",
      updatedAt: new Date(Date.parse(voicing1.updatedAt) + 1000).toISOString(),
    };

    await repo.saveVoicing(db, voicing2);
    const retrieved2 = await repo.getVoicing(db, voicing1.id);

    assert.strictEqual(retrieved2.revision, "new-revision");
    assert.notStrictEqual(retrieved2.updatedAt, voicing1.updatedAt);
  });
});
