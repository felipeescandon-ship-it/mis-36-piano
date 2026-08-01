# Entrega 2 · Especificación de interfaz del constructor de acordes

Rol de diseño: Javier
Actualizado: 1 de agosto de 2026

Este documento define la interfaz del constructor de acordes con el detalle necesario
para implementarla sin inventar decisiones. Sustituye a la versión anterior, que
enumeraba sus propios apartados en lugar de contenerlos.

## Principio rector

El constructor no es una pantalla nueva del producto: es la misma aplicación
haciendo una tarea más. Todo lo que aquí se especifica reutiliza componentes,
colores y medidas que ya existen en `index.html`. No se introduce ningún token
nuevo salvo los tres que se declaran explícitamente en el apartado 2.4.

La razón es concreta. El usuario ya aprendió a leer el teclado de la vista Tocar por
color. Si el constructor usa otra convención, ese aprendizaje se rompe en la misma
sesión.

---

## 1 · Corrección de la especificación anterior

La versión previa de este documento proponía esta paleta de manos:

```
Mano L: #3B82F6 (azul)   Mano R: #EF4444 (rojo)   Ambas: #8B5CF6 (púrpura)
```

**No debe usarse.** Contradice la convención vigente de la aplicación, donde el azul
es la mano derecha. Implementarla habría hecho que el mismo color significara cosas
distintas en dos vistas contiguas.

La convención real, definida en `index.html` y explicada al usuario en la leyenda
(`index.html:698-704`), es:

| Concepto | Blancas | Negras y digitación | Origen |
|---|---|---|---|
| Mano izquierda | `linear-gradient(#dcfce7,#85d6a9)` | `--green` `#168447` | `index.html:113,116,123` |
| Mano derecha | `linear-gradient(#dbeafe,#92c5fa)` | `--blue` `#155fc0` | `index.html:114,116,123` |
| Vista previa | `linear-gradient(#fff0cc,#f7c66a)` | `--amber` `#925000` | `index.html:115,116,123` |

No existe estado «ambas manos»: una nota pertenece siempre a una mano. El púrpura
propuesto no tiene referente en el modelo de datos — `ChordBuilder.addNote()` recibe
un único `hand`.

Los breakpoints anteriores (576 / 992 px) tampoco coincidían con la aplicación, que
corta en 900 / 760 / 600 px (`index.html:322,335,339`).

---

## 2 · Tokens

### 2.1 Heredados sin cambios

```css
--bg:#f4f7fb    --panel:#fff     --ink:#152033    --muted:#526178
--blue:#155fc0  --blueSoft:#dbeafe
--green:#168447 --greenSoft:#dcfce7
--amber:#925000 --amberSoft:#fff0cc
--line:#d8e0ec  --navy:#071a33   --focus:#0b6ff4
--shadow:0 12px 30px rgba(18,40,75,.10)
```

### 2.2 Tipografía

Familia: `Inter, system-ui, -apple-system, "Segoe UI", sans-serif`.

| Uso | Tamaño | Peso |
|---|---|---|
| Nombre del acorde en construcción | `clamp(34px,5vw,48px)` | 900 |
| Título de sección del panel | 18px | 800 |
| Etiqueta de control | 13px | 800 |
| Texto de apoyo y descripciones | 14px | 650 |
| Nota dentro de una ficha | 15px | 850 |
| Metadato secundario | 12px | 750 |

Los pesos altos no son decorativos: la aplicación se lee sobre un atril, a distancia
de brazo, con poca luz.

### 2.3 Medidas

- Objetivo táctil mínimo **44 × 44 px**, sin excepciones (`index.html:76`).
- Radio: 11 px en controles, 20 px en tarjetas, 13 px en fichas de nota.
- Escala de espaciado: 4 / 8 / 12 / 16 / 22 px.
- Foco: `outline:3px solid var(--focus); outline-offset:3px`. No se sustituye por
  sombras ni cambios de fondo.

### 2.4 Tokens nuevos

Tres, y solo porque el constructor tiene estados que la aplicación actual no
representa:

```css
--slotEmpty:#f3f6fa      /* hueco de nota todavía sin asignar */
--libraryTint:#eef2f7    /* fondo de fila de voicing de Biblioteca (apartado 9) */
--dangerSoft:#fee2e2     /* ya existe como literal en .danger; se nombra */
```

---

## 3 · Anatomía y comportamiento responsive

El constructor es una **hoja modal sobre la vista actual**, no una pestaña más del
conmutador. La tarea tiene principio y fin —se guarda o se descarta—, y sacar al
usuario de la canción le haría perder el contexto de para qué estaba creando la
posición.

### 3.1 Contenedor

```
Desktop / iPad horizontal (> 900px)
┌────────────────────────────────────────────────────┐
│ ▓ Cabecera: nombre del acorde + cerrar             │
├──────────────────────────┬─────────────────────────┤
│ Columna A (fundamental,  │ Columna B (notas de la   │
│ cualidad, bajo)          │ posición)                │
│ 40%                      │ 60%                      │
├──────────────────────────┴─────────────────────────┤
│ ▓ Teclado (colapsado por defecto)                  │
├────────────────────────────────────────────────────┤
│ ▓ Pie: [Escuchar] ······· [Cancelar] [Guardar]     │
└────────────────────────────────────────────────────┘
max-width:1040px · border-radius:20px · box-shadow:var(--shadow)
```

```
≤ 900px — una sola columna, mismo orden vertical: A, B, teclado, pie
≤ 600px — hoja a pantalla completa, sin radio, pie fijo al fondo
```

El pie **nunca** hace scroll con el contenido: en móvil queda fijo con
`position:sticky;bottom:0` y fondo `--panel` con borde superior `--line`, para que
Guardar esté siempre alcanzable con el pulgar.

### 3.2 Reserva de espacio

La cabecera muestra el nombre del acorde en construcción, que cambia de longitud
según se elige cualidad y bajo (`Do` → `Do Mayor` → `Do Mayor (Sol/Do)`). Reserva
dos líneas de altura desde el inicio. Si el bloque crece al elegir el bajo, todo lo
de abajo salta.

---

## 4 · Selector de fundamental

Rejilla de 12 celdas que replica la disposición del teclado, no una lista alfabética.
El usuario piensa en teclas, no en orden de diccionario.

```
      ┌───┐ ┌───┐       ┌───┐ ┌───┐ ┌───┐
      │Do#│ │Re#│       │Fa#│ │Sol│ │La#│
      └───┘ └───┘       └───┘ └───┘ └───┘
    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
    │Do │ │Re │ │Mi │ │Fa │ │Sol│ │La │ │Si │
    └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
```

- Celda: 44 × 44 px mínimo, radio 11 px.
- Blancas: fondo `--panel`, borde `--line`. Negras: fondo `--ink`, texto `--panel`.
- Seleccionada: fondo `--blue`, texto blanco, `box-shadow:0 4px 12px rgba(21,95,192,.24)`
  — el mismo tratamiento que el conmutador de vista ya usa (`index.html:.view-switch button[aria-pressed="true"]`).
- El nombre respeta la notación activa (española / inglesa) del ajuste global. El
  constructor **no** añade su propio conmutador de notación.

`role="radiogroup"` con `aria-label="Fundamental"`; cada celda es un
`button role="radio"` con `aria-checked`.

---

## 5 · Selector de cualidad

Seis cualidades base siempre visibles; tres extendidas tras un desplegable.

```
[ Mayor ] [ menor ] [ 7 ] [ maj7 ] [ m7 ] [ sus4 ]
                                    ▸ Más cualidades (3)
```

Al expandir: `[ dim ] [ m7b5 ] [ aug ]`.

La separación no es arbitraria: el equipo confirmó que las seis primeras cubren más
del 90 % del uso. Mostrar nueve de golpe hace que las seis frecuentes parezcan tan
raras como `m7b5`.

- Fichas de 44 px de alto, ancho según contenido, `padding-inline:16px`.
- Estado seleccionado idéntico al del apartado 4.
- El desplegable conserva su estado abierto durante la sesión, no entre sesiones.

---

## 6 · Bajo alternativo

Opcional y **colapsado por defecto**. Es la excepción, no la norma.

```
☐ Bajo distinto de la fundamental
```

Al marcar, aparece la misma rejilla de 12 del apartado 4, con una etiqueta que
explica el resultado en lugar de nombrar el concepto:

> Sonará `Sol` en el bajo con el acorde de `Do Mayor`.

El nombre en cabecera pasa a `Do Mayor (Sol/Do)`, que es el formato que ya produce
`selectChordName()` en `ChordSelectors`. La interfaz no inventa un formato propio.

Si el bajo elegido coincide con la fundamental, la casilla se desmarca sola y se
muestra el mensaje: *"Ese ya es el bajo del acorde"*. No es un error: es información.

---

## 7 · Construcción de la posición

### 7.1 El teclado es el campo de entrada

Se descarta el patrón de tres desplegables (nota / octava / mano) que sugería el
borrador funcional. Obliga a traducir mentalmente «la tecla que quiero» a tres
coordenadas, y el usuario ya tiene el teclado delante.

**Interacción:** el usuario elige mano activa, y toca teclas. Cada toque añade o
quita esa nota.

```
Mano activa:  [ ● Izquierda ]  [   Derecha   ]
              verde activo      azul inactivo
```

El conmutador de mano usa el color de su mano cuando está activo. Es el único control
de la pantalla que se colorea a sí mismo, y por eso funciona como leyenda permanente.

### 7.2 Extensión del teclado

De **Si1 a Do7** (MIDI 35–96).

Es el único intervalo que satisface los dos documentos que hoy se contradicen: cubre
el registro de bajo `Si1–La2` que la leyenda de `index.html:716` declara al usuario, y
llega hasta el techo de las muestras de piano. Queda pendiente de confirmación del
pianista (issue #12).

Nota para quien implemente: `docs/09` dice *"Do2 (MIDI 36) a Do7 (MIDI 84)"* y el
roadmap dice 36–96. Son incompatibles — 84 es Do6. Este documento propone 35–96 y la
discrepancia debe resolverse en el issue #12 antes de escribir `validateNote`.

Con 62 teclas el diagrama no cabe en ninguna pantalla. Por eso:

- Contenedor con `overflow-x:auto` (el mismo `.keyboard-wrap` existente).
- Al abrirse, hace scroll automático hasta centrar la octava de la fundamental.
- Anclas de salto sobre el teclado: `[ Si1 ] [ Do3 ] [ Do4 ] [ Do5 ] [ Do6 ]`.
  Son botones de 44 px que desplazan el contenedor, no filtros.

### 7.3 Lista de notas

Junto al teclado, la posición en construcción como fichas legibles sin mirar el
diagrama:

```
Mano izquierda      Mano derecha
┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│  Do2      ⑤  │    │  Mi4      ①  │  │  Sol4     ③  │
│           ✕  │    │           ✕  │  │           ✕  │
└──────────────┘    └──────────────┘  └──────────────┘
 borde verde         borde azul
```

- Ficha: mínimo 44 px de alto, radio 13 px, borde 1 px del color de la mano,
  fondo `--greenSoft` / `--blueSoft`.
- El círculo de digitación reutiliza `.finger`: 25 px, borde blanco de 2 px, fondo del
  color de la mano. Tocarlo abre el selector de dedo (1–5 y «sin dedo»).
- La `✕` es un objetivo de 44 px propio, no un icono de 16 px dentro de la ficha.
- Orden: por altura ascendente dentro de cada mano. No por orden de creación — el
  usuario busca la nota por dónde está, no por cuándo la puso.

### 7.4 Límites

`ChordBuilder` acepta hasta 32 notas. Ese número no es un objetivo: a partir de 5 notas
en una mano, la ficha número 6 aparece con borde ámbar y el texto:

> Seis notas en una mano. Comprueba que sea alcanzable.

Es una advertencia, no un bloqueo — el aviso de «cordura» formal está previsto para E3.
No se impide guardar.

---

## 8 · Teclado colapsado y expandido

Estado por defecto: **colapsado**, mostrando solo las fichas del apartado 7.3 y un
botón `▸ Mostrar diagrama`.

Razón: en iPad vertical el teclado de 62 teclas empuja el pie fuera de la pantalla, y
el usuario que ya sabe qué notas quiere no lo necesita.

- El estado se conserva por dispositivo, igual que la preferencia de notas de la
  vista Letra.
- Expandido, el botón pasa a `▾ Ocultar diagrama`.
- La transición es de altura, 180 ms, `ease-out`, y queda anulada bajo
  `prefers-reduced-motion` (`index.html:179` ya establece ese respeto).

En ≤ 600 px expandir el teclado lo muestra en una capa propia a pantalla completa con
su propio cierre, en lugar de comprimir el resto. Comprimir daría un teclado de 34 px
por tecla dentro de una hoja de 360 px: inutilizable con el dedo.

---

## 9 · Vista previa sonora

Un único botón en el pie: `♪ Escuchar`.

- Deshabilitado mientras `selectIsComplete()` sea falso, con `aria-describedby`
  apuntando a *"Elige fundamental, cualidad y al menos una nota"*.
- Mientras suena: el texto pasa a `■ Detener` y las teclas implicadas se pintan con el
  ámbar de vista previa (`.preview`), no con el color de su mano. Así se distingue
  «esto está sonando ahora» de «esto pertenece a la mano izquierda».
- El fallback a osciladores es **silencioso**: no hay indicador. Decisión ya tomada;
  un aviso de calidad de audio no le sirve de nada a quien está construyendo un acorde.
- Si el contexto de audio está bloqueado, el primer toque lo desbloquea y reproduce.
  No se muestra un aviso previo de «toca para activar el sonido».

---

## 10 · Diálogo de guardado

```
┌─ Guardar posición ─────────────────────────┐
│                                            │
│ Nombre                                     │
│ ┌────────────────────────────────────────┐ │
│ │ Do Mayor                               │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ○ Biblioteca                               │
│   Reutilizable en cualquier canción.       │
│   Editarla después afectará a todas.       │
│                                            │
│ ◉ Solo esta canción                        │
│   No aparecerá en otras canciones.         │
│                                            │
│              [ Cancelar ]  [ Guardar ]     │
└────────────────────────────────────────────┘
```

- **`Solo esta canción` viene preseleccionado.** La opción reversible va por defecto;
  crear en Biblioteca es la decisión con consecuencias fuera de la pantalla actual.
- Radio buttons de 44 px de objetivo, con la descripción dentro del área tocable.
- El nombre se rellena con `selectChordName()` y es editable. Vacío no bloquea:
  al guardar sin nombre se usa el generado.
- No hay borrador automático. Cancelar descarta, y el botón Cancelar no pide
  confirmación: pedirla convierte cada salida en dos decisiones.

---

## 11 · Selector de voicings

Donde se elige una posición existente:

```
[ Todos ▾ ]   ← filtro: Todos · Biblioteca · Solo esta canción

┌────────────────────────────────────────────┐
│ Do Mayor · fundamental      Biblioteca     │  fondo --libraryTint
├────────────────────────────────────────────┤
│ Do Mayor · 2ª posición                     │  fondo --panel
├────────────────────────────────────────────┤
│ Fa Mayor · abierta          Biblioteca     │  fondo --libraryTint
└────────────────────────────────────────────┘
```

- El fondo `--libraryTint` (`#eef2f7`) contrasta 1.06:1 con `--panel`. Es
  deliberadamente sutil: distingue sin jerarquizar. Por eso **nunca va solo** — la
  etiqueta textual «Biblioteca» lo acompaña siempre, para quien no perciba la
  diferencia de fondo.
- La etiqueta usa `--muted` a 12px/750. No es una insignia de color.
- Filas de 44 px mínimo, separadas por `--line`.
- El filtro es un `select` nativo con los estilos existentes. Con menos de 4 posiciones
  guardadas no se muestra: filtrar tres elementos es ruido.

---

## 12 · Confirmación de edición de Biblioteca

Al editar una posición de Biblioteca usada por más de una canción:

```
┌─ Esta posición se usa en 3 canciones ──────┐
│                                            │
│ Al guardar, las tres verán la versión      │
│ nueva.                                     │
│                                            │
│ ○ Actualizar en todas                      │
│ ◉ Crear una copia solo para esta canción   │
│                                            │
│              [ Cancelar ]  [ Continuar ]   │
└────────────────────────────────────────────┘
```

Por defecto, la copia. El modelo ya versiona en lugar de sobrescribir (D-003); la
interfaz debe reflejar esa misma prudencia.

Si la posición se usa en una sola canción, este diálogo no aparece. No hay nada que
advertir.

---

## 13 · Estados

| Estado | Qué se ve |
|---|---|
| Inicial | Fundamental sin elegir; cualidad y notas deshabilitadas y al 55 % de opacidad (`button:disabled` existente) |
| Incompleto | `Escuchar` y `Guardar` deshabilitados, con el motivo en texto junto al pie |
| Completo | Ambos activos |
| Sonando | `■ Detener`; teclas en ámbar |
| Guardando | `Guardar` con texto `Guardando…`, deshabilitado; el resto del formulario sigue legible, no se cubre |
| Error al guardar | Franja `--dangerSoft` sobre el pie con el motivo y `[ Reintentar ]`. Lo construido **no se pierde** |
| Sin posiciones (selector) | *"Todavía no hay posiciones guardadas"* + `[ Crear la primera ]` |

El estado de error no descarta el trabajo. Es la diferencia entre un fallo y una
pérdida.

---

## 14 · Accesibilidad

Requisitos, no aspiraciones:

- Todo objetivo táctil ≥ 44 × 44 px, incluidas la `✕` de las fichas y los círculos de
  digitación.
- Contraste de texto ≥ 4.5:1. Los pares usados (`--ink` sobre `--panel`, `--muted`
  sobre `--panel`, blanco sobre `--blue`, blanco sobre `--green`) ya lo cumplen en la
  aplicación actual.
- **El color nunca es el único portador de significado.** Cada nota indica su mano por
  color *y* por la columna en que aparece *y* por su nombre accesible.
- Nombre accesible de una tecla: `"Mi4, mano derecha, dedo 1. Tocar para quitar."`
- Nombre accesible de una tecla libre: `"Mi4. Tocar para añadir a la mano derecha."`
  El texto refleja la mano activa en ese momento.
- Al abrirse la hoja, el foco va al primer elemento de la rejilla de fundamentales.
  Al cerrarse, vuelve al control que la abrió.
- Foco atrapado dentro de la hoja mientras está abierta; `Esc` cierra con la misma
  semántica que Cancelar.
- Navegación con flechas dentro de la rejilla de fundamentales y del grupo de
  cualidades (patrón `radiogroup`), no tabulación celda a celda.
- Cada cambio de estado del constructor se anuncia por `aria-live="polite"`:
  *"Mi4 añadida a la mano derecha. 3 notas."*

---

## 15 · Movimiento

Escaso y con función:

| Qué | Duración | Curva |
|---|---|---|
| Apertura de la hoja | 200 ms | `cubic-bezier(.2,.75,.3,1)` |
| Expansión del teclado | 180 ms | `ease-out` |
| Aparición de ficha de nota | 120 ms | `ease-out` |

Nada pulsa, nada rebota, nada llama la atención sobre sí mismo. Todo desaparece bajo
`prefers-reduced-motion:reduce`, respetando el bloque que la aplicación ya tiene en
`index.html:179`.

---

## 16 · Lo que este documento no decide

Escrito explícitamente, porque la versión anterior de este archivo dio por
especificado lo que no lo estaba:

1. **El rango exacto de notas.** Se propone Si1–Do7 (MIDI 35–96) por ser el único que
   concilia los documentos existentes, pero requiere confirmación del pianista y
   resolver la contradicción 84/96 — issues #12 y #13.
2. **Dónde se abre el constructor desde la canción.** Este documento define la hoja;
   no define el punto de entrada en la interfaz de canción, porque depende de cómo
   quede la vista de canción de E3.
3. **Etiquetado de inversiones.** Fuera de E2 por decisión previa; el constructor no
   muestra «1ª inversión» en ninguna parte.
4. **Densidad en desktop ancho (> 1240 px).** La hoja se limita a 1040 px y se centra.
   No se ha diseñado un aprovechamiento mayor porque el uso real es en iPad.

Si algo de lo anterior se implementa, no será por seguir este documento.
