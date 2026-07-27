import assert from "node:assert/strict";
import test from "node:test";
import { createPlaybackMachine } from "../src/application/playback/playback-machine.js";
import { playbackRanges } from "../src/application/playback/timeline.js";
import { migrateMis36ToLibrary } from "../src/domain/migrations/mis36-v1.js";
import { contrastLibraryFixture } from "./fixtures/contrast-playback.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";

const firstEvent = "11111111-1111-4111-8111-111111111141";
const secondEvent = "11111111-1111-4111-8111-111111111142";
const thirdEvent = "11111111-1111-4111-8111-111111111143";

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

  suspend() {
    this.state = "suspended";
  }

  resume() {
    this.state = "running";
  }
}

function setup() {
  const clock = new FakeClock();
  const machine = createPlaybackMachine({ clock });
  machine.load(contrastLibraryFixture);
  return { clock, machine };
}

test("carga el fixture B y avanza por tiempo absoluto", () => {
  const { clock, machine } = setup();
  assert.equal(machine.getSnapshot().status, "ready");
  assert.equal(machine.getSnapshot().eventId, firstEvent);

  machine.play({ range: playbackRanges.song() });
  assert.equal(machine.getSnapshot().status, "playing");
  clock.advance(0.624);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, firstEvent);
  clock.advance(0.001);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, secondEvent);
  assert.equal(machine.getSnapshot().elapsedBeats, 0);
});

test("pausa y reanuda conservando el pulso interno", () => {
  const { clock, machine } = setup();
  machine.play({ range: playbackRanges.song() });
  clock.advance(0.9375);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, secondEvent);
  assert.equal(machine.getSnapshot().elapsedBeats, 0.5);

  machine.pause();
  const paused = machine.getSnapshot();
  assert.equal(paused.status, "paused");
  assert.equal(paused.remainingBeats, 1.5);
  const pausedGeneration = paused.generation;

  clock.advance(10);
  machine.tick();
  assert.deepEqual(machine.getSnapshot(), paused);

  machine.resume();
  assert.ok(machine.getSnapshot().generation > pausedGeneration);
  clock.advance(0.936);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, secondEvent);
  clock.advance(0.002);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, thirdEvent);
});

test("cambiar tempo reancla la posición sin reordenar eventos", () => {
  const { clock, machine } = setup();
  machine.play({ range: playbackRanges.song() });
  clock.advance(0.3125);
  machine.tick();
  assert.equal(machine.getSnapshot().elapsedBeats, 0.5);

  const generation = machine.getGeneration();
  machine.setTempo(60);
  assert.equal(machine.getSnapshot().tempo, 60);
  assert.ok(machine.getGeneration() > generation);
  clock.advance(0.499);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, firstEvent);
  clock.advance(0.001);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, secondEvent);
});

test("detener invalida la generación y conserva el evento visible", () => {
  const { clock, machine } = setup();
  machine.play({ range: playbackRanges.song() });
  clock.advance(0.7);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, secondEvent);

  const playingGeneration = machine.getGeneration();
  machine.stop();
  assert.equal(machine.getSnapshot().status, "ready");
  assert.equal(machine.getSnapshot().eventId, secondEvent);
  assert.ok(machine.getGeneration() > playingGeneration);
});

test("la pausa de sistema no avanza y exige gesto si el reloj está suspendido", () => {
  const { clock, machine } = setup();
  machine.play({ range: playbackRanges.song() });
  clock.advance(0.3125);
  machine.tick();

  machine.handleVisibility(true);
  assert.equal(machine.getSnapshot().status, "paused");
  assert.equal(machine.getSnapshot().pauseReason, "system");
  assert.equal(machine.getSnapshot().elapsedBeats, 0.5);

  clock.suspend();
  machine.handleVisibility(false);
  assert.equal(machine.getSnapshot().status, "blocked");
  clock.advance(20);
  machine.tick();
  assert.equal(machine.getSnapshot().elapsedBeats, 0.5);

  clock.resume();
  machine.resume();
  clock.advance(0.3125);
  machine.tick();
  assert.equal(machine.getSnapshot().eventId, secondEvent);
});

test("Práctica comparte la máquina, cuenta pulsos y repeticiones", () => {
  const { clock, machine } = setup();
  machine.startPractice({ fromEventId: firstEvent, repetitions: 2, countInBeats: 2 });

  assert.equal(machine.getSnapshot().mode, "practice");
  assert.equal(machine.getSnapshot().phase, "countIn");
  assert.equal(machine.getSnapshot().countInRemaining, 2);

  clock.advance(0.625);
  machine.tick();
  assert.equal(machine.getSnapshot().countInRemaining, 1);
  clock.advance(0.625);
  machine.tick();
  assert.equal(machine.getSnapshot().phase, "events");
  assert.equal(machine.getSnapshot().practiceRepetition, 1);
  assert.equal(machine.getSnapshot().eventId, firstEvent);

  clock.advance(1.875);
  machine.tick();
  assert.equal(machine.getSnapshot().practiceRepetition, 2);
  assert.equal(machine.getSnapshot().eventId, firstEvent);

  machine.stop();
  assert.equal(machine.getSnapshot().status, "ready");
  assert.equal(machine.getSnapshot().eventId, firstEvent);
});

test("una carga inválida es atómica y conserva el documento anterior", () => {
  const { machine } = setup();
  const before = machine.getSnapshot();
  const invalid = structuredClone(contrastLibraryFixture);
  invalid.voicings = [];

  assert.throws(
    () => machine.load(invalid),
    error => error.code === "missing_resource",
  );
  assert.deepEqual(machine.getSnapshot(), before);
});

test("cambiar de canción elimina IDs y estado del documento anterior", async () => {
  const { clock, machine } = setup();
  machine.play({ range: playbackRanges.song() });
  clock.advance(1);
  machine.tick();
  const previousGeneration = machine.getGeneration();

  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  machine.load(migrated);
  const current = machine.getSnapshot();

  assert.equal(current.status, "ready");
  assert.equal(current.songId, migrated.song.id);
  assert.notEqual(current.eventId, firstEvent);
  assert.ok(current.generation > previousGeneration);
  assert.equal(current.queueLength, 0);
});

test("completa 1.000 pulsos con reloj falso sin deriva acumulada", () => {
  const longLibrary = structuredClone(contrastLibraryFixture);
  const source = longLibrary.song.sections[0].events[0];
  longLibrary.song.metadata.tempo = 120;
  longLibrary.song.sections = [{
    ...longLibrary.song.sections[0],
    events: Array.from({ length: 1000 }, (_, index) => ({
      ...source,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      position: index,
      beats: 1,
    })),
  }];
  const clock = new FakeClock();
  const machine = createPlaybackMachine({ clock });
  machine.load(longLibrary);
  machine.play({ range: playbackRanges.song() });

  clock.advance(499.75);
  machine.tick();
  assert.equal(machine.getSnapshot().status, "playing");
  assert.equal(machine.getSnapshot().queueIndex, 999);
  assert.equal(machine.getSnapshot().elapsedBeats, 0.5);

  clock.advance(0.25);
  machine.tick();
  assert.equal(machine.getSnapshot().status, "ended");
  assert.equal(machine.getSnapshot().elapsedBeats, 1);
});

test("solo notifica ticks cuando cambia la transición lógica", () => {
  const { clock, machine } = setup();
  const snapshots = [];
  const unsubscribe = machine.subscribe(snapshot => snapshots.push(snapshot));
  const afterSubscribe = snapshots.length;

  machine.play({ range: playbackRanges.song() });
  assert.equal(snapshots.length, afterSubscribe + 1);
  clock.advance(0.2);
  machine.tick();
  assert.equal(snapshots.length, afterSubscribe + 1);
  clock.advance(0.425);
  machine.tick();
  assert.equal(snapshots.length, afterSubscribe + 2);

  unsubscribe();
  machine.pause();
  assert.equal(snapshots.length, afterSubscribe + 2);
});

test("seek, unload y destroy son seguros e idempotentes", () => {
  const { machine } = setup();
  machine.seek(thirdEvent);
  assert.equal(machine.getSnapshot().eventId, thirdEvent);
  machine.unload();
  assert.equal(machine.getSnapshot().status, "empty");
  machine.destroy();
  assert.equal(machine.getSnapshot().status, "empty");
  assert.deepEqual(machine.destroy(), machine.getSnapshot());
  assert.throws(() => machine.load(contrastLibraryFixture), error => error.code === "machine_destroyed");
});
