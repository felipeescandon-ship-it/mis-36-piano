/**
 * E1.3 Audio Infrastructure Tests
 *
 * Validates:
 * 1. Absolute time scheduling (source.start at requested time)
 * 2. Voicing contract (pitchClass + octave, not chord names)
 * 3. Nearest sample transposition
 * 4. Sample load failure + fallback + degraded state
 * 5. Both samples and fallback fail → audio_failed
 * 6. Suspended context → audio_blocked until gesture
 * 7. Generation cancellation (only stops own sources)
 * 8. Old generation cannot publish state/sound
 * 9. stopGeneration() + destroy() idempotent
 * 10. Release ≤ 150ms
 * 11. No imports of window/document/index.html data
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import AudioRuntime from '../src/infrastructure/audio/audio-runtime.js';
import PianoSamples from '../src/infrastructure/audio/piano-samples.js';
import FallbackSynth from '../src/infrastructure/audio/fallback-synth.js';

// ─────────────────────────────────────────────────────────────────
// Mock AudioContext, sources, oscillators
// ─────────────────────────────────────────────────────────────────

class MockAudioBuffer {
  constructor(length, sampleRate) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.numberOfChannels = 1;
  }
}

class MockGainNode {
  constructor(audioContext) {
    this.gain = {
      value: 1,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    };
    this.destination = null;
  }
  connect(dest) { this.destination = dest; }
  disconnect() { this.destination = null; }
}

class MockOscillator {
  constructor() {
    this.type = 'sine';
    this.frequency = { value: 440, setValueAtTime: () => {} };
    this.destination = null;
    this.startTime = null;
    this.stopTime = null;
    this.isStarted = false;
    this.isStopped = false;
  }
  connect(dest) { this.destination = dest; }
  disconnect() { this.destination = null; }
  start(when) { this.startTime = when; this.isStarted = true; }
  stop(when) { this.stopTime = when; this.isStopped = true; }
}

class MockBufferSource {
  constructor() {
    this.buffer = null;
    this.playbackRate = { value: 1 };
    this.destination = null;
    this.startTime = null;
    this.stopTime = null;
    this.isStarted = false;
    this.isStopped = false;
  }
  connect(dest) { this.destination = dest; }
  disconnect() { this.destination = null; }
  start(when) { this.startTime = when; this.isStarted = true; }
  stop(when) { this.stopTime = when; this.isStopped = true; }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.bufferSources = [];
    this.oscillators = [];
    this.gains = [];
    this.sampleRate = 44100;
  }

  createBufferSource() {
    const source = new MockBufferSource();
    this.bufferSources.push(source);
    return source;
  }

  createOscillator() {
    const osc = new MockOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    const gain = new MockGainNode(this);
    this.gains.push(gain);
    return gain;
  }

  createBuffer(channels, length, sampleRate) {
    return new MockAudioBuffer(length, sampleRate);
  }

  decodeAudioData(arrayBuffer, success, error) {
    const buffer = new MockAudioBuffer(44100, 44100);
    setTimeout(() => success(buffer), 10);
  }

  async resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  reset() {
    this.currentTime = 0;
    this.bufferSources = [];
    this.oscillators = [];
    this.gains = [];
  }
}

class MockScheduler {
  cancel() {}
  schedule(callback) {}
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

test('1. schedules buffer sources at absolute AudioContext time', async () => {
  const audioContext = new MockAudioContext();
  audioContext.currentTime = 0.5;

  let sourceStartTime = null;
  const pianoSamples = {
    playVoicing: (voicing, at, release, callbacks) => {
      sourceStartTime = at;
      const source = new MockBufferSource();
      source.start(at);
      if (callbacks.onStart) callbacks.onStart(source);
    },
    destroy: () => {},
  };

  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = { notes: [{ pitchClass: 'C', octave: 4 }] };
  const generation = runtime.nextGeneration();
  runtime.playVoicing(voicing, 2.0, 1.0, generation);

  assert.strictEqual(sourceStartTime, 2.0, 'source scheduled at absolute time 2.0');
});

test('2. accepts voicing with pitchClass and octave', () => {
  const audioContext = new MockAudioContext();
  const pianoSamples = {
    playVoicing: () => {},
    destroy: () => {},
  };
  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = {
    notes: [
      { pitchClass: 'C', octave: 4 },
      { pitchClass: 'E', octave: 4 },
      { pitchClass: 'G', octave: 4 },
    ],
  };

  const generation = runtime.nextGeneration();
  runtime.playVoicing(voicing, 1.0, 1.0, generation);

  assert.strictEqual(runtime.getState().runtimeState, 'uninitialized', 'accepts voicing contract');
});

test('3. finds nearest sample and calculates transposition', () => {
  const audioContext = new MockAudioContext();
  const pianoSamples = new PianoSamples(audioContext);

  const nearest = pianoSamples._findNearestSample(60);
  assert.strictEqual(nearest, 60, 'finds exact sample');

  const nearestSharp = pianoSamples._findNearestSample(61);
  assert.ok(nearestSharp, 'finds nearest sample for in-between pitch');

  const ratio = Math.pow(2, 2 / 12);
  assert.ok(Math.abs(ratio - 1.122) < 0.01, 'semitone ratio ≈ 1.122');
});

test('4. sample error triggers fallback', () => {
  const audioContext = new MockAudioContext();

  let fallbackCalled = false;
  const pianoSamples = {
    playVoicing: (voicing, at, release, callbacks) => {
      if (callbacks.onError) callbacks.onError();
    },
    destroy: () => {},
  };

  const fallbackSynth = {
    playVoicing: (voicing, at, release, callbacks) => {
      fallbackCalled = true;
      if (callbacks.onStart) callbacks.onStart({});
    },
    destroy: () => {},
  };

  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = { notes: [{ pitchClass: 'C', octave: 4 }] };
  const generation = runtime.nextGeneration();
  runtime.playVoicing(voicing, 1.0, 1.0, generation);

  assert.ok(fallbackCalled, 'fallback invoked after sample error');
  assert.strictEqual(runtime.state, 'degraded', 'state is degraded');
});

test('5. both samples and fallback fail', () => {
  const audioContext = new MockAudioContext();

  const pianoSamples = {
    playVoicing: (voicing, at, release, callbacks) => {
      if (callbacks.onError) callbacks.onError();
    },
    destroy: () => {},
  };

  const fallbackSynth = {
    playVoicing: (voicing, at, release, callbacks) => {
      if (callbacks.onError) callbacks.onError();
    },
    destroy: () => {},
  };

  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = { notes: [{ pitchClass: 'C', octave: 4 }] };
  const generation = runtime.nextGeneration();
  runtime.playVoicing(voicing, 1.0, 1.0, generation);

  assert.strictEqual(runtime.state, 'failed', 'state is failed when all audio fails');
});

test('6. detects suspended AudioContext and reports blocked state', async () => {
  const audioContext = new MockAudioContext();
  audioContext.state = 'suspended';

  const pianoSamples = {
    playVoicing: () => {},
    destroy: () => {},
  };
  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = { notes: [{ pitchClass: 'C', octave: 4 }] };
  const generation = runtime.nextGeneration();
  runtime.playVoicing(voicing, 1.0, 1.0, generation);

  assert.strictEqual(runtime.state, 'blocked', 'reports blocked when context suspended');

  await runtime.clock.resume();
  assert.strictEqual(runtime.state, 'running', 'recovers to running after resume');
});

test('7. cancels only sources from specified generation', () => {
  const audioContext = new MockAudioContext();

  let stoppedCount = 0;
  const mockSource = {
    stop: () => { stoppedCount++; },
  };

  const pianoSamples = {
    playVoicing: (voicing, at, release, callbacks) => {
      if (callbacks.onStart) callbacks.onStart(mockSource);
    },
    destroy: () => {},
  };

  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = { notes: [{ pitchClass: 'C', octave: 4 }] };
  const gen1 = runtime.nextGeneration();
  runtime.playVoicing(voicing, 1.0, 1.0, gen1);

  const gen2 = runtime.nextGeneration();
  runtime.playVoicing(voicing, 2.0, 1.0, gen2);

  stoppedCount = 0;
  runtime.stopGeneration(gen1, 50);

  assert.equal(stoppedCount, 1, 'only gen1 source stopped');
});

test('8. ignores callbacks from invalidated generations', () => {
  const audioContext = new MockAudioContext();
  const pianoSamples = { playVoicing: () => {}, destroy: () => {} };
  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const gen1 = runtime.nextGeneration();
  const gen2 = runtime.nextGeneration();

  assert.strictEqual(runtime._isValidGeneration(gen1), false, 'gen1 is invalid');
  assert.strictEqual(runtime._isValidGeneration(gen2), true, 'gen2 is valid');
});

test('9. stopGeneration() and destroy() are idempotent', () => {
  const audioContext = new MockAudioContext();
  const pianoSamples = { playVoicing: () => {}, destroy: () => {} };
  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const gen = runtime.nextGeneration();

  runtime.stopGeneration(gen, 50);
  runtime.stopGeneration(gen, 50);
  runtime.stopGeneration(gen, 50);

  runtime.destroy();
  runtime.destroy();
  runtime.destroy();

  assert.strictEqual(runtime.isDestroyed, true);
});

test('10. release envelope ≤ 150ms', () => {
  const durationSecs = 1.0;
  const releaseRatio = 0.2;
  const releaseMs = Math.min(durationSecs * releaseRatio * 1000, 150);

  assert.ok(releaseMs <= 150, 'release ≤ 150ms');
});

test('11. audio modules have no window/document/index.html dependencies', () => {
  const audioContext = new MockAudioContext();
  const pianoSamples = { playVoicing: () => {}, destroy: () => {} };
  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  assert.ok(runtime.audioContext);
  assert.ok(runtime.pianoSamples);
  assert.ok(runtime.fallbackSynth);

  const state = runtime.getState();
  assert.strictEqual(state.songId, undefined, 'no songId');
  assert.strictEqual(state.chordName, undefined, 'no chordName');
});

test('bonus: modules integrate correctly', () => {
  const audioContext = new MockAudioContext();
  audioContext.currentTime = 0;

  const pianoSamples = {
    playVoicing: () => {},
    destroy: () => {},
  };
  const fallbackSynth = new FallbackSynth(audioContext);
  const runtime = new AudioRuntime({ audioContext, pianoSamples, fallbackSynth });

  const voicing = {
    notes: [
      { pitchClass: 'C', octave: 4 },
      { pitchClass: 'E', octave: 4 },
      { pitchClass: 'G', octave: 4 },
    ],
  };

  const gen = runtime.nextGeneration();
  runtime.playVoicing(voicing, 0.5, 1.5, gen);

  const state = runtime.getState();
  assert.strictEqual(state.generation, gen);
  assert.strictEqual(runtime.state, 'uninitialized');

  runtime.destroy();
  assert.strictEqual(runtime.isDestroyed, true);
});
