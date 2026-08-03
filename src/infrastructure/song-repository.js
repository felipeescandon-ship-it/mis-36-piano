function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

export function createSongRepository() {
  return {
    async saveSong(database, song) {
      const transaction = database.transaction(["songs"], "readwrite");
      const store = transaction.objectStore("songs");
      store.put(song, song.id);
      await transactionComplete(transaction);
    },

    async getSong(database, songId) {
      const transaction = database.transaction(["songs"], "readonly");
      const request = transaction.objectStore("songs").get(songId);
      return requestResult(request);
    },

    async getAllSongs(database) {
      const transaction = database.transaction(["songs"], "readonly");
      const request = transaction.objectStore("songs").getAll();
      return requestResult(request);
    },

    async getActiveSongs(database) {
      const all = await this.getAllSongs(database);
      return all.filter(song => !song.archivedAt);
    },

    async getArchivedSongs(database) {
      const all = await this.getAllSongs(database);
      return all.filter(song => Boolean(song.archivedAt));
    },

    async deleteSong(database, songId) {
      const transaction = database.transaction(["songs"], "readwrite");
      const store = transaction.objectStore("songs");
      store.delete(songId);
      await transactionComplete(transaction);
    },
  };
}
