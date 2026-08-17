# Piano Estudio

Cancionero personal: aplicación web para acompañar, seguir la letra y
practicar canciones en piano. "Mis 36" fue la canción original de la app y
sigue siendo la canción semilla del catálogo.

- Producción: <https://mis-36-piano.vercel.app/>
- Repositorio: <https://github.com/felipeescandon-ship-it/mis-36-piano>
- Aplicación: `index.html`
- API: `api/song-sync.js` (contenido de cada canción), `api/catalog-sync.js`
  (índice del cancionero), `api/practice-sync.js` (memoria de práctica)

## Pantallas

La app tiene tres pantallas principales, accesibles desde la barra superior
(arranca en Cancionero):

- **Cancionero**: fichero de canciones — una solapa por canción y un panel de
  detalle abajo con la seleccionada (abrir, editar, borrar, o saltar directo a
  una subvista de Tocar). La solapa "＋" importa una canción nueva pegando
  letra y acordes desde internet.
- **Tocar**: la canción abierta, con tres subvistas:
  - *Teclado*: acorde actual y siguiente lado a lado, con el teclado visual,
    los dedos sugeridos y la inversión usada.
  - *Acordes y letra*: la partitura completa (letra con acordes encima o en
    línea), para leer o seguir la canción de principio a fin. Puede mostrar u
    ocultar las notas de la mano derecha junto a cada acorde, respetando su
    inversión y la notación española o inglesa.
  - *Estructura*: mapa de secciones para saltar directo a cualquier parte de
    la canción.
  - El botón "✎ Editar" (junto al título) abre el modo de edición de acordes
    y letra sobre la misma vista de "Acordes y letra".
- **Practicar**: elegir una transición puntual entre dos acordes para
  repetirla (con manos separadas opcionales), o tocar la canción completa a
  tempo reducido. Lleva un contador de repeticiones por canción y por
  transición, con tendencia semanal, que sincroniza entre dispositivos.

El botón "⚙ Ajustes" del header abre un menú anclado al propio botón (no
un bloque en el flujo de la página: abrirlo y cerrarlo no desplaza el resto
de la app). En escritorio flota bajo el botón; en móvil (≤640px) se muestra
como una hoja que sube desde abajo. Se cierra con Escape, tocando fuera o
volviendo a pulsar "⚙ Ajustes".

Su contenido depende de la pantalla activa: en Cancionero, sin canción
cargada, solo muestra "Administrar biblioteca"; en Tocar y Practicar
también muestra los controles de reproducción (sección inicial, recorrido,
ayuda visual, sonido, tempo). "Administrar biblioteca" tiene "☁ Sincronizar
ahora" y un icono "⇅" que despliega exportar/importar, del cancionero
completo o de la canción abierta.

El conmutador de notación ("Do · Re" / "C · D") vive en el header, junto a
"⚙ Ajustes" — no depende de la pantalla en la que estés.

## Biblioteca de acordes

`index.html` tiene 43 acordes con voicing propio: mano izquierda, mano
derecha con digitación y las tres inversiones. Un acorde que una canción usa
pero la biblioteca no tiene queda **pendiente**: se guarda, se muestra y se
cuenta, pero no suena. La app nunca inventa un voicing por fórmula.

Trece de esos 43 son un vocabulario general pensado para que una canción
pegada de internet suene sin construir nada a mano:

- **Tríadas** (18 con las que ya había): C, G, F, Am, Em, Dm, D, A, E, Bm,
  F#m, C#m, B, Bb, Eb, Gm, Cm, G#m.
- **Dominantes**: G7, C7, D7, A7, E7.
- **Color**: Cmaj7, Fmaj7, Am7, Dm7, Csus2, Gsus4, Cadd9.

A diferencia de los acordes que nacieron de una canción concreta —cuya
inversión por defecto se eligió para encadenar bien dentro de esa canción—
estos usan la fundamental, que es lo que se lee en un cifrado.

### Sostenidos, bemoles y maj7

La biblioteca nombra con sostenidos y `7M` (`A#`, `C7M`), pero los cifrados
de internet usan bemoles y `maj7` para los mismos acordes (`Bb`, `Cmaj7`).
El importador guarda el símbolo **tal cual se pegó**, a propósito: no
reescribe lo que escribió el autor. Para que ambas escrituras suenen,
`canonicalChord()` traduce solo al momento de buscar el voicing. Lo guardado
y lo que se ve en pantalla siguen siendo el símbolo original — pegar `Bb`
muestra "Sib" en notación española, no "La#".

## Arquitectura

La aplicación es intencionalmente pequeña:

- `index.html` concentra datos musicales, interfaz, reproducción y persistencia local;
- `api/song-sync.js` valida y guarda el contenido de cada canción en Vercel Blob;
- `api/catalog-sync.js` sincroniza el índice del cancionero (qué canciones existen,
  en qué orden, borradas o no) como un único documento global;
- `api/practice-sync.js` sincroniza los contadores de práctica (repeticiones por
  canción y transición) como otro documento global; como son contadores que solo
  crecen, los conflictos se resuelven combinando por máximo en vez de pedir que
  el usuario elija una versión;
- `assets/audio-engine.js` es el motor de sonido (ver abajo);
- `sw.js` cachea la app y las muestras para que funcione offline;
- `localStorage` conserva ajustes y estados pendientes;
- la nube mantiene revisiones inmutables para resolver conflictos y recuperar datos.

## Motor de sonido

El sonido está en `assets/audio-engine.js`, aparte de `index.html`. `index.html`
decide **qué** acorde suena y **cuándo**; el motor decide **con qué**. Cinco
decisiones sostienen eso:

**1. Muestras reales autohospedadas.** El piano es `SplendidGrandPiano` de
[smplr](https://github.com/danigb/smplr): 226 muestras con cinco capas de
velocity y release samples propios. Ni la librería ni las muestras vienen de un
CDN — `assets/vendor/smplr.mjs` y `assets/piano-samples/` se sirven same-origin,
porque el service worker no puede cachear recursos cross-origin. Sin
autohospedaje no hay piano real offline. Ocupa el doble en el repo, pero cada
usuario descarga solo el formato que usa (~20MB, una vez).
`scripts/fetch-piano-samples.mjs` regenera la carpeta; la lista de muestras la
extrae del `LAYERS` de la propia librería, no de una copia a mano.

El formato se elige **decodificando una muestra de verdad** (`pickFormat()`), no
preguntándole al navegador. El camino de smplr falla justo donde importa: decide
con `canPlayType()` y, en Safari, tanto `audio/m4a` como `audio/aac` devuelven
`""`, así que descarta m4a, se queda sin candidatos y cae al primer formato de la
lista — que es `ogg`, el único que Safari no decodifica. Las 226 descargas dan 200
OK, todas las decodificaciones fallan sin ruido y el piano queda "listo" y mudo.
Un decode real de 74KB no se equivoca. Los archivos `ogg` son Ogg/**Opus** (no
Vorbis) y los `m4a` son AAC-LC, que es lo que Safari sí decodifica.

**2. Fallback transparente a síntesis.** Quien dispara notas llama siempre a la
capa "smart" (`playChordAt` / `playChordNow`) y nunca sabe qué motor suena. La
descarga arranca al iniciar la app —no en el primer toque de tecla— con la
promesa cacheada, y mientras tanto suena el sintetizador. Nunca se espera a la
red con una nota pendiente. Si ninguna muestra carga, la carga se marca fallida y
el sintetizador se queda: un piano "listo" sin buffers sonaría en silencio, que
es peor que un sonido básico. Lo mismo si ningún formato decodifica.

**3. ADSR con velocity real.** En el sintetizador la velocity no es un
multiplicador de volumen: mueve el attack (más fuerte, más rápido), el sustain y
el brillo armónico (energía en 2.º y 3.er armónico). Medido entre velocity 0.12 y
0.95, el brillo crece 4.6× mientras el volumen crece 3.2×, y el attack pasa de
50ms a 11ms. El release siempre es exponencial hacia el silencio, nunca un corte:
un salto a cero en la envolvente es exactamente lo que produce el click al soltar
una nota.

**4. API de tiempo absoluto con voces cancelables.** Todo acepta un `when`
anclado al reloj del `AudioContext` y devuelve un handle con `cancel()`, que sirve
igual para una nota que ya suena y para una que todavía no arrancó. Sobre eso, el
transporte de `index.html` programa con 600ms de look-ahead: un productor entrega
los pasos de a uno con su instante ideal, calculado siempre desde el paso
anterior y nunca desde "ahora", así que la deriva no se acumula. Con el hilo
principal bloqueado 900ms —más que la ventana de look-ahead— el desvío medido
sigue siendo 0ms. La cuenta previa y el loop de práctica son un solo tramo
continuo del mismo transporte, por eso el primer acorde cae exactamente en el
pulso que la cuenta anunció.

**5. Cacheo offline.** `sw.js` usa cache-first para las muestras y el bundle (no
cambian nunca) y network-first con fallback a caché para el resto, para que la app
funcione offline sin que una versión nueva del código quede atascada. `/api/*`
queda **fuera** de la caché a propósito: servir una respuesta vieja de
sincronización haría que la app crea que guardó cuando no guardó.

## Reglas de seguridad

- Los ajustes vigentes de "Mis 36" son la referencia de regresión.
- No sobrescribir ni eliminar el contenido actual de Vercel Blob.
- No inicializar la nube desde un dispositivo nuevo con datos predeterminados.
- Los cambios de estructura deben probarse en Safari y en iPad antes de llegar a
  producción.
