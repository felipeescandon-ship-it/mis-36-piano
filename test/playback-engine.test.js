import assert from "node:assert/strict";
import test from "node:test";
import { createPlaybackEngine, createRafTicker } from "../src/application/playback/playback-engine.js";
import { playbackRanges } from "../src/application/playback/timeline.js";
import { migrateMis36ToLibrary } from "../src/domain/migrations/mis36-v1.js";
import { contrastLibraryFixture } from "./fixtures/contrast-playback.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";

const firstEvent = "11111111-1111-4111-8111-111111111141";
const secondEvent = "11111111-1111-4111-8111-111111111142";

class FakeClock {
  constructor() {
    this.time = 0;
    this.state = "running";
  }

  now() {
    return this.time;
  }

  advance(seconds) {
    this.time += seconds;
  }
}

function createSpyAudio() {
  const calls = { playVoicing: [], stopGeneration: [] };
  let generation = 0;
  return {
    calls,
    nextGeneration() {
      generation += 1;
      return generation;
    },
    playVoicing(voicing, at, duration, gen) {
      calls.playVoicing.push({ voicing, at, duration, gen });
    },
    stopGeneration(gen, releaseMs) {
      calls.stopGeneration.push({ gen, releaseMs });
    },
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
    isRunning: () => running,
    fire() {
      if (running && cb) cb();
    },
  };
}

function setup(library = contrastLibraryFixture) {
  const clock = new FakeClock();
  const audioRuntime = createSpyAudio();
  const ticker = createFakeTicker();
  const engine = createPlaybackEngine({ clock, audioRuntime, ticker });
  engine.load(library);
  engine.start();
  return { clock, audioRuntime, ticker, engine };
}

test("subscribe() ve el playbackDocument ya listo en la notificación de load(), no el anterior", () => {
  // engine.load() llama a machine.load(), que notifica a los suscriptores de
  // forma síncrona. Si getPlaybackDocument() todavía devolviera el valor
  // previo (null antes de la primera carga) en ese instante, cualquier UI
  // que reaccione al snapshot inicial mostraría "sin canción" a pesar de que
  // el snapshot ya diga "ready".
  const clock = new FakeClock();
  const audioRuntime = createSpyAudio();
  const ticker = createFakeTicker();
  const engine = createPlaybackEngine({ clock, audioRuntime, ticker });

  let seenDuringLoad;
  engine.subscribe(() => {
    seenDuringLoad = engine.getPlaybackDocument();
  });
  engine.load(contrastLibraryFixture);

  assert.ok(seenDuringLoad, "el documento ya está disponible durante la notificación de load()");
  assert.equal(seenDuringLoad.song.id, contrastLibraryFixture.song.id);
});

test("play() + tick dispara playVoicing con las notas del primer evento", () => {
  const { engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();

  assert.equal(audioRuntime.calls.playVoicing.length, 1);
  const call = audioRuntime.calls.playVoicing[0];
  const expectedVoicing = engine.getPlaybackDocument().eventsById.get(firstEvent).voicing;
  assert.deepEqual(call.voicing.notes, expectedVoicing.notes);
  assert.ok(call.duration > 0);
});

test("avanzar al segundo evento dispara exactamente una llamada adicional con el voicing correcto", () => {
  const { clock, engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 1);

  clock.advance(0.625);
  ticker.fire();

  assert.equal(audioRuntime.calls.playVoicing.length, 2);
  const secondCall = audioRuntime.calls.playVoicing[1];
  const expectedVoicing = engine.getPlaybackDocument().eventsById.get(secondEvent).voicing;
  assert.deepEqual(secondCall.voicing.notes, expectedVoicing.notes);
  assert.notDeepEqual(secondCall.voicing.notes, audioRuntime.calls.playVoicing[0].voicing.notes);
});

test("ticks repetidos sin cruzar límite de evento no repiten audio", () => {
  const { engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();
  ticker.fire();
  ticker.fire();

  assert.equal(audioRuntime.calls.playVoicing.length, 1);
});

test("stop() detiene la generación activa y silencia ticks futuros", () => {
  const { clock, engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();
  const generationUsed = audioRuntime.calls.playVoicing[0].gen;

  engine.stop();
  assert.equal(audioRuntime.calls.stopGeneration.length, 1);
  assert.equal(audioRuntime.calls.stopGeneration[0].gen, generationUsed);

  clock.advance(5);
  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 1, "sin audio adicional tras stop");
});

test("select() en pausa/listo no dispara audio", () => {
  const { engine, audioRuntime, ticker } = setup();
  engine.select(secondEvent);
  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 0);
});

test("seek() mientras reproduce detiene la generación vieja sin sonar la nueva", () => {
  const { engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 1);

  engine.seek(secondEvent);
  assert.equal(audioRuntime.calls.stopGeneration.length, 1);

  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 1, "seek no inicia audio nuevo por sí solo");
});

test("load() de otra canción detiene audio viejo y no referencia sus voicings", async () => {
  const { engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();
  const oldVoicingIds = audioRuntime.calls.playVoicing.map(call => call.voicing.id);

  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  engine.load(migrated);
  assert.equal(audioRuntime.calls.stopGeneration.length, 1);

  engine.play({ range: playbackRanges.song() });
  ticker.fire();

  const newCalls = audioRuntime.calls.playVoicing.slice(oldVoicingIds.length);
  for (const call of newCalls) {
    assert.ok(!oldVoicingIds.includes(call.voicing.id));
  }
});

test("práctica: repeticiones distintas del mismo evento suenan por separado", () => {
  const { clock, engine, audioRuntime, ticker } = setup();
  engine.startPractice({ fromEventId: firstEvent, repetitions: 2, countInBeats: 2 });

  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 0, "silencio durante cuenta previa");

  clock.advance(0.625);
  ticker.fire();
  clock.advance(0.625);
  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 1, "repetición 1 suena");

  clock.advance(1.875);
  ticker.fire();
  assert.equal(audioRuntime.calls.playVoicing.length, 2, "repetición 2 suena por separado");
});

test("createRafTicker invoca requestFrame/cancelFrame inyectados", () => {
  let scheduled = null;
  let cancelled = false;
  const ticker = createRafTicker({
    requestFrame: cb => { scheduled = cb; return 1; },
    cancelFrame: () => { cancelled = true; },
  });

  let calls = 0;
  ticker.start(() => { calls += 1; });
  assert.equal(typeof scheduled, "function");

  ticker.stop();
  assert.equal(cancelled, true);

  const staleCallback = scheduled;
  staleCallback();
  assert.equal(calls, 0, "callback tras stop() no hace nada");
});

test("destroy() es idempotente", () => {
  const { engine, audioRuntime, ticker } = setup();
  engine.play({ range: playbackRanges.song() });
  ticker.fire();

  engine.destroy();
  engine.destroy();

  assert.equal(engine.getSnapshot().status, "empty");
  assert.ok(audioRuntime.calls.stopGeneration.length >= 1);
});

test("paridad cruzada: audio se dispara igual sobre Mis 36 migrada", async () => {
  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  const { engine, audioRuntime, ticker } = setup(migrated);

  engine.play({ range: playbackRanges.song() });
  ticker.fire();

  assert.equal(audioRuntime.calls.playVoicing.length, 1);
  assert.ok(audioRuntime.calls.playVoicing[0].voicing.notes.length > 0);
});
