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

export function createChordRepository() {
  return {
    async saveChord(database, chord) {
      const transaction = database.transaction(["chords"], "readwrite");
      const store = transaction.objectStore("chords");
      store.put(chord, chord.id);
      await transactionComplete(transaction);
    },

    async getChord(database, chordId) {
      const transaction = database.transaction(["chords"], "readonly");
      const request = transaction.objectStore("chords").get(chordId);
      return requestResult(request);
    },

    async getAllChords(database) {
      const transaction = database.transaction(["chords"], "readonly");
      const request = transaction.objectStore("chords").getAll();
      return requestResult(request);
    },

    async getChordsBySource(database, source) {
      const all = await this.getAllChords(database);
      return all.filter(chord => chord.source === source);
    },

    async deleteChord(database, chordId) {
      const transaction = database.transaction(["chords"], "readwrite");
      const store = transaction.objectStore("chords");
      store.delete(chordId);
      await transactionComplete(transaction);
    },
  };
}
