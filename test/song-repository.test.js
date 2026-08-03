import { describe, it } from "node:test";
import assert from "node:assert";
import { createSongFactory } from "../src/application/song-library/song-factory.js";
import { createSongRepository } from "../src/infrastructure/song-repository.js";
import { createMockDatabase } from "./fixtures/mock-indexed-db.js";

const mockDatabase = () => createMockDatabase("songs");

describe("Song Repository", () => {
  it("saves and retrieves a song by ID", async () => {
    const db = mockDatabase();
    const repo = createSongRepository();
    const song = createSongFactory().createSong({ title: "Canción" });

    await repo.saveSong(db, song);
    const retrieved = await repo.getSong(db, song.id);

    assert.deepStrictEqual(retrieved, song);
  });

  it("returns undefined for a nonexistent song", async () => {
    const db = mockDatabase();
    const repo = createSongRepository();

    const result = await repo.getSong(db, "nonexistent-id");
    assert.strictEqual(result, undefined);
  });

  it("retrieves all songs", async () => {
    const db = mockDatabase();
    const repo = createSongRepository();
    const factory = createSongFactory();
    const first = factory.createSong({ title: "Primera" });
    const second = factory.createSong({ title: "Segunda" });

    await repo.saveSong(db, first);
    await repo.saveSong(db, second);

    const all = await repo.getAllSongs(db);
    assert.strictEqual(all.length, 2);
  });

  it("separates active songs from archived songs", async () => {
    const db = mockDatabase();
    const repo = createSongRepository();
    const factory = createSongFactory();
    const active = factory.createSong({ title: "Activa" });
    const archived = factory.archiveSong(factory.createSong({ title: "Archivada" }));

    await repo.saveSong(db, active);
    await repo.saveSong(db, archived);

    const activeSongs = await repo.getActiveSongs(db);
    const archivedSongs = await repo.getArchivedSongs(db);

    assert.strictEqual(activeSongs.length, 1);
    assert.strictEqual(activeSongs[0].metadata.title, "Activa");
    assert.strictEqual(archivedSongs.length, 1);
    assert.strictEqual(archivedSongs[0].metadata.title, "Archivada");
  });

  it("deletes a song by ID", async () => {
    const db = mockDatabase();
    const repo = createSongRepository();
    const song = createSongFactory().createSong({ title: "Borrable" });

    await repo.saveSong(db, song);
    await repo.deleteSong(db, song.id);

    const retrieved = await repo.getSong(db, song.id);
    assert.strictEqual(retrieved, undefined);
  });

  it("updates song revision on save", async () => {
    const db = mockDatabase();
    const repo = createSongRepository();
    const song1 = createSongFactory().createSong({ title: "Editable" });

    await repo.saveSong(db, song1);

    const song2 = { ...song1, revision: "new-revision" };
    await repo.saveSong(db, song2);

    const retrieved = await repo.getSong(db, song1.id);
    assert.strictEqual(retrieved.revision, "new-revision");
  });
});
