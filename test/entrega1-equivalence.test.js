/**
 * E1.5 · lectura nueva detrás de bandera (prueba interna, sin index.html)
 *
 * Prueba que el motor universal (E1.1-E1.4), al REPRODUCIRSE de principio a
 * fin mediante playback-engine.js con un reloj falso, produce exactamente la
 * misma secuencia de acordes/voicings/duraciones que la vista canónica
 * independiente de "Mis 36" (canonicalLegacy, ya construida en Entrega 0).
 *
 * No conecta index.html. La bandera `pianoUniversalEngine` permanece apagada
 * por defecto; index.html sigue sirviendo el lector heredado sin cambios.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { features } from "../src/config/features.js";
import { canonicalLegacy } from "../src/domain/canonical.js";
import { migrateMis36ToLibrary } from "../src/domain/migrations/mis36-v1.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";
import { createPlaybackDocument } from "../src/application/playback/playback-document.js";
import { compileTimeline, playbackRanges } from "../src/application/playback/timeline.js";
import { createPlaybackEngine } from "../src/application/playback/playback-engine.js";

class FakeClock {
  constructor() {
    this.time = 0;
    this.state = "running";
  }

  now() {
    return this.time;
  }
}

function createSpyAudio() {
  const calls = [];
  let generation = 0;
  return {
    calls,
    nextGeneration() {
      generation += 1;
      return generation;
    },
    playVoicing(voicing, at, duration, gen) {
      calls.push({ voicing, at, duration, gen });
    },
    stopGeneration() {},
  };
}

function createFakeTicker() {
  let cb = null;
  let running = false;
  return {
    start(callback) {
      running = true;
      cb = callback;
    },
    stop() {
      running = false;
      cb = null;
    },
    fire() {
      if (running && cb) cb();
    },
  };
}

function normalizeNote(note) {
  return {
    pitchClass: note.pitchClass,
    octave: note.octave,
    spelling: note.spelling,
    hand: note.hand,
    finger: note.finger ?? null,
  };
}

test("pianoUniversalEngine permanece apagada por defecto", () => {
  assert.equal(features.pianoUniversalEngine, false);
});

test("el motor universal reproduce la secuencia canónica completa de Mis 36", async () => {
  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  const playbackDocument = createPlaybackDocument(migrated);
  const fullTimeline = compileTimeline(playbackDocument, { range: playbackRanges.song() });

  const expected = canonicalLegacy(mis36LegacyFixture)
    .sections.flatMap(section => section.events)
    .map(event => ({ symbol: event.symbol, beats: event.beats, notes: event.notes }));

  assert.equal(fullTimeline.entries.length, 81);
  assert.equal(expected.length, 81);
  assert.equal(fullTimeline.totalBeats, 320);

  const clock = new FakeClock();
  const audioRuntime = createSpyAudio();
  const ticker = createFakeTicker();
  const engine = createPlaybackEngine({ clock, audioRuntime, ticker });

  engine.load(migrated);
  engine.start();
  engine.play({ range: playbackRanges.song() });

  const observed = [];
  for (const entry of fullTimeline.entries) {
    clock.time = (entry.startBeat * 60) / fullTimeline.tempo + 0.001;
    ticker.fire();
    const snapshot = engine.getSnapshot();
    assert.equal(snapshot.eventId, entry.eventId, "el motor debe estar en el evento esperado tras el salto de tiempo");
    const indexed = playbackDocument.eventsById.get(snapshot.eventId);
    observed.push({
      symbol: indexed.chord.symbol,
      beats: entry.durationBeats,
      notes: indexed.voicing.notes.map(normalizeNote),
    });
  }

  assert.deepEqual(observed, expected);

  clock.time = (fullTimeline.totalBeats * 60) / fullTimeline.tempo + 0.001;
  ticker.fire();
  assert.equal(engine.getSnapshot().status, "ended");

  engine.destroy();
});

test("el motor universal dispara audio para cada uno de los 81 eventos, sin duplicados ni omisiones", async () => {
  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  const playbackDocument = createPlaybackDocument(migrated);
  const fullTimeline = compileTimeline(playbackDocument, { range: playbackRanges.song() });

  const clock = new FakeClock();
  const audioRuntime = createSpyAudio();
  const ticker = createFakeTicker();
  const engine = createPlaybackEngine({ clock, audioRuntime, ticker });

  engine.load(migrated);
  engine.start();
  engine.play({ range: playbackRanges.song() });

  for (const entry of fullTimeline.entries) {
    clock.time = (entry.startBeat * 60) / fullTimeline.tempo + 0.001;
    ticker.fire();
  }

  assert.equal(audioRuntime.calls.length, 81);
  const soundedVoicingNotes = audioRuntime.calls.map(call => call.voicing.notes.map(normalizeNote));
  const expectedVoicingNotes = fullTimeline.entries.map(
    entry => playbackDocument.eventsById.get(entry.eventId).voicing.notes.map(normalizeNote),
  );
  assert.deepEqual(soundedVoicingNotes, expectedVoicingNotes);

  engine.destroy();
});
