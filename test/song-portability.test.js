import { describe, it } from "node:test";
import assert from "node:assert";
import { createSongFactory } from "../src/application/song-library/song-factory.js";
import { createChordBuilder } from "../src/application/chord-constructor/chord-builder.js";
import { createChordFactory } from "../src/application/chord-constructor/chord-factory.js";
import { validateLibrary } from "../src/domain/validation.js";
import {
  buildExportBundle,
  parseExportBundle,
  importExportBundle,
} from "../src/application/song-library/song-portability.js";

function songWithOneChordEvent() {
  const builder = createChordBuilder();
  builder.setRoot({ pitchClass: 0, spelling: "C" });
  builder.setQuality("Mayor");
  builder.addNote({ pitchClass: 0, octave: 3, spelling: "C", hand: "left" });
  builder.addNote({ pitchClass: 0, octave: 4, spelling: "C", hand: "right" });

  const chordFactory = createChordFactory();
  const chord = chordFactory.createChord(builder.state());
  const voicing = chordFactory.createVoicing(chord.id, builder.state(), "song", "Do Mayor");

  const song = createSongFactory().createSong({ title: "Con acorde" });
  const line = song.sections[0].lines[0];
  song.sections[0].events.push({
    id: crypto.randomUUID(),
    lineId: line.id,
    anchor: 0,
    position: 0,
    beats: 1,
    chord: { chordId: chord.id, voicingId: voicing.id, voicingRevision: voicing.revision },
  });

  return { song, chord, voicing };
}

describe("Song Portability", () => {
  it("only bundles chords and voicings referenced by the song", () => {
    const { song, chord, voicing } = songWithOneChordEvent();
    const unrelatedChord = { ...chord, id: crypto.randomUUID() };
    const unrelatedVoicing = { ...voicing, id: crypto.randomUUID(), chordId: unrelatedChord.id };

    const bundle = buildExportBundle({
      song,
      chords: [chord, unrelatedChord],
      voicings: [voicing, unrelatedVoicing],
    });

    assert.strictEqual(bundle.chords.length, 1);
    assert.strictEqual(bundle.chords[0].id, chord.id);
    assert.strictEqual(bundle.voicings.length, 1);
    assert.strictEqual(bundle.voicings[0].id, voicing.id);
  });

  it("stamps the export envelope", () => {
    const { song, chord, voicing } = songWithOneChordEvent();
    const bundle = buildExportBundle({ song, chords: [chord], voicings: [voicing] });

    assert.strictEqual(bundle.format, "piano-library-export");
    assert.strictEqual(bundle.schemaVersion, 1);
    assert.ok(Number.isFinite(Date.parse(bundle.exportedAt)));
  });

  it("rejects text that is not JSON", () => {
    assert.throws(() => parseExportBundle("{ esto no es json"), /JSON válido/);
  });

  it("rejects a bundle with an unknown envelope format", () => {
    assert.throws(
      () => importExportBundle({ format: "otra-cosa", schemaVersion: 1, song: {}, chords: [], voicings: [] }),
      /formato de exportación/,
    );
  });

  it("rejects a structurally invalid bundle", () => {
    const { song, chord, voicing } = songWithOneChordEvent();
    const bundle = buildExportBundle({ song, chords: [chord], voicings: [voicing] });
    bundle.voicings[0].revision = crypto.randomUUID(); // ya no coincide con el evento

    assert.throws(() => importExportBundle(bundle));
  });

  it("imports as a fresh copy with no identifier collisions", () => {
    const { song, chord, voicing } = songWithOneChordEvent();
    const bundle = buildExportBundle({ song, chords: [chord], voicings: [voicing] });
    const roundTripped = JSON.parse(JSON.stringify(bundle));

    const imported = importExportBundle(roundTripped);

    assert.doesNotThrow(() => validateLibrary(imported));
    assert.notStrictEqual(imported.song.id, song.id);
    assert.notStrictEqual(imported.chords[0].id, chord.id);
    assert.notStrictEqual(imported.voicings[0].id, voicing.id);

    const importedEvent = imported.song.sections[0].events[0];
    assert.strictEqual(importedEvent.chord.chordId, imported.chords[0].id);
    assert.strictEqual(importedEvent.chord.voicingId, imported.voicings[0].id);
    assert.strictEqual(importedEvent.chord.voicingRevision, imported.voicings[0].revision);
  });

  it("round-trips through parseExportBundle end to end", () => {
    const { song, chord, voicing } = songWithOneChordEvent();
    const bundle = buildExportBundle({ song, chords: [chord], voicings: [voicing] });
    const jsonText = JSON.stringify(bundle);

    const imported = importExportBundle(parseExportBundle(jsonText));

    assert.strictEqual(imported.song.metadata.title, "Con acorde");
    assert.doesNotThrow(() => validateLibrary(imported));
  });
});
