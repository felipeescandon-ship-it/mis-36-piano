const DATABASE_NAME = "piano-library-shadow-v1";
const DATABASE_VERSION = 1;
const STORES = ["songs", "chords", "voicings", "revisions", "syncQueue", "migrationState"];

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

export async function openShadowDatabase(indexedDBFactory = globalThis.indexedDB) {
  if (!indexedDBFactory) throw new Error("IndexedDB no está disponible.");
  const request = indexedDBFactory.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    for (const store of STORES) {
      if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
    }
  };
  return requestResult(request);
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

export async function persistShadowMigration(database, result) {
  if (result.migration?.status !== "shadow") {
    throw new Error("Entrega 0 solo permite persistir migraciones en estado shadow.");
  }
  const transaction = database.transaction(
    ["songs", "chords", "voicings", "revisions", "migrationState"],
    "readwrite",
  );
  const songs = transaction.objectStore("songs");
  const chords = transaction.objectStore("chords");
  const voicings = transaction.objectStore("voicings");
  const revisions = transaction.objectStore("revisions");
  const migrationState = transaction.objectStore("migrationState");

  songs.put(result.song, result.song.id);
  revisions.put(result.song, `${result.song.id}:${result.song.revision}`);
  for (const chord of result.chords) {
    chords.put(chord, chord.id);
    revisions.put(chord, `${chord.id}:${chord.revision}`);
  }
  for (const voicing of result.voicings) {
    voicings.put(voicing, voicing.id);
    revisions.put(voicing, `${voicing.id}:${voicing.revision}`);
  }
  migrationState.put(result.migration, result.migration.migration);
  await transactionComplete(transaction);
  return result.migration;
}

export async function readShadowMigration(database, migrationName) {
  const transaction = database.transaction(["migrationState"], "readonly");
  return requestResult(transaction.objectStore("migrationState").get(migrationName));
}

export const shadowDatabaseContract = Object.freeze({
  name: DATABASE_NAME,
  version: DATABASE_VERSION,
  stores: [...STORES],
});
