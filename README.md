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
- Cuestión abierta que condiciona lo siguiente: issue
  [#16](https://github.com/felipeescandon-ship-it/mis-36-piano/issues/16) — `src/` está
  probado pero no se ejecuta en producción
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

## El motor nuevo se comprueba en producción, pero todavía no la reproduce

Los contratos, el migrador heredado, la comparación canónica, la persistencia local
en estado `shadow`, el motor de reproducción de la Entrega 1 y el constructor de
acordes de la Entrega 2 viven en `src/`.

**Las vistas siguen siendo las heredadas.** Tocar, Letra, Editar y Práctica corren
sobre el código de `index.html`; ningún usuario oye ni ve nada producido por `src/`,
y las tres banderas de `src/config/features.js` siguen apagadas —
`test/safety.test.js` lo verifica en cada ejecución.

Lo que sí existe desde agosto de 2026 es una puerta:

```
https://mis-36-piano.vercel.app/?motor=universal
```

Con ese parámetro, y solo con él, `index.html` importa `src/`, migra la canción en
memoria, comprueba la equivalencia canónica contra los datos que sirve producción y
publica el resultado en `window.mis36EquivalenceReport` y en la consola. No cambia
nada de lo que se ve ni se oye.

Sin el parámetro no se descarga un solo archivo de `src/`: el bloque sale antes de
importar nada. Verificado en navegador con cero peticiones a `src/`.

Importa porque `test/migration.test.js` comprueba la equivalencia contra un fixture
congelado, y la canción publicada no está congelada — el editor la reescribe y la
nube la sincroniza. La comprobación en vivo detecta desviaciones que el fixture no
puede ver.

Queda pendiente la decisión de fondo del issue #16: cuándo las vistas dejan de
consumir el código heredado y pasan a consumir el motor. Este paso no la toma; hace
que deje de ser una decisión a ciegas.

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
