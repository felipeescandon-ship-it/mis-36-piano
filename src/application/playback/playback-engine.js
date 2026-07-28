import { createPlaybackMachine } from "./playback-machine.js";
import { createPlaybackDocument, voicingRevisionKey } from "./playback-document.js";
import { compileTimeline, playbackRanges } from "./timeline.js";
import { compilePracticeTimeline } from "./practice.js";

export function createRafTicker({
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
} = {}) {
  if (typeof requestFrame !== "function" || typeof cancelFrame !== "function") {
    throw new Error("createRafTicker requiere requestAnimationFrame/cancelAnimationFrame.");
  }
  let handle = null;
  let running = false;
  return Object.freeze({
    start(callback) {
      if (running) return;
      running = true;
      const loop = () => {
        if (!running) return;
        callback();
        handle = requestFrame(loop);
      };
      handle = requestFrame(loop);
    },
    stop() {
      running = false;
      if (handle != null) cancelFrame(handle);
      handle = null;
    },
    isRunning: () => running,
  });
}

export function createPlaybackEngine({ clock, audioRuntime, ticker } = {}) {
  if (!audioRuntime) throw new Error("audioRuntime required");

  const machine = createPlaybackMachine({ clock });
  const activeTicker = ticker || createRafTicker();

  let playbackDocument = null;
  let timeline = null;
  let audioGeneration = null;
  let lastMachineGeneration = null;
  let lastSoundedKey = null;

  function currentEntry(snapshot) {
    if (!timeline) return null;
    if (snapshot.queueIndex < 0 || snapshot.queueIndex >= timeline.entries.length) return null;
    return timeline.entries[snapshot.queueIndex];
  }

  function onSnapshot(snapshot) {
    if (snapshot.generation !== lastMachineGeneration) {
      if (audioGeneration != null) audioRuntime.stopGeneration(audioGeneration, 50);
      audioGeneration = null;
      lastSoundedKey = null;
      lastMachineGeneration = snapshot.generation;
    }
    if (snapshot.status !== "playing") return;
    const entry = currentEntry(snapshot);
    if (!entry) return;

    const key = `${snapshot.eventId}:${snapshot.practiceRepetition ?? ""}`;
    if (key === lastSoundedKey) return;
    lastSoundedKey = key;

    const voicing = playbackDocument.voicingsByRevision.get(
      voicingRevisionKey(entry.voicingId, entry.voicingRevision),
    );
    if (!voicing) return;

    if (audioGeneration == null) audioGeneration = audioRuntime.nextGeneration();
    const durationSeconds = (entry.durationBeats * 60) / snapshot.tempo;
    const onset = Math.max(0, clock.now() - (snapshot.elapsedBeats * 60) / snapshot.tempo);
    audioRuntime.playVoicing(voicing, onset, durationSeconds, audioGeneration);
  }

  const unsubscribe = machine.subscribe(onSnapshot);

  return Object.freeze({
    load(library) {
      const result = machine.load(library);
      playbackDocument = createPlaybackDocument(library);
      timeline = null;
      return result;
    },
    unload() {
      const result = machine.unload();
      playbackDocument = null;
      timeline = null;
      return result;
    },
    select: eventId => machine.select(eventId),
    play(options = {}) {
      const beforeEventId = machine.getSnapshot().eventId;
      const tempo = machine.getSnapshot().tempo;
      const range = options.range || playbackRanges.fromEvent(options.fromEventId || beforeEventId);
      // Compiled before calling machine.play(): play() notifies subscribers
      // synchronously, so `timeline` must already be in place for onSnapshot
      // to resolve the first entry.
      timeline = compileTimeline(playbackDocument, { tempo, range });
      return machine.play(options);
    },
    startPractice(options = {}) {
      const beforeEventId = machine.getSnapshot().eventId;
      const tempo = machine.getSnapshot().tempo;
      timeline = compilePracticeTimeline(playbackDocument, {
        ...options,
        fromEventId: options.fromEventId || beforeEventId,
        tempo,
      });
      return machine.startPractice(options);
    },
    tick: () => machine.tick(),
    pause: reason => machine.pause(reason),
    resume: () => machine.resume(),
    stop: () => machine.stop(),
    seek: eventId => machine.seek(eventId),
    setTempo: bpm => machine.setTempo(bpm),
    handleVisibility: hidden => machine.handleVisibility(hidden),
    subscribe: listener => machine.subscribe(listener),
    getSnapshot: () => machine.getSnapshot(),
    getGeneration: () => machine.getGeneration(),
    getPlaybackDocument: () => playbackDocument,
    start() {
      activeTicker.start(() => machine.tick());
    },
    stopTicking() {
      activeTicker.stop();
    },
    destroy() {
      activeTicker.stop();
      unsubscribe();
      if (audioGeneration != null) audioRuntime.stopGeneration(audioGeneration, 0);
      return machine.destroy();
    },
  });
}
