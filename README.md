# Mis 36 · piano

Aplicación web para acompañar, seguir la letra y practicar "Mis 36" en piano.

- Producción: <https://mis-36-piano.vercel.app/>
- Repositorio: <https://github.com/felipeescandon-ship-it/mis-36-piano>
- Aplicación: `index.html`
- API: `api/song-sync.js`

## Vistas

- **Tocar**: reproduce la canción con teclado visual, resaltando la nota y el acorde
  en curso.
- **Letra**: muestra la letra completa con los acordes ubicados sobre cada palabra.
  Puede mostrar u ocultar las notas de la mano derecha junto a cada acorde,
  respetando su inversión y la notación española o inglesa. Utiliza anotaciones
  tipográficas como `Mi | Mi-Sol#-Si`, con el acorde principal azul y la letra
  distribuida en fragmentos musicales adaptables.
- **Editar**: permite ajustar la posición de los acordes sobre la letra.
- **Práctica**: aísla una transición entre dos acordes para repetirla.

## Arquitectura

La aplicación es intencionalmente pequeña:

- `index.html` concentra datos musicales, interfaz, reproducción y persistencia local;
- `api/song-sync.js` valida y guarda los ajustes de la canción en Vercel Blob;
- `localStorage` conserva ajustes y estados pendientes;
- la nube mantiene revisiones inmutables para resolver conflictos y recuperar datos.

## Reglas de seguridad

- Los ajustes vigentes de "Mis 36" son la referencia de regresión.
- No sobrescribir ni eliminar el contenido actual de Vercel Blob.
- No inicializar la nube desde un dispositivo nuevo con datos predeterminados.
- Los cambios de estructura deben probarse en Safari y en iPad antes de llegar a
  producción.
