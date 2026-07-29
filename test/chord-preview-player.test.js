import { describe, it } from "node:test";
import assert from "node:assert";
import { createChordPreviewPlayer } from "../src/application/chord-constructor/chord-preview-player.js";

const mockAudio = () => {
  let playing = null;
  let lastCall = null;
  return {
    playVoicing(voicing, at, duration, generation) {
      playing = { voicing, at, duration, generation };
      lastCall = playing;
    },
    stopGeneration(generation) {
      if (playing && playing.generation === generation) {
        playing = null;
      }
    },
    /** Última llamada recibida, aunque después se haya detenido. */
    lastCall: () => lastCall,
    state: "ready",
  };
};

describe("Chord Preview Player", () => {
  it("creates player with initial state stopped", () => {
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    assert.strictEqual(player.state().isPlaying, false);
    assert.strictEqual(player.state().generation, null);
  });

  it("plays voicing and tracks generation", () => {
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    const voicing = {
      format: "piano-voicing",
      id: "v1",
      notes: [
        { pitchClass: 0, octave: 4, spelling: "C", hand: "right" },
        { pitchClass: 4, octave: 4, spelling: "E", hand: "right" },
        { pitchClass: 7, octave: 4, spelling: "G", hand: "right" },
      ],
    };

    player.play(voicing, 2.0);

    const state = player.state();
    assert.strictEqual(state.isPlaying, true);
    assert.strictEqual(state.voicingId, "v1");

    // Al reproducir se crea un identificador de generación y es el mismo que
    // recibe el runtime de audio: es el asa con la que luego se detiene ese
    // sonido y no otro.
    assert.notStrictEqual(state.generation, null);
    assert.strictEqual(state.generation, audio.lastCall().generation);
  });

  it("stops playback and clears state", () => {
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    const voicing = {
      id: "v1",
      notes: [{ pitchClass: 0, octave: 4, spelling: "C", hand: "right" }],
    };

    player.play(voicing, 0);
    assert.strictEqual(player.state().isPlaying, true);

    player.stop();

    assert.strictEqual(player.state().isPlaying, false);
    assert.strictEqual(player.state().voicingId, null);
  });

  it("prevents multiple simultaneous plays", () => {
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    const voicing1 = { id: "v1", notes: [{ pitchClass: 0, octave: 4, spelling: "C", hand: "right" }] };
    const voicing2 = { id: "v2", notes: [{ pitchClass: 4, octave: 4, spelling: "E", hand: "right" }] };

    player.play(voicing1, 0);
    const gen1 = player.state().generation;

    player.play(voicing2, 0);
    const gen2 = player.state().generation;

    // Second play should stop the first
    assert.notStrictEqual(gen1, gen2);
    assert.strictEqual(player.state().voicingId, "v2");
  });

  it("handles play with custom duration", () => {
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    const voicing = { id: "v1", notes: [{ pitchClass: 0, octave: 4, spelling: "C", hand: "right" }] };

    player.play(voicing, 0, 1.5);

    const state = player.state();
    assert.strictEqual(state.isPlaying, true);
  });

  it("is idempotent on stop", () => {
    const audio = mockAudio();
    const player = createChordPreviewPlayer(audio);

    const voicing = { id: "v1", notes: [{ pitchClass: 0, octave: 4, spelling: "C", hand: "right" }] };

    player.play(voicing, 0);
    player.stop();
    player.stop(); // Should not throw
    player.stop(); // Should not throw

    assert.strictEqual(player.state().isPlaying, false);
  });
});
