import { describe, it } from "node:test";
import assert from "node:assert";
import { parseSongText } from "../src/application/song-library/song-text-parser.js";

describe("Song Text Parser", () => {
  it("splits sections by bracketed headers", () => {
    const { sections } = parseSongText(`[Primera Parte]\nUna línea sin acordes\n\n[Estribillo]\nOtra línea`);
    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].name, "Primera Parte");
    assert.strictEqual(sections[1].name, "Estribillo");
  });

  it("pairs a chord line with the lyric line below it", () => {
    const text = `[Primera Parte]\n        C              G\nWhen I find myself in times of trouble`;
    const { sections } = parseSongText(text);
    const line = sections[0].lines[0];
    assert.strictEqual(line.text, "When I find myself in times of trouble");
    assert.strictEqual(line.chords.length, 2);
    assert.strictEqual(line.chords[0].token.rootSpelling, "C");
    assert.strictEqual(line.chords[1].token.rootSpelling, "G");
    line.chords.forEach(chord => assert.ok(chord.anchor >= 0 && chord.anchor <= 8));
  });

  it("treats a parenthesized chord-only line as an instrumental break", () => {
    const text = `[Primera Parte]\n( F7M(2/4+)  F6  C )`;
    const { sections } = parseSongText(text);
    const line = sections[0].lines[0];
    assert.strictEqual(line.text, "· · ·");
    assert.strictEqual(line.chords.length, 3);
    assert.deepStrictEqual(line.chords.map(c => c.anchor), [0, 1, 2]);
    assert.strictEqual(line.chords[0].token.quality, "maj7");
    assert.strictEqual(line.chords[1].token.quality, "6");
    assert.strictEqual(line.chords[2].token.quality, "Mayor");
  });

  it("treats a chord line with no lyric partner as instrumental", () => {
    const text = `[Estribillo]\nAm F C\n\n[Segunda Parte]\nTexto normal`;
    const { sections } = parseSongText(text);
    assert.strictEqual(sections[0].lines[0].text, "· · ·");
    assert.strictEqual(sections[0].lines[0].chords.length, 3);
    assert.strictEqual(sections[1].lines[0].text, "Texto normal");
    assert.strictEqual(sections[1].lines[0].chords.length, 0);
  });

  it("keeps plain lyric lines without chords untouched", () => {
    const { sections } = parseSongText(`[Letra]\nSolo texto, sin acordes arriba`);
    assert.strictEqual(sections[0].lines[0].text, "Solo texto, sin acordes arriba");
    assert.strictEqual(sections[0].lines[0].chords.length, 0);
  });

  it("ignores blank lines and drops sections left empty", () => {
    const { sections } = parseSongText(`\n\n[Vacía]\n\n[Con contenido]\nHola`);
    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].name, "Con contenido");
  });
});
