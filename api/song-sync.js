import { get, list, put } from "@vercel/blob";

const CURRENT_PATH = "mis36/current.json";
const HISTORY_PREFIX = "mis36/history/";
const ALLOWED_INVERSIONS = new Set(["root", "first", "second"]);
const ALLOWED_CHORDS = new Set(["E", "F#", "F#m", "A", "Am", "C#m", "C#", "G#m", "G#", "D", "B", "B/D#"]);
const SECTION_LINE_COUNTS = [2, 8, 4, 7, 4, 4, 6, 2, 4, 7];
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

function validateSongSync(data) {
  if (!data || data.version !== 4 || !data.events || typeof data.events !== "object" || Array.isArray(data.events)) {
    throw new ValidationError("Formato de sincronización no válido.");
  }
  const eventEntries = Object.entries(data.events);
  if (eventEntries.length > 1500) throw new ValidationError("Demasiados eventos.");
  if (!Array.isArray(data.deleted) || data.deleted.length > 1500) throw new ValidationError("Lista de eliminados no válida.");
  if (!Array.isArray(data.added) || data.added.length > 500) throw new ValidationError("Lista de agregados no válida.");

  for (const [key, value] of eventEntries) {
    if (typeof key !== "string" || key.length > 100 || !/^\d+:(?:\d+:\d+|custom:[\w:-]+)$/.test(key)) throw new ValidationError("Identificador de evento no válido.");
    const section = Number(key.split(":", 1)[0]);
    if (!Number.isInteger(section) || section < 0 || section >= SECTION_LINE_COUNTS.length) throw new ValidationError("Sección de evento no válida.");
    if (!value || !ALLOWED_CHORDS.has(value.chord)) throw new ValidationError("Acorde no reconocido.");
    if (!ALLOWED_INVERSIONS.has(value.inversion)) throw new ValidationError("Inversión no reconocida.");
    if (![value.line, value.anchor, value.position].every(Number.isInteger)) throw new ValidationError("Posición no válida.");
    if (value.line < 0 || value.line >= SECTION_LINE_COUNTS[section] || value.anchor < 0 || value.anchor > 200 || value.position < 0 || value.position > 1500) throw new ValidationError("Posición fuera de rango.");
    if (!Number.isFinite(+value.beats) || +value.beats <= 0 || +value.beats > 32) throw new ValidationError("Duración no válida.");
  }

  for (const key of data.deleted) {
    if (typeof key !== "string" || key.length > 100 || !/^\d+:\d+:\d+$/.test(key)) throw new ValidationError("Evento eliminado no válido.");
    const section = Number(key.split(":", 1)[0]);
    if (section < 0 || section >= SECTION_LINE_COUNTS.length) throw new ValidationError("Sección eliminada no válida.");
  }

  const addedIds = new Set();
  for (const value of data.added) {
    if (!value || !Number.isInteger(value.section) || value.section < 0 || value.section >= SECTION_LINE_COUNTS.length) throw new ValidationError("Sección agregada no válida.");
    if (typeof value.uid !== "string" || !value.uid.startsWith("custom:") || value.uid.length > 100) throw new ValidationError("Identificador agregado no válido.");
    const eventKey = `${value.section}:${value.uid}`;
    if (addedIds.has(eventKey) || !data.events[eventKey]) throw new ValidationError("Evento agregado incoherente.");
    addedIds.add(eventKey);
    if (!ALLOWED_CHORDS.has(value.chord) || !ALLOWED_INVERSIONS.has(value.inversion)) throw new ValidationError("Acorde agregado no válido.");
    if (!Number.isInteger(value.line) || !Number.isInteger(value.anchor)) throw new ValidationError("Posición agregada no válida.");
    if (value.line < 0 || value.line >= SECTION_LINE_COUNTS[value.section] || value.anchor < 0 || value.anchor > 200) throw new ValidationError("Posición agregada fuera de rango.");
    if (!Number.isFinite(+value.beats) || +value.beats <= 0 || +value.beats > 32) throw new ValidationError("Duración agregada no válida.");
  }

  if (JSON.stringify(data).length > 250_000) throw new ValidationError("La sincronización es demasiado grande.");
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
    console.error("Cloud read failed", error);
    return json({ error: "cloud_read_failed" }, 500);
  }
}

export async function PUT(request) {
  if (!cloudIsConfigured()) {
    return json({ error: "cloud_not_configured" }, 503);
  }

  if (!sameOrigin(request)) return json({ error: "cross_origin_write_blocked" }, 403);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 300_000) return json({ error: "payload_too_large" }, 413);

  try {
    const payload = await request.json();
    const songSync = validateSongSync(payload.songSync);
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
      format: "mis36-cloud-v1",
      revision,
      updatedAt,
      songSync,
    };
    const body = JSON.stringify(document);
    const safeTimestamp = updatedAt.replaceAll(":", "-");

    await put(`${HISTORY_PREFIX}${safeTimestamp}-${revision}.json`, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
    });

    return json(document);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ValidationError) {
      return json({ error: "invalid_song_sync", message: error.message }, 400);
    }
    console.error("Cloud write failed", error);
    return json({ error: "cloud_write_failed" }, 500);
  }
}
