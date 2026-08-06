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

La app tiene tres pantallas principales, accesibles desde la barra superior:

- **Cancionero**: biblioteca de canciones. Abrir, editar, borrar e importar
  canciones nuevas pegando letra y acordes desde internet.
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
