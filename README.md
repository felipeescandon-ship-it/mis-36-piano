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
- Plataforma multicanción: **Entregas 0 y 1 completas; Entrega 2 integrada en
  `main` salvo su interfaz, ya especificada y pendiente de implementar**
- Pruebas: **137**, ejecutadas automáticamente en cada pull request
- Cuestiones abiertas que condicionan lo siguiente: issues
  [#14 y #16](https://github.com/felipeescandon-ship-it/mis-36-piano/issues)
- Letra heredada: puede mostrar u ocultar las notas de la mano derecha junto a cada
  acorde, respetando su inversión y la notación española o inglesa. Utiliza
  anotaciones tipográficas como `Mi | Mi-Sol#-Si`, con el acorde principal azul y
  la letra distribuida en fragmentos musicales adaptables.

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
8. [Recap y continuidad para E1.3](docs/08-RECAP-Y-CONTINUIDAD.md)
9. [Entrega 2 · constructor de acordes](docs/09-ENTREGA-2-CONSTRUCTOR-ACORDES.md)
10. [Recap de la Entrega 2](docs/10-RECAP-E2-COMPLETA.md)
11. [Interfaz de la Entrega 2](docs/11-E2-INTERFAZ.md) — especificación
    visual completa. Su apartado 16 enumera lo que deliberadamente no decide

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

## El motor nuevo todavía no corre en producción

Los contratos, el migrador heredado, la comparación canónica, la persistencia local
en estado `shadow`, el motor de reproducción de la Entrega 1 y el constructor de
acordes de la Entrega 2 viven en `src/`.

**Nada de eso lo importa `index.html` ni la API publicada**, y las tres banderas
siguen desactivadas; `test/safety.test.js` lo verifica en cada ejecución. Es decir:
`src/` está probado pero no se ejecuta para ningún usuario, y lo que sí corre en
producción son las 2709 líneas de `index.html`.

Es una consecuencia deliberada de migrar por fases, pero el coste crece con cada
entrega: hay dos descripciones de cómo funciona la aplicación y la que está cubierta
por pruebas no es la que usan los usuarios. La decisión de cuándo `index.html`
empieza a consumir `src/` sigue abierta — issue #16.

Para ejecutar las verificaciones:

```sh
npm test
```

## Integración continua

`.github/workflows/test.yml` ejecuta `npm test` en cada pull request y en cada push
a `main`. La suite completa tarda menos de un segundo; el límite de cinco minutos
del workflow está puesto para que una prueba que se cuelgue aparezca como fallo en
lugar de como una espera silenciosa.

Los checks de Vercel que acompañan a cada PR verifican que el sitio compila y se
despliega, **no** que las pruebas pasen. Conviene no confundirlos: una PR llegó a
producción en verde rompiendo tres aserciones porque nadie ejecutaba la suite.

El check `test` es requerido para integrar en `main` y la regla no admite excepciones
para administradores, de modo que un fallo bloquea la integración en lugar de
limitarse a mostrarse. Como consecuencia, `git push` directo a `main` queda
rechazado: el check solo puede ejecutarse después de subir los commits, así que todo
cambio entra por pull request.

Ese check se publica con el nombre `test`, declarado explícitamente en el workflow.
Renombrarlo allí sin actualizar la regla de protección dejaría a `main` esperando
indefinidamente un check que ya nadie publica.
