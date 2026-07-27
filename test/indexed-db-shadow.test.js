import assert from "node:assert/strict";
import test from "node:test";
import {
  openShadowDatabase,
  persistShadowMigration,
  shadowDatabaseContract,
} from "../src/infrastructure/indexed-db-shadow.js";
import { migrateMis36ToLibrary } from "../src/domain/migrations/mis36-v1.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";

class MemoryStore {
  constructor(values) {
    this.values = values;
  }
  put(value, key) {
    this.values.set(key, structuredClone(value));
  }
}

class MemoryDatabase {
  constructor() {
    this.stores = new Map();
  }
  transaction(names) {
    const transaction = {
      objectStore: name => {
        if (!this.stores.has(name)) this.stores.set(name, new Map());
        return new MemoryStore(this.stores.get(name));
      },
    };
    queueMicrotask(() => transaction.oncomplete?.());
    return transaction;
  }
}

class MemoryIndexedDBFactory {
  open(name, version) {
    const request = {};
    queueMicrotask(() => {
      const names = new Set();
      request.result = {
        name,
        version,
        objectStoreNames: { contains: value => names.has(value) },
        createObjectStore: value => names.add(value),
        stores: names,
      };
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }
}

test("abre el catálogo shadow con todos los almacenes del contrato", async () => {
  const database = await openShadowDatabase(new MemoryIndexedDBFactory());

  assert.equal(database.name, shadowDatabaseContract.name);
  assert.equal(database.version, shadowDatabaseContract.version);
  assert.deepEqual([...database.stores], shadowDatabaseContract.stores);
});

test("la persistencia shadow se puede repetir sin duplicar recursos", async () => {
  const database = new MemoryDatabase();
  const result = await migrateMis36ToLibrary(mis36LegacyFixture);

  await persistShadowMigration(database, result);
  const sizes = Object.fromEntries([...database.stores].map(([name, values]) => [name, values.size]));
  await persistShadowMigration(database, result);

  assert.deepEqual(
    Object.fromEntries([...database.stores].map(([name, values]) => [name, values.size])),
    sizes,
  );
  assert.equal(database.stores.get("songs").size, 1);
  assert.equal(database.stores.get("migrationState").size, 1);
  assert.equal(database.stores.has("syncQueue"), false);
});

test("Entrega 0 rechaza cualquier estado que no sea shadow", async () => {
  const database = new MemoryDatabase();
  const result = await migrateMis36ToLibrary(mis36LegacyFixture);
  result.migration.status = "active";

  await assert.rejects(() => persistShadowMigration(database, result), /solo permite/);
  assert.equal(database.stores.size, 0);
});
