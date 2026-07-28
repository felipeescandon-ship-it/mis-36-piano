/**
 * Fallback synthesizer: oscillator-based synth when samples fail.
 *
 * Plays the same concrete notes (pitchClass + octave) via sine wave oscillators.
 * No knowledge of chord names, inversions, or symbols.
 */

class FallbackSynth {
  constructor(audioContext) {
    if (!audioContext) throw new Error('audioContext required');
    this.audioContext = audioContext;
    this.isDestroyed = false;
    this.activeOscillators = new Map(); // node id -> oscillator
    this.nodeIdCounter = 0;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Play voicing via oscillators.
   *
   * @param {Object} voicing - { notes: [{ pitchClass, octave }, ...] }
   * @param {number} at - Absolute AudioContext time to start
   * @param {number} release - Absolute AudioContext time to release
   * @param {Object} callbacks - { onStart, onError }
   */
  playVoicing(voicing, at, release, { onStart, onError } = {}) {
    if (this.isDestroyed) return;
    if (!voicing || !voicing.notes) return;

    voicing.notes.forEach(note => {
      this._playNote(note, at, release, onStart, onError);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Internal: Note playback
  // ─────────────────────────────────────────────────────────────────

  _playNote(note, at, release, onStart, onError) {
    if (this.isDestroyed) return;

    const { pitchClass, octave } = note;
    if (pitchClass === undefined || octave === undefined) return;

    const frequency = this._frequencyFromPitchClassOctave(pitchClass, octave);
    if (!frequency) {
      if (onError) onError();
      return;
    }

    try {
      const nodeId = ++this.nodeIdCounter;

      const oscillator = this.audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const gain = this.audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);

      // Attack + release envelope
      const attackTime = Math.min(0.1, at);
      const releaseDuration = Math.min((release - at) * 0.2, 0.15);

      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.3, at + attackTime);
      gain.gain.setValueAtTime(0.3, release - releaseDuration);
      gain.gain.exponentialRampToValueAtTime(0.01, release);

      oscillator.start(at);
      oscillator.stop(release);

      this.activeOscillators.set(nodeId, { oscillator, gain });

      if (onStart) onStart({ nodeId, oscillator, gain });

      // Clean up after release
      const cleanupTime = release + 0.5;
      const cleanupId = setTimeout(() => {
        this.activeOscillators.delete(nodeId);
      }, Math.max(0, (cleanupTime - this.audioContext.currentTime) * 1000));
    } catch (err) {
      console.error('Failed to play note via synth:', err);
      if (onError) onError();
    }
  }

  _frequencyFromPitchClassOctave(pitchClass, octave) {
    if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass > 11) return null;
    const midi = (octave + 1) * 12 + pitchClass;
    // A4 = 440 Hz = MIDI 69
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.activeOscillators.clear();
  }
}

export default FallbackSynth;
