# Registro de decisiones

Actualizado: 27 de julio de 2026
Estado: decisiones aceptadas y preguntas que deben resolverse antes de su entrega.

## Quién decide

Felipe, en todo. El proyecto lo lleva una sola persona.

### Javier y Fernando no son personas

Conviene decirlo con los nombres, porque siguen apareciendo en el historial de este
repositorio y quien los encuentre pensará que son colaboradores a los que puede
escribir.

Los documentos anteriores repartían las decisiones entre un comité asesor de cinco
integrantes:

| Nombre en los documentos | Qué era |
|---|---|
| **Javier · diseño** | personaje inventado |
| **Fernando · UX** | personaje inventado |
| **El profesor de piano** | personaje inventado |
| **El pianista** | personaje inventado |
| **El experto en UX musical** | personaje inventado |

Ninguno existe. Se crearon durante el desarrollo como puntos de vista con los que
razonar sobre el producto, y los documentos acabaron tratándolos como personas
reales que emitían opiniones, validaban entregas y firmaban decisiones.

Dónde siguen apareciendo, y por qué no se borran: en los mensajes de commit
anteriores al 1 de agosto de 2026, en el nombre antiguo del archivo
`11-E2-WIREFRAMES-JAVIER.md` —hoy `11-E2-INTERFAZ.md`— y en los issues #11 y #14 ya
cerrados. Reescribir el historial para tapar eso sería otra forma del mismo
problema; queda esta nota como explicación.

**La ficción tuvo un coste concreto.** Varias decisiones ya tomadas quedaron
registradas como «pendientes de validación» de alguien que nunca iba a responder, y
el roadmap las trataba como bloqueos externos. La interfaz de la Entrega 2 estuvo
detenida esperando unos wireframes que solo podía escribir quien ya estaba en el
proyecto.

Si en el futuro vuelve a servir razonar desde varios puntos de vista, que sea sin
nombre propio y sin fecha de reunión: un criterio no necesita fingirse persona para
ser útil.

Lo que sí conviene conservar es **qué tipo de criterio** necesita cada decisión
—musical, de interfaz, de producto—, porque eso indica qué hay que comprobar antes
de darla por buena. Las preguntas abiertas de más abajo lo indican en esa columna.

## Decisiones aceptadas

### D-001 · El producto será multicanción

La aplicación actual no se considera terminada como plataforma para repertorio.
“Mis 36” pasa a ser la primera canción de una biblioteca.

Consecuencia: no se siguen agregando canciones como constantes dentro de
`index.html`.

### D-002 · Canción, acorde y voicing son conceptos separados

Un acorde representa identidad armónica. Un voicing representa notas, octavas,
manos y digitación concretas. Una canción utiliza una revisión de ese voicing.

Consecuencia: el usuario puede agregar notas sin inventar una nueva cualidad de
acorde y puede usar varias posiciones para el mismo símbolo.

### D-003 · Las posiciones compartidas son versionadas

Editar un voicing de biblioteca crea una revisión. Las canciones existentes no se
actualizan silenciosamente.

Consecuencia: actualizar repertorio requiere una acción explícita y reversible.

### D-004 · “Mis 36” se migra sin sobrescribir el origen

La primera migración es paralela y reversible. `mis36/` y su historial permanecen
intactos.

Consecuencia: activar la biblioteca y convertir datos son operaciones separadas.

### D-005 · Persistencia local primero

La app confirma el guardado en el dispositivo antes de sincronizar. Los datos
estructurados de biblioteca se moverán a IndexedDB; las preferencias pequeñas
pueden permanecer en `localStorage`.

Consecuencia: la interfaz distingue siempre dispositivo, pendiente, nube y conflicto.

### D-006 · La nube sincroniza por recurso

Canciones, acordes y voicings tienen revisiones independientes.

Consecuencia: un conflicto no reemplaza toda la biblioteca.

### D-007 · Archivar antes que eliminar

La acción normal es archivar. La eliminación definitiva se diseña después de
definir papelera, retención y recuperación.

Consecuencia: P0 no necesita borrado irreversible.

### D-008 · El motor se separa antes del rediseño visual

Reloj musical y renderizado parcial se implementan como infraestructura del
reproductor universal. La identidad cálida y las animaciones llegan después.

Consecuencia: se evita rediseñar componentes que todavía cambiarán de estructura.

### D-009 · La primera versión sigue siendo personal

No se agregan cuentas, permisos ni colaboración en tiempo real.

Consecuencia: el modelo debe permitir una futura propiedad de recursos, pero P0
mantiene la experiencia simple y sin contraseña.

### D-010 · Módulos ES nativos para la fundación

El prototipo de Entrega 0 utiliza módulos ES nativos y el ejecutor de pruebas
incluido en Node. No incorpora un empaquetador mientras los contratos, migradores y
adaptadores puedan compartirse directamente entre navegador y API.

Consecuencia: la aplicación publicada conserva su despliegue actual y el nuevo
código permanece aislado. Antes de integrar la interfaz se prueba la carga modular
en la versión objetivo de Safari; solo se agrega transformación o empaquetado si
esa prueba demuestra una necesidad concreta.

Responsable: Felipe.
Fecha: 27 de julio de 2026.

### D-011 · Un único motor observable

Tocar, Letra y Práctica consumen snapshots inmutables de una única máquina de
reproducción. Las vistas no mantienen colas ni posiciones musicales independientes.

Consecuencia: cualquier divergencia entre vistas se considera un defecto del
adaptador, no se resuelve duplicando estado.

Responsable: Felipe.
Fecha: 27 de julio de 2026.

### D-012 · Tiempo absoluto con reloj inyectable

`AudioContext.currentTime` es la referencia musical en navegador. Timers y
`requestAnimationFrame` despiertan planificación o renderizado, pero no calculan el
progreso acumulando retrasos. En pruebas se inyecta un reloj falso.

Consecuencia: pausa, cambio de tempo y pruebas largas pueden verificarse sin esperar
tiempo real ni acumular deriva.

Responsable: Felipe.
Fecha: 27 de julio de 2026.

### D-013 · Segundo plano produce pausa de sistema

Cuando el documento se oculta, el motor captura evento y pulso y detiene el avance.
Al volver, Safari solicita gesto si el contexto está suspendido. No se promete audio
continuo con la pantalla bloqueada en Entrega 1.

Consecuencia: no se reproducen acordes vencidos en ráfaga y la recuperación es
predecible entre dispositivos.

Fecha: 27 de julio de 2026.

### D-014 · Cambio de canción atómico y generacional

Un agregado nuevo se valida antes de reemplazar el actual. Cada carga incrementa una
generación que invalida callbacks, fuentes de audio y operaciones asíncronas
anteriores.

Consecuencia: un documento inválido no elimina el válido y una canción anterior no
puede reaparecer después del cambio.

Responsable: Felipe.
Fecha: 27 de julio de 2026.

### D-015 · Letra conserva nodos durante reproducción

La hoja se construye una vez por canción. El avance modifica únicamente nodos
anteriores, actuales y siguientes mediante IDs estables.

Consecuencia: se conserva foco, se reduce trabajo de DOM y VoiceOver no recibe una
hoja completa en cada cambio.

Fecha: 27 de julio de 2026.

### D-016 · Tempo editable como override de sesión

El tempo del documento es el valor inicial. Cambiar el control durante una sesión
reancla la posición musical y reprograma el futuro, sin modificar la canción ni el
orden de eventos.

Consecuencia: Entrega 1 no introduce escrituras musicales al ajustar velocidad.

Fecha: 27 de julio de 2026.

### D-017 · Los acordes de Letra son anotaciones tipográficas

En la vista heredada de Letra, el símbolo principal se muestra azul y con mayor
peso; el separador y las notas del voicing permanecen en un nivel gris secundario.
Los acordes inactivos no usan tarjeta, borde ni fondo permanente. El acorde actual
puede recibir un fondo azul suave y una barra lateral.

La letra se organiza en fragmentos musicales adaptables. El ancho de una anotación
no vuelve a separar cada palabra en una columna independiente; cuando falta espacio,
el fragmento completo se reajusta antes de producir superposición. La apariencia
compacta no reduce el objetivo táctil mínimo de 44 × 44 px.

Consecuencia: `Mi | Mi-Sol#-Si` conserva jerarquía musical, continuidad de lectura
y accesibilidad sin convertir la hoja en un tablero de tarjetas. Esta decisión no
forma parte de E1.4 ni conecta el motor nuevo.

Fecha: 27 de julio de 2026.

### D-018 · Las notas del acorde salen visibles por defecto en Letra

La vista Letra muestra las notas del voicing junto a cada acorde sin que el usuario
tenga que pedirlo. El conmutador sigue existiendo y su elección se conserva en el
dispositivo, de modo que quien prefiera la lectura limpia la desactiva una vez.

Esta decisión confirma el comportamiento que ya tenía la aplicación publicada
(`index.html:838`); no cambia código.

Tiene un coste medido y aceptado: cada anotación `Mi | Mi-Sol#-Si` ocupa unos 124 px
de ancho medio y ensancha la celda de la palabra que lleva debajo, así que sobre una
palabra corta quedan unos 100 px muertos y el verso se lee más separado. Con las
notas ocultas ese efecto desaparece.

Se prefiere la información pedagógica: quien abre Letra está aprendiendo la canción,
y descubrir que las notas existen vale más que la fluidez tipográfica de un verso.
Lo contrario obligaría a saber que hay algo que activar.

Consecuencia: la separación de palabras en Letra es un efecto conocido de esta
decisión, no un defecto que reportar. Si alguna vez molesta lo suficiente, la
alternativa registrada es ocultarlas solo por debajo de cierto ancho, donde el
efecto se nota más.

Fecha: 1 de agosto de 2026.

### D-019 · El motor entra en producción como comprobación antes que como reproductor

`index.html` puede alcanzar `src/`, pero solo para comprobarse a sí mismo. Con
`?motor=universal` en la dirección, la aplicación migra la canción en memoria,
compara la equivalencia canónica y publica el informe. Sin ese parámetro no importa
un solo archivo de `src/`.

El orden es deliberado. Conectar las vistas al motor es el cambio grande —reescribe
el bucle central de un archivo de 2709 líneas— y hasta ahora se iba a dar sin haber
ejecutado nunca ese código en un navegador contra los datos reales. Ahora se puede
ejecutar antes de decidir.

También cubre un hueco de las pruebas: `test/migration.test.js` compara contra un
fixture congelado, y la canción publicada no lo está, porque el editor la reescribe
y la nube la sincroniza. La primera ejecución en navegador ya lo demostró: los datos
vivos sin ediciones dan 86 eventos, mientras el fixture da 81 y cinco borrados. Son
consistentes —86 menos 5— pero solo una comprobación en vivo lo enseña.

La bandera `pianoUniversalEngine` sigue apagada y no puede activarse desde la URL:
esto es una comprobación, no un interruptor de producción.

Consecuencia: el issue #16 deja de ser una decisión a ciegas. Sigue abierto lo que de
verdad decide —cuándo las vistas dejan de consumir el código heredado—, pero ya no
hay que tomarlo sin evidencia.

Fecha: 1 de agosto de 2026.

### D-020 · La Entrega 0 queda cerrada

La validación física que faltaba era ejecutar el adaptador IndexedDB `shadow` en
Safari/iPad real. La aceptación de E1.6 la cubrió: se validó en Safari/iPad con
IndexedDB `shadow`, Letra adaptable, VoiceOver, zoom al 200 % y regreso tras bloqueo.

El roadmap seguía marcando «validación física pendiente» en tres sitios por no haber
cruzado ambos registros.

Fecha: 1 de agosto de 2026.

### D-021 · La Entrega 2 queda cerrada

El constructor de acordes tenía núcleo, persistencia y audio integrados desde
julio; faltaba la interfaz. Se implementó el 3 de agosto de 2026: hoja modal
sobre Editar, con punto de entrada en el mismo selector "Nuevo acorde" que ya
usaba "＋ Añadir" — resolviendo el apartado 16.1 de `11-E2-INTERFAZ.md` sin
esperar a la vista de canción de Entrega 3.

Verificado en navegador (Playwright/Chromium): construir un acorde, guardarlo
con ambos alcances, colocarlo en la letra y que sobreviva a recargar la
página. Durante esa verificación apareció un defecto real: el símbolo
generado para un acorde nuevo puede coincidir con uno de los 12 fijos
(`Mi Mayor` produce el mismo `E` que ya existe), y guardarlo por símbolo
sobrescribía silenciosamente el original. Se corrigió identificando cada
acorde por su UUID internamente, separado del texto que se muestra.

Quedan fuera de esta entrega, sin bloquearla: el filtro Todos/Biblioteca/
Canción del selector de voicings (`11-E2-INTERFAZ.md`, apartado 11), el
selector de dedo por nota, la disposición exacta de teclado en la rejilla de
fundamental/bajo, y las inversiones alternativas de un acorde construido. El
criterio para posponerlos: ninguno impide que un acorde nuevo se construya,
se guarde y se reutilice hoy; todos importan más cuando haya volumen de
acordes guardados que los necesite.

Fecha: 3 de agosto de 2026.

## Decisiones que requieren prototipo

### D-P02 · Rango y estrategia de muestras de piano

**Resuelta.** Registro permitido Si1–Do7 (MIDI 35–96): el grave es el del bajo que
documenta `index.html`, el agudo el techo de las muestras. Muestra más cercana con
transposición de hasta ±12 semitonos y respaldo de osciladores cuando no la hay.

`validateNote` comprueba la altura absoluta, no el número de octava. Issues #12 y #13.

## Preguntas abiertas

| ID | Pregunta | Criterio que la decide | Bloquea |
|---|---|---|---|
| Q-03 | ¿Cuánto tiempo permanece una canción archivada antes de permitir borrado definitivo? | producto | Eliminación |
| Q-04 | ¿Qué formato se importa después del JSON propio: texto de acordes, ChordPro u otro? | producto e ingeniería | P1, no P0 |
| Q-05 | ¿Se guardan portadas o solo metadatos textuales en P0? | producto | No bloqueante |
| Q-06 | ¿Una canción puede fijar tempo por sección en P0? | musical | Modelo si se aprueba |
| Q-07 | ¿Cómo se comunica la actualización de un voicing usado por varias canciones? | interfaz | Sincronización |
| Q-08 | ¿Cuál es el periodo de convivencia de v1 y v2 después de activar producción? | producto e ingeniería | Activación |

### Cerradas al retirar el comité

Q-01 y Q-02 figuraban como abiertas porque esperaban la validación de personas que no
existen. Sus respuestas ya estaban tomadas y aplicadas en el código:

- **Q-01 · cualidades de P0.** Resueltas: seis base (Mayor, menor, 7, maj7, m7, sus4)
  más tres extendidas (dim, m7b5, aug). Es lo que implementa `ChordBuilder`.
- **Q-02 · biblioteca frente a exclusiva de canción.** Resuelta: radio button al
  guardar, fondo `--libraryTint` en las filas de Biblioteca y filtro de tipo en el
  selector. Especificado en `11-E2-INTERFAZ.md`, apartados 10 y 11.

## Cómo registrar nuevas decisiones

Cada decisión nueva debe incluir:

- problema;
- alternativas consideradas;
- decisión;
- consecuencia;
- responsable;
- fecha;
- documentos afectados.

Una decisión que cambie datos, migración o alcance P0 se actualiza en el mismo
commit en PRD, arquitectura, migración, roadmap y pruebas según corresponda.
