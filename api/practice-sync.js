import { get, list, put } from "@vercel/blob";

const CURRENT_PATH = "practice/current.json";
const HISTORY_PREFIX = "practice/history/";
const CLOUD_FORMAT = "piano-practice-cloud-v1";
const SONG_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
const TRANSITION_KEY_PATTERN = /^\d{1,4}:\d{1,4}$/;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
class ValidationError extends Error {}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function readCurrent() {
  let cursor;
  let latest = null;
  do {
    const history = await list({ prefix: HISTORY_PREFIX, limit: 1000, cursor });
    latest = history.blobs.reduce((selected, blob) => (
      !selected || blob.pathname > selected.pathname ? blob : selected
    ), latest);
    cursor = history.hasMore ? history.cursor : undefined;
  } while (cursor);
  const result = await get(latest?.pathname || CURRENT_PATH, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const document = await new Response(result.stream).json();
  return { document };
}

function validateCounterMap(map, keyPattern, maxKeys, maxValue, label) {
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new ValidationError(`${label} no válido.`);
  }
  const keys = Object.keys(map);
  if (keys.length > maxKeys) throw new ValidationError(`${label} tiene demasiadas entradas.`);
  for (const key of keys) {
    if (!keyPattern.test(key)) throw new ValidationError(`${label} contiene una clave no válida.`);
    const value = map[key];
    if (!Number.isInteger(value) || value < 0 || value > maxValue) {
      throw new ValidationError(`${label} contiene un valor no válido.`);
    }
  }
  return map;
}

// El log de práctica es solo contadores de repeticiones y fechas — nunca
// contenido de la canción. Cada dispositivo puede sumar repeticiones de
// forma independiente entre sincronizaciones, así que el cliente resuelve
// conflictos combinando por máximo (ver mergePracticeLog en el front-end);
// este endpoint solo valida forma y rangos razonables, igual que
// catalog-sync.js valida el manifiesto sin interpretar su contenido.
function validatePracticeLog(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ValidationError("Formato del log de práctica no válido.");
  }
  const songIds = Object.keys(data);
  if (songIds.length > 500) throw new ValidationError("Demasiadas canciones en el log de práctica.");
  for (const songId of songIds) {
    if (!SONG_ID_PATTERN.test(songId)) throw new ValidationError("Identificador de canción no válido.");
    const entry = data[songId];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ValidationError("Entrada de práctica no válida.");
    }
    if (!Number.isInteger(entry.reps) || entry.reps < 0 || entry.reps > 1_000_000) {
      throw new ValidationError("Repeticiones no válidas.");
    }
    if (entry.lastPracticedAt !== null && (typeof entry.lastPracticedAt !== "string" || entry.lastPracticedAt.length > 40)) {
      throw new ValidationError("Fecha de práctica no válida.");
    }
    validateCounterMap(entry.transitions, TRANSITION_KEY_PATTERN, 2000, 1_000_000, "Transiciones");
    validateCounterMap(entry.daily, DAY_KEY_PATTERN, 400, 100_000, "Historial diario");
  }
  if (JSON.stringify(data).length > 200_000) throw new ValidationError("El log de práctica es demasiado grande.");
  return data;
}

function cloudIsConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function GET() {
  if (!cloudIsConfigured()) {
    return json({ error: "cloud_not_configured" }, 503);
  }

  try {
    const current = await readCurrent();
    if (!current) return json({ empty: true }, 404);
    return json(current.document);
  } catch (error) {
    console.error("Practice log read failed", error);
    return json({ error: "cloud_read_failed" }, 500);
  }
}

export async function PUT(request) {
  if (!cloudIsConfigured()) {
    return json({ error: "cloud_not_configured" }, 503);
  }

  if (!sameOrigin(request)) return json({ error: "cross_origin_write_blocked" }, 403);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 250_000) return json({ error: "payload_too_large" }, 413);

  try {
    const payload = await request.json();
    const practice = validatePracticeLog(payload.practice);
    const current = await readCurrent();

    if (current && payload.baseRevision !== current.document.revision && payload.force !== true) {
      return json({
        error: "revision_conflict",
        revision: current.document.revision,
        updatedAt: current.document.updatedAt,
      }, 409);
    }

    if (current) {
      const elapsed = Date.now() - Date.parse(current.document.updatedAt || 0);
      if (elapsed >= 0 && elapsed < 1000) return json({ error: "too_many_writes" }, 429);
    }

    const revision = crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const document = {
      format: CLOUD_FORMAT,
      revision,
      updatedAt,
      practice,
    };
    const body = JSON.stringify(document);
    const safeTimestamp = updatedAt.replaceAll(":", "-");

    await put(`${HISTORY_PREFIX}${safeTimestamp}-${revision}.json`, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
    });
    await put(CURRENT_PATH, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
    });

    return json(document);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ValidationError) {
      return json({ error: "invalid_practice_sync", message: error.message }, 400);
    }
    console.error("Practice log write failed", error);
    return json({ error: "cloud_write_failed" }, 500);
  }
}
