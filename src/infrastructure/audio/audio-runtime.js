/**
 * Audio runtime: independent coordinator for piano sample playback.
 *
 * No knowledge of songs, chords, DOM, or 'Mis 36'.
 * Receives concrete voicings (pitchClass + octave) and schedules them at absolute time.
 * Manages generation tokens to invalidate stale callbacks.
 *
 * Injected dependencies:
 * - audioContext: Web Audio API AudioContext
 * - pianoSamples: lazy-loaded Salamander + transposition
 * - fallbackSynth: oscillator respaldo when samples fail
 */

class AudioRuntime {
  constructor({
    audioContext,
    pianoSamples,
    fallbackSynth,
  } = {}) {
    if (!audioContext) throw new Error('audioContext required');
    if (!pianoSamples) throw new Error('pianoSamples required');
    if (!fallbackSynth) throw new Error('fallbackSynth required');

    this.audioContext = audioContext;
    this.pianoSamples = pianoSamples;
    this.fallbackSynth = fallbackSynth;

    // State
    this.state = 'uninitialized';
    this.currentGeneration = 0;
    this.activeSources = new Map(); // generation -> Set<source>
    this.activeSynths = new Map(); // generation -> Set<synth node>

    this.isDestroyed = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API: Clock (for integration with playback-machine)
  // ─────────────────────────────────────────────────────────────────

  get clock() {
    const runtime = this;
    return {
      now: () => runtime.audioContext.currentTime,
      get state() { return runtime.state; },
      resume: () => runtime._resumeContext(),
    };
  }

  _resumeContext() {
    if (this.audioContext.state === 'suspended') {
      return this.audioContext.resume().then(() => {
        if (this.audioContext.state === 'running') this.state = 'running';
      }).catch(() => {
        this.state = 'failed';
      });
    }
    // Ya no está suspendido (puede no haberlo estado nunca, si el contexto se
    // creó tras un gesto del usuario): sincroniza el estado igual, porque sin
    // esto `this.state` se queda en 'uninitialized' para siempre y
    // playback-machine lo trata como bloqueado aunque el audio funcione bien.
    if (this.audioContext.state === 'running') this.state = 'running';
    return Promise.resolve();
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API: Audio playback
  // ─────────────────────────────────────────────────────────────────

  /**
   * Play a voicing at absolute time.
   *
   * @param {Object} voicing - { notes: [{ pitchClass, octave }, ...] }
   * @param {number} at - Absolute AudioContext time
   * @param {number} duration - Duration in seconds
   * @param {number} generation - Generation token
   */
  playVoicing(voicing, at, duration, generation) {
    if (this.isDestroyed) return;
    if (!this._isValidGeneration(generation)) return;
    if (!voicing || !voicing.notes) return;

    // Check context state first
    if (this.audioContext.state === 'suspended') {
      this.state = 'blocked';
      return;
    }

    const release = at + duration;

    // Try samples first
    this.pianoSamples.playVoicing(voicing, at, release, {
      onStart: (source) => {
        if (this._isValidGeneration(generation)) {
          if (!this.activeSources.has(generation)) {
            this.activeSources.set(generation, new Set());
          }
          this.activeSources.get(generation).add(source);
        }
      },
      onError: () => {
        // Fallback to synth
        if (this._isValidGeneration(generation)) {
          this.fallbackSynth.playVoicing(voicing, at, release, {
            onStart: (synth) => {
              if (this._isValidGeneration(generation)) {
                if (!this.activeSynths.has(generation)) {
                  this.activeSynths.set(generation, new Set());
                }
                this.activeSynths.get(generation).add(synth);
                this.state = 'degraded';
              }
            },
            onError: () => {
              if (this._isValidGeneration(generation)) {
                this.state = 'failed';
              }
            },
          });
        }
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Generation management
  // ─────────────────────────────────────────────────────────────────

  nextGeneration() {
    this.currentGeneration++;
    return this.currentGeneration;
  }

  _isValidGeneration(generation) {
    return generation === this.currentGeneration;
  }

  stopGeneration(generation, releaseMs = 50) {
    if (this.isDestroyed) return;
    if (!this.activeSources.has(generation) && !this.activeSynths.has(generation)) {
      return; // Idempotent
    }

    const releaseSecs = releaseMs / 1000;
    const stopTime = this.audioContext.currentTime + releaseSecs;

    const sources = this.activeSources.get(generation) || new Set();
    const synths = this.activeSynths.get(generation) || new Set();

    sources.forEach(source => {
      try {
        source.stop(stopTime);
      } catch (e) {
        // Already stopped
      }
    });

    synths.forEach(synth => {
      try {
        synth.stop(stopTime);
      } catch (e) {
        // Already stopped
      }
    });

    this.activeSources.delete(generation);
    this.activeSynths.delete(generation);
  }

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Stop all active generations
    const generations = new Set([
      ...this.activeSources.keys(),
      ...this.activeSynths.keys(),
    ]);
    generations.forEach(gen => this.stopGeneration(gen, 50));

    this.activeSources.clear();
    this.activeSynths.clear();

    if (this.pianoSamples && this.pianoSamples.destroy) {
      this.pianoSamples.destroy();
    }
    if (this.fallbackSynth && this.fallbackSynth.destroy) {
      this.fallbackSynth.destroy();
    }

    this.state = 'uninitialized';
  }

  // ─────────────────────────────────────────────────────────────────
  // Observers (for testing)
  // ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      runtimeState: this.state,
      generation: this.currentGeneration,
      activeSources: this.activeSources.size,
      activeSynths: this.activeSynths.size,
    };
  }
}

export default AudioRuntime;
