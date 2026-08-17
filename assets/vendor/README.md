# Librerías vendorizadas

## smplr.mjs

- Paquete: [`smplr`](https://github.com/danigb/smplr) v1.0.0 (`dist/index.mjs`, sin modificar)
- Licencia: MIT
- Muestras: `SplendidGrandPiano`, en `assets/piano-samples/`

Está copiado dentro del proyecto en lugar de cargarse desde un CDN por una razón
concreta: el service worker solo puede cachear recursos same-origin. Un `import`
a un CDN cross-origin dejaría la app sin piano real offline.

El bundle no está parcheado. La única adaptación es externa: el motor
(`assets/audio-engine.js`) le pasa un `storage` propio — un punto de extensión
público de la librería — que reescribe las URLs de muestras a los nombres con los
que están guardadas en disco. Actualizar la librería es reemplazar este archivo
por el `dist/index.mjs` de la nueva versión; si cambiara la lista de muestras de
`LAYERS`, hay que volver a correr `node scripts/fetch-piano-samples.mjs`.
