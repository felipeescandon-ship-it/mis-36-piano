# Recap y continuidad · inicio de E1.3

Actualizado: 27 de julio de 2026  
Estado: Entrega 0 integrada; E1.1 y E1.2 implementadas; E1.3 analizada y pendiente
de implementación.

## Propósito

Este documento permite continuar el proyecto en otro chat sin reconstruir decisiones
ni confundir trabajo terminado con trabajo planificado. Debe leerse junto con
`README.md`, todos los documentos de `docs/` y, especialmente,
`07-ENTREGA-1-MOTOR-UNIVERSAL.md`.

## Ubicación y publicación

- Repositorio local:
  `/Users/felipeescandon/Documents/Codex/2026-07-24/referenced-chatgpt-conversation-this-is-untrusted-2/work/mis-36-piano-review`
- Rama activa: `agent/entrega-1-timeline-maquina`
- PR borrador: <https://github.com/felipeescandon-ship-it/mis-36-piano/pull/3>
- Vista previa:
  <https://mis-36-piano-git-agent-ent-31fc7f-felipeescandon-1438s-projects.vercel.app>
- Producción protegida: <https://mis-36-piano.vercel.app/>

La vista previa corresponde a la rama del PR. Producción no fue sustituida por esta
rama.

## Restricciones que siguen vigentes

1. Conservar intactos la aplicación publicada, la API heredada y los datos
   `mis36/`.
2. Seguir el plan documentado de migración y reversión.
3. No escribir todavía recursos multicanción en producción.
4. Mantener desactivadas `pianoLibrary` y `pianoLibraryCloudWrites`.
5. No conectar una unidad nueva a `index.html` antes del paso previsto.
6. No presentar una prueba local de Chromium como aceptación de Safari/iPad.
7. Cada unidad debe quedar desplegable y reversible por separado.

## Estado por entrega

### Entrega 0 · completada e integrada

Incluye contratos, validación estricta, modelo Song/Chord/Voicing, fixture heredado,
migrador idempotente, comparación canónica e IndexedDB en estado `shadow`.

Evidencia principal:

- 81 eventos activos y 320 pulsos conservados;
- IDs deterministas y migración repetible;
- equivalencia canónica de “Mis 36”;
- ninguna escritura remota multicanción;
- banderas de biblioteca desactivadas.

Pendiente transversal: validación manual del adaptador IndexedDB en Safari/iPad real.

### Entrega 1.1 · completada

Implementa el documento de reproducción inmutable, índices por ID y revisión,
timeline puro, rangos musicales y fixture B de contraste a 96 BPM y 3/4.

Archivos principales:

- `src/application/playback/playback-document.js`
- `src/application/playback/timeline.js`
- `test/playback-timeline.test.js`
- `test/fixtures/contrast-playback.js`

### Entrega 1.2 · completada

Implementa la máquina de reproducción con reloj inyectable, snapshots inmutables,
pausa, reanudación, tempo, práctica, suspensión, invalidación por generación y
cambio atómico de canción.

Archivos principales:

- `src/application/playback/playback-machine.js`
- `src/application/playback/practice.js`
- `src/application/playback/errors.js`
- `test/playback-machine.test.js`

Evidencia:

- 1.000 pulsos sin deriva acumulada con reloj falso;
- pausa y reanudación conservan el pulso interno;
- suspensión no dispara eventos vencidos;
- carga inválida conserva el documento anterior;
- cambiar canción elimina el estado del documento anterior.

Commit base de E1.1 y E1.2:

- `0dcb6ba` · `feat: implementar timeline y maquina de Entrega 1`

### Mejora heredada de Letra · completada

Esta mejora no constituye E1.4 y no utiliza todavía el motor nuevo.

- botón para mostrar u ocultar las notas de la mano derecha;
- preferencia conservada en el dispositivo;
- formato compacto como `Mi | Mi-Sol#-Si`;
- acorde principal a 24 px y notas componentes a 12 px en escritorio;
- hoja de hasta 1320 px y menor distancia vertical entre líneas;
- adaptación móvil sin desbordamiento;
- editor heredado conserva únicamente el símbolo del acorde.

Commits:

- `bafd149` · `Mostrar notas de acordes en Letra`
- `228143a` · `Compactar acordes en Letra`

Validación visual realizada:

- escritorio a 1440 px: tarjeta de 38 px de alto y hoja de 1320 px;
- móvil a 390 px: 86 tarjetas y 48 filas sin desbordamiento;
- vista previa de Vercel verificada directamente;
- advertencia local de `/api/song-sync` esperable al usar un servidor de archivos
  estáticos y no relacionada con la interfaz.

## Estado exacto de E1.3

E1.3 fue revisada y planificada, pero no se crearon todavía módulos ni pruebas de
audio nuevos. No debe marcarse como implementada.

### Objetivo

Extraer el audio heredado como infraestructura independiente de canción, DOM y
símbolos de acordes. Debe recibir las notas concretas del voicing y programarlas
usando tiempo absoluto.

### Organización prevista

```text
src/infrastructure/audio/
├── audio-runtime.js
├── piano-samples.js
└── fallback-synth.js
```

### Responsabilidades acordadas

`audio-runtime.js`:

- recibir el contexto y dependencias del navegador por inyección;
- exponer el reloj basado en `AudioContext.currentTime`;
- coordinar estados `uninitialized`, `loading`, `ready`, `running`, `suspended`,
  `degraded` y `failed`;
- programar voicings mediante fechas absolutas;
- registrar fuentes por generación;
- cancelar una generación con liberación breve e idempotente;
- solicitar reanudación explícita cuando el contexto está bloqueado;
- limpiar recursos con `destroy()`.

`piano-samples.js`:

- cargar de forma diferida el conjunto Salamander actual;
- abortar operaciones invalidadas;
- decodificar muestras mediante dependencias inyectadas;
- elegir la muestra más cercana por altura MIDI;
- calcular la transposición mediante `playbackRate`;
- no conocer “Mis 36”, acordes ni elementos del DOM.

`fallback-synth.js`:

- reproducir las mismas notas concretas mediante osciladores;
- utilizarse cuando las muestras fallan;
- comunicar estado `degraded`;
- devolver `audio_failed` solamente si tampoco puede utilizarse el respaldo.

### Contrato mínimo que debe conservarse

```text
clock.now()
clock.state
clock.resume()
audio.playVoicing(voicing, at, duration, generation)
audio.stopGeneration(generation, release)
```

El contrato exacto de construcción puede refinarse durante la implementación, pero
no se debe cambiar la semántica documentada de tiempo absoluto y generación.

### Pruebas obligatorias de E1.3

1. `source.start()` recibe la fecha absoluta solicitada.
2. Un voicing usa `pitchClass` y `octave`, no el nombre visible del acorde.
3. La muestra más cercana conserva transposición correcta.
4. Fallar la carga de muestras activa respaldo y estado `degraded`.
5. Fallar muestras y respaldo produce `audio_failed`.
6. Contexto suspendido produce `audio_blocked` hasta un gesto.
7. Cancelar una generación detiene únicamente sus fuentes.
8. Una generación antigua no puede publicar estado ni sonido.
9. `stopGeneration()` y `destroy()` son idempotentes.
10. La liberación al detener queda dentro del objetivo de 150 ms.
11. Los módulos no importan `window`, `document` ni datos de `index.html`.

### Fuera de E1.3

- no conectar todavía Tocar, Letra o Práctica al motor nuevo;
- no modificar la reproducción heredada visible de `index.html`;
- no añadir una bandera de lectura nueva;
- no implementar biblioteca ni constructor de acordes;
- no crear rutas de nube multicanción;
- no afirmar aceptación Safari/iPad real.

Esos trabajos corresponden a E1.4, E1.5, Entrega 2 y E1.6 respectivamente.

## Verificación disponible

Comando principal:

```sh
npm test
```

Estado al cerrar esta sesión:

- 33 pruebas;
- 33 aprobadas;
- 0 fallidas;
- sintaxis del script heredado válida;
- `git diff --check` aprobado;
- árbol de trabajo limpio antes de crear este recap.

## Orden recomendado para la próxima sesión

1. Leer `README.md` y todos los documentos de `docs/`.
2. Confirmar rama, PR y árbol de trabajo.
3. Releer las secciones **Reloj y planificador**, **Audio**, **Paso 3** y
   **Criterios de aceptación** de `07-ENTREGA-1-MOTOR-UNIVERSAL.md`.
4. Implementar únicamente los tres módulos de E1.3.
5. Crear dobles de `AudioContext`, fuentes, ganancias, osciladores, carga y aborto;
   las pruebas no deben depender de audio ni tiempo reales.
6. Ejecutar todas las pruebas y confirmar que `index.html`, la API, las banderas y
   `mis36/` no cambiaron.
7. Actualizar roadmap y documentación solo cuando E1.3 cumpla fallback,
   cancelación y bloqueo.
8. Crear un commit separado, subirlo al mismo PR y validar Vercel.

## Texto sugerido para iniciar el próximo chat

```text
Continúa el proyecto “Mis 36 · Piano”.

Repositorio local:
/Users/felipeescandon/Documents/Codex/2026-07-24/referenced-chatgpt-conversation-this-is-untrusted-2/work/mis-36-piano-review

Rama:
agent/entrega-1-timeline-maquina

PR:
https://github.com/felipeescandon-ship-it/mis-36-piano/pull/3

Lee README.md y todos los documentos de docs/. Usa
docs/08-RECAP-Y-CONTINUIDAD.md como punto de continuidad.

Entrega 0, E1.1 y E1.2 están completadas. La mejora visual heredada de Letra
también está completada. E1.3 fue analizada, pero todavía no implementada.

Implementa únicamente E1.3: adaptador de audio aislado, muestras, fallback,
programación absoluta, cancelación por generación y estado bloqueado. No conectes
todavía el motor nuevo a index.html, no escribas datos multicanción en producción
y conserva intactos la aplicación publicada, la API y mis36/.

Antes de modificar código, resume el plan concreto y confirma las restricciones.
```

