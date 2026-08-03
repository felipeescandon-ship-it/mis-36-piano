# Roadmap · de “Mis 36” a plataforma multicanción

Actualizado: 1 de agosto de 2026
Formato: Ahora / Siguiente / Después. Las entregas expresan dependencias, no fechas
prometidas.

## Cambio de prioridad

La prioridad anterior era completar cuatro mejoras aisladas: reloj de audio,
actualización parcial de letra, animaciones por BPM e identidad visual cálida.

El nuevo diagnóstico cambia el producto: la aplicación debe admitir repertorio y
acordes ilimitados. Por eso:

- reloj de audio y actualización parcial pasan a ser infraestructura del motor;
- animaciones e identidad visual se posponen;
- modelo de datos, constructor de acordes y migración segura pasan primero.

## Estado general

| Área | Estado |
|---|---|
| Experiencia actual Tocar / Letra / Editar / Práctica | **Completada en producción** |
| Especificación multicanción | **Completada** |
| Arquitectura y contratos | **Entrega 0 completada (D-020)** |
| Motor multicanción | **Entrega 1 completada** |
| Constructor de acordes | **Entrega 2 integrada salvo interfaz, ya especificada** |
| Biblioteca de canciones | **No iniciada (Entrega 3)** |
| Migración de producción | **No iniciada (Entrega 4)** |
| Integración continua | **Activa desde la PR #9 y obligatoria para integrar en `main`** |

Las vistas siguen siendo las heredadas y las banderas siguen apagadas. Desde
agosto de 2026, `index.html` sí alcanza `src/` con `?motor=universal` para
comprobar la equivalencia canónica contra los datos vivos, sin cambiar nada de lo
que se ve ni se oye (D-019). Lo que el issue #16 decide —cuándo las vistas dejan de
consumir el código heredado— sigue abierto, pero ya no se decide a ciegas.

## Cuestiones abiertas

| Issue | Bloquea | Decide |
|---|---|---|
| #16 · ¿cuándo las vistas dejan de consumir el código heredado? | Entregas 3 y 4 | producto |

## Ahora · fundación

### Entrega 0 · contratos y prototipo

Estado: **Completada.** La validación física del adaptador IndexedDB `shadow` en
Safari/iPad la cubrió la aceptación de E1.6 — ver D-020.

Objetivo: demostrar que el modelo nuevo representa “Mis 36” sin cambiar la
aplicación pública.

Incluye:

- fixtures del formato heredado;
- módulos de Song, Chord, Voicing y validación;
- migrador idempotente a `piano-song` v1;
- comparación canónica;
- prueba de IndexedDB;
- decisión sobre empaquetado y módulos;
- bandera de biblioteca desactivada.

Implementado en la rama de fundación:

- contratos estrictos y compartibles mediante módulos ES nativos;
- fixture de la revisión heredada verificada `d21083ad-cf4a-486b-8661-494778a2a83d`;
- migración con huella SHA-256, IDs deterministas y registro `shadow`;
- comparación canónica de las 81 entradas activas, 5 eliminaciones heredadas y
  2 duraciones personalizadas;
- adaptador IndexedDB aislado, sin cola ni escritura remota;
- pruebas automáticas de validación, equivalencia, idempotencia y persistencia.

Dependencia: ninguna escritura en la nube nueva.

### Entrega 1 · motor universal

Estado: **Completada (E1.1-E1.6)**

Objetivo: cargar una canción como dato y ejecutar la experiencia actual sin
referencias especiales a “Mis 36”.

Incluye:

- selección de documento activo;
- reloj musical basado en `AudioContext`;
- pausa, reanudación y regreso de Safari;
- renderizado parcial de Letra;
- Tocar, Letra y Práctica consumiendo el mismo estado;
- pruebas de regresión de “Mis 36”.

Plan de ejecución aprobado:

1. línea de tiempo pura y segundo fixture de contraste;
2. máquina de estados con reloj falso;
3. adaptador de audio programado por tiempo absoluto;
4. adaptadores de Tocar, Letra y Práctica;
5. lectura nueva detrás de bandera interna;
6. Safari/iPad y ensayo de reversión.

Avance verificado:

- [x] E1.1 · documento inmutable, índices, fixture B y timeline puro;
- [x] E1.2 · máquina de estados, reloj falso, pausa, tempo, práctica y generación;
- [x] E1.3 · adaptador de audio (AudioRuntime, PianoSamples, FallbackSynth; PR #4);
- [x] E1.4 · selectors.js + playback-engine.js conectando motor y audio (PR #5);
- [x] E1.5 · bandera `pianoUniversalEngine` (apagada) + prueba interna de
      equivalencia canónica completa (81/81 eventos, 320 pulsos) contra "Mis 36"
      (PR #5). **No conecta `index.html`** — esa conexión visual detrás de la
      bandera queda pendiente de decisión explícita, por ser el primer cambio de
      esta migración que tocaría el archivo de producción;
- [x] E1.6 · aceptación Safari/iPad físico — validada en Safari/iPad con
      IndexedDB `shadow`, Letra adaptable, accesibilidad (VoiceOver, zoom al 200%),
      acordes sin colisiones, bloqueo y regreso sin eventos en ráfaga.

Mejora independiente previa a E1.3, integrada en producción mediante el PR #3: la
vista Letra heredada permite mostrar u ocultar las notas de la mano derecha junto a
cada acorde. Las presenta como anotaciones tipográficas, conserva objetivos
táctiles de 44 px y mantiene la letra en fragmentos musicales adaptables. Esto no
activa el motor nuevo ni cambia el alcance pendiente de E1.4.

La especificación completa, contratos, invariantes, riesgos y criterios están en
[`07-ENTREGA-1-MOTOR-UNIVERSAL.md`](07-ENTREGA-1-MOTOR-UNIVERSAL.md).

Dependencia: Entrega 0.

## Siguiente · capacidad de crear

### Entrega 2 · constructor y biblioteca de acordes

Estado: **Integrada en `main`: núcleo, persistencia, audio e interfaz.**

Objetivo: permitir acordes y posiciones que no existan en la canción actual.

Completado:

- [x] ChordBuilder: máquina de estado, cualidades (6-9), bajo alternativo
- [x] ChordFactory: genera Chord y Voicing inmutables con UUIDs
- [x] ChordSelectors: exposición de estado a UI (nombre, notas, MIDI)
- [x] ChordRepository: persistencia de chords en IndexedDB
- [x] VoicingRepository: persistencia de voicings en IndexedDB
- [x] ChordPreviewPlayer: reproducción sonora de voicings
- [x] Ámbito: "library" (reutilizable) vs "song" (exclusivo), validado en
      `validateVoicing`
- [x] 63 pruebas propias, dentro de una suite de 137 que ahora sí termina
- [x] **Rango Si1–Do7 (MIDI 35–96).** `validateNote` lo comprueba sobre la altura
      absoluta. Antes aceptaba octavas 0 a 8 (MIDI 12–131) y el constructor
      comprobaba el número de octava en su lugar, de modo que dejaba pasar Si7
      —once semitonos por encima de la muestra más aguda— y rechazaba el registro
      de bajo Si1–La2 que documenta `index.html`. Issues #12 y #13.

- [x] Interfaz especificada en [`11-E2-INTERFAZ.md`](11-E2-INTERFAZ.md) (issue #11)

Corrección de julio de 2026 (PR #7): la suite de esta entrega **no llegaba a
terminar**. El doble de prueba de IndexedDB, duplicado en tres archivos,
declaraba `onsuccess` y `oncomplete` sin invocarlos nunca, de modo que cada
`await` de los repositorios quedaba pendiente para siempre. Los archivos no
fallaban: se quedaban callados, y como los dos primeros imprimían verde en
menos de 100 ms, la entrega se dio por verificada con "64 tests" que nadie vio
completar. Al repararlo afloraron dos pruebas más que el bloqueo ocultaba y un
`import` de `node:crypto` en código de navegador, que habría roto la entrega al
conectarla a `index.html`.

Desde la PR #9 existe integración continua, de modo que este modo de fallo ya
no puede repetirse en silencio.

Interfaz (3 de agosto de 2026):

- [x] Constructor visual en pantalla, como hoja modal sobre Editar
- [x] Punto de entrada: opción "＋ Crear acorde nuevo…" en el mismo selector
      "Nuevo acorde" que ya usaba "＋ Añadir" — resuelve el apartado 16.1 de
      `11-E2-INTERFAZ.md` sin esperar a la biblioteca de Entrega 3
- [x] Radio Biblioteca/Canción al guardar con descripciones
- [x] Teclado de Si1 a Do7 para construir la posición, colapsable
- [x] Vista previa sonora reutilizando el motor de audio heredado
- [x] Persistencia real vía ChordFactory + ChordRepository/VoicingRepository
      en IndexedDB, hidratada al cargar la página
- [x] Traducción al formato heredado (`legacy-chord-adapter.js`): cada acorde
      construido se identifica internamente por su UUID, no por su símbolo,
      porque el símbolo puede coincidir con uno de los 12 acordes fijos
      (`Mi Mayor` produce el mismo `E` que ya existe). Guardarlo por símbolo
      sobrescribía silenciosamente el acorde original hasta que se corrigió.

No implementado en esta vuelta, por decisión de alcance:

- [ ] Filtro de tipo en el selector de voicings ("Todos"/"Biblioteca"/"Canción")
- [ ] Selector de dedo por nota (el dedo se numera automáticamente)
- [ ] Rejilla de fundamental/bajo con la disposición exacta de teclado del
      apartado 4 de `11-E2-INTERFAZ.md`; se implementó como paleta de 12
      celdas etiquetadas, sin los huecos que imitan las teclas negras
- [ ] Inversiones alternativas de un acorde construido (solo existe la
      posición que se construyó)

Dependencia: contratos de Chord y Voicing.

### Entrega 3 · biblioteca local de canciones

Estado: **no iniciada**

Objetivo: crear y utilizar varias canciones sin nube.

Incluye:

- pantalla de biblioteca;
- crear, abrir, duplicar, archivar y restaurar;
- metadatos y estructura editable;
- importar y exportar JSON propio;
- canción activa persistente;
- búsqueda básica si cabe sin retrasar P0;
- estados vacíos y recuperación ante archivos inválidos.

Dependencias: Entregas 1 y 2.

## Siguiente · seguridad y nube

### Entrega 4 · migración de “Mis 36” en sombra

Estado: **no iniciada**

Objetivo: producir una copia v1 equivalente y verificable, manteniendo intacto el
sistema heredado.

Incluye:

- backup y hash del origen;
- conversión local;
- escritura remota bajo rutas nuevas;
- lectura de comprobación;
- comparación canónica;
- bandera interna para probar la biblioteca nueva;
- ensayo de reversión.

Dependencia: Entregas 0–3 y plan de QA aprobado.

### Entrega 5 · sincronización por recurso

Estado: **no iniciada**

Objetivo: sincronizar canciones, acordes y voicings sin reemplazar toda la biblioteca.

Incluye:

- catálogo remoto;
- revisiones por recurso;
- cola local de cambios;
- conflictos local/remoto;
- historial y restauración;
- estados de dispositivo y nube;
- tolerancia a desconexión y reintentos.

Dependencia: migración en sombra verificada.

## Después · apertura y personalidad

### Entrega 6 · activación multicanción

- activar la nueva biblioteca en producción;
- crear la segunda canción real;
- observar errores y conflictos;
- mantener reversión heredada durante el periodo acordado;
- ampliar cualidades de acorde según uso real.

### Entrega 7 · mejoras posteriores

- transposición;
- explicaciones pedagógicas;
- formatos de importación adicionales;
- animaciones sincronizadas al BPM;
- identidad visual cálida y orgánica;
- cuentas, colaboración o bibliotecas compartidas, si se aprueban.

## Dependencias críticas

```text
Contratos
   ├── Motor universal ── Biblioteca de canciones
   └── Constructor de acordes ────────────────┤
                                               ↓
                                  Migración en sombra
                                               ↓
                                  Sincronización v2
                                               ↓
                                  Activación pública
```

## Riesgos del roadmap

| Riesgo | Consecuencia | Mitigación |
|---|---|---|
| Construir interfaz antes del modelo | Reescritura y formatos incompatibles | Contratos y prototipo primero |
| Migrar y activar a la vez | Difícil detectar o revertir errores | Sombra, comparación y bandera |
| Acorde mutable compartido | Cambios inesperados en varias canciones | Revisiones inmutables |
| Un documento remoto gigante | Conflictos y sobrescritura global | Sincronización por recurso |
| Mantener todo en `index.html` | Acoplamiento creciente | Separación gradual por módulos |
| Posponer Safari hasta el final | Fallos de audio tardíos | Pruebas desde el motor universal |

## Definición de avance

Una entrega no pasa a la siguiente solo por estar programada. Debe cumplir sus
criterios en [`05-CALIDAD-Y-ACEPTACION.md`](05-CALIDAD-Y-ACEPTACION.md), dejar el
repositorio limpio y actualizar esta hoja de ruta.
