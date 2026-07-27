# Arquitectura y modelo de datos

Actualizado: 27 de julio de 2026
Estado: diseño objetivo; sujeto a validación mediante un prototipo técnico.

## Diagnóstico de la arquitectura actual

La versión vigente es correcta para una canción, pero sus límites son estructurales:

- `index.html` contiene la canción, doce acordes, voicings, interfaz y reproducción;
- el selector del editor se construye desde el objeto cerrado `voicings`;
- la API rechaza cualquier acorde fuera de `ALLOWED_CHORDS`;
- las secciones se validan contra el número de líneas de “Mis 36”;
- `localStorage` y Vercel Blob utilizan nombres específicos de `mis36`;
- la nube guarda un único documento `mis36-cloud-v1`.

Agregar más constantes no convierte esta arquitectura en multicanción. El primer
trabajo técnico debe ser extraer contratos y adaptadores manteniendo el
comportamiento visible.

## Principios

1. **El motor no conoce la canción:** reproducción, renderizado y práctica reciben
   un documento válido.
2. **Los datos no dependen del DOM:** una canción puede validarse, migrarse y
   probarse sin abrir la interfaz.
3. **Los recursos tienen versión:** canción, acorde y voicing se sincronizan y
   restauran por separado.
4. **Las referencias no son mutables por sorpresa:** una actualización global no
   cambia una canción publicada sin una acción explícita.
5. **La escritura musical es un dato:** `C#` y `Db` pueden sonar igual, pero no
   siempre deben mostrarse igual.
6. **Local primero:** cada cambio confirmado se persiste en el dispositivo antes
   de intentar la nube.
7. **Migraciones idempotentes:** ejecutar una migración dos veces produce el mismo
   resultado, no duplicados.

## Capas objetivo

```text
Interfaz
├── Biblioteca de canciones
├── Constructor / biblioteca de acordes
├── Tocar
├── Letra
└── Práctica
        │
Aplicación
├── Selección de canción
├── Edición e historial
├── Reproducción y reloj musical
└── Sincronización por recurso
        │
Dominio
├── Song
├── Section / LyricLine / ChordEvent
├── ChordDefinition
├── Voicing
└── Validadores y migradores
        │
Persistencia
├── IndexedDB: datos locales
├── localStorage: preferencias pequeñas
└── Vercel Blob: catálogo e historial remoto
```

## Identidades

Todos los recursos editables usan UUID:

- `songId`
- `sectionId`
- `lineId`
- `eventId`
- `chordId`
- `voicingId`

Los nombres y posiciones de arreglos nunca se usan como identidad permanente.

## Modelo de canción

Ejemplo normativo simplificado:

```json
{
  "format": "piano-song",
  "schemaVersion": 1,
  "id": "uuid-song",
  "revision": "uuid-revision",
  "metadata": {
    "title": "Mis 36",
    "artist": "Pablo Alborán",
    "key": "E",
    "tempo": 72,
    "timeSignature": [4, 4],
    "notation": "es",
    "tags": []
  },
  "sections": [
    {
      "id": "uuid-section",
      "name": "Introducción",
      "lines": [
        {
          "id": "uuid-line",
          "text": "Introducción instrumental"
        }
      ],
      "events": [
        {
          "id": "uuid-event",
          "lineId": "uuid-line",
          "anchor": 0,
          "position": 0,
          "beats": 4,
          "chord": {
            "chordId": "uuid-chord",
            "voicingId": "uuid-voicing",
            "voicingRevision": "uuid-voicing-revision"
          }
        }
      ]
    }
  ],
  "archivedAt": null,
  "createdAt": "2026-07-27T00:00:00.000Z",
  "updatedAt": "2026-07-27T00:00:00.000Z"
}
```

### Reglas

- `title` es obligatorio; `artist` puede quedar vacío.
- `tempo` debe estar dentro del rango soportado por el reproductor.
- una sección contiene al menos una línea;
- un evento debe referir a una línea de su propia sección;
- `anchor` representa la palabra o el final de línea;
- `position` determina orden cuando varios acordes comparten ancla;
- `beats` es positivo y tiene un máximo de seguridad;
- archivar no elimina el documento ni su historial;
- el documento no incrusta preferencias del dispositivo.

## Modelo de nota

Una nota para reproducción y notación:

```json
{
  "pitchClass": 1,
  "octave": 4,
  "spelling": "C#",
  "hand": "right",
  "finger": 2
}
```

### Reglas

- `pitchClass`: entero entre 0 y 11;
- `octave`: entero dentro del registro soportado;
- `spelling`: nombre visible coherente con el pitch;
- `hand`: `left` o `right`;
- `finger`: opcional, entero entre 1 y 5;
- el sistema puede sugerir escritura, pero debe conservar la elegida por el editor.

El audio utiliza altura y octava. La interfaz utiliza `spelling`.

## Modelo de acorde

El acorde describe identidad armónica; no una posición concreta:

```json
{
  "format": "piano-chord",
  "schemaVersion": 1,
  "id": "uuid-chord",
  "revision": "uuid-revision",
  "symbol": "C#m7/G#",
  "root": {"pitchClass": 1, "spelling": "C#"},
  "quality": "minor7",
  "bass": {"pitchClass": 8, "spelling": "G#"},
  "extensions": [],
  "alterations": [],
  "source": "generated",
  "tags": [],
  "archivedAt": null
}
```

### Generador inicial

P0 debe soportar las doce fundamentales y, como mínimo:

- mayor;
- menor;
- disminuido;
- aumentado;
- sus2;
- sus4;
- 6;
- m6;
- 7;
- maj7;
- m7;
- m7b5;
- bajo alternativo.

La lista definitiva se confirma antes del constructor visual. Una cualidad nueva no
debe exigir cambios en cada canción ni una nueva constante de servidor.

## Modelo de voicing

El voicing contiene las notas que realmente se tocan:

```json
{
  "format": "piano-voicing",
  "schemaVersion": 1,
  "id": "uuid-voicing",
  "revision": "uuid-revision",
  "chordId": "uuid-chord",
  "name": "Primera inversión cómoda",
  "scope": "library",
  "notes": [
    {"pitchClass": 1, "octave": 2, "spelling": "C#", "hand": "left", "finger": 5},
    {"pitchClass": 4, "octave": 4, "spelling": "E", "hand": "right", "finger": 1},
    {"pitchClass": 8, "octave": 4, "spelling": "G#", "hand": "right", "finger": 3},
    {"pitchClass": 1, "octave": 5, "spelling": "C#", "hand": "right", "finger": 5}
  ],
  "pedagogy": {
    "inversionLabel": "1.ª inversión",
    "explanation": "",
    "handSizeNote": ""
  },
  "createdAt": "2026-07-27T00:00:00.000Z",
  "updatedAt": "2026-07-27T00:00:00.000Z"
}
```

### Reglas

- un voicing contiene al menos una nota;
- una nota se puede agregar o eliminar manualmente;
- las digitaciones son opcionales y no se inventan al guardar;
- se puede duplicar un voicing antes de modificarlo;
- modificar un voicing crea una revisión nueva;
- una canción fijada a una revisión anterior no cambia automáticamente;
- el usuario puede elegir explícitamente actualizar una o varias canciones.

Esta regla resuelve el riesgo principal de una biblioteca reutilizable.

## Catálogo local

Los documentos musicales se almacenarán en IndexedDB porque una biblioteca completa
puede superar límites razonables de `localStorage`.

Almacenes propuestos:

| Almacén | Clave | Contenido |
|---|---|---|
| `songs` | `songId` | última revisión local de cada canción |
| `chords` | `chordId` | definiciones armónicas |
| `voicings` | `voicingId` | posiciones versionadas |
| `revisions` | `resourceId + revision` | snapshots recuperables |
| `syncQueue` | ID de operación | cambios pendientes para la nube |
| `migrationState` | nombre de migración | progreso y verificaciones |

`localStorage` queda reservado para preferencias de interfaz, canción activa y
marcadores pequeños compatibles con la versión heredada.

## Persistencia remota

Se mantiene Vercel Blob y el patrón de snapshots inmutables.

Rutas conceptuales:

```text
piano-library/catalog/history/<timestamp>-<revision>.json
piano-library/songs/<songId>/history/<timestamp>-<revision>.json
piano-library/chords/<chordId>/history/<timestamp>-<revision>.json
piano-library/voicings/<voicingId>/history/<timestamp>-<revision>.json
```

El catálogo contiene metadatos e IDs, no canciones completas.

### API objetivo

```text
GET  /api/library
GET  /api/songs/:songId
PUT  /api/songs/:songId
GET  /api/chords/:chordId
PUT  /api/chords/:chordId
GET  /api/voicings/:voicingId
PUT  /api/voicings/:voicingId
POST /api/migrations/mis36
```

Cada escritura incluye:

- `baseRevision`;
- documento validado;
- identificador de operación idempotente;
- `force` solo después de una elección explícita ante conflicto.

Cada recurso resuelve conflictos por separado. Una modificación de un acorde no
reemplaza el catálogo ni otra canción.

## Reloj musical y renderizado

El nuevo motor debe absorber dos tareas previamente pendientes:

- utilizar el tiempo de `AudioContext` como referencia musical;
- actualizar parcialmente acorde, línea y estados, sin reconstruir toda la letra.

Esto es infraestructura de la plataforma, no una mejora decorativa. El contrato del
motor será:

```text
load(playbackDocument)
unload()
select(eventId)
play({ fromEventId?, range? })
pause()
resume()
stop()
seek(eventId)
setTempo(bpm)
startPractice(options)
handleVisibility(hidden)
subscribe(playbackState)
getSnapshot()
destroy()
```

El documento de ejecución agrega canción, acordes y revisiones fijadas de voicing.
No es un nuevo formato persistido. El estado observable contiene canción y revisión,
evento por ID, siguiente evento, pulso interno, tempo, modo, generación y condición
del audio.

`AudioContext.currentTime` es la referencia mientras el contexto está activo. Los
timers solamente despiertan al planificador; no acumulan el tiempo musical. Cada
reproducción tiene una generación, de modo que una carga, búsqueda, detención o
cambio de canción invalida callbacks y audio anteriores.

Cuando la pestaña queda oculta, el motor conserva evento y pulso y entra en pausa de
sistema. Safari puede suspender el contexto; al volver se solicita un gesto si es
necesario y nunca se encadenan eventos vencidos.

La hoja de Letra se construye una vez por canción y mantiene mapas de nodos por ID.
El avance solamente modifica evento, línea y sección anteriores, actuales y
siguientes. La especificación normativa del motor, su máquina de estados, plan de
implementación y reversión están en
[`07-ENTREGA-1-MOTOR-UNIVERSAL.md`](07-ENTREGA-1-MOTOR-UNIVERSAL.md).

## Validación

Los validadores se comparten entre navegador y API mediante módulos, evitando reglas
duplicadas como las actuales.

Todo documento:

- declara `format` y `schemaVersion`;
- rechaza propiedades o tamaños peligrosos según contrato;
- valida referencias internas;
- normaliza datos antes de comparar revisiones;
- no confía en HTML, archivos importados ni datos remotos;
- mantiene mensajes de error entendibles para el usuario y códigos estables para pruebas.

## Organización de código propuesta

```text
src/
├── domain/
│   ├── song.js
│   ├── chord.js
│   ├── voicing.js
│   ├── validation.js
│   └── migrations/
├── application/
│   ├── library.js
│   ├── editor.js
│   ├── playback.js
│   └── sync.js
├── infrastructure/
│   ├── indexed-db.js
│   ├── cloud-api.js
│   └── audio.js
└── ui/
    ├── library/
    ├── player/
    └── chord-builder/
```

La herramienta de construcción concreta se decide mediante un prototipo. El contrato
de datos no depende de esa decisión.
