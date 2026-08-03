# Recap y continuidad · inicio de E1.3

**⚠️ Documento obsoleto desde el 3 de agosto de 2026.** Ver
[`10-RECAP-E2-COMPLETA.md`](10-RECAP-E2-COMPLETA.md) y
[`04-ROADMAP.md`](04-ROADMAP.md) para estado actual.

Actualizado: 28 de julio de 2026  
Estado: Entrega 0 y Entrega 1 completadas en producción; E2 (constructor de
acordes) pendiente de implementación.

## Propósito

Este documento permite continuar el proyecto en otro chat sin reconstruir decisiones
ni confundir trabajo terminado con trabajo planificado. Debe leerse junto con
`README.md`, todos los documentos de `docs/` y, especialmente,
`07-ENTREGA-1-MOTOR-UNIVERSAL.md`.

## Ubicación y publicación

- Repositorio local:
  `/Users/felipeescandon/Documents/Codex/2026-07-24/referenced-chatgpt-conversation-this-is-untrusted-2/work/mis-36-piano-review`
- Rama base actual: `main`
- PR integrado: <https://github.com/felipeescandon-ship-it/mis-36-piano/pull/3>
- Commit de fusión: `3579b263c1e37dfa5282776da1551f5257afe794`
- Producción: <https://mis-36-piano.vercel.app/>

El PR #3 fue fusionado el 27 de julio de 2026 y el despliegue de Vercel terminó
correctamente. Para E1.3 debe crearse una rama nueva desde `main`; no se reutiliza
la rama ni el PR ya cerrados.

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
- formato tipográfico como `Mi | Mi-Sol#-Si`, sin tarjeta permanente;
- acorde principal azul a 19 px, notas componentes gris azuladas a 14 px y letra
  adaptable entre 21 y 26 px;
- letra distribuida en fragmentos musicales con separación natural entre palabras;
- estado actual con fondo azul suave y barra lateral; siguiente con indicador discreto;
- área táctil mínima de 44 × 44 px y nombre accesible con acorde, notas y palabra
  de entrada;
- acordes terminales sin la flecha `↵` y con una marca visual ligada al final de
  la frase;
- hoja de hasta 1320 px, menor distancia vertical entre líneas y adaptación móvil
  sin desbordamiento;
- editor heredado conserva únicamente el símbolo del acorde.

Commits:

- `bafd149` · `Mostrar notas de acordes en Letra`
- `228143a` · `Compactar acordes en Letra`
- `28bb924` · `Refinar acordes y letra`
- `3579b26` · fusión del PR #3 en `main`

Validación visual realizada:

- iPad horizontal a 1180 px: 86 acordes, sin colisiones ni desbordamiento;
- iPad vertical a 820 px: sin colisiones ni desbordamiento;
- móvil a 390 px y reflujo estrecho a 320 px: sin elementos recortados ni
  desplazamiento horizontal;
- notas componentes de 14 px y objetivos táctiles de 44 px en todos los tamaños
  comprobados;
- estado actual único mediante `aria-current` y ausencia de la antigua flecha `↵`;
- acorde principal `#155FC0`, notas `#526178`, separador `#667085` e indicadores
  con contraste WCAG AA;
- 34 pruebas aprobadas y despliegue de Vercel correcto después de la fusión;
- advertencia local de `/api/song-sync` esperable al usar un servidor de archivos
  estáticos y no relacionada con la interfaz.

Validación manual todavía pendiente:

- Safari en iPad físico, vertical y horizontal;
- zoom o ampliación de texto al 200 %;
- VoiceOver y teclado externo;
- comprobar el acorde visible más largo sin desplazamiento horizontal;
- validar IndexedDB `shadow` de Entrega 0 en Safari real.

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

- 34 pruebas;
- 34 aprobadas;
- 0 fallidas;
- sintaxis del script heredado válida;
- `git diff --check` aprobado;
- `main` sincronizada con el commit de fusión `3579b26`;
- producción desplegada sin escrituras multicanción.

## Mapa completo de pendientes

### Inmediato · aceptación física pendiente

1. Probar en Safari/iPad real el adaptador IndexedDB `shadow` de Entrega 0.
2. Revisar la vista Letra publicada en orientación vertical y horizontal.
3. Probar ampliación al 200 %, VoiceOver, teclado externo, foco y acordes largos.
4. Registrar resultados sin confundir emulación de viewport con aceptación física.

Estas comprobaciones no autorizan escrituras `piano-library/` ni cambian el orden de
E1.3.

### Entrega 1 · terminar el motor universal

1. **E1.3 · audio:** implementar `audio-runtime.js`, `piano-samples.js` y
   `fallback-synth.js` con tiempo absoluto, fallback, estados, cancelación por
   generación y pruebas aisladas.
2. **E1.4 · vistas:** adaptar Tocar, Letra y Práctica para consumir una única
   máquina observable, sin reconstruir la hoja completa en cada avance.
3. **E1.5 · bandera:** agregar una bandera interna separada de `pianoLibrary`,
   apagada por defecto, para leer “Mis 36” migrada solo en memoria.
4. **E1.6 · aceptación:** ejecutar Safari/iPad real, equivalencia musical y ensayo
   de reversión antes de declarar completa la Entrega 1.

Cada unidad debe tener pruebas, commit, PR y reversión independientes. E1.3 no puede
conectar todavía `index.html`.

### Entrega 2 · constructor y biblioteca de acordes

- Resolver D-P02: rango de muestras, muestra más cercana y transposición máxima.
- Confirmar Q-01: cualidades exactas de P0.
- Resolver Q-02: diferencia visual entre posición global y exclusiva de canción.
- Implementar fundamentales, cualidades, bajo alternativo e inversiones.
- Permitir agregar o quitar notas, elegir mano, octava y digitación.
- Duplicar antes de editar y versionar voicings para no cambiar canciones por
  sorpresa.
- Añadir vista previa visual y sonora, guardado y archivado.

### Entrega 3 · biblioteca local de canciones

- Crear biblioteca sobre IndexedDB, todavía sin nube v2.
- Crear, abrir, duplicar, archivar y restaurar canciones.
- Editar metadatos, secciones, líneas, eventos, anclas y duraciones.
- Persistir canción activa.
- Importar y exportar el JSON propio con rechazo atómico de archivos inválidos.
- Verificar al menos diez canciones de prueba sin modificar código.

### Entrega 4 · migración de “Mis 36” en sombra

- Cumplir todas las condiciones previas de
  `03-MIGRACION-Y-REVERSIÓN.md`.
- Identificar commit de producción y verificar API heredada.
- Comparar exportación local con documento remoto.
- Crear respaldo remoto inmutable y registrar SHA-256 del origen.
- Ejecutar migración idempotente local y después remota bajo `piano-library/`.
- Leer nuevamente, comparar canónicamente y marcar `verified`.
- Ensayar reversión sin borrar ni sobrescribir `mis36/`.

No ejecutar esta entrega antes de completar las Entregas 0–3 y el plan de QA.

### Entrega 5 · sincronización por recurso

- Catálogo remoto y revisiones separadas de canción, acorde y voicing.
- Cola local idempotente, reintentos y funcionamiento sin conexión.
- Conflictos por recurso mediante `baseRevision`.
- Historial, restauración y estados separados de dispositivo, pendiente, nube y
  conflicto.
- Confirmar que un dispositivo nuevo nunca publique datos predeterminados.

### Entregas 6 y 7 · activación y evolución

- Activar la biblioteca nueva solo después de verificar la migración.
- Crear la segunda canción real.
- Mantener el lector heredado y la reversión durante el periodo que se acuerde
  mediante Q-08.
- Resolver política de archivo/eliminación, importadores posteriores y portadas.
- Después: transposición, pedagogía, animaciones, identidad visual, cuentas y
  colaboración si se aprueban.

### Preguntas abiertas que deben conservarse

- Q-01 · cualidades exactas de acordes en P0.
- Q-02 · posición de biblioteca frente a posición exclusiva.
- Q-03 · retención antes de eliminación definitiva.
- Q-04 · formato posterior al JSON propio.
- Q-05 · portadas en P0.
- Q-06 · tempo por sección.
- Q-07 · actualización de voicings usados por varias canciones.
- Q-08 · convivencia de lector heredado y biblioteca nueva.

## Orden recomendado para la próxima sesión

1. Leer `README.md` y todos los documentos de `docs/`.
2. Confirmar que `main` contiene `3579b26`, ejecutar `npm test` y revisar el árbol
   de trabajo.
3. Releer las secciones **Reloj y planificador**, **Audio**, **Paso 3** y
   **Criterios de aceptación** de `07-ENTREGA-1-MOTOR-UNIVERSAL.md`.
4. Crear una rama nueva, por ejemplo `agent/entrega-1-audio`, desde `main`.
5. Antes de modificar código, resumir el plan y confirmar que no habrá conexión con
   `index.html` ni escrituras multicanción.
6. Implementar únicamente los tres módulos de E1.3.
7. Crear dobles de `AudioContext`, fuentes, ganancias, osciladores, carga y aborto;
   las pruebas no deben depender de audio ni tiempo reales.
8. Ejecutar todas las pruebas y confirmar que `index.html`, la API, las banderas y
   `mis36/` no cambiaron.
9. Actualizar roadmap y documentación solo cuando E1.3 cumpla fallback,
   cancelación y bloqueo.
10. Crear un PR nuevo para E1.3 y validar Vercel antes de fusionar.

## Texto sugerido para iniciar el próximo chat

```text
Continúa el proyecto “Mis 36 · Piano”.

Repositorio local:
/Users/felipeescandon/Documents/Codex/2026-07-24/referenced-chatgpt-conversation-this-is-untrusted-2/work/mis-36-piano-review

Base:
main, commit de fusión 3579b263c1e37dfa5282776da1551f5257afe794

Lee README.md y todos los documentos de docs/. Usa
docs/08-RECAP-Y-CONTINUIDAD.md como punto de continuidad.

Entrega 0, E1.1 y E1.2 están integradas en producción mediante el PR #3. La mejora
visual heredada de Letra también está publicada: acorde principal azul, notas
secundarias y frases adaptables. E1.3 fue analizada, pero todavía no implementada.

Implementa únicamente E1.3: adaptador de audio aislado, muestras, fallback,
programación absoluta, cancelación por generación y estado bloqueado. No conectes
todavía el motor nuevo a index.html, no escribas datos multicanción en producción
y conserva intactos la aplicación publicada, la API y mis36/. Crea una rama y un
PR nuevos desde main; no reutilices el PR #3.

Antes de modificar código, resume el plan concreto y confirma las restricciones.
```
