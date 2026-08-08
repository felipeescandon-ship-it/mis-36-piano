import { get, list, put } from "@vercel/blob";

const CURRENT_PATH = "catalog/current.json";
const HISTORY_PREFIX = "catalog/history/";
const CLOUD_FORMAT = "piano-catalog-cloud-v1";
const SONG_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
// Sin caracteres de control (permite acentos, símbolos y emoji normales).
const NO_CONTROL_CHARS_PATTERN = /^[^\x00-\x1F\x7F]*$/;
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

// El manifiesto es solo el índice del cancionero — quién existe, en qué
// orden, y si está borrado. El contenido de cada canción (letra, acordes)
// vive en su propio documento (api/song-sync.js); este endpoint nunca lo
// toca ni lo valida.
function validateManifest(data) {
  if (!data || !Array.isArray(data.entries) || data.entries.length > 500) {
    throw new ValidationError("Formato de catálogo no válido.");
  }
  const seenIds = new Set();
  for (const entry of data.entries) {
    if (!entry || typeof entry.songId !== "string" || !SONG_ID_PATTERN.test(entry.songId)) {
      throw new ValidationError("Identificador de canción no válido.");
    }
    if (seenIds.has(entry.songId)) throw new ValidationError("Canción repetida en el catálogo.");
    seenIds.add(entry.songId);
    if (typeof entry.title !== "string" || entry.title.length > 200 || !NO_CONTROL_CHARS_PATTERN.test(entry.title)) {
      throw new ValidationError("Título no válido.");
    }
    if (typeof entry.artist !== "string" || entry.artist.length > 200 || !NO_CONTROL_CHARS_PATTERN.test(entry.artist)) {
      throw new ValidationError("Artista no válido.");
    }
    if (typeof entry.originalKey !== "string" || entry.originalKey.length > 20) {
      throw new ValidationError("Tonalidad no válida.");
    }
    if (!Number.isInteger(entry.order) || entry.order < 0 || entry.order > 1000) {
      throw new ValidationError("Orden no válido.");
    }
    if (typeof entry.revision !== "string" || entry.revision.length > 100) {
      throw new ValidationError("Revisión de canción no válida.");
    }
    if (typeof entry.updatedAt !== "string" || entry.updatedAt.length > 40) {
      throw new ValidationError("Fecha no válida.");
    }
    if (typeof entry.deleted !== "boolean") {
      throw new ValidationError("Estado de borrado no válido.");
    }
  }
  if (JSON.stringify(data).length > 100_000) throw new ValidationError("El catálogo es demasiado grande.");
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
    console.error("Catalog read failed", error);
    return json({ error: "cloud_read_failed" }, 500);
  }
}

export async function PUT(request) {
  if (!cloudIsConfigured()) {
    return json({ error: "cloud_not_configured" }, 503);
  }

  if (!sameOrigin(request)) return json({ error: "cross_origin_write_blocked" }, 403);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 150_000) return json({ error: "payload_too_large" }, 413);

  try {
    const payload = await request.json();
    const manifest = validateManifest(payload.manifest);
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
      manifest,
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
      return json({ error: "invalid_catalog", message: error.message }, 400);
    }
    console.error("Catalog write failed", error);
    return json({ error: "cloud_write_failed" }, 500);
  }
}
