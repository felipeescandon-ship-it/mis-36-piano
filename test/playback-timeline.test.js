import assert from "node:assert/strict";
import test from "node:test";
import { migrateMis36ToLibrary } from "../src/domain/migrations/mis36-v1.js";
import { createPlaybackDocument } from "../src/application/playback/playback-document.js";
import {
  beatAtTime,
  compileTimeline,
  eventAtBeat,
  playbackRanges,
} from "../src/application/playback/timeline.js";
import { compilePracticeTimeline } from "../src/application/playback/practice.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";
import { contrastLibraryFixture } from "./fixtures/contrast-playback.js";

const ids = {
  firstSection: "11111111-1111-4111-8111-111111111121",
  secondSection: "11111111-1111-4111-8111-111111111122",
  firstEvent: "11111111-1111-4111-8111-111111111141",
  secondEvent: "11111111-1111-4111-8111-111111111142",
  thirdEvent: "11111111-1111-4111-8111-111111111143",
  fourthEvent: "11111111-1111-4111-8111-111111111144",
};

test("el fixture B contrasta tempo, compás, acordes y digitación opcional", () => {
  const document = createPlaybackDocument(contrastLibraryFixture);
  const timeline = compileTimeline(document);

  assert.equal(document.song.metadata.tempo, 96);
  assert.deepEqual(document.song.metadata.timeSignature, [3, 4]);
  assert.deepEqual(document.chords.map(chord => chord.symbol), ["Dm7", "G7"]);
  assert.equal(document.voicings.some(voicing => voicing.notes.some(note => note.finger === undefined)), true);
  assert.equal(Object.isFrozen(document.song), true);
  assert.equal(document.eventsById.set, undefined);
  assert.deepEqual(timeline.entries.map(entry => entry.durationBeats), [1, 2, 3, 1, 2]);
  assert.deepEqual(timeline.entries.map(entry => entry.startBeat), [0, 1, 3, 6, 7]);
  assert.equal(timeline.totalBeats, 9);
});

test("compila rangos por IDs sin depender de títulos o índices persistidos", () => {
  const document = createPlaybackDocument(contrastLibraryFixture);

  assert.deepEqual(
    compileTimeline(document, { range: playbackRanges.section(ids.firstSection) }).entries.map(entry => entry.eventId),
    [ids.firstEvent, ids.secondEvent, ids.thirdEvent],
  );
  assert.deepEqual(
    compileTimeline(document, { range: playbackRanges.fromEvent(ids.thirdEvent) }).entries.map(entry => entry.eventId),
    [ids.thirdEvent, ids.fourthEvent, "11111111-1111-4111-8111-111111111145"],
  );
  assert.deepEqual(
    compileTimeline(document, {
      range: playbackRanges.sections([ids.secondSection, ids.firstSection]),
    }).entries.map(entry => entry.sectionId),
    [ids.firstSection, ids.firstSection, ids.firstSection, ids.secondSection, ids.secondSection],
  );
  assert.deepEqual(
    compileTimeline(document, { range: playbackRanges.transition(ids.thirdEvent) }).entries.map(entry => entry.eventId),
    [ids.thirdEvent, ids.fourthEvent],
  );
});

test("localiza límites musicales y calcula tiempo sin deriva acumulada", () => {
  const timeline = compileTimeline(createPlaybackDocument(contrastLibraryFixture));

  assert.equal(eventAtBeat(timeline, 0).entry.eventId, ids.firstEvent);
  assert.equal(eventAtBeat(timeline, 0.999).entry.eventId, ids.firstEvent);
  assert.equal(eventAtBeat(timeline, 1).entry.eventId, ids.secondEvent);
  assert.equal(eventAtBeat(timeline, 9), null);
  assert.equal(beatAtTime({ anchorBeat: 0, anchorTime: 10, now: 510, tempo: 120 }), 1000);
});

test("Práctica repite dos eventos después de la cuenta previa", () => {
  const timeline = compilePracticeTimeline(createPlaybackDocument(contrastLibraryFixture), {
    fromEventId: ids.secondEvent,
    repetitions: 3,
    countInBeats: 4,
  });

  assert.equal(timeline.mode, "practice");
  assert.equal(timeline.leadInBeats, 4);
  assert.equal(timeline.entries.length, 6);
  assert.deepEqual(timeline.entries.map(entry => entry.practiceRepetition), [1, 1, 2, 2, 3, 3]);
  assert.deepEqual(timeline.entries.map(entry => entry.startBeat), [4, 6, 9, 11, 14, 16]);
  assert.equal(timeline.totalBeats, 19);
});

test("rechaza rangos vacíos, IDs desconocidos y posiciones duplicadas", () => {
  const document = createPlaybackDocument(contrastLibraryFixture);
  assert.throws(
    () => compileTimeline(document, { range: playbackRanges.sections([]) }),
    error => error.code === "empty_range",
  );
  assert.throws(
    () => compileTimeline(document, { range: playbackRanges.fromEvent("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") }),
    error => error.code === "unknown_event",
  );

  const duplicate = structuredClone(contrastLibraryFixture);
  duplicate.song.sections[0].events[1].position = 0;
  assert.throws(
    () => compileTimeline(createPlaybackDocument(duplicate)),
    error => error.code === "duplicate_event_position",
  );
});

test("Mis 36 conserva 81 eventos y 320 pulsos en el timeline nuevo", async () => {
  const migrated = await migrateMis36ToLibrary(mis36LegacyFixture);
  const timeline = compileTimeline(createPlaybackDocument(migrated));

  assert.equal(timeline.entries.length, 81);
  assert.equal(timeline.totalBeats, 320);
  assert.equal(timeline.entries.filter(entry => entry.durationBeats === 2).length, 2);
  assert.equal(new Set(timeline.entries.map(entry => entry.eventId)).size, 81);
});
