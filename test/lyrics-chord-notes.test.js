import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Letra ofrece las notas del acorde activadas por defecto y permite ocultarlas", () => {
  assert.match(html, /id="lyricsNotesToggle"[^>]+aria-pressed="true"[^>]*>Ocultar notas</);
  assert.match(html, /readPreference\("mis36-lyrics-show-chord-notes","true"\)!=="false"/);
  assert.match(html, /showLyricsChordNotes\?"Ocultar notas":"Mostrar notas"/);
  assert.match(html, /savePreference\("mis36-lyrics-show-chord-notes",String\(showLyricsChordNotes\)\)/);
});

test("cada acorde de Letra muestra la digitación real de la mano derecha", () => {
  assert.match(html, /resolveVoicing\(event\.chord,event\.inversion\)\.r\.map\(\(\[note\]\)=>noteText\(note,event\.chord\)\)/);
  assert.match(html, /notes\.textContent=lyricsChordNotes\(event\)\.join\("-"\)/);
  assert.match(html, /separator\.textContent="\|"/);
});

test("la opción mantiene accesibilidad y no recarga de información el editor", () => {
  assert.match(html, /if\(songEditMode\|\|!showLyricsChordNotes\)/);
  assert.match(html, /notas de mano derecha: \$\{chordNotes\.join\(", "\)\}/);
  assert.match(html, /lyricsNotesToggle\.setAttribute\("aria-pressed",String\(showLyricsChordNotes\)\)/);
  assert.match(html, /\.song-editing \.lyrics-view-actions\{display:none\}/);
});

test("las tarjetas son compactas y la hoja aprovecha el ancho de escritorio", () => {
  assert.match(html, /\.show-full:not\(\.song-editing\) \.app\{max-width:1480px\}/);
  assert.match(html, /\.lyrics-page\{max-width:1400px/);
  assert.match(html, /\.song-sheet\{max-width:1320px/);
  assert.match(html, /\.song-chord-name\{font-size:24px/);
  assert.match(html, /\.song-line\{margin:0 0 12px/);
});
