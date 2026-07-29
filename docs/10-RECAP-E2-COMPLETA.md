# E2 Completa · Constructor de acordes

Actualizado: 29 de julio de 2026  
Estado: Core, persistencia y audio preview completados; UI pendiente de Javier/Fernando wireframes.

## Ubicación y rama

- Repositorio local: `/Users/felipeescandon/Documents/Codex/2026-07-24/referenced-chatgpt-conversation-this-is-untrusted-2/work/mis-36-piano-review`
- Rama: `feat/entrega-2-constructor`
- Commit base E2: `7cff0e5` · `feat: complete E2 chord constructor with persistence and audio preview`
- Próximo paso: PR + merge a `main` cuando UI confirmada

## Arquitectura E2 (implementada)

### Dominio (application/chord-constructor/)

```
ChordBuilder (state machine)
  ├─ setRoot({pitchClass, spelling})
  ├─ setQuality("Mayor" | "menor" | "7" | "maj7" | "m7" | "sus4" | "dim" | "m7b5" | "aug")
  ├─ setBass({pitchClass, spelling}) [opcional]
  ├─ addNote({pitchClass, octave, spelling, hand, finger?})
  ├─ removeNote(index)
  ├─ clearNotes()
  └─ build(scope, name) → {scope, name, state}

ChordFactory
  ├─ createChord(builderState) → Chord (immutable, UUID, revision)
  └─ createVoicing(chordId, builderState, scope, name) → Voicing

ChordSelectors
  ├─ selectChordName(state) → "Do Mayor" | "Do Mayor (Sol/Do)"
  ├─ selectNotes(state) → [{pitchClass, octave, hand, finger, midiNumber}]
  ├─ selectIsComplete(state) → boolean
  ├─ selectCanAddNote(state) → boolean
  └─ selectNoteCount(state) → number
```

### Persistencia (infrastructure/)

```
ChordRepository
  ├─ saveChord(database, chord)
  ├─ getChord(database, id) → Chord | undefined
  ├─ getAllChords(database) → Chord[]
  ├─ getChordsBySource(database, source) → Chord[]
  └─ deleteChord(database, id)

VoicingRepository
  ├─ saveVoicing(database, voicing)
  ├─ getVoicing(database, id) → Voicing | undefined
  ├─ getAllVoicings(database) → Voicing[]
  ├─ getVoicingsByScope(database, scope) → Voicing[]
  └─ deleteVoicing(database, id)
```

Usan `openShadowDatabase()` de E0 y transacciones IndexedDB.

### Audio

```
ChordPreviewPlayer
  ├─ play(voicing, at, duration?)
  ├─ stop()
  └─ state() → {isPlaying, generation, voicingId}
```

Usa `audio.playVoicing(voicing, at, duration, generation)` de E1.3.

## Validación (64 tests)

### Builder & Factory (25 tests)
- State machine transitions, qualities, root/bass/notes
- Rango Do2–Do7, límite 32 notas
- Inmutabilidad de Chord/Voicing, UUIDs

### Selectors (15 tests)
- Cálculo MIDI correcto
- Filtering, state immutability
- Completitud (root + quality + ≥1 nota)

### Repositorios (12 tests)
- Save/retrieve, nonexistent handling
- Filter por scope/source
- Delete, revision updates

### Audio (6 tests)
- Play/stop, generation tracking
- Prevención de plays simultáneos
- Idempotencia en stop

### End-to-End (4 tests)
- Construct → Factory → Persist → Load → Preview
- Múltiples voicings del mismo chord
- Prevención de duplicados por ID

**Comando:** `npm test -- test/chord-*.test.js test/e2-*.test.js`

## Restricciones vigentes

1. No escribir datos multicanción en producción (banderas desactivadas)
2. No conectar UI a `index.html` todavía
3. No modificar E1 (Entrega 1 debe permanecer intacta)
4. Persistencia local primero; nube en E5

## Decisiones confirmadas por equipo

| Aspecto | Decisión |
|---------|----------|
| Cualidades | 6 base (Mayor, menor, 7, maj7, m7, sus4) + 3 extendidas (dim, m7b5, aug) |
| Rango | Do2–Do7 (MIDI 36–96), ±12 semitonos con fallback synth |
| Inversiones | Permitidas en E2 (sin etiquetar); E3 agrega selector automático |
| Biblioteca/Canción | Radio button al guardar + fondo gris en filas + filtro en selector |
| iPad | Teclado expandible (botón "Mostrar diagrama"), no fuerza scroll |
| Audio | Muestras Salamander + fallback osciladores; sin indicador visual |

## Estado de E1 (sin regresiones)

- E1.1–E1.6: 72 tests, todos pasando
- No hay cambios a playback, timeline, audio-runtime, o selectors de E1
- E2 agrega módulos nuevos; no modifica existentes

## Próximos pasos (UI)

1. **Wireframes confirmados** — Javier confirma layout, Fondo gris, radio button, filtro
2. **Integración a index.html** — Constructor en modal/página
3. **Flujo guardado** — Radio Biblioteca/Canción, confirmación de impacto
4. **Selector de voicings** — Mostrar biblioteca global + canción exclusivos
5. **Tests de regresión** — Verificar que Tocar/Letra/Práctica sigan funcionando

## Bloqueantes resueltos

- ✅ Inversiones permitidas sin etiquetar (no bloquea E2)
- ✅ Distinción Biblioteca/Canción definida en wireframe verbal
- ✅ Rango Do2–Do7 + ±12 validado por pianista
- ✅ Cualidades (6-9) validadas por profesor

## Deuda técnica

- Pedagogy fields (inversionLabel, explanation, handSizeNote) vacíos; E3 completa
- No hay validación de "cordura" (ej: ≤5 notas por mano); E3 agrega advertencia
- Sin control granular de voicings (ej: filtrar por mano); E3 expande

## Línea de comandos útiles

```bash
# E2 tests únicamente
npm test -- test/chord-*.test.js test/e2-*.test.js

# Ver todos (E1 + E2)
npm test

# Verificar sintaxis
npm test -- --syntax-check

# Rama y cambios
git log --oneline -5
git status
git diff
```

## Plan para próxima sesión

Si UI es el próximo trabajo:

1. Leer este documento y `docs/09-ENTREGA-2-CONSTRUCTOR-ACORDES.md`
2. Revisar wireframe verbal en `docs/09-ENTREGA-2-CONSTRUCTOR-ACORDES.md` (sección Wireframe guardado)
3. Confirmar con Javier/Fernando cualquier cambio visual
4. Crear rama `feat/entrega-2-ui` desde `feat/entrega-2-constructor`
5. Implementar constructor visual (probablemente usando modules ES + Lit o Preact si existe)
6. PR a `main` + validación Vercel

Si otro trabajo (E3, audio production, E4):

1. Este E2 está listo para convivir con otros
2. Banderas `pianoLibrary` y `pianoLibraryCloudWrites` permanecen OFF
3. No hay datos reales en producción todavía

## Histórico de commits

- `fedc974` · `docs: update continuation doc to reflect E1 complete, E2 next`
- `2ca227b` · `feat: implement E2 chord builder and factory with complete test coverage`
- `7b5b851` · `docs: propose E2 chord constructor with minimal viable scope`
- `8b03f9c` · `docs: integrate team feedback into E2 proposal`
- `7cff0e5` · `feat: complete E2 chord constructor with persistence and audio preview`
