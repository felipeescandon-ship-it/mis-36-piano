/**
 * Doble de prueba de IndexedDB para los repositorios de Chord y Voicing.
 *
 * IndexedDB es una API basada en eventos: `put`, `get`, `getAll` y `delete`
 * devuelven un objeto de petición y el navegador invoca `onsuccess` más tarde;
 * la transacción invoca `oncomplete` cuando sus peticiones terminan. Los
 * repositorios envuelven esos callbacks en promesas, así que un doble que se
 * limite a declarar `onsuccess: null` sin llegar a invocarlo deja la promesa
 * pendiente para siempre y el archivo de prueba se cuelga sin fallar.
 *
 * Por eso aquí los callbacks se disparan en un microtask: el consumidor alcanza
 * a asignarlos —el ejecutor de una promesa corre de forma síncrona— y la espera
 * se resuelve en el mismo turno del bucle de eventos.
 */

function createRequest(result) {
  const request = { result, error: null, onsuccess: null, onerror: null };
  queueMicrotask(() => request.onsuccess?.());
  return request;
}

export function createMockDatabase(...storeNames) {
  const stores = new Map(storeNames.map(name => [name, new Map()]));

  return {
    /** Expone el contenido de un almacén; útil para aserciones directas. */
    _dump(name) {
      return new Map(stores.get(name));
    },

    transaction(requestedStores) {
      const objectStores = {};
      for (const storeName of requestedStores) {
        const store = stores.get(storeName);
        if (!store) throw new Error(`Almacén desconocido: ${storeName}`);

        objectStores[storeName] = {
          put(value, key) {
            store.set(key, value);
            return createRequest(undefined);
          },
          get(key) {
            return createRequest(store.get(key));
          },
          getAll() {
            return createRequest([...store.values()]);
          },
          delete(key) {
            store.delete(key);
            return createRequest(undefined);
          },
        };
      }

      const transaction = {
        objectStore(name) {
          return objectStores[name];
        },
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
      };

      queueMicrotask(() => transaction.oncomplete?.());
      return transaction;
    },
  };
}
