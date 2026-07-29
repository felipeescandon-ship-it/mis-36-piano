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

export function createVoicingRepository() {
  return {
    async saveVoicing(database, voicing) {
      const transaction = database.transaction(["voicings"], "readwrite");
      const store = transaction.objectStore("voicings");
      store.put(voicing, voicing.id);
      await transactionComplete(transaction);
    },

    async getVoicing(database, voicingId) {
      const transaction = database.transaction(["voicings"], "readonly");
      const request = transaction.objectStore("voicings").get(voicingId);
      return requestResult(request);
    },

    async getAllVoicings(database) {
      const transaction = database.transaction(["voicings"], "readonly");
      const request = transaction.objectStore("voicings").getAll();
      return requestResult(request);
    },

    async getVoicingsByScope(database, scope) {
      const all = await this.getAllVoicings(database);
      return all.filter(voicing => voicing.scope === scope);
    },

    async deleteVoicing(database, voicingId) {
      const transaction = database.transaction(["voicings"], "readwrite");
      const store = transaction.objectStore("voicings");
      store.delete(voicingId);
      await transactionComplete(transaction);
    },
  };
}
