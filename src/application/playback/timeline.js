import { playbackError } from "./errors.js";

export const playbackRanges = Object.freeze({
  song: () => ({ kind: "song" }),
  section: sectionId => ({ kind: "section", sectionId }),
  fromEvent: eventId => ({ kind: "fromEvent", eventId }),
  sections: sectionIds => ({ kind: "sections", sectionIds: [...sectionIds] }),
  transition: eventId => ({ kind: "transition", eventId }),
});

export function validateTempo(tempo) {
  if (!Number.isFinite(tempo) || tempo < 20 || tempo > 300) {
    throw playbackError("invalid_tempo", "El tempo debe estar entre 20 y 300.", { tempo });
  }
  return tempo;
}

function orderedEvents(playbackDocument) {
  const ordered = [];
  for (const section of playbackDocument.song.sections) {
    const positions = new Set();
    const events = [...section.events].sort((left, right) => left.position - right.position);
    for (const event of events) {
      if (positions.has(event.position)) {
        throw playbackError("duplicate_event_position", "Dos eventos comparten posición dentro de una sección.", {
          sectionId: section.id,
          position: event.position,
        });
      }
      positions.add(event.position);
      const indexed = playbackDocument.eventsById.get(event.id);
      ordered.push({
        event,
        section,
        sectionIndex: indexed.sectionIndex,
        chord: indexed.chord,
        voicing: indexed.voicing,
      });
    }
  }
  return ordered;
}

function selectRange(playbackDocument, ordered, range) {
  const normalizedRange = range || playbackRanges.song();
  switch (normalizedRange.kind) {
    case "song":
      return ordered;
    case "section": {
      if (!playbackDocument.sectionsById.has(normalizedRange.sectionId)) {
        throw playbackError("unknown_section", "La sección solicitada no existe.", {
          sectionId: normalizedRange.sectionId,
        });
      }
      return ordered.filter(item => item.section.id === normalizedRange.sectionId);
    }
    case "fromEvent": {
      const start = ordered.findIndex(item => item.event.id === normalizedRange.eventId);
      if (start < 0) {
        throw playbackError("unknown_event", "El evento solicitado no existe.", {
          eventId: normalizedRange.eventId,
        });
      }
      return ordered.slice(start);
    }
    case "sections": {
      if (!Array.isArray(normalizedRange.sectionIds) || !normalizedRange.sectionIds.length) {
        throw playbackError("empty_range", "Debes seleccionar al menos una sección.");
      }
      const selected = new Set(normalizedRange.sectionIds);
      if (selected.size !== normalizedRange.sectionIds.length) {
        throw playbackError("duplicate_section", "Una sección está repetida en el rango.");
      }
      for (const sectionId of selected) {
        if (!playbackDocument.sectionsById.has(sectionId)) {
          throw playbackError("unknown_section", "La sección solicitada no existe.", { sectionId });
        }
      }
      return ordered.filter(item => selected.has(item.section.id));
    }
    case "transition": {
      const start = ordered.findIndex(item => item.event.id === normalizedRange.eventId);
      if (start < 0) {
        throw playbackError("unknown_event", "El evento solicitado no existe.", {
          eventId: normalizedRange.eventId,
        });
      }
      if (start + 1 >= ordered.length) {
        throw playbackError("empty_range", "El último evento no tiene una transición siguiente.", {
          eventId: normalizedRange.eventId,
        });
      }
      return ordered.slice(start, start + 2);
    }
    default:
      throw playbackError("invalid_range", "El tipo de rango no está soportado.", {
        kind: normalizedRange.kind,
      });
  }
}

function freezeRange(range) {
  const copy = { ...range };
  if (Array.isArray(copy.sectionIds)) copy.sectionIds = Object.freeze([...copy.sectionIds]);
  return Object.freeze(copy);
}

export function compileTimeline(playbackDocument, options = {}) {
  if (!playbackDocument?.song || !playbackDocument.eventsById) {
    throw playbackError("invalid_playback_document", "Debes cargar un documento de reproducción indexado.");
  }
  const tempo = validateTempo(options.tempo ?? playbackDocument.song.metadata.tempo);
  const ordered = orderedEvents(playbackDocument);
  const selected = selectRange(playbackDocument, ordered, options.range);
  if (!selected.length) throw playbackError("empty_range", "El rango no contiene eventos reproducibles.");

  let startBeat = 0;
  const entries = selected.map((item, index) => {
    const durationBeats = item.event.beats;
    const entry = Object.freeze({
      eventId: item.event.id,
      sectionId: item.section.id,
      lineId: item.event.lineId,
      chordId: item.chord.id,
      voicingId: item.voicing.id,
      voicingRevision: item.voicing.revision,
      position: item.event.position,
      startBeat,
      durationBeats,
      nextEventId: selected[index + 1]?.event.id || null,
    });
    startBeat += durationBeats;
    return entry;
  });

  return Object.freeze({
    songId: playbackDocument.song.id,
    songRevision: playbackDocument.song.revision,
    tempo,
    range: freezeRange(options.range || playbackRanges.song()),
    leadInBeats: 0,
    entries: Object.freeze(entries),
    totalBeats: startBeat,
    mode: "playback",
  });
}

export function eventAtBeat(timeline, beat) {
  if (!timeline?.entries?.length) return null;
  if (beat < timeline.leadInBeats || beat >= timeline.totalBeats) return null;
  let low = 0;
  let high = timeline.entries.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const entry = timeline.entries[middle];
    const endBeat = entry.startBeat + entry.durationBeats;
    if (beat < entry.startBeat) high = middle - 1;
    else if (beat >= endBeat) low = middle + 1;
    else return { entry, queueIndex: middle };
  }
  return null;
}

export function beatAtTime({ anchorBeat, anchorTime, now, tempo }) {
  return anchorBeat + Math.max(0, now - anchorTime) * validateTempo(tempo) / 60;
}
