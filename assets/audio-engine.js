/*
 * Motor de sonido de Piano Estudio.
 *
 * Cinco decisiones de diseño, en orden de dependencia:
 *
 *  1. Muestras reales autohospedadas. smplr (assets/vendor/smplr.mjs) y las 226
 *     muestras de SplendidGrandPiano (assets/piano-samples/) se sirven
 *     same-origin, no desde un CDN, para que el service worker pueda cachearlas.
 *  2. Fallback transparente a síntesis. Quien dispara notas llama siempre a la
 *     capa "smart" (playChordAt / playChordNow) y nunca sabe qué motor suena: el
 *     sintetizador cubre la ventana de descarga y el piano toma el relevo solo.
 *  3. ADSR con velocity real en el sintetizador. La velocity mueve attack,
 *     sustain y brillo armónico, no solo volumen. El release siempre es
 *     exponencial hacia el silencio: es lo que evita los clicks.
 *  4. API de tiempo absoluto con voces cancelables. Todo acepta un `when`
 *     anclado al reloj del AudioContext y devuelve un handle con cancel(), para
 *     que el transporte pueda programar con look-ahead sin depender de que el
 *     hilo principal llegue puntual.
 *  5. (En sw.js) cacheo offline cache-first de las muestras.
 */
(function (global) {
  "use strict";

  const VENDOR_URL = "assets/vendor/smplr.mjs";
  const SAMPLE_BASE = "assets/piano-samples";

  // smplr pide "<base>/<nombre de muestra>.<formato>", con nombres tipo
  // "PP D#0" — espacios y almohadillas. En vez de guardar en disco archivos con
  // esos caracteres (el '#' de una URL es delimitador de fragmento y los hosts
  // estáticos lo tratan de forma inconsistente), guardamos slugs ASCII y
  // reescribimos la URL en la capa de storage, que es un punto de extensión
  // público de la librería. El mapa de muestras sigue siendo el de smplr.
  // Contador de la carga en curso. smplr no falla cuando una muestra no está:
  // se queda sin buffer para esa región y sigue. Si no contáramos acá, un 404
  // masivo daría un piano "listo" que suena en silencio, que es peor que el
  // sintetizador. Con esto, cero muestras válidas = carga fallida.
  let fetchStats = null;

  const SAMPLE_STORAGE = {
    fetch(url) {
      return fetch(rewriteSampleUrl(url), { cache: "force-cache" }).then(response => {
        if (fetchStats) {
          if (response && response.ok) fetchStats.ok++;
          else fetchStats.failed++;
        }
        return response;
      }, error => {
        if (fetchStats) fetchStats.failed++;
        throw error;
      });
    }
  };

  function rewriteSampleUrl(url) {
    const dot = url.lastIndexOf(".");
    if (dot < 0) return url;
    const format = url.slice(dot + 1);
    const slash = url.lastIndexOf("/", dot);
    // El nombre puede llegar crudo ("PP D#0") o ya percent-encoded
    // ("PP%20D%230") según cómo lo arme la librería: normalizamos antes de
    // convertirlo al slug con el que están guardados los archivos.
    let name = url.slice(slash + 1, dot);
    try {
      name = decodeURIComponent(name);
    } catch (error) {
      /* no estaba encodeado */
    }
    const slug = name.replace(/#/g, "s").replace(/ /g, "_").toLowerCase();
    return `${SAMPLE_BASE}/${format}/${slug}.${format}`;
  }

  const NOTE_OFFSETS = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

  function toMidi(note) {
    if (typeof note === "number") return note;
    const match = String(note).match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return 60;
    return (Number(match[2]) + 1) * 12 + NOTE_OFFSETS[match[1]];
  }

  function toFrequency(note) {
    return 440 * Math.pow(2, (toMidi(note) - 69) / 12);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // --- Contexto, salida y reverberación compartida -------------------------

  let context = null;
  let masterBus = null;
  let reverbSend = null;

  function ensureContext() {
    if (!context) {
      context = new (global.AudioContext || global.webkitAudioContext)();
      masterBus = context.createGain();
      masterBus.gain.value = 1;
      masterBus.connect(context.destination);
    }
    return context;
  }

  function ensureReverb() {
    if (reverbSend) return reverbSend;
    const ctx = ensureContext();
    const seconds = 1.8;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.7);
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.12;
    convolver.connect(wet);
    wet.connect(ctx.destination);
    reverbSend = convolver;
    return reverbSend;
  }

  async function resume() {
    const ctx = ensureContext();
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch (error) {
        /* el navegador aún no autoriza; el llamador reporta el estado */
      }
    }
    return ctx.state === "running";
  }

  function unlockFromGesture() {
    const ctx = ensureContext();
    // Un buffer de una muestra en silencio: el truco clásico para que iOS
    // considere el contexto desbloqueado por gesto del usuario.
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      source.connect(ctx.destination);
      source.start(0);
    } catch (error) {
      /* sin consecuencias: el resume() de abajo es el que decide */
    }
    return resume();
  }

  // --- Estado de carga del piano muestreado -------------------------------

  const status = { phase: "idle", loaded: 0, total: 0, usingSamples: false };
  const statusListeners = new Set();
  let piano = null;
  let loadPromise = null;

  function setStatus(phase, extra) {
    status.phase = phase;
    if (extra) Object.assign(status, extra);
    status.usingSamples = phase === "ready" && !!piano;
    statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        /* un listener roto no debe frenar la carga */
      }
    });
  }

  function onStatus(listener) {
    statusListeners.add(listener);
    listener(status);
    return () => statusListeners.delete(listener);
  }

  // En conexiones medidas no gastamos ~22MB sin permiso: la app sigue sonando
  // con el sintetizador y la carga queda disponible a pedido (force: true).
  function connectionIsMetered() {
    const connection = global.navigator && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
    if (!connection) return false;
    if (connection.saveData) return true;
    return /(^|-)(2g|slow-2g)$/.test(connection.effectiveType || "");
  }

  function load(options) {
    const force = !!(options && options.force);
    if (status.phase === "ready") return Promise.resolve(true);
    if (loadPromise) return loadPromise;
    if (status.phase === "failed" && !force) return Promise.resolve(false);
    if (status.phase === "deferred" && !force) return Promise.resolve(false);
    if (!force && connectionIsMetered()) {
      setStatus("deferred");
      return Promise.resolve(false);
    }

    const ctx = ensureContext();
    setStatus("loading", { loaded: 0, total: 0 });
    fetchStats = { ok: 0, failed: 0 };

    loadPromise = import(new URL(VENDOR_URL, document.baseURI).href)
      .then(smplr => {
        const instrument = new smplr.SplendidGrandPiano(ctx, {
          baseUrl: SAMPLE_BASE,
          storage: SAMPLE_STORAGE,
          destination: masterBus,
          decayTime: 0.5,
          onLoadProgress: (loaded, total) => setStatus("loading", { loaded, total })
        });
        return instrument.ready.then(() => instrument);
      })
      .then(instrument => {
        if (!fetchStats.ok) {
          throw new Error(`Ninguna muestra se pudo cargar (${fetchStats.failed} fallos)`);
        }
        if (fetchStats.failed) {
          console.warn(`Piano cargado con ${fetchStats.failed} muestras faltantes de ${fetchStats.ok + fetchStats.failed}.`);
        }
        piano = instrument;
        // El piano comparte el envío de reverberación con el sintetizador para
        // que el cruce entre motores no cambie el espacio del sonido.
        try {
          piano.output.addEffect("sala", ensureReverb(), 0.12);
        } catch (error) {
          /* sin reverb el piano suena igual, solo más seco */
        }
        setStatus("ready");
        return true;
      })
      .catch(error => {
        console.warn("Piano muestreado no disponible; sigue el sintetizador.", error);
        piano = null;
        setStatus("failed");
        return false;
      })
      .finally(() => {
        loadPromise = null;
        fetchStats = null;
      });

    return loadPromise;
  }

  // La promesa se cachea y la carga arranca al iniciar la app, no en el primer
  // toque de tecla: para cuando alguien pulse algo, o ya está lista o suena el
  // sintetizador, pero nunca se espera.
  function beginPreload(options) {
    return load(options);
  }

  // --- Sintetizador de respaldo: ADSR con velocity real -------------------

  // La velocity (0..1) no es un multiplicador de volumen. Mueve tres cosas:
  //   attack   — más fuerte, más rápido el golpe de martillo
  //   sustain  — cuánto se sostiene respecto del pico
  //   brillo   — energía en 2.º y 3.er armónico, que es lo que hace que una
  //              nota fuerte suene distinta y no solo más alta
  function synthVoices(when, note, duration, velocity, releaseTime) {
    const ctx = ensureContext();
    const v = clamp(velocity, 0, 1);
    const frequency = toFrequency(note);
    const attack = 0.006 + (1 - v) * 0.05;
    const decay = 0.09 + (1 - v) * 0.12;
    const peak = 0.1 + v * 0.26;
    const sustain = peak * (0.3 + v * 0.34);
    const brightness = Math.pow(v, 1.7);

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, when);
    voiceGain.gain.exponentialRampToValueAtTime(peak, when + attack);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), when + attack + decay);

    const holdUntil = when + Math.max(attack + decay + 0.02, duration);
    voiceGain.gain.setValueAtTime(Math.max(0.0001, sustain), holdUntil);
    // Release exponencial hacia el silencio, nunca lineal ni un corte seco:
    // un salto a 0 en la envolvente es exactamente lo que produce el click.
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, holdUntil + releaseTime);

    voiceGain.connect(masterBus);
    voiceGain.connect(ensureReverb());

    const partials = [
      { type: "sine", ratio: 1, gain: 0.62 },
      { type: "triangle", ratio: 2, gain: 0.2 * brightness + 0.05 },
      { type: "triangle", ratio: 3, gain: 0.12 * brightness + 0.02 }
    ];
    const oscillators = partials.map(partial => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = partial.type;
      oscillator.frequency.value = frequency * partial.ratio;
      gain.gain.value = partial.gain;
      oscillator.connect(gain);
      gain.connect(voiceGain);
      oscillator.start(when);
      oscillator.stop(holdUntil + releaseTime + 0.05);
      return oscillator;
    });

    return { gain: voiceGain, oscillators, endsAt: holdUntil + releaseTime };
  }

  // --- Voces activas y cancelación ---------------------------------------

  const activeHandles = new Set();

  function fadeOutGain(gain, at, releaseTime) {
    try {
      if (typeof gain.cancelAndHoldAtTime === "function") gain.cancelAndHoldAtTime(at);
      else {
        const current = Math.max(0.0001, gain.value || 0.0001);
        gain.cancelScheduledValues(at);
        gain.setValueAtTime(current, at);
      }
      gain.exponentialRampToValueAtTime(0.0001, at + releaseTime);
    } catch (error) {
      /* si la envolvente ya terminó, no hay nada que desvanecer */
    }
  }

  function makeHandle(when, cancelFn) {
    const handle = {
      when,
      cancelled: false,
      cancel(at, releaseTime) {
        if (handle.cancelled) return;
        handle.cancelled = true;
        activeHandles.delete(handle);
        const ctx = ensureContext();
        cancelFn(Math.max(at || 0, ctx.currentTime), releaseTime == null ? 0.12 : releaseTime);
      }
    };
    activeHandles.add(handle);
    return handle;
  }

  function forgetLater(handle, endsAt) {
    const ctx = ensureContext();
    const delay = Math.max(0, (endsAt - ctx.currentTime) * 1000) + 200;
    setTimeout(() => activeHandles.delete(handle), delay);
  }

  /** Corta todo lo que esté sonando, con release exponencial. */
  function dampAt(at, releaseTime) {
    Array.from(activeHandles).forEach(handle => handle.cancel(at, releaseTime));
  }

  // --- Capa "smart": tiempo absoluto, motor transparente -----------------

  /**
   * Toca un acorde en un instante absoluto del reloj del AudioContext.
   *
   * notes  — nombres ("C4") o números MIDI; el primero se trata como bajo
   * when   — tiempo absoluto (ctx.currentTime + x)
   * opts   — {velocity, duration, release, spread, damp}
   *
   * Devuelve un handle cancelable: cancel(at) sirve tanto para una nota que ya
   * suena como para una que todavía no arrancó.
   */
  function playChordAt(notes, when, opts) {
    const ctx = ensureContext();
    const options = opts || {};
    const list = (Array.isArray(notes) ? notes : [notes]).filter(note => note != null);
    if (!list.length) return null;

    const at = Math.max(when, ctx.currentTime);
    const velocity = clamp(options.velocity == null ? 0.75 : options.velocity, 0.05, 1);
    const duration = Math.max(0.12, options.duration == null ? 1 : options.duration);
    const releaseTime = Math.max(0.04, options.release == null ? 0.12 : options.release);
    const spread = options.spread == null ? 0.012 : options.spread;
    if (options.damp !== false) dampAt(at, Math.min(releaseTime, 0.12));

    if (piano && status.phase === "ready") {
      const stops = [];
      list.forEach((note, index) => {
        const isBass = index === 0;
        const noteVelocity = clamp(velocity * (isBass ? 1 : 0.86), 0.05, 1);
        stops.push(
          piano.start({
            note: toMidi(note),
            velocity: Math.round(noteVelocity * 127),
            time: at + index * spread,
            duration: isBass ? duration * 1.08 : duration,
            ampRelease: releaseTime
          })
        );
      });
      const handle = makeHandle(at, (cancelAt) => {
        stops.forEach(stop => {
          try {
            stop(cancelAt);
          } catch (error) {
            /* voz ya terminada */
          }
        });
      });
      forgetLater(handle, at + duration * 1.08 + releaseTime);
      return handle;
    }

    const voices = list.map((note, index) =>
      synthVoices(
        at + index * spread,
        note,
        index === 0 ? duration * 1.08 : duration,
        clamp(velocity * (index === 0 ? 1 : 0.82), 0.05, 1),
        releaseTime
      )
    );
    const endsAt = voices.reduce((max, voice) => Math.max(max, voice.endsAt), at);
    const handle = makeHandle(at, (cancelAt, cancelRelease) => {
      voices.forEach(voice => {
        fadeOutGain(voice.gain, cancelAt, cancelRelease);
        voice.oscillators.forEach(oscillator => {
          try {
            oscillator.stop(cancelAt + cancelRelease + 0.03);
          } catch (error) {
            /* ya detenido */
          }
        });
      });
    });
    forgetLater(handle, endsAt);
    return handle;
  }

  function playChordNow(notes, opts) {
    const ctx = ensureContext();
    return playChordAt(notes, ctx.currentTime + 0.02, opts);
  }

  function playMidiAt(note, when, opts) {
    return playChordAt([note], when, opts);
  }

  function playMidiNow(note, opts) {
    return playChordNow([note], opts);
  }

  /** Clic de metrónomo / cuenta previa, también en tiempo absoluto. */
  function clickAt(when, accent) {
    const ctx = ensureContext();
    const at = Math.max(when, ctx.currentTime);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = accent ? 1040 : 780;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.11, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
    oscillator.connect(gain);
    gain.connect(masterBus);
    oscillator.start(at);
    oscillator.stop(at + 0.1);
    return { when: at, cancel() {
      try {
        oscillator.stop(ctx.currentTime);
      } catch (error) {
        /* ya sonó */
      }
    } };
  }

  global.PianoEngine = {
    ensureContext,
    resume,
    unlockFromGesture,
    beginPreload,
    load,
    onStatus,
    dampAt,
    playChordAt,
    playChordNow,
    playMidiAt,
    playMidiNow,
    clickAt,
    toMidi,
    toFrequency,
    get status() {
      return status;
    },
    get usingSamples() {
      return status.usingSamples;
    },
    get now() {
      return ensureContext().currentTime;
    }
  };
})(window);
