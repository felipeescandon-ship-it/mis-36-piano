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
- `localStorage` conserva ajustes y estados pendientes;
- la nube mantiene revisiones inmutables para resolver conflictos y recuperar datos.

## Reglas de seguridad

- Los ajustes vigentes de "Mis 36" son la referencia de regresión.
- No sobrescribir ni eliminar el contenido actual de Vercel Blob.
- No inicializar la nube desde un dispositivo nuevo con datos predeterminados.
- Los cambios de estructura deben probarse en Safari y en iPad antes de llegar a
  producción.
