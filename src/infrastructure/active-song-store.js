const ACTIVE_SONG_KEY = "piano-library:active-song-id";

// La canción activa es un puntero simple, no un recurso versionado — vive en
// localStorage junto al resto de los ajustes heredados, no en IndexedDB.
export function createActiveSongStore(storage = globalThis.localStorage) {
  return {
    getActiveSongId() {
      return storage.getItem(ACTIVE_SONG_KEY);
    },

    setActiveSongId(songId) {
      storage.setItem(ACTIVE_SONG_KEY, songId);
    },

    clearActiveSongId() {
      storage.removeItem(ACTIVE_SONG_KEY);
    },
  };
}
