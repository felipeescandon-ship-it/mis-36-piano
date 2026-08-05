import { get, list, put } from "@vercel/blob";

const LEGACY_SONG_ID = "mis-36";
const LEGACY_CURRENT_PATH = "mis36/current.json";
const LEGACY_HISTORY_PREFIX = "mis36/history/";
const CLOUD_FORMAT = "piano-song-cloud-v1";
const ALLOWED_INVERSIONS = new Set(["root", "first", "second"]);
const CHORD_PATTERN = /^[A-Za-z0-9#b°+/]{1,16}$/;
const SONG_ID_PATTERN = /^[a-z0-9-]{1,64}$/;
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

function validateSongId(songId) {
  if (typeof songId !== "string" || !SONG_ID_PATTERN.test(songId)) {
    throw new ValidationError("Identificador de canción no válido.");
  }
  return songId;
}

function songPaths(songId) {
  return {
    current: `songs/${songId}/current.json`,
    historyPrefix: `songs/${songId}/history/`,
  };
}

async function latestBlob(prefix, fallbackPath) {
  let cursor;
  let latest = null;
  do {
    const history = await list({ prefix, limit: 1000, cursor });
    latest = history.blobs.reduce((selected, blob) => (
      !selected || blob.pathname > selected.pathname ? blob : selected
    ), latest);
    cursor = history.hasMore ? history.cursor : undefined;
  } while (cursor);
  const result = await get(latest?.pathname || fallbackPath, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const document = await new Response(result.stream).json();
  return { document };
}

async function readCurrent(songId) {
  const { current, historyPrefix } = songPaths(songId);
  const found = await latestBlob(historyPrefix, current);
  if (found) return found;
  if (songId === LEGACY_SONG_ID) {
    return latestBlob(LEGACY_HISTORY_PREFIX, LEGACY_CURRENT_PATH);
  }
  return null;
}

function validateSongDocument(data) {
  if (!data || data.version !== 5 || !Array.isArray(data.sections) || data.sections.length > 200) {
    throw new ValidationError("Formato de canción no válido.");
  }
  let totalEvents = 0;
  for (const section of data.sections) {
    if (!section || typeof section.name !== "string" || section.name.length > 200) {
      throw new ValidationError("Nombre de sección no válido.");
    }
    if (!Array.isArray(section.lines) || section.lines.length > 500 || section.lines.some(line => typeof line !== "string" || line.length > 500)) {
      throw new ValidationError("Letra de sección no válida.");
    }
    if (!Array.isArray(section.events) || section.events.length > 500) {
      throw new ValidationError("Eventos de sección no válidos.");
    }
    totalEvents += section.events.length;
    for (const event of section.events) {
      if (!event || typeof event.uid !== "string" || event.uid.length > 100) {
        throw new ValidationError("Identificador de evento no válido.");
      }
      if (typeof event.chord !== "string" || !CHORD_PATTERN.test(event.chord)) {
        throw new ValidationError("Acorde no válido.");
      }
      if (!ALLOWED_INVERSIONS.has(event.inversion)) {
        throw new ValidationError("Inversión no reconocida.");
      }
      if (!Number.isInteger(event.line) || event.line < 0 || event.line >= section.lines.length) {
        throw new ValidationError("Posición de línea fuera de rango.");
      }
      if (!Number.isInteger(event.anchor) || event.anchor < 0 || event.anchor > 500) {
        throw new ValidationError("Ancla fuera de rango.");
      }
      if (!Number.isFinite(+event.beats) || +event.beats <= 0 || +event.beats > 32) {
        throw new ValidationError("Duración no válida.");
      }
    }
  }
  if (totalEvents > 1500) throw new ValidationError("Demasiados eventos.");
  if (JSON.stringify(data).length > 250_000) throw new ValidationError("La canción es demasiado grande.");
  return data;
}

function cloudIsConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function GET(request) {
  if (!cloudIsConfigured()) {
    return json({ error: "cloud_not_configured" }, 503);
  }

  let songId;
  try {
    songId = validateSongId(new URL(request.url).searchParams.get("songId"));
  } catch (error) {
    return json({ error: "invalid_song_id", message: error.message }, 400);
  }

  try {
    const current = await readCurrent(songId);
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
    const songId = validateSongId(payload.songId);
    const song = validateSongDocument(payload.song);
    const current = await readCurrent(songId);

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
      songId,
      revision,
      updatedAt,
      song,
    };
    const body = JSON.stringify(document);
    const safeTimestamp = updatedAt.replaceAll(":", "-");
    const { current: currentPath, historyPrefix } = songPaths(songId);

    await put(`${historyPrefix}${safeTimestamp}-${revision}.json`, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
    });
    await put(currentPath, body, {
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
