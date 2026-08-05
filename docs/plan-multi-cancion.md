# Plan: cancionero personal multi-canción

Este documento registra el plan acordado para expandir "Mis 36 · piano" de una
app de una sola canción a un cancionero personal con varias canciones, sin
perder nada de lo que ya funciona hoy en producción. Es un plan de diseño, no
código: ninguna fase descrita acá se ha ejecutado todavía.

## Objetivo

Convertir la app actual en un cancionero personal de varias canciones,
manteniendo "Mis 36" funcionando exactamente como hoy. Flujo principal una vez
completo:

```
Buscar canción → copiar con acordes → pegar → revisar → guardar → practicar
```

Las canciones y sus ediciones se sincronizan entre dispositivos vía Vercel
Blob, igual que hoy hace `api/song-sync.js` con los ajustes de "Mis 36".

## Decisiones de alcance ya tomadas

- Es una app personal (para un solo usuario), aunque sigue públicamente
  accesible en producción.
- No habrá usuarios, cuentas ni PIN. Riesgo aceptado: cualquiera con la URL
  podría editar el catálogo. Se compensa con revisiones recuperables en Blob,
  deshacer inmediato al borrar, y exportación/importación completa como
  backup manual.
- Las canciones nuevas se agregan copiando y pegando letra con acordes desde
  internet, con un importador dentro de la app. Queda además una vía de
  escape manual (agregar el objeto de la canción directamente) para formatos
  que el parser no cubra.
- Todas las canciones tendrán las cuatro vistas actuales: Tocar, Letra,
  Editar, Práctica — con el mismo nivel de detalle que "Mis 36" (inversiones,
  práctica cronometrada, etc.).
- La sincronización en la nube es **por canción** (documento y revisión
  propios), no un único documento combinado.
- El sonido de "Mis 36" (Salamander Grand Piano V3, dinámica, sustain, ataque
  escalonado, compresión/reverberación, y los 12 voicings actuales) es
  intocable. No se reemplaza por un motor genérico.

## Hallazgos del código actual (contexto para las fases)

- `index.html` (~2700 líneas) concentra datos musicales, interfaz,
  reproducción y persistencia; `api/song-sync.js` valida y guarda un único
  documento en Vercel Blob.
- La letra/acordes de "Mis 36" están en `sections` (armado con
  `makeSection`), hardcodeado.
- Los voicings de piano (`voicings`, `voicingVariants`, `defaultInversions`,
  línea ~899) están **escritos a mano**, no calculados por fórmula: mano
  izquierda = fundamental grave, mano derecha = tríada en posición cerrada
  (dedos 1-3-5), con una inversión elegida por acorde y spellings enarmónicos
  manuales donde hace falta (`C#` usa la nota "F" pero se escribe "E#").
- Historial de git: los 12 voicings ya estaban completos en el primer commit
  del archivo. Los únicos cambios posteriores fueron dos correcciones
  cosméticas de ortografía enarmónica. No hubo un proceso de prueba-y-error
  por oído a lo largo de muchos commits — se construyeron de una sola vez
  aplicando teoría musical estándar (fundamental + calidad + inversión
  elegida por voice-leading).
- `api/song-sync.js` ya implementa control de conflictos por revisión
  (`baseRevision` vs `revision` actual → `409 revision_conflict` salvo
  `force:true`) y guarda un historial inmutable de cada escritura
  (`history/<timestamp>-<revision>.json`, nunca se sobreescribe). Este
  mecanismo se reutiliza, no se rediseña.
- Las claves de `localStorage` (`mis36-song-sync-v1`, `mis36-cloud-revision`,
  etc.) y las rutas de Blob (`mis36/current.json`) están hardcodeadas al
  nombre de esta canción.

---

## Parte A — Plan general (catálogo, importador, sincronización)

### Fase 0 — Línea base de regresión

Checklist que se re-verifica manualmente al final de cada fase siguiente:

- Reproducción y seguimiento actuales.
- Presentación de letra y acordes.
- Edición de acordes y posiciones.
- Modo Práctica.
- Ajustes existentes (notación, teclado, sustain, etc.).
- Persistencia en `localStorage`.
- Sincronización actual con Vercel Blob.
- Funcionamiento móvil y de escritorio (Safari e iPad incluidos).

### Fase 1 — Modelo genérico de canción

Schema común para toda canción:

- `id`, `title`, `artist`, `originalKey`.
- `sections[]`: nombre + líneas de letra + eventos de acorde (posición,
  línea, ancla, beats, inversión).
- Líneas instrumentales sin letra.
- `sourceText`: texto original pegado (o `null` para canciones semilla).
- `createdAt`, `updatedAt`, `revision`.

Los acordes se guardan tal como llegan (`G4`, `F7M`, `C/E`, `Bm7b5`...), sin
normalizar a una lista fija. Las cuatro vistas se refactorizan para leer de
una `currentSong` genérica en vez de la constante `sections` actual — sin
cambio visual todavía.

"Mis 36" queda como **canción semilla**: su definición vive en el código
(fallback y referencia), pero deja de ser la fuente única de canciones — se
copia al catálogo dinámico en la Fase 3.

### Fase 2 — Biblioteca de voicings curados

Ver Parte B de este documento (plan detallado y ya recortado). Resumen: se
extrae la biblioteca actual intacta y se expande por duplicación +
transposición + aprobación manual, nunca por generación algorítmica
silenciosa.

### Fase 3 — Migración de "Mis 36" y catálogo dinámico

- "Mis 36" se convierte al schema de la Fase 1 y se copia como primera
  entrada del catálogo.
- Claves de estado renombradas a un prefijo neutral versionado
  (`piano-song:*`), namespaceadas por `songId`.
- Migración automática: si existen las claves viejas y no las nuevas, se
  copian una sola vez.
- Selector de canción en el header. La app abre la última canción usada, o
  "Mis 36" la primera vez.
- **Ajustado tras revisión de Fase 4:** el catálogo entregado en esta fase
  todavía solo ordena canciones que existen como constante en el HTML
  (`loadCatalog()` descarta cualquier id ajeno a `SONGS`) — no es aún fuente
  de verdad real. Ese salto (aceptar canciones que solo existen en
  almacenamiento) se hace recién en la Fase 4, junto con el cambio de
  formato de sincronización que lo hace posible. También se corrigió en esta
  base un bug de mutación: `sections` pasó de ser la misma referencia que la
  semilla de "Mis 36" (mutada en sitio en cada sesión) a un clon de trabajo
  por canción (`cloneSongSections`), para que cambiar de canción y volver no
  arrastre estado de una sesión de edición anterior.

### Fase 4 — API genérica y catálogo real (sin listas blancas por canción)

- El documento sincronizado deja de ser un **diff de overrides** contra una
  canción hardcodeada (formato `songSync` actual, ilegible sin el código) y
  pasa a ser **la canción completa**: `{id, title, artist, originalKey,
  sections:[{name, lines, events}], sourceText, revision, updatedAt}`. Este
  cambio es el que permite que la Fase 6 (importador) guarde canciones que no
  existen en el HTML, sin inventar un segundo formato ni migrar el primero.
- `SONGS` pasa a ser semilla de solo lectura; el catálogo persistido
  (`loadCatalog()`) acepta canciones que solo existen en `localStorage`/Blob.
- `api/song-sync.js` deja de depender de `SECTION_LINE_COUNTS`/
  `ALLOWED_CHORDS` fijos. Valida **estructura** derivada del propio
  documento (tipos, límites de tamaño, rangos numéricos, símbolo de acorde
  como string acotado en largo y charset), no una lista cerrada de
  contenido conocido.
- Cada canción: documento propio (`songs/<songId>/current.json` +
  `songs/<songId>/history/...`), y el `PUT` escribe de verdad `current.json`
  en cada guardado — hoy solo escribe en `history/` y cada lectura lista el
  prefijo completo para encontrar el blob más reciente, un costo que crece
  sin límite con la cantidad de guardados históricos.
- Conflictos por revisión: se extiende el mecanismo que ya existe hoy, por
  canción individual.
- Fallback de lectura: si `songs/mis-36/current.json` no existe, se lee
  `mis36/current.json` (ruta actual en producción, formato diff viejo) y se
  convierte a canción completa aplicando los overrides sobre la semilla, sin
  tocar el blob viejo.

**Implementado.** Notas de la implementación real:

- El documento completo quedó con forma `{version:5, sections:[{name,
  lines, events:[{uid,chord,inversion,line,anchor,beats}]}]}` — más simple
  que lo bosquejado arriba: no lleva `id`/`title`/`sourceText` todavía
  porque el catálogo real (canciones que solo viven en almacenamiento) sigue
  sin construirse; eso se retoma cuando exista el importador (Fase 6), que
  es quien de verdad necesita guardar esos campos.
- La conversión del formato legado (`mis36-cloud-v1` → documento completo)
  se hace **en el cliente**, no en el servidor: el servidor solo sirve el
  blob viejo tal cual si no existe el nuevo (`api/song-sync.js` no sabe
  interpretar diffs, nunca tuvo la letra/estructura para hacerlo). El
  cliente decide el formato por el campo `format` de la respuesta y
  normaliza con `validatedCloudDocument`.
- `loadCatalog()` **no** se tocó en esta fase — sigue aceptando solo
  canciones que existen como constante en `SONGS`. Confirmado al revisar el
  código: la única pieza real que bloqueaba tratarlo como "hecho" en la
  Fase 3 era el formato de sincronización (ya resuelto acá); el catálogo en
  sí no tenía ninguna canción real que aceptar todavía. Se deja para la
  Fase 6, cuando el importador exista y produzca canciones sin entrada en
  el HTML.
- Verificado con un servidor mock: guardado/carga por canción aislados (dos
  canciones no se pisan), conversión del formato legado con
  revalidación idempotente, exportar/importar archivo en ambos formatos
  (v2 documento completo y v1 diff viejo), y sincronización automática al
  abrir la app en un "segundo dispositivo" (localStorage vacío + nube ya
  poblada).

### Fase 5 — Sincronización del catálogo

- Documento propio en Blob para el manifiesto: lista de `{songId, title,
  artist, originalKey, order, revision, updatedAt, deleted}`.
- Al abrir la app: mostrar catálogo local → consultar manifiesto en la nube →
  traer canciones nuevas/actualizadas → guardar localmente.
- Estados visibles: "Guardado", "Sincronizando", "Sin conexión".
- Borrado suave (`deleted:true` en el manifiesto) + deshacer inmediato
  (toast). Sin papelera navegable en v1.

### Prerrequisito de la Fase 6 — acordes pendientes, sin caída

Al empezar a construir el importador se confirmó un hallazgo crítico: la app
**no tenía ningún camino de degradación** para un acorde fuera de la
biblioteca curada. `resolveVoicing()` asumía siempre `voicings[chord]`
presente; con un acorde desconocido lanzaba `TypeError` sin captura en
`render()`, y los validadores del cliente descartaban o rechazaban esos
eventos en silencio. El criterio de éxito #3 de este plan ("degrada
elegantemente") era aspiracional, no implementado — y el criterio #2 pide
justamente probar con una canción real que use acordes que "Mis 36" nunca
tocó, el escenario que rompía la app.

**Implementado como prerrequisito, antes del parser:**

- `resolveVoicing(chord,inversion)` devuelve un objeto "pendiente"
  (`{l:null,r:[],inv:"",inversion:"root",pending:true}`) en vez de explotar
  cuando el acorde no está en `voicings`/`voicingVariants`. Único punto de
  cambio que cubre casi todos los sitios de lectura (teclado, notas,
  digitación), porque todos consumen su forma `{l,r,inv}`.
- `playChord` ve `pending` y no reproduce nada, pero respeta los `beats` del
  evento — el resto de la canción no se desincroniza, el silencio ocupa
  exactamente el lugar del acorde que falta.
- `chordText`, `noteText`, `keyHint` devuelven el símbolo original o un
  marcador neutro (`"—"`) en vez de la cadena `"undefined"`.
- Los validadores del cliente (`applyFullDocument`, `applyLegacyDiff`,
  `validatedSongDocument`) dejan de exigir pertenencia a la biblioteca:
  solo exigen que el símbolo tenga forma válida (mismo patrón que ya usaba
  el servidor desde la Fase 4) y que la inversión sea una de las tres reales
  (`root`/`first`/`second`, con `"root"` como default seguro). Un acorde
  pendiente sobrevive guardar, cargar, sincronizar y exportar sin perderse.
- Marcado visible: en la vista Letra el botón del acorde pendiente se ve con
  borde ámbar y la palabra "pendiente"; en la guía de Práctica y en el
  detalle de acorde se explica que ese cambio no se puede practicar/sonar
  todavía, en vez de mostrar datos vacíos sin explicación.
- Descartado deliberadamente: generar un voicing por fórmula para acordes
  desconocidos. Resolvería el silencio, pero contradice dos decisiones ya
  tomadas ("no se reemplaza por un motor genérico", "nunca por generación
  algorítmica silenciosa" en la Parte B) y haría sonar acordes nunca
  aprobados por oído.
- Verificado: `resolveVoicing`/`chordText`/`render`/`playChord` con un
  acorde inventado no lanzan error; el acorde pendiente sobrevive
  guardado→recarga y sincronización entre "dos dispositivos" sin
  descartarse; `verifyVoicingLibraryIntegrity()` sigue pasando (los 12
  originales, intactos); un acorde ya aprobado (`E`) resuelve exactamente
  igual que antes del cambio.

### Fase 6 — Importador (copiar y pegar, acotado)

Cobertura v1, en orden de prioridad:

1. Acordes encima de la letra (alineación por columnas).
2. Acordes inline `[C]palabra`.
3. Progresiones instrumentales sueltas.
4. `Tono: X`, secciones entre corchetes, limpieza de marcas de formato
   (`**C**`).

El detector es un borrador, no tiene que ser perfecto — `sourceText` se
guarda siempre para comparar contra la interpretación.

**Implementado**, junto con la Fase 7 en una sola entrega (como preveía el
orden de ejecución). Notas de la implementación real:

- **Catálogo dinámico real, resuelto acá** (quedaba pendiente de la Fase 4):
  `SONGS` sigue siendo semillas de solo lectura; una canción importada vive
  enteramente en `dynamicSongs` (metadata: título/artista/tonalidad/
  `sourceText`) + su documento completo v5 en la misma clave de
  sincronización que usa cualquier canción (`piano-song:<id>:sync-v1`). No
  hizo falta una semilla en código: el documento completo *es* la canción.
  `songMeta`/`songExists` unifican ambos orígenes en el resto del archivo.
  `loadCatalog()` ahora sí acepta y persiste ids que solo viven en
  almacenamiento.
- El parser (`parseSongText`) cubre las 4 prioridades. Encontró un bug real
  durante las pruebas: el patrón de acorde permisivo (necesario para aceptar
  símbolos reales como `Bm7b5` o `D7M`) también hacía matchear palabras
  cortas como "Coro" o "Final" (`C`+`oro`, `F`+`inal`), rompiendo la
  detección de encabezados de sección. Se resolvió con un segundo patrón
  más estricto (`SOLO_CHORD_TOKEN_PATTERN`, limitado a calidades de acorde
  reales conocidas) usado solo para decidir si una línea `[Palabra]` sola es
  un acorde suelto entre corchetes o un encabezado — el patrón permisivo
  se sigue usando donde el contexto ya desambigua (línea entera de acordes,
  o `[C]` pegado a una palabra).
- Un acorde que el parser detecta pero que la biblioteca no reconoce se
  guarda como pendiente (Prerrequisito de arriba) — nunca bloquea ni
  descarta la importación.
- **Fase 7 simplificada deliberadamente:** en vez de construir una vista de
  revisión paralela, el flujo de guardado abre la canción importada
  directamente en el editor ya existente (Letra + "Editar acordes y letra")
  — reasignar secciones, mover/cambiar/añadir/quitar acordes y corregir
  letra ya son cosas que ese editor sabe hacer. Lo que sí es nuevo es la
  vista previa *antes* de guardar (`#importPanel`): confirmar
  título/artista/tonalidad, ver el conteo de acordes detectados separados
  en "pendientes" vs "ya en la biblioteca", y un vistazo a las primeras
  líneas de cada sección. `sourceText` se guarda siempre en
  `dynamicSongs[id].sourceText`, aunque todavía no hay una UI para volver a
  mostrarlo en paralelo del editor — eso se agrega después si hace falta en
  la práctica.
- Verificado con un servidor mock: análisis con texto vacío y sin título
  (mensajes claros, sin guardar nada); colisión de título con "Mis 36" →
  `mis-36-2` sin pisar la canción original; guardado→apertura en modo
  edición sin errores; sincronización con la nube de una canción importada
  (antes solo sincronizaba "Mis 36"); acorde pendiente detectado y marcado
  visualmente en la vista Letra de la canción recién importada.
- **Limitación conocida, heredada de que la Fase 5 no existe todavía:** el
  catálogo (`piano-catalog-v1`) es local a cada dispositivo. Una canción
  importada en un dispositivo no aparece automáticamente en otro hasta que
  la Fase 5 (manifiesto sincronizado) exista — su documento sí sincroniza
  desde ya, solo falta que el catálogo lo anuncie.

### Fase 7 — Revisión visual antes de guardar

Vista de edición previa: confirmar título/artista/tonalidad, revisar y
reasignar secciones, mover/cambiar/añadir/quitar acordes, corregir letra, ver
`sourceText` en paralelo. Nada entra al catálogo sin pasar por acá.

**Implementado junto con la Fase 6** (ver notas arriba) — reutilizando el
editor existente en vez de una vista paralela, con la vista previa del
importador cubriendo la confirmación de título/artista/tonalidad y el
resumen de acordes antes de guardar.

### Fase 8 — Red de seguridad mínima

- Confirmación antes de borrar una canción.
- Deshacer inmediato al borrar.
- Exportar/importar el cancionero completo como JSON.

Queda explícitamente fuera de v1: historial navegable de versiones con UI de
restaurar, papelera con recuperación tardía. El historial en Blob ya se
genera solo; la UI para navegarlo se agrega después si hace falta en la
práctica.

### Fuera de la v1

Importar desde URL, buscar canciones desde la app, cuentas/permisos,
compartir individualmente, edición colaborativa, reconocimiento por audio,
interpretación por IA, compatibilidad universal con cualquier sitio de
acordes, UI de merge para conflictos multi-dispositivo.

### Criterio de éxito de la v1

1. "Mis 36" funciona igual, con voicings idénticos a los actuales.
2. Se pega una canción real con acordes que "Mis 36" nunca usó.
3. La biblioteca de acordes los reproduce, o degrada elegantemente si alguno
   no está aprobado todavía.
4. El importador detecta razonablemente secciones/letra/acordes; se corrige
   el resto en la revisión previa.
5. Se guarda **a través del importador** (no cargada a mano) — aparece en el
   catálogo, se practica con las cuatro vistas.
6. Se abre otro dispositivo: la canción aparece vía el manifiesto
   sincronizado.
7. Un fallo de importación o de sync no borra nada irrecuperable.

### Orden de ejecución (Parte A)

```
Fase 1 (schema + refactor de vistas)
→ Fase 2 (biblioteca de acordes, ver Parte B)
→ Fase 3 (migración + catálogo dinámico)
→ Fase 4 (API genérica)
→ Fase 5 (sync del catálogo)
→ Fase 6 + 7 (importador + revisión, una sola entrega)
→ Fase 8 (red de seguridad mínima)
```

---

## Parte B — Biblioteca de acordes (plan detallado, versión recortada)

### Fase 1 — Congelar la biblioteca actual

Los 12 voicings de "Mis 36" se marcan como aprobados y protegidos, sin
tocarlos: nota de mano izquierda, notas y dedos de mano derecha, variantes,
inversión predeterminada, spellings especiales. Se guarda una copia de
referencia (snapshot) para detectar cualquier modificación accidental.

**Resultado esperado:** "Mis 36" suena exactamente igual antes y después de
extraer la biblioteca.

### Fase 2 — Elegir el repertorio real

Reunir las canciones concretas que se quieren agregar (no una lista
hipotética). De cada una extraer tonalidad, acordes usados, frecuencia de
cada uno, slash chords, alias de nomenclatura (`F7M`/`Fmaj7`). Armar una
lista única priorizada por frecuencia, por ejemplo:

```
Acorde              Apariciones
C                    48
Am                   37
Fmaj7 / F7M          19
Gsus4 / G4           14
C/E                  11
Bm7b5                 3
```

**Meta:** cubrir 80-90% de las apariciones del repertorio elegido, no todos
los acordes teóricamente posibles. Esta lista es la única fuente de qué
construir; no hay taxonomía pre-declarada de familias a llenar.

### Fase 3 — Expandir según el repertorio elegido

No hizo falta construir una herramienta interna de taller: los 9 acordes de
KM0 (Fase 4 original, ver historial de commits) se agregaron directamente en
`voicings`/`voicingVariants`/`defaultInversions`, verificando cada uno por
aritmética de semitonos contra un acorde ya aprobado de la misma familia
antes de escucharlo. El proceso real, por acorde de la lista de la Fase 2 en
orden de frecuencia:

1. Identificar su calidad exacta.
2. Elegir un acorde aprobado de la misma familia (o, si es la primera vez que
   aparece esa familia, construirlo desde cero por teoría estándar, igual
   que se hizo con los 12 originales).
3. Duplicar y transponer por aritmética de semitonos, a mano.
4. Ajustar registro, octavas, reparto entre manos.
5. Escucharlo tocando la canción real donde aparece (la aprobación aislada o
   en progresiones sueltas queda como paso opcional, no obligatorio).
6. Aprobarlo → queda disponible para toda la biblioteca (con su alias si
   corresponde).

Una propuesta nunca sobrescribe un voicing aprobado; para cambiarlo se crea
una variante nueva. No se construyen acordes que el repertorio elegido no
use.

### Fase 4 — Variantes (solo bajo demanda)

Cada acorde tiene una variante principal obligatoria. Se agrega una segunda
variante (conducción cercana) solo si una canción real la necesita.
Variantes adicionales, solo si otra canción real lo exige. Nunca se
construyen variantes especulativas.

### Criterios de aprobación

Un voicing se aprueba solo si:

- Contiene las notas esenciales del acorde y el bajo correcto.
- No suena turbio en el registro grave ni excesivamente agudo en la mano
  derecha.
- Se mantiene dentro del rango donde las muestras del piano suenan
  naturales.
- No cruza las manos accidentalmente y es razonablemente tocable.
- Enlaza bien con los acordes vecinos y suena coherente con "Mis 36" (mismo
  piano, sustain, dinámica, reverberación).
- Se verificó por aritmética de semitonos contra un acorde ya aprobado de la
  misma familia, y se escuchó tocando la canción real donde aparece (no hace
  falta un paso previo aislado si la canción real ya lo confirma).

### Definición de "listo" (Parte B)

1. Los 12 voicings originales siguen intactos (verificado contra el
   snapshot).
2. La biblioteca cubre 80-90% de las apariciones del repertorio elegido.
3. Al menos una canción nueva se puede reproducir completa de principio a
   fin.
4. Los acordes faltantes se pueden agregar después, con el mismo proceso
   puntual de la Fase 4.
5. Ningún cambio afectó el motor de audio actual.

### Orden de ejecución (Parte B)

```
Congelar los 12 originales
→ elegir repertorio real y priorizar por frecuencia
→ expandir solo lo que el repertorio pide, por orden de frecuencia
  (aritmética de semitonos + escuchar en la canción real)
→ variantes solo si una canción real lo exige
```

---

## Riesgo de seguridad aceptado

Sin PIN, con URL pública: cualquiera que la encuentre podría editar o borrar
el catálogo. Se compensa con revisiones recuperables en Blob, deshacer
inmediato al borrar, y export/import completo como backup manual. Riesgo
consciente, no accidental.
