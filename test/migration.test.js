import assert from "node:assert/strict";
import test from "node:test";
import { compareCanonical } from "../src/domain/canonical.js";
import { migrateMis36ToLibrary, migrationOperationKey } from "../src/domain/migrations/mis36-v1.js";
import { validateLibrary } from "../src/domain/validation.js";
import { mis36LegacyFixture } from "./fixtures/mis36-legacy.js";

test("migra el snapshot vigente de Mis 36 con equivalencia canónica", async () => {
  const result = await migrateMis36ToLibrary(mis36LegacyFixture);
  const comparison = compareCanonical(mis36LegacyFixture, result);
  const events = result.song.sections.flatMap(section => section.events);

  assert.equal(comparison.equal, true);
  assert.deepEqual(comparison.checks, {
    sections: true,
    lines: true,
    events: true,
    voicings: true,
    durations: true,
  });
  assert.equal(events.length, 81);
  assert.equal(result.chords.length, 12);
  assert.equal(result.voicings.length, 36);
  assert.equal(result.migration.audit.deletedEventKeys.length, 5);
  assert.equal(events.filter(event => event.beats !== 4).length, 2);
  assert.equal(result.migration.status, "shadow");
  assert.ok(Object.values(result.migration.checks).every(Boolean));
  assert.match(migrationOperationKey(result.migration.sourceHash), /^mis36:1:[0-9a-f]{64}$/);
  validateLibrary(result);
});

test("la migración es idempotente y conserva IDs deterministas", async () => {
  const first = await migrateMis36ToLibrary(structuredClone(mis36LegacyFixture));
  const second = await migrateMis36ToLibrary(structuredClone(mis36LegacyFixture));

  assert.deepEqual(second, first);
  assert.equal(new Set(first.chords.map(chord => chord.id)).size, first.chords.length);
  assert.equal(new Set(first.voicings.map(voicing => voicing.id)).size, first.voicings.length);
  assert.equal(
    new Set(first.song.sections.flatMap(section => section.events.map(event => event.id))).size,
    81,
  );
});

test("un cambio del origen cambia su huella y el recurso migrado", async () => {
  const changed = structuredClone(mis36LegacyFixture);
  changed.songSync.events["3:1:0"].beats = 3;

  const original = await migrateMis36ToLibrary(mis36LegacyFixture);
  const migrated = await migrateMis36ToLibrary(changed);

  assert.notEqual(migrated.migration.sourceHash, original.migration.sourceHash);
  assert.equal(migrated.song.id, original.song.id);
  assert.notEqual(migrated.song.revision, original.song.revision);
  assert.equal(compareCanonical(changed, migrated).equal, true);
});
