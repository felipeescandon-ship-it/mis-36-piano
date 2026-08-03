import { describe, it } from "node:test";
import assert from "node:assert";
import { createSongFactory } from "../src/application/song-library/song-factory.js";
import { validateSong } from "../src/domain/validation.js";

describe("Song Factory", () => {
  it("creates a valid empty song", () => {
    const factory = createSongFactory();
    const song = factory.createSong({ title: "Nueva canción" });

    assert.doesNotThrow(() => validateSong(song));
    assert.strictEqual(song.metadata.title, "Nueva canción");
    assert.strictEqual(song.sections.length, 1);
    assert.strictEqual(song.archivedAt, null);
  });

  it("fills metadata defaults", () => {
    const factory = createSongFactory();
    const song = factory.createSong({ title: "Sin datos" });

    assert.strictEqual(song.metadata.artist, "");
    assert.strictEqual(song.metadata.tempo, 120);
    assert.deepStrictEqual(song.metadata.timeSignature, [4, 4]);
    assert.strictEqual(song.metadata.notation, "es");
  });

  it("duplicates a song with new identifiers", () => {
    const factory = createSongFactory();
    const original = factory.createSong({ title: "Original" });
    const copy = factory.duplicateSong(original);

    assert.doesNotThrow(() => validateSong(copy));
    assert.notStrictEqual(copy.id, original.id);
    assert.notStrictEqual(copy.revision, original.revision);
    assert.strictEqual(copy.metadata.title, "Original (copia)");
    assert.notStrictEqual(copy.sections[0].id, original.sections[0].id);
    assert.notStrictEqual(copy.sections[0].lines[0].id, original.sections[0].lines[0].id);
  });

  it("duplicates preserving chord events with new own identifiers", () => {
    const factory = createSongFactory();
    const original = factory.createSong({ title: "Con acordes" });
    const line = original.sections[0].lines[0];
    original.sections[0].events.push({
      id: crypto.randomUUID(),
      lineId: line.id,
      anchor: 0,
      position: 0,
      beats: 1,
      chord: { chordId: crypto.randomUUID(), voicingId: crypto.randomUUID(), voicingRevision: crypto.randomUUID() },
    });

    const copy = factory.duplicateSong(original);
    const originalEvent = original.sections[0].events[0];
    const copiedEvent = copy.sections[0].events[0];

    assert.notStrictEqual(copiedEvent.id, originalEvent.id);
    assert.strictEqual(copiedEvent.lineId, copy.sections[0].lines[0].id);
    assert.deepStrictEqual(copiedEvent.chord, originalEvent.chord);
  });

  it("allows a custom title when duplicating", () => {
    const factory = createSongFactory();
    const original = factory.createSong({ title: "Original" });
    const copy = factory.duplicateSong(original, "Otro nombre");

    assert.strictEqual(copy.metadata.title, "Otro nombre");
  });

  it("archives and restores a song", () => {
    const factory = createSongFactory();
    const song = factory.createSong({ title: "Archivable" });

    const archived = factory.archiveSong(song);
    assert.doesNotThrow(() => validateSong(archived));
    assert.notStrictEqual(archived.archivedAt, null);

    const restored = factory.restoreSong(archived);
    assert.doesNotThrow(() => validateSong(restored));
    assert.strictEqual(restored.archivedAt, null);
  });
});
