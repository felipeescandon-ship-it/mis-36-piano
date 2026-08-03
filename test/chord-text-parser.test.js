import { describe, it } from "node:test";
import assert from "node:assert";
import { parseChordToken } from "../src/application/song-library/chord-text-parser.js";

describe("Chord Text Parser", () => {
  it("parses a plain major chord", () => {
    const parsed = parseChordToken("C");
    assert.strictEqual(parsed.rootPitchClass, 0);
    assert.strictEqual(parsed.rootSpelling, "C");
    assert.strictEqual(parsed.quality, "Mayor");
    assert.strictEqual(parsed.bassPitchClass, null);
    assert.strictEqual(parsed.approximate, false);
  });

  it("parses minor chords", () => {
    const parsed = parseChordToken("Am");
    assert.strictEqual(parsed.rootPitchClass, 9);
    assert.strictEqual(parsed.quality, "menor");
  });

  it("parses a slash chord with alternate bass", () => {
    const parsed = parseChordToken("Am/G");
    assert.strictEqual(parsed.rootPitchClass, 9);
    assert.strictEqual(parsed.quality, "menor");
    assert.strictEqual(parsed.bassPitchClass, 7);
    assert.strictEqual(parsed.bassSpelling, "G");
  });

  it("parses flats consistently", () => {
    const parsed = parseChordToken("Bb");
    assert.strictEqual(parsed.rootPitchClass, 10);
    assert.strictEqual(parsed.rootSpelling, "Bb");
    assert.strictEqual(parsed.quality, "Mayor");
  });

  it("parses sixth chords", () => {
    const parsed = parseChordToken("F6");
    assert.strictEqual(parsed.rootPitchClass, 5);
    assert.strictEqual(parsed.quality, "6");
    assert.strictEqual(parsed.approximate, false);
  });

  it("resolves Brazilian-style 7M as maj7 even with decorative parentheses", () => {
    const parsed = parseChordToken("F7M(2/4+)");
    assert.strictEqual(parsed.rootPitchClass, 5);
    assert.strictEqual(parsed.quality, "maj7");
    assert.strictEqual(parsed.approximate, false);
  });

  it("falls back to an approximate quality for unrecognized suffixes", () => {
    const parsed = parseChordToken("Cxyz7");
    assert.strictEqual(parsed.rootPitchClass, 0);
    assert.strictEqual(parsed.quality, "7");
    assert.strictEqual(parsed.approximate, true);
  });

  it("returns null for tokens that are not chord-shaped", () => {
    assert.strictEqual(parseChordToken("When"), null);
    assert.strictEqual(parseChordToken("i"), null);
    assert.strictEqual(parseChordToken(""), null);
    assert.strictEqual(parseChordToken("   "), null);
  });
});
