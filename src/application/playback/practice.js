import { playbackError } from "./errors.js";
import { compileTimeline, playbackRanges, validateTempo } from "./timeline.js";

export function compilePracticeTimeline(playbackDocument, options = {}) {
  const repetitions = Number(options?.repetitions);
  const countInBeats = Number(options?.countInBeats ?? 0);
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100) {
    throw playbackError("invalid_repetitions", "Las repeticiones deben estar entre 1 y 100.");
  }
  if (!Number.isInteger(countInBeats) || countInBeats < 0 || countInBeats > 16) {
    throw playbackError("invalid_count_in", "La cuenta previa debe estar entre 0 y 16 pulsos.");
  }
  const tempo = validateTempo(options.tempo ?? playbackDocument.song.metadata.tempo);
  const transition = compileTimeline(playbackDocument, {
    tempo,
    range: playbackRanges.transition(options.fromEventId),
  });
  const entries = [];
  let startBeat = countInBeats;
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const source of transition.entries) {
      entries.push(Object.freeze({
        ...source,
        startBeat,
        nextEventId: null,
        practiceRepetition: repetition,
      }));
      startBeat += source.durationBeats;
    }
  }
  for (let index = 0; index < entries.length - 1; index++) {
    entries[index] = Object.freeze({ ...entries[index], nextEventId: entries[index + 1].eventId });
  }

  return Object.freeze({
    songId: playbackDocument.song.id,
    songRevision: playbackDocument.song.revision,
    tempo,
    range: Object.freeze(playbackRanges.transition(options.fromEventId)),
    leadInBeats: countInBeats,
    entries: Object.freeze(entries),
    totalBeats: startBeat,
    mode: "practice",
    repetitions,
  });
}
