import { randomUUID } from "node:crypto";

export function createChordPreviewPlayer(audio) {
  let currentGeneration = null;
  let currentVoicingId = null;
  let isPlaying = false;

  return {
    play(voicing, at, duration = 1.0) {
      // Stop previous if playing
      if (currentGeneration) {
        audio.stopGeneration(currentGeneration);
      }

      // Generate new voicing ID
      currentGeneration = randomUUID();
      currentVoicingId = voicing.id;
      isPlaying = true;

      // Play voicing at absolute time
      audio.playVoicing(voicing, at, duration, currentGeneration);
    },

    stop() {
      if (currentGeneration) {
        audio.stopGeneration(currentGeneration);
      }
      currentGeneration = null;
      currentVoicingId = null;
      isPlaying = false;
    },

    state() {
      return Object.freeze({
        isPlaying,
        generation: currentGeneration,
        voicingId: currentVoicingId,
      });
    },
  };
}
