import { describe, it } from "node:test";
import assert from "node:assert";
import { createActiveSongStore } from "../src/infrastructure/active-song-store.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

describe("Active Song Store", () => {
  it("returns null when no song is active", () => {
    const store = createActiveSongStore(createMemoryStorage());
    assert.strictEqual(store.getActiveSongId(), null);
  });

  it("persists the active song id", () => {
    const store = createActiveSongStore(createMemoryStorage());
    store.setActiveSongId("song-1");
    assert.strictEqual(store.getActiveSongId(), "song-1");
  });

  it("overwrites the active song id", () => {
    const store = createActiveSongStore(createMemoryStorage());
    store.setActiveSongId("song-1");
    store.setActiveSongId("song-2");
    assert.strictEqual(store.getActiveSongId(), "song-2");
  });

  it("clears the active song id", () => {
    const store = createActiveSongStore(createMemoryStorage());
    store.setActiveSongId("song-1");
    store.clearActiveSongId();
    assert.strictEqual(store.getActiveSongId(), null);
  });
});
