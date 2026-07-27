# Piano · biblioteca de canciones y acordes

Aplicación web para aprender, acompañar y practicar canciones en piano. La versión
publicada nació alrededor de **“Mis 36”** y actualmente ofrece vistas para tocar,
seguir la letra, practicar transiciones y corregir la posición de los acordes.

La siguiente etapa del producto es convertir ese reproductor especializado en una
plataforma capaz de:

- guardar y organizar múltiples canciones;
- usar las vistas **Tocar**, **Letra** y **Práctica** con cualquier canción;
- construir acordes y posiciones sin depender de una lista cerrada;
- reutilizar acordes, inversiones, digitaciones y voicings entre canciones;
- conservar una copia local y sincronizar cada recurso con la nube.

## Estado

- Producción: <https://mis-36-piano.vercel.app/>
- Repositorio: <https://github.com/felipeescandon-ship-it/mis-36-piano>
- Aplicación actual: `index.html`
- API actual: `api/song-sync.js`
- Plataforma multicanción: **Entrega 1 en curso; timeline y máquina sin integración visible**

## Documentación

La fuente de verdad para la transformación del producto está en
[`docs/README.md`](docs/README.md).

Documentos principales:

1. [Requisitos de producto](docs/01-REQUISITOS-DE-PRODUCTO.md)
2. [Arquitectura y modelo de datos](docs/02-ARQUITECTURA-Y-DATOS.md)
3. [Migración y reversión](docs/03-MIGRACION-Y-REVERSIÓN.md)
4. [Roadmap](docs/04-ROADMAP.md)
5. [Calidad y criterios de aceptación](docs/05-CALIDAD-Y-ACEPTACION.md)
6. [Decisiones y preguntas abiertas](docs/06-DECISIONES.md)
7. [Entrega 1 · motor universal](docs/07-ENTREGA-1-MOTOR-UNIVERSAL.md)

## Reglas de seguridad

- “Mis 36” y sus ajustes vigentes son la referencia de regresión.
- No sobrescribir ni eliminar el contenido actual de Vercel Blob durante el
  desarrollo de la plataforma.
- No inicializar la nube desde un dispositivo nuevo con datos predeterminados.
- Toda migración debe poder compararse, repetirse sin duplicar datos y revertirse.
- Los cambios de estructura deben probarse en Safari y en iPad antes de llegar a
  producción.
- No modificar datos musicales para probar funciones de infraestructura.

## Arquitectura actual

La aplicación es intencionalmente pequeña:

- `index.html` concentra datos musicales, interfaz, reproducción y persistencia local;
- `api/song-sync.js` valida y guarda una única canción en Vercel Blob;
- `localStorage` conserva ajustes y estados pendientes;
- la nube mantiene revisiones inmutables para resolver conflictos y recuperar datos.

Esta estructura sigue funcionando para una canción, pero no debe ampliarse agregando
más canciones o más listas cerradas dentro de `index.html`. La migración documentada
separa el motor, los datos y la persistencia antes de abrir la biblioteca al usuario.

## Prototipo de Entrega 0

Los contratos, el migrador heredado, la comparación canónica y la persistencia local
en estado `shadow` viven en `src/`. No están importados por `index.html` ni por la API
publicada y las dos banderas de biblioteca permanecen desactivadas.

Para ejecutar las verificaciones:

```sh
npm test
```
