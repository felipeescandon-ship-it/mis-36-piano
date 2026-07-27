# Entrega 1 · motor universal

Actualizado: 27 de julio de 2026
Estado: E1.1 y E1.2 implementadas; E1.3–E1.6 pendientes.

## Resumen

La Entrega 1 separa reproducción, navegación musical, práctica y seguimiento visual
de los datos fijos de “Mis 36”. El resultado será un motor capaz de cargar cualquier
agregado válido de canción, acordes y voicings, y de alimentar las vistas Tocar,
Letra y Práctica mediante un único estado observable.

Esta entrega no abre todavía la biblioteca al usuario. “Mis 36” seguirá siendo la
canción visible por defecto y el motor nuevo permanecerá detrás de una bandera
interna hasta completar regresión musical, accesibilidad y pruebas reales en
Safari/iPad.

## Estado de implementación

| Unidad | Estado | Evidencia |
|---|---|---|
| E1.1 · timeline y fixture B | Completada | rangos por ID, 81 eventos, 320 pulsos y contraste 96 BPM/3-4 |
| E1.2 · máquina y reloj falso | Completada | pausa, tempo, 1.000 pulsos, práctica, suspensión y cambio atómico |
| E1.3 · audio | Pendiente | no se ha extraído ni programado audio |
| E1.4 · vistas | Pendiente | ninguna vista importa todavía el motor |
| E1.5 · bandera | Pendiente | el lector público continúa heredado |
| E1.6 · aceptación | Pendiente | requiere Safari/iPad real |

E1.1 y E1.2 son módulos sin `window`, DOM, `localStorage`, red ni `AudioContext`.
Permanecen desconectados de `index.html` y no alteran la aplicación publicada.

## Problema

La aplicación vigente reproduce correctamente una canción, pero el comportamiento
musical depende de variables globales, índices de arreglos, elementos del DOM y
temporizadores encadenados dentro de `index.html`. El temporizador decide cuándo
cambia el acorde, Letra reconstruye la hoja completa al avanzar y Safari no conserva
una posición musical explícita cuando suspende el audio.

Si se conecta una biblioteca a esta estructura, cambiar de canción puede dejar
temporizadores, audio o resaltados del documento anterior. Además, no existe una
forma determinista de probar pausa, reanudación, cambio de tempo o regreso desde
segundo plano sin esperar tiempo real.

## Resultado esperado

Al terminar la entrega:

1. el motor carga una canción por ID y revisión, sin conocer “Mis 36”;
2. el tiempo de `AudioContext` es la referencia mientras el audio está activo;
3. Tocar, Letra y Práctica consumen el mismo snapshot de reproducción;
4. pausa conserva evento y desplazamiento dentro del evento;
5. detener, buscar o cambiar de canción invalida todo trabajo anterior;
6. volver a Safari nunca reproduce eventos vencidos en ráfaga;
7. Letra actualiza únicamente los nodos afectados por el cambio;
8. dos canciones de fixture pueden alternarse sin estado residual;
9. la secuencia canónica de “Mis 36” continúa siendo idéntica;
10. la aplicación heredada puede recuperarse apagando una bandera.

## Metas verificables

- Reproducir los 81 eventos activos de “Mis 36” en el mismo orden, con sus pulsos,
  acordes y revisiones de voicing.
- Alternar al menos 20 veces entre dos fixtures sin audio, timers, selección,
  resaltados ni suscriptores residuales.
- Con reloj simulado, completar 1.000 pulsos sin deriva acumulada.
- Pausar y reanudar conservando el desplazamiento musical con una tolerancia de
  0,05 pulsos.
- Detener audio y planificación anterior en un máximo de 150 ms.
- No emitir más de una transición visible al recuperar una pestaña suspendida.
- No reemplazar la hoja completa de Letra durante el avance normal.
- Mantener `pianoLibrary` desactivada por defecto y no añadir escrituras remotas.

## Fuera de alcance

- **Biblioteca visible:** crear, elegir, duplicar y archivar canciones corresponde a
  la Entrega 3.
- **Constructor de acordes:** generación y edición de posiciones corresponde a la
  Entrega 2.
- **Edición sobre el esquema nuevo:** el editor heredado continúa disponible hasta
  que la biblioteca local tenga un flujo seguro.
- **Sincronización v2:** no se crean endpoints ni rutas `piano-library/`.
- **Reproducción garantizada con la pantalla bloqueada:** esta entrega recupera la
  sesión al volver; no promete audio continuo en segundo plano.
- **Rediseño visual:** se conservan estructura, controles y lenguaje actuales.
- **Nuevas animaciones:** solamente se mantiene o simplifica el movimiento necesario
  para el estado musical.
- **Transposición y tempo por sección:** el motor respeta el contrato actual de un
  tempo de sesión para toda la cola.

## Usuarios e historias P0

### Pianista o intérprete

- Como pianista, quiero pausar y continuar en el mismo punto musical para no perder
  el lugar.
- Como intérprete, quiero volver a Safari y recuperar una sesión coherente sin oír
  una ráfaga de acordes atrasados.
- Como usuario, quiero que Detener cancele de inmediato sonido, cuenta previa y
  seguimiento.

### Estudiante

- Como estudiante, quiero que Tocar, Letra y Práctica señalen siempre el mismo
  acorde para no recibir instrucciones contradictorias.
- Como estudiante, quiero practicar una transición con la duración y el tempo de la
  canción activa.

### Futuro usuario de biblioteca

- Como usuario de varias canciones, quiero cambiar el documento activo sin conservar
  audio o resaltados de la canción anterior.
- Como usuario, quiero que un documento inválido sea rechazado sin perder la canción
  válida que ya estaba cargada.

## Diagnóstico del código vigente

| Responsabilidad | Estado actual | Riesgo |
|---|---|---|
| Posición musical | `sectionIndex` y `stepIndex` globales | Identidad dependiente de índices |
| Avance | `setTimeout` encadenado | Deriva y ráfagas al reanudar |
| Pausa | cancela el timer | No conserva pulso interno |
| Reanudación | vuelve a ejecutar el evento | Repite duración completa |
| Audio | mezcla carga, reloj y reproducción | Difícil sustituir o probar |
| Práctica | segundo flujo de timers | Estados incompatibles con reproducción |
| Letra | `renderFullSong()` por cambio | Foco, rendimiento y VoiceOver |
| Cambio de canción | no existe | Riesgo de estado residual |
| Safari | aviso en `visibilitychange` | No hay recuperación musical |
| Pruebas | dependen del navegador y tiempo real | Errores de carrera difíciles de reproducir |

## Decisiones de alcance

### Una sola fuente de estado

Existirá una única instancia de motor para la canción activa. Tocar, Letra y
Práctica se suscriben a snapshots inmutables; ninguna vista modifica directamente
índices, colas o timers.

### Identidad por ID

El motor usa `songId`, `sectionId`, `lineId` y `eventId`. Los índices solamente son
detalles derivados para ordenar o renderizar. Una búsqueda o reanudación nunca se
guarda como posición de arreglo.

### Reloj musical, no timer musical

`AudioContext.currentTime` determina el progreso cuando el contexto está activo. Un
timer corto o `requestAnimationFrame` puede despertar al planificador o refrescar la
interfaz, pero nunca es la fuente de verdad.

### Suspensión explícita

Cuando el documento pasa a segundo plano, el motor captura evento y pulso y entra en
pausa de sistema. Al regresar muestra que debe continuarse mediante gesto. No avanza
ni dispara tareas vencidas mientras la sesión está suspendida.

Esta política favorece recuperación predecible en Safari. Audio continuo con la
pantalla bloqueada queda fuera de alcance.

### Cambio de canción atómico

`load()` valida y prepara el documento nuevo antes de reemplazar el actual. Si falla,
el documento válido anterior permanece disponible. Si tiene éxito, primero detiene
audio y planificación anteriores, invalida operaciones asíncronas y después publica
un único snapshot `ready`.

### Tempo de sesión

La canción aporta el tempo inicial. El control de tempo crea un override de sesión
que no modifica el documento. Si cambia durante reproducción, el motor fija la
posición musical actual y recalcula desde ese punto las fechas futuras, sin cambiar
orden ni duración en pulsos.

## Agregado de reproducción

El motor no recibe únicamente `Song`, porque cada evento fija una revisión de
voicing. Recibe un agregado de solo lectura:

```js
{
  song,
  chordsById,
  voicingsByRevision
}
```

`voicingsByRevision` utiliza la clave conceptual:

```text
voicingId + ":" + revision
```

El agregado no es un nuevo formato persistido. Es una vista de ejecución construida
desde recursos ya validados. Antes de cargarlo se comprueba:

- formato y versión de todos los recursos;
- coincidencia entre `song.id` y la selección solicitada;
- existencia de cada acorde y voicing referidos;
- coincidencia de `chordId` entre evento y voicing;
- coincidencia exacta de `voicingRevision`;
- secciones y eventos no vacíos para los rangos reproducibles;
- tempo y pulsos dentro de límites;
- ausencia de IDs duplicados.

## Línea de tiempo

`compileTimeline()` es una función pura. Recibe agregado, rango y tempo; devuelve
entradas ordenadas:

```js
{
  eventId,
  sectionId,
  lineId,
  chordId,
  voicingId,
  voicingRevision,
  position,
  startBeat,
  durationBeats,
  nextEventId
}
```

### Rangos admitidos

- sección activa;
- desde el evento activo hasta el final;
- canción completa;
- conjunto ordenado de secciones;
- transición de dos eventos para Práctica.

Una cola vacía es un error recuperable y no cambia el documento cargado.

### Reglas

- el orden se obtiene de secciones y `event.position`;
- empates de posición son inválidos dentro de una sección;
- `startBeat` es acumulativo dentro de la cola compilada;
- la duración se conserva en pulsos, no se convierte definitivamente a milisegundos;
- el final de reproducción no vuelve al primer evento;
- la navegación manual puede decidir envolver, pero no forma parte del reloj;
- una cola compilada queda asociada a `song.revision` y a un número de generación.

## Contrato del motor

```text
load(playbackDocument)
unload()
select(eventId)
play({ fromEventId?, range? })
pause(reason?)
resume()
stop()
seek(eventId)
setTempo(bpm)
startPractice({ fromEventId, repetitions, countInBeats })
handleVisibility(hidden)
subscribe(listener)
getSnapshot()
destroy()
```

### Semántica

- `load`: valida de forma atómica, detiene la generación anterior y queda `ready`.
- `unload`: cancela todo, libera referencias de canción y queda `empty`.
- `select`: cambia el evento activo sin iniciar audio.
- `play`: compila la cola y comienza desde el evento o rango solicitado.
- `pause`: conserva evento, pulso interno, cola y modo.
- `resume`: continúa desde el pulso conservado; no reinicia toda la cola.
- `stop`: cancela y conserva el evento visible actual; en Práctica vuelve al evento
  de salida de la transición.
- `seek`: cancela audio futuro y selecciona un evento por ID.
- `setTempo`: reancla tiempo y reprograma lo no ejecutado.
- `startPractice`: usa la misma máquina y reloj con modo `practice`.
- `handleVisibility(true)`: captura posición y pausa con razón `system`.
- `handleVisibility(false)`: queda `blocked` hasta un gesto si el contexto no corre.
- `subscribe`: devuelve una función de cancelación.
- `destroy`: hace idempotente la limpieza final.

Todas las operaciones que cancelan pueden repetirse sin efectos adicionales.

## Estado observable

```js
{
  generation,
  status,
  mode,
  phase,
  songId,
  songRevision,
  eventId,
  nextEventId,
  sectionId,
  lineId,
  queueIndex,
  queueLength,
  tempo,
  elapsedBeats,
  remainingBeats,
  practiceRepetition,
  practiceTotal,
  countInRemaining,
  audioStatus,
  pauseReason,
  error
}
```

### Estados

| Estado | Significado | Acciones principales |
|---|---|---|
| `empty` | no hay documento | `load` |
| `ready` | documento y evento válidos | `play`, `seek`, `load` |
| `starting` | se solicita audio o muestras | `stop`, cancelación por generación |
| `playing` | reloj activo | `pause`, `stop`, `seek`, `setTempo` |
| `paused` | pausa del usuario | `resume`, `stop`, `seek` |
| `blocked` | Safari o política de audio exige gesto | `resume`, `stop` |
| `ended` | cola completada | `play`, `seek`, `stop` |
| `error` | fallo recuperable o fatal descrito | `load`, `stop`, reintento |

`mode` puede ser `playback` o `practice`; no se crean dos motores.

### Transiciones principales

| Origen | Acción o condición | Destino |
|---|---|---|
| `empty` | `load` válido | `ready` |
| `ready` | `play` o `startPractice` | `starting` |
| `starting` | contexto disponible | `playing` |
| `starting` | contexto exige gesto | `blocked` |
| `playing` | pausa de usuario | `paused` |
| `playing` | documento oculto | `paused` con razón `system` |
| `paused` | `resume` | `starting` |
| `blocked` | gesto y `resume` exitoso | `playing` |
| `playing` | último evento completado | `ended` |
| cualquiera con documento | `stop` | `ready` |
| cualquiera | `load` válido | `ready` con generación nueva |
| cualquiera | `unload` o `destroy` | `empty` |

Una acción no admitida no cambia el estado y devuelve un error de contrato estable.

### Invariantes

- solamente `playing` puede avanzar musicalmente;
- `eventId` siempre pertenece a `songRevision`;
- `nextEventId` es `null` al final de la cola;
- `elapsedBeats + remainingBeats` coincide con la duración del evento;
- ningún callback de una generación antigua puede publicar estado;
- cada snapshot es inmutable;
- los suscriptores reciben como máximo una notificación por transición lógica;
- un error de audio no invalida el documento musical.

### Errores estables

| Código | Tratamiento |
|---|---|
| `invalid_playback_document` | rechazar carga y conservar documento anterior |
| `missing_resource` | rechazar carga y señalar ID/revisión, sin contenido musical |
| `unknown_event` | no mover selección |
| `empty_range` | conservar `ready` y pedir otro rango |
| `audio_blocked` | pasar a `blocked` y solicitar gesto |
| `audio_degraded` | continuar con respaldo y comunicar estado |
| `audio_failed` | detener avance y conservar posición |

Las operaciones invalidadas por una generación nueva terminan silenciosamente; no
se presentan como error al usuario.

## Reloj y planificador

El motor recibirá dependencias inyectadas:

```text
clock.now()
clock.state
clock.resume()
scheduler.schedule(callback)
scheduler.cancel()
audio.playVoicing(voicing, at, duration)
audio.stopGeneration(generation, release)
```

En navegador, `clock.now()` se apoya en `AudioContext.currentTime`. En pruebas se usa
un reloj falso controlado sin esperas reales.

### Anclaje

Al comenzar o reanudar se registra:

```text
anchorContextTime
anchorBeat
tempo
```

La posición se calcula:

```text
anchorBeat + (clock.now() - anchorContextTime) * tempo / 60
```

Pausa, cambio de tempo y suspensión capturan primero esa posición. Nunca se suma el
retraso de un timer a la posición anterior.

### Lookahead

El planificador puede despertar aproximadamente cada 25 ms y preparar audio hasta
100 ms por adelantado. Estos valores son parámetros del adaptador, no del dominio.
La transición visible se deriva del reloj en `requestAnimationFrame`.

Al volver de una suspensión se descartan despertares vencidos. No se reproducen
eventos cuyo inicio ya pasó.

## Audio

La Entrega 1 extrae la infraestructura existente sin ampliar todavía el registro:

- carga diferida de muestras Salamander;
- muestra más cercana y transposición actual;
- oscilador de respaldo cuando las muestras fallan;
- sustain corto, natural y largo;
- liberación breve al detener o cambiar de acorde;
- clic de cuenta previa para Práctica.

El motor entrega notas del voicing fijado. El adaptador de audio no resuelve símbolos
ni consulta constantes de “Mis 36”.

### Estados de audio

- `uninitialized`;
- `loading`;
- `ready`;
- `running`;
- `suspended`;
- `degraded` para respaldo;
- `failed` si tampoco existe respaldo.

Un fallo de muestras pasa a `degraded` y permite continuar. Un contexto bloqueado
pasa a `blocked` y exige gesto. Ningún fallo debe adelantar la cola.

## Integración de las vistas

### Tocar

Un selector convierte el snapshot en:

- acorde y voicing actuales;
- acorde y voicing siguientes;
- posición dentro de la sección;
- notas mantenidas y próximas;
- estado de transporte.

La vista no llama a `setTimeout` ni modifica la cola.

### Letra

Al cargar una canción se construye una vez el árbol estático y se guardan mapas:

```text
eventId -> botón de acorde
lineId  -> contenedor de línea
sectionId -> contenedor de sección
```

Al cambiar el snapshot solamente se actualizan:

- acorde anterior;
- acorde actual;
- acorde siguiente;
- línea y sección anteriores/actuales;
- texto vivo actual y siguiente;
- estado de seguimiento.

No se ejecuta `renderFullSong()` durante el avance normal. La región `aria-live`
anuncia únicamente cambios reales de evento o estado, no cada frame del reloj.

### Práctica

Práctica compila una cola de dos eventos y añade:

- cuenta previa opcional;
- repeticiones;
- contador de repetición;
- evento de salida y llegada.

Usa el mismo tempo, audio, estado, pausa, stop y política de Safari. Cerrar Práctica
detiene el modo antes de desmontar la vista.

## Cambio entre canciones

Aunque la biblioteca visible llegue después, Entrega 1 prueba el cambio mediante una
API interna:

1. validar completamente el agregado nuevo;
2. incrementar la generación;
3. detener fuentes y planificador anteriores;
4. cancelar cargas asíncronas que todavía no hayan publicado resultado;
5. limpiar mapas y resaltados de las vistas;
6. instalar el documento nuevo;
7. seleccionar su primer evento reproducible;
8. emitir un único snapshot `ready`.

No se conserva la posición entre canciones en esta entrega. La persistencia de
canción activa corresponde a la Entrega 3.

## Fixtures

### Fixture A · “Mis 36”

Se utiliza la salida verificada del migrador de Entrega 0:

- 10 secciones;
- 81 eventos activos;
- 5 eliminaciones heredadas auditadas;
- 2 eventos de 2 pulsos;
- 12 acordes;
- 36 voicings versionados;
- tempo inicial de 72 BPM.

### Fixture B · canción de contraste

Se creará un fixture autocontenido con:

- ID, título y revisión distintos;
- 2 secciones y al menos 5 eventos;
- tempo de 96 BPM;
- compás 3/4;
- una línea instrumental y una con letra;
- al menos un acorde y voicing no usados por “Mis 36”;
- duraciones de 1, 2 y 3 pulsos;
- digitación opcional ausente en al menos una nota.

Su propósito es detectar dependencias de títulos, acordes cerrados, 4/4, 72 BPM,
índices o digitaciones obligatorias.

## Estrategia de implementación

### Paso 1 · línea de tiempo pura

- crear fixture B;
- construir índices por ID;
- implementar rangos y orden estable;
- probar duración, final de cola y referencias inválidas.

Salida: ninguna dependencia de DOM, audio o tiempo real.

### Paso 2 · máquina de estados con reloj falso

- implementar reducer y snapshots;
- play, pause, resume, stop, seek y tempo;
- token de generación;
- suscripción y limpieza;
- pruebas de 1.000 pulsos y carreras.

Salida: reproducción lógica determinista sin sonido.

### Paso 3 · adaptador de audio

- extraer carga de muestras y respaldo;
- programar fuentes con tiempo absoluto;
- detener por generación;
- exponer estados `blocked` y `degraded`.

Salida: sonido independiente de canción, DOM y símbolo.

### Paso 4 · adaptadores de vista

- conectar Tocar al snapshot;
- render estático e incremental de Letra;
- migrar Práctica a la misma máquina;
- conservar controles y textos actuales.

Salida: las tres vistas comparten estado.

### Paso 5 · lectura nueva detrás de bandera

- agregar una bandera interna separada de `pianoLibrary`;
- cargar “Mis 36” migrada desde fixture o conversión local en memoria;
- mantener el lector heredado como camino predeterminado;
- comparar secuencia y capturas de estado.

Salida: prueba interna sin escritura local v2 ni nube.

### Paso 6 · Safari/iPad y reversión

- ejecutar matriz manual;
- bloquear y volver;
- cambiar orientación;
- provocar suspensión del contexto;
- probar VoiceOver y movimiento reducido;
- apagar bandera y confirmar regreso inmediato al motor heredado.

Salida: evidencia de aceptación y decisión de continuar a Entrega 2.

### Unidades de integración

Cada paso se publica por separado y debe dejar `main` desplegable:

| Unidad | Puede integrarse si |
|---|---|
| E1.1 · timeline y fixture B | funciones puras y regresión canónica pasan |
| E1.2 · máquina y reloj falso | no importa navegador ni modifica la app |
| E1.3 · audio | fallback, cancelación y estado bloqueado están probados |
| E1.4 · vistas | Tocar, Letra y Práctica comparten `eventId` |
| E1.5 · bandera interna | apagada por defecto y reversión ensayada |
| E1.6 · aceptación | Safari/iPad real y equivalencia musical aprobados |

No se mezcla una unidad fallida con la siguiente para ocultar regresiones.

## Organización propuesta

```text
src/
├── application/
│   └── playback/
│       ├── timeline.js
│       ├── playback-machine.js
│       ├── playback-engine.js
│       ├── selectors.js
│       └── practice.js
├── infrastructure/
│   └── audio/
│       ├── audio-runtime.js
│       ├── piano-samples.js
│       └── fallback-synth.js
└── ui/
    ├── player/playback-adapter.js
    ├── lyrics/playback-adapter.js
    └── practice/playback-adapter.js
```

Los módulos de aplicación no importan `window`, `document`, `localStorage` ni
`AudioContext`. Esas dependencias entran únicamente por adaptadores.

## Pruebas

### Unidad

- compilación de rangos y línea de tiempo;
- referencias por ID y revisiones;
- estados y transiciones válidas;
- posición por tiempo absoluto;
- pausa y reanudación a mitad de evento;
- cambio de tempo;
- final de cola;
- idempotencia de `stop` y `destroy`;
- invalidación por generación;
- cuenta previa y repeticiones;
- suspensión y recuperación.

### Integración

- motor con reloj falso y audio espía;
- audio programado con fechas absolutas;
- respaldo cuando fallan muestras;
- dos documentos alternados repetidamente;
- actualizaciones parciales de las tres vistas;
- foco y `aria-live`;
- bandera activa e inactiva;
- ausencia de escrituras IndexedDB y remotas.

### Regresión

- representación canónica de 81 eventos;
- orden de secciones y líneas;
- acordes, bajos, notas, digitaciones e inversiones;
- duraciones de 2 y 4 pulsos;
- rangos sección, desde aquí, completa y personalizada;
- transición practicada entre dos eventos.

### Manual

| Superficie | Casos mínimos |
|---|---|
| Safari en iPad | play, pausa, bloqueo, regreso, orientación y gesto de reanudación |
| Safari en Mac | muestras, respaldo, tempo, pestaña en segundo plano y VoiceOver |
| Chromium | canción A/B, render incremental y reducción de movimiento |
| Sin conexión | muestras ya almacenadas y respaldo sin red |

## Criterios de aceptación

### Carga

- Dado un agregado válido, cuando se carga, entonces el primer evento queda `ready`.
- Dado un agregado inválido, cuando se carga, entonces se rechaza completo y el
  documento anterior no cambia.
- Dada una canción distinta, cuando se carga, entonces no quedan fuentes,
  suscriptores, resaltados ni IDs del documento anterior.

### Reproducción

- Dada una cola, cuando se reproduce, entonces cada transición corresponde al tiempo
  absoluto calculado desde pulsos y tempo.
- Dado un evento de 2 pulsos, cuando se reproduce a 72 BPM, entonces el siguiente
  comienza después de 1,666… segundos musicales.
- Dada una cola terminada, cuando llega al final, entonces queda `ended` sin volver
  al inicio.

### Pausa y Safari

- Dado un evento a mitad de duración, cuando se pausa y continúa, entonces conserva
  evento y pulso con tolerancia de 0,05 pulsos.
- Dada una pestaña oculta, cuando vuelve, entonces no suena ningún evento vencido.
- Dado un contexto suspendido, cuando vuelve, entonces el motor queda `blocked`
  hasta un gesto y comunica la acción necesaria.

### Vistas

- Dado un snapshot, Tocar, Letra y Práctica muestran el mismo `eventId`.
- Dado un avance normal, Letra no reemplaza el contenedor completo.
- Dado VoiceOver, cada cambio de evento produce como máximo un anuncio musical.
- Dado movimiento reducido, no se ejecutan transiciones decorativas.

### Reversión

- Dada la bandera interna apagada, la aplicación utiliza exclusivamente el motor
  heredado.
- Apagar la bandera no requiere convertir, borrar ni restaurar datos.
- `mis36/`, `api/song-sync.js` y la revisión heredada no se modifican.

## Riesgos y mitigaciones

| Riesgo | Señal | Mitigación |
|---|---|---|
| Dos fuentes de estado | vistas muestran eventos distintos | snapshots únicos y adaptadores pasivos |
| Timer como reloj oculto | deriva en pruebas largas | reloj inyectado y posición absoluta |
| Callback antiguo | acorde de otra canción | token de generación en toda tarea asíncrona |
| Audio anticipado tras stop | suena una fuente programada | registro y cancelación por generación |
| Safari suspende contexto | estado visual sigue avanzando | pausa de sistema y gesto explícito |
| Render parcial pierde foco | VoiceOver repite o salta | nodos estables y pruebas de foco |
| Fixture demasiado parecido | dependencia de “Mis 36” no detectada | contraste de tempo, compás y acordes |
| Extracción demasiado grande | regresión difícil de aislar | seis pasos reversibles y bandera |

## Reversión

La reversión de Entrega 1 es de código, no de datos:

1. apagar la bandera interna del motor;
2. detener la instancia nueva si existe;
3. cargar el flujo heredado sin transformar persistencia;
4. conservar logs técnicos sin letra ni documentos completos;
5. comparar secuencia y estado que produjeron el fallo;
6. corregir en una rama antes de reactivar.

No se borran recursos de Entrega 0 ni se copia contenido hacia `mis36/`.

## Observabilidad

Se pueden registrar:

- versión del motor;
- `songId`, revisión y generación;
- transición de estado;
- evento por ID;
- deriva detectada en milisegundos;
- razón de pausa;
- estado del audio;
- tipo y duración de operación.

No se registran letra, documentos completos, tokens, buffers ni muestras.

## Dependencias

- Entrega 0 integrada y pruebas aprobadas;
- contratos `piano-song`, `piano-chord` y `piano-voicing`;
- fixture canónico de “Mis 36”;
- acceso físico a Safari/iPad para aceptación final.

La decisión sobre registro ampliado de muestras D-P02 no bloquea esta entrega,
porque se conserva el registro vigente. Sí bloquea la aceptación completa del
constructor de Entrega 2.

## Condición de cierre

La Entrega 1 se considera completada únicamente cuando:

- pasan pruebas unitarias, integración y regresión;
- profesor o pianista confirma equivalencia de “Mis 36”;
- Fernando valida pausa, regreso y mensajes;
- se ejecuta la matriz real de Safari/iPad;
- se ensaya la bandera de reversión;
- no existen cambios de datos ni escrituras remotas;
- el roadmap y este documento registran resultados reales.

Completar el código sin la prueba física de Safari/iPad mantiene el estado
“implementada; aceptación pendiente”.
