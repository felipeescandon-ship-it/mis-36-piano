import assert from "node:assert/strict";
import test from "node:test";
import { createPlaybackMachine } from "../src/application/playback/playback-machine.js";
import { createPlaybackDocument } from "../src/application/playback/playback-document.js";
import { playbackRanges } from "../src/application/playback/timeline.js";
import { migrateMis36ToLibrary } from "../src/domain/migrations/mis36-v1.js";
import {
  selectTocarViewModel,
  selectPracticaViewModel,
  buildLetraTree,
  selectLetraPatch,
} from "../src/application/playback/selectors.js";
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

function setup(library = contrastLibraryFixture) {
  const clock = new FakeClock();
  const machine = createPlaybackMachine({ clock });
  machine.load(library);
  const playbackDocument = createPlaybackDocument(library);
  return { clock, machine, playbackDocument };
}

test("selectTocarViewModel devuelve null cuando el estado es empty", () => {
  const clock = new FakeClock();
  const machine = createPlaybackMachine({ clock });
  const viewModel = selectTocarViewModel(machine.getSnapshot(), null);
  assert.equal(viewModel, null);
});

test("selectTocarViewModel refleja el primer evento tras cargar sin reproducir", () => {
  const { machine, playbackDocument } = setup();
  const viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);

  assert.equal(viewModel.currentChord.symbol, "Dm7");
  assert.deepEqual(viewModel.currentVoicing.notes, playbackDocument.eventsById.get(firstEvent).voicing.notes);
  assert.equal(viewModel.nextChord.symbol, "G7");
  assert.deepEqual(viewModel.positionInSection, { index: 0, length: 3 });
});

test("selectTocarViewModel actualiza tras avanzar con ticks", () => {
  const { clock, machine, playbackDocument } = setup();
  machine.play({ range: playbackRanges.song() });
  clock.advance(0.625);
  machine.tick();

  const viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.currentChord.symbol, "G7");
  assert.equal(viewModel.positionInSection.index, 1);
});

test("selectTocarViewModel.transportState refleja cada estado real", () => {
  const { clock, machine, playbackDocument } = setup();

  let viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.transportState.canPlay, true);
  assert.equal(viewModel.transportState.canPause, false);

  machine.play({ range: playbackRanges.song() });
  viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.transportState.canPause, true);
  assert.equal(viewModel.transportState.canPlay, false);

  machine.pause();
  viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.transportState.canResume, true);

  clock.advance(10);
  machine.resume();
  machine.stop();
  viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.transportState.status, "ready");
  assert.equal(viewModel.transportState.canStop, true);
});

test("selectPracticaViewModel fuera de práctica no expone repeticiones", () => {
  const { machine, playbackDocument } = setup();
  const viewModel = selectPracticaViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.repetition, null);
  assert.equal(viewModel.totalRepetitions, null);
  assert.equal(viewModel.canStop, false);
});

test("selectPracticaViewModel refleja cuenta previa y repeticiones", () => {
  const { clock, machine, playbackDocument } = setup();
  machine.startPractice({ fromEventId: firstEvent, repetitions: 2, countInBeats: 2 });

  let viewModel = selectPracticaViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.isCountingIn, true);
  assert.equal(viewModel.countInRemaining, 2);

  clock.advance(0.625);
  machine.tick();
  viewModel = selectPracticaViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.countInRemaining, 1);

  clock.advance(0.625);
  machine.tick();
  viewModel = selectPracticaViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.isCountingIn, false);
  assert.equal(viewModel.repetition, 1);
  assert.equal(viewModel.departureChord.symbol, "Dm7");
  assert.equal(viewModel.canStop, true);

  clock.advance(1.875);
  machine.tick();
  viewModel = selectPracticaViewModel(machine.getSnapshot(), playbackDocument);
  assert.equal(viewModel.repetition, 2);
});

test("buildLetraTree es estable frente al avance de reproducción", () => {
  const { clock, machine, playbackDocument } = setup();
  const tree = buildLetraTree(playbackDocument);

  machine.play({ range: playbackRanges.song() });
  clock.advance(0.625);
  machine.tick();
  clock.advance(2);
  machine.tick();

  const treeAfter = buildLetraTree(playbackDocument);
  assert.deepEqual(tree, treeAfter);

  const firstSection = tree.sections[0];
  const positions = firstSection.events.map(event => event.position);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("selectLetraPatch primera llamada exige reconstrucción", () => {
  const { machine, playbackDocument } = setup();
  const patch = selectLetraPatch(machine.getSnapshot(), null, playbackDocument);
  assert.equal(patch.shouldRebuild, true);
});

test("selectLetraPatch sin cambio lógico no anuncia nada", () => {
  const { machine, playbackDocument } = setup();
  const snapshot = machine.getSnapshot();
  const patch = selectLetraPatch(snapshot, snapshot, playbackDocument);
  assert.equal(patch.shouldRebuild, false);
  assert.equal(patch.announcement, null);
});

test("selectLetraPatch en avance normal no reconstruye toda la hoja", () => {
  const { clock, machine, playbackDocument } = setup();
  machine.play({ range: playbackRanges.song() });
  const previous = machine.getSnapshot();
  clock.advance(0.625);
  machine.tick();
  const current = machine.getSnapshot();

  const patch = selectLetraPatch(current, previous, playbackDocument);
  assert.equal(patch.shouldRebuild, false, "no se ejecuta renderFullSong() durante el avance normal");
  assert.equal(patch.previousEventId, firstEvent);
  assert.equal(patch.currentEventId, secondEvent);
  assert.notEqual(patch.announcement, null);
});

test("selectLetraPatch al cargar otra canción exige reconstrucción", async () => {
  const { machine, playbackDocument } = setup();
  const previous = machine.getSnapshot();

  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  machine.load(migrated);
  const migratedDocument = createPlaybackDocument(migrated);

  const patch = selectLetraPatch(machine.getSnapshot(), previous, migratedDocument);
  assert.equal(patch.shouldRebuild, true);
});

test("paridad cruzada: selectores funcionan igual sobre Mis 36 migrada", async () => {
  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  const { clock, machine, playbackDocument } = setup(migrated);

  let viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.ok(viewModel.currentChord);
  assert.ok(viewModel.currentVoicing);
  assert.deepEqual(viewModel.positionInSection, { index: 0, length: viewModel.positionInSection.length });

  machine.play({ range: playbackRanges.song() });
  clock.advance(0.01);
  machine.tick();
  viewModel = selectTocarViewModel(machine.getSnapshot(), playbackDocument);
  assert.ok(viewModel.currentChord);

  const tree = buildLetraTree(playbackDocument);
  assert.ok(tree.sections.length > 0);
  assert.equal(tree.songId, migrated.song.id);
});
