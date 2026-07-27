import { createPlaybackDocument } from "./playback-document.js";
import { playbackError } from "./errors.js";
import {
  beatAtTime,
  compileTimeline,
  eventAtBeat,
  playbackRanges,
  validateTempo,
} from "./timeline.js";
import { compilePracticeTimeline } from "./practice.js";

function emptySnapshot(generation = 0) {
  return Object.freeze({
    generation,
    status: "empty",
    mode: "playback",
    phase: "ready",
    songId: null,
    songRevision: null,
    eventId: null,
    nextEventId: null,
    sectionId: null,
    lineId: null,
    queueIndex: -1,
    queueLength: 0,
    tempo: null,
    elapsedBeats: 0,
    remainingBeats: 0,
    practiceRepetition: null,
    practiceTotal: null,
    countInRemaining: 0,
    audioStatus: "uninitialized",
    pauseReason: null,
    error: null,
  });
}

function audioStatus(clock) {
  return clock.state === "running" ? "running" : "suspended";
}

export function createPlaybackMachine({ clock }) {
  if (!clock || typeof clock.now !== "function" || !Number.isFinite(clock.now())) {
    throw playbackError("invalid_clock", "El motor necesita un reloj válido.");
  }

  let playbackDocument = null;
  let timeline = null;
  let snapshot = emptySnapshot();
  let selectedEventId = null;
  let positionBeat = 0;
  let anchorBeat = 0;
  let anchorTime = 0;
  let tempo = null;
  let generation = 0;
  let destroyed = false;
  const listeners = new Set();

  function assertActive() {
    if (destroyed) throw playbackError("machine_destroyed", "La máquina de reproducción fue destruida.");
  }

  function notify() {
    for (const listener of [...listeners]) listener(snapshot);
  }

  function replaceSnapshot(value, shouldNotify = true) {
    snapshot = Object.freeze(value);
    if (shouldNotify) notify();
    return snapshot;
  }

  function nextGeneration() {
    generation += 1;
    return generation;
  }

  function eventContext(eventId) {
    const indexed = playbackDocument?.eventsById.get(eventId);
    if (!indexed) throw playbackError("unknown_event", "El evento solicitado no existe.", { eventId });
    return indexed;
  }

  function readySnapshot(eventId, options = {}) {
    const indexed = eventContext(eventId);
    const fromEvent = compileTimeline(playbackDocument, {
      tempo,
      range: playbackRanges.fromEvent(eventId),
    });
    return {
      generation,
      status: options.status || "ready",
      mode: options.mode || "playback",
      phase: "ready",
      songId: playbackDocument.song.id,
      songRevision: playbackDocument.song.revision,
      eventId,
      nextEventId: fromEvent.entries[0].nextEventId,
      sectionId: indexed.sectionId,
      lineId: indexed.event.lineId,
      queueIndex: 0,
      queueLength: 0,
      tempo,
      elapsedBeats: 0,
      remainingBeats: indexed.event.beats,
      practiceRepetition: null,
      practiceTotal: null,
      countInRemaining: 0,
      audioStatus: audioStatus(clock),
      pauseReason: options.pauseReason || null,
      error: null,
    };
  }

  function snapshotAtBeat(beat, status, pauseReason = null) {
    if (!timeline) return readySnapshot(selectedEventId, { status, pauseReason });
    const boundedBeat = Math.max(0, Math.min(beat, timeline.totalBeats));
    if (boundedBeat < timeline.leadInBeats) {
      const first = timeline.entries[0];
      const indexed = eventContext(first.eventId);
      return {
        generation,
        status,
        mode: timeline.mode,
        phase: "countIn",
        songId: timeline.songId,
        songRevision: timeline.songRevision,
        eventId: first.eventId,
        nextEventId: first.eventId,
        sectionId: indexed.sectionId,
        lineId: indexed.event.lineId,
        queueIndex: -1,
        queueLength: timeline.entries.length,
        tempo,
        elapsedBeats: boundedBeat,
        remainingBeats: timeline.leadInBeats - boundedBeat,
        practiceRepetition: 1,
        practiceTotal: timeline.repetitions || null,
        countInRemaining: timeline.leadInBeats - boundedBeat,
        audioStatus: audioStatus(clock),
        pauseReason,
        error: null,
      };
    }

    if (boundedBeat >= timeline.totalBeats) {
      const last = timeline.entries.at(-1);
      const indexed = eventContext(last.eventId);
      selectedEventId = last.eventId;
      return {
        generation,
        status: "ended",
        mode: timeline.mode,
        phase: "events",
        songId: timeline.songId,
        songRevision: timeline.songRevision,
        eventId: last.eventId,
        nextEventId: null,
        sectionId: indexed.sectionId,
        lineId: indexed.event.lineId,
        queueIndex: timeline.entries.length - 1,
        queueLength: timeline.entries.length,
        tempo,
        elapsedBeats: last.durationBeats,
        remainingBeats: 0,
        practiceRepetition: last.practiceRepetition || null,
        practiceTotal: timeline.repetitions || null,
        countInRemaining: 0,
        audioStatus: audioStatus(clock),
        pauseReason: null,
        error: null,
      };
    }

    const located = eventAtBeat(timeline, boundedBeat);
    if (!located) throw playbackError("invalid_timeline_position", "La posición no pertenece a la línea de tiempo.");
    const { entry, queueIndex } = located;
    const indexed = eventContext(entry.eventId);
    selectedEventId = entry.eventId;
    return {
      generation,
      status,
      mode: timeline.mode,
      phase: "events",
      songId: timeline.songId,
      songRevision: timeline.songRevision,
      eventId: entry.eventId,
      nextEventId: entry.nextEventId,
      sectionId: indexed.sectionId,
      lineId: indexed.event.lineId,
      queueIndex,
      queueLength: timeline.entries.length,
      tempo,
      elapsedBeats: boundedBeat - entry.startBeat,
      remainingBeats: entry.startBeat + entry.durationBeats - boundedBeat,
      practiceRepetition: entry.practiceRepetition || null,
      practiceTotal: timeline.repetitions || null,
      countInRemaining: 0,
      audioStatus: audioStatus(clock),
      pauseReason,
      error: null,
    };
  }

  function currentBeat() {
    if (snapshot.status !== "playing") return positionBeat;
    return beatAtTime({ anchorBeat, anchorTime, now: clock.now(), tempo });
  }

  function synchronize(shouldNotify = false) {
    if (snapshot.status !== "playing") return snapshot;
    const beat = currentBeat();
    positionBeat = Math.min(beat, timeline.totalBeats);
    const previous = snapshot;
    const next = snapshotAtBeat(positionBeat, "playing");
    const logicalChange = previous.status !== next.status ||
      previous.phase !== next.phase ||
      previous.queueIndex !== next.queueIndex ||
      previous.practiceRepetition !== next.practiceRepetition;
    return replaceSnapshot(next, shouldNotify || logicalChange);
  }

  function begin(compiled) {
    timeline = compiled;
    tempo = compiled.tempo;
    positionBeat = 0;
    anchorBeat = 0;
    anchorTime = clock.now();
    nextGeneration();
    const status = clock.state === "running" ? "playing" : "blocked";
    return replaceSnapshot(snapshotAtBeat(0, status, status === "blocked" ? "audio" : null));
  }

  const api = Object.freeze({
    load(library) {
      assertActive();
      const candidate = createPlaybackDocument(library);
      const candidateTimeline = compileTimeline(candidate);
      nextGeneration();
      playbackDocument = candidate;
      timeline = null;
      tempo = candidate.song.metadata.tempo;
      positionBeat = 0;
      selectedEventId = candidateTimeline.entries[0].eventId;
      return replaceSnapshot(readySnapshot(selectedEventId));
    },

    unload() {
      assertActive();
      nextGeneration();
      playbackDocument = null;
      timeline = null;
      selectedEventId = null;
      positionBeat = 0;
      tempo = null;
      return replaceSnapshot(emptySnapshot(generation));
    },

    select(eventId) {
      assertActive();
      if (!playbackDocument) throw playbackError("invalid_playback_document", "No hay una canción cargada.");
      eventContext(eventId);
      nextGeneration();
      timeline = null;
      positionBeat = 0;
      selectedEventId = eventId;
      return replaceSnapshot(readySnapshot(eventId));
    },

    play(options = {}) {
      assertActive();
      if (!playbackDocument) throw playbackError("invalid_playback_document", "No hay una canción cargada.");
      const range = options.range ||
        playbackRanges.fromEvent(options.fromEventId || selectedEventId);
      const compiled = compileTimeline(playbackDocument, { tempo, range });
      return begin(compiled);
    },

    startPractice(options = {}) {
      assertActive();
      if (!playbackDocument) throw playbackError("invalid_playback_document", "No hay una canción cargada.");
      const compiled = compilePracticeTimeline(playbackDocument, {
        ...options,
        fromEventId: options.fromEventId || selectedEventId,
        tempo,
      });
      return begin(compiled);
    },

    tick() {
      assertActive();
      return synchronize(false);
    },

    pause(reason = "user") {
      assertActive();
      if (snapshot.status !== "playing") return snapshot;
      synchronize(false);
      if (snapshot.status === "ended") return snapshot;
      positionBeat = currentBeat();
      nextGeneration();
      return replaceSnapshot(snapshotAtBeat(positionBeat, "paused", reason));
    },

    resume() {
      assertActive();
      if (!["paused", "blocked"].includes(snapshot.status)) return snapshot;
      if (clock.state !== "running") {
        return replaceSnapshot(snapshotAtBeat(positionBeat, "blocked", snapshot.pauseReason || "audio"));
      }
      nextGeneration();
      anchorBeat = positionBeat;
      anchorTime = clock.now();
      return replaceSnapshot(snapshotAtBeat(positionBeat, "playing"));
    },

    stop() {
      assertActive();
      if (!playbackDocument) return snapshot;
      if (snapshot.status === "playing") synchronize(false);
      const eventId = snapshot.mode === "practice" && timeline
        ? timeline.entries[0].eventId
        : snapshot.eventId || selectedEventId;
      nextGeneration();
      timeline = null;
      positionBeat = 0;
      selectedEventId = eventId;
      return replaceSnapshot(readySnapshot(eventId));
    },

    seek(eventId) {
      return api.select(eventId);
    },

    setTempo(nextTempo) {
      assertActive();
      const validated = validateTempo(nextTempo);
      if (!playbackDocument) throw playbackError("invalid_playback_document", "No hay una canción cargada.");
      if (snapshot.status === "playing") {
        positionBeat = currentBeat();
        nextGeneration();
        tempo = validated;
        anchorBeat = positionBeat;
        anchorTime = clock.now();
        return replaceSnapshot(snapshotAtBeat(positionBeat, "playing"));
      }
      nextGeneration();
      tempo = validated;
      return replaceSnapshot({ ...snapshot, generation, tempo });
    },

    handleVisibility(hidden) {
      assertActive();
      if (hidden) return api.pause("system");
      if (snapshot.pauseReason === "system" && clock.state !== "running") {
        return replaceSnapshot(snapshotAtBeat(positionBeat, "blocked", "system"));
      }
      return snapshot;
    },

    subscribe(listener) {
      assertActive();
      if (typeof listener !== "function") throw playbackError("invalid_listener", "El suscriptor no es válido.");
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return snapshot;
    },

    getGeneration() {
      return generation;
    },

    destroy() {
      if (destroyed) return snapshot;
      nextGeneration();
      playbackDocument = null;
      timeline = null;
      selectedEventId = null;
      positionBeat = 0;
      tempo = null;
      replaceSnapshot(emptySnapshot(generation));
      listeners.clear();
      destroyed = true;
      return snapshot;
    },
  });
  return api;
}
