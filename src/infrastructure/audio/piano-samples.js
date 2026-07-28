/**
 * Piano samples: lazy-loaded Salamander piano samples with transposition.
 *
 * Responsibilities:
 * - Lazy-load samples asynchronously
 * - Find nearest sample by MIDI pitch
 * - Calculate transposition via playbackRate
 * - No knowledge of chord names, inversions, or symbols
 *
 * Receives voicing as: { notes: [{ pitchClass, octave, digitiation? }] }
 * Each note is absolute MIDI pitch, no dependencies on song structure.
 */

const SALAMANDER_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/salamander-piano-lite/2.1.0/';

// Salamander samples: { midi: [{ vel, url }, ...], ... }
const SALAMANDER_SAMPLES = {
  21: { vel: 5, url: 'A0_1_forte_1.0_2.0.mp3' },
  24: { vel: 5, url: 'C1_1_forte_1.0_2.0.mp3' },
  27: { vel: 5, url: 'D#1_1_forte_1.0_2.0.mp3' },
  30: { vel: 5, url: 'F#1_1_forte_1.0_2.0.mp3' },
  33: { vel: 5, url: 'A1_1_forte_1.0_2.0.mp3' },
  36: { vel: 5, url: 'C2_1_forte_1.0_2.0.mp3' },
  39: { vel: 5, url: 'D#2_1_forte_1.0_2.0.mp3' },
  42: { vel: 5, url: 'F#2_1_forte_1.0_2.0.mp3' },
  45: { vel: 5, url: 'A2_1_forte_1.0_2.0.mp3' },
  48: { vel: 5, url: 'C3_1_forte_1.0_2.0.mp3' },
  51: { vel: 5, url: 'D#3_1_forte_1.0_2.0.mp3' },
  54: { vel: 5, url: 'F#3_1_forte_1.0_2.0.mp3' },
  57: { vel: 5, url: 'A3_1_forte_1.0_2.0.mp3' },
  60: { vel: 5, url: 'C4_1_forte_1.0_2.0.mp3' },
  63: { vel: 5, url: 'D#4_1_forte_1.0_2.0.mp3' },
  66: { vel: 5, url: 'F#4_1_forte_1.0_2.0.mp3' },
  69: { vel: 5, url: 'A4_1_forte_1.0_2.0.mp3' },
  72: { vel: 5, url: 'C5_1_forte_1.0_2.0.mp3' },
  75: { vel: 5, url: 'D#5_1_forte_1.0_2.0.mp3' },
  78: { vel: 5, url: 'F#5_1_forte_1.0_2.0.mp3' },
  81: { vel: 5, url: 'A5_1_forte_1.0_2.0.mp3' },
  84: { vel: 5, url: 'C6_1_forte_1.0_2.0.mp3' },
  87: { vel: 5, url: 'D#6_1_forte_1.0_2.0.mp3' },
  90: { vel: 5, url: 'F#6_1_forte_1.0_2.0.mp3' },
  93: { vel: 5, url: 'A6_1_forte_1.0_2.0.mp3' },
  96: { vel: 5, url: 'C7_1_forte_1.0_2.0.mp3' },
};

class PianoSamples {
  constructor(audioContext, decodeAudioData = null) {
    if (!audioContext) throw new Error('audioContext required');
    this.audioContext = audioContext;
    this.decodeAudioData = decodeAudioData || this._defaultDecode.bind(this);

    this.buffers = new Map(); // midi -> AudioBuffer
    this.loadingPromise = null;
    this.isDestroyed = false;
    this.abortControllers = new Map(); // midi -> AbortController
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Play a voicing at absolute time with transposition.
   *
   * @param {Object} voicing - { notes: [{ pitchClass, octave }, ...] }
   * @param {number} at - Absolute AudioContext time to start
   * @param {number} release - Absolute AudioContext time to release
   * @param {Object} callbacks - { onStart, onError }
   */
  playVoicing(voicing, at, release, { onStart, onError } = {}) {
    if (this.isDestroyed) return;
    if (!voicing || !voicing.notes) return;

    this.ensureLoaded().then(() => {
      if (this.isDestroyed) return;
      voicing.notes.forEach(note => {
        this._playNote(note, at, release, onStart, onError);
      });
    }).catch(() => {
      if (onError) onError();
    });
  }

  ensureLoaded() {
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      await Promise.all(
        Array.from(Object.keys(SALAMANDER_SAMPLES)).map(midi =>
          this._loadSample(parseInt(midi, 10))
        )
      );
    })();

    return this.loadingPromise;
  }

  // ─────────────────────────────────────────────────────────────────
  // Internal: Sample loading & decoding
  // ─────────────────────────────────────────────────────────────────

  async _loadSample(midi) {
    if (this.buffers.has(midi)) return;
    if (this.isDestroyed) return;

    const info = SALAMANDER_SAMPLES[midi];
    if (!info) return;

    const url = SALAMANDER_BASE_URL + info.url;
    const abort = new AbortController();
    this.abortControllers.set(midi, abort);

    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      if (abort.signal.aborted || this.isDestroyed) return;

      const buffer = await this.decodeAudioData(arrayBuffer);
      if (abort.signal.aborted || this.isDestroyed) return;

      this.buffers.set(midi, buffer);
      this.abortControllers.delete(midi);
    } catch (err) {
      this.abortControllers.delete(midi);
      if (err.name !== 'AbortError') {
        console.warn(`Failed to load sample ${midi}:`, err);
      }
    }
  }

  _defaultDecode(arrayBuffer) {
    return new Promise((resolve, reject) => {
      this.audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Internal: Note playback
  // ─────────────────────────────────────────────────────────────────

  _playNote(note, at, release, onStart, onError) {
    if (this.isDestroyed) return;

    const { pitchClass, octave } = note;
    if (pitchClass === undefined || octave === undefined) return;

    const midi = this._midiFromPitchClassOctave(pitchClass, octave);
    const nearestMidi = this._findNearestSample(midi);
    if (!nearestMidi) {
      if (onError) onError();
      return;
    }

    const buffer = this.buffers.get(nearestMidi);
    if (!buffer) {
      if (onError) onError();
      return;
    }

    const transposition = midi - nearestMidi;
    const playbackRate = Math.pow(2, transposition / 12);

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      const gain = this.audioContext.createGain();
      source.connect(gain);
      gain.connect(this.audioContext.destination);

      // Release envelope: fade out over last 150ms
      const releaseDuration = Math.min((release - at) * 0.2, 0.15);
      gain.gain.setValueAtTime(1, at);
      gain.gain.exponentialRampToValueAtTime(0.01, release - releaseDuration);

      source.start(at);
      if (onStart) onStart(source);

      source.stop(release);
    } catch (err) {
      console.error('Failed to play note:', err);
      if (onError) onError();
    }
  }

  _midiFromPitchClassOctave(pitchClass, octave) {
    return (octave + 1) * 12 + pitchClass;
  }

  _findNearestSample(midi) {
    const samples = Object.keys(SALAMANDER_SAMPLES).map(x => parseInt(x, 10)).sort((a, b) => a - b);
    if (samples.length === 0) return null;

    let nearest = samples[0];
    let minDist = Math.abs(midi - nearest);

    for (const s of samples) {
      const dist = Math.abs(midi - s);
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }

    return nearest;
  }

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.abortControllers.forEach(abort => abort.abort());
    this.abortControllers.clear();
    this.buffers.clear();
  }
}

export default PianoSamples;
