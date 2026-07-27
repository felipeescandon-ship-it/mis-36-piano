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
  assert.match(html, /spokenMusicList\(chordNotes\)/);
  assert.match(html, /chordButton\.setAttribute\("aria-current","true"\)/);
  assert.match(html, /"sobre la palabra":"over the word"/);
  assert.match(html, /lyricsNotesToggle\.setAttribute\("aria-pressed",String\(showLyricsChordNotes\)\)/);
  assert.match(html, /\.song-editing \.lyrics-view-actions\{display:none\}/);
});

test("las anotaciones son tipográficas, táctiles y la letra conserva un flujo natural", () => {
  assert.match(html, /\.show-full:not\(\.song-editing\) \.app\{max-width:1480px\}/);
  assert.match(html, /\.lyrics-page\{max-width:1400px/);
  assert.match(html, /\.song-sheet\{max-width:1320px/);
  assert.match(html, /\.song-chord\{[^}]+min-height:44px[^}]+background:transparent/);
  assert.match(html, /\.song-chord-name\{color:#155fc0;font-size:19px/);
  assert.match(html, /\.song-chord-notes\{color:#526178;font-size:14px/);
  assert.match(html, /\.song-word\{[^}]+font-size:clamp\(21px,1\.7vw,26px\)/);
  assert.match(html, /\.song-part h3\{[^}]+font-size:18px/);
  assert.match(html, /\.song-lyric-run\{[^}]+flex-wrap:wrap/);
  assert.match(html, /song-word-cell song-phrase-cell/);
  assert.match(html, /song-terminal-marker/);
  assert.doesNotMatch(html, /textContent=songEditMode\?"Fin de línea":"↵"/);
});

test("el editor heredado conserva sus controles y tarjetas separadas de la vista de lectura", () => {
  assert.match(html, /\.song-editing \.song-chord\{[^}]+background:#fff7e5/);
  assert.match(html, /endTarget\.textContent="Fin de línea"/);
  assert.match(html, /if\(songEditMode\)\{/);
});
