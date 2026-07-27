# Requisitos de producto · plataforma multicanción

Actualizado: 27 de julio de 2026
Estado: especificación base para planificación.

## Resumen

La aplicación actual enseña y acompaña una única canción cuyos datos, acordes y
posiciones están definidos dentro del código. El usuario no puede guardar otras
canciones ni construir un acorde que no pertenezca a la lista de “Mis 36”.

La nueva versión debe convertir la experiencia actual en un **reproductor universal
con biblioteca de canciones y biblioteca de acordes**, sin perder el valor
pedagógico, interpretativo ni la seguridad de sincronización ya alcanzados.

## Problema

La interfaz parece un editor musical, pero en realidad edita excepciones de una
canción fija. Cuando el usuario intenta agregar una nota, un acorde o una posición
nueva, solo encuentra los doce acordes predefinidos en el código. Ampliar esa lista
manualmente para cada canción no escala y aumenta el riesgo de dañar la canción
publicada.

## Usuarios principales

- **Pianista o estudiante:** quiere cargar repertorio y tocarlo con acompañamiento visual.
- **Profesor de piano:** quiere explicar posiciones, inversiones y transiciones.
- **Editor de canciones:** quiere ingresar letra, secciones, acordes y duraciones.
- **Usuario en interpretación:** necesita controles mínimos, anticipación y estabilidad.

La primera versión seguirá siendo personal y sin cuentas de usuario.

## Objetivos

1. Permitir crear, guardar, abrir, duplicar, archivar, importar y exportar canciones.
2. Hacer que Tocar, Letra y Práctica funcionen con cualquier canción válida.
3. Permitir construir acordes estándar y posiciones personalizadas nota por nota.
4. Reutilizar acordes y voicings sin cambiar accidentalmente canciones existentes.
5. Migrar “Mis 36” sin perder ajustes, historial ni capacidad de reversión.
6. Mantener funcionamiento local y sincronización con conflictos explícitos.

## Indicadores de éxito

### Funcionales

- “Mis 36” produce el mismo resultado musical antes y después de la migración.
- Se pueden crear al menos diez canciones de prueba sin tocar el código fuente.
- Una canción puede utilizar un acorde que no exista en “Mis 36”.
- Se puede crear un voicing agregando o quitando notas y asignando digitación.
- Cerrar y volver a abrir la aplicación conserva la biblioteca local.
- Dos dispositivos pueden sincronizar canciones distintas sin sobrescribirse.

### Experiencia

- Crear una canción vacía requiere como máximo una decisión inicial: título.
- Agregar un acorde estándar no exige construir manualmente sus notas.
- Crear una posición personalizada deja claro qué mano toca cada nota.
- Ninguna edición de biblioteca cambia una canción existente sin confirmación.
- Los estados dispositivo, pendiente, nube y conflicto nunca se combinan en un
  mensaje ambiguo.

## Historias de usuario P0

### Biblioteca de canciones

- Como pianista, quiero abrir una biblioteca para elegir qué canción tocar.
- Como editor, quiero crear una canción con título, artista y tempo para comenzar
  sin modificar código.
- Como editor, quiero duplicar una canción para experimentar sin alterar el original.
- Como usuario, quiero archivar una canción y recuperarla antes de eliminarla
  definitivamente.
- Como usuario, quiero exportar una canción y volver a importarla conservando sus datos.

### Edición musical

- Como editor, quiero dividir una canción en secciones y líneas.
- Como editor, quiero ubicar un acorde antes de una palabra o al final de una línea.
- Como editor, quiero definir la duración de cada evento en pulsos.
- Como editor, quiero deshacer y rehacer operaciones dentro de la canción activa.

### Acordes y notas

- Como pianista, quiero elegir una fundamental y una cualidad para obtener un acorde estándar.
- Como pianista, quiero elegir inversión y bajo alternativo.
- Como pianista, quiero agregar o quitar notas de una posición concreta.
- Como profesor, quiero asignar dedos opcionales a cada nota de ambas manos.
- Como editor, quiero guardar una posición personalizada para reutilizarla.
- Como usuario, quiero que editar una posición reutilizable no cambie silenciosamente
  las canciones que ya la usan.

### Reproducción

- Como pianista, quiero usar Tocar, Letra y Práctica con la canción seleccionada.
- Como intérprete, quiero que pausa y reanudación mantengan el punto musical.
- Como usuario de iPad, quiero recuperar audio y seguimiento al volver a Safari.

### Persistencia

- Como usuario, quiero que cada cambio se guarde primero en mi dispositivo.
- Como usuario, quiero saber qué canción o acorde todavía no llegó a la nube.
- Como usuario, quiero resolver conflictos por recurso, no reemplazar toda la biblioteca.
- Como usuario, quiero restaurar una revisión anterior después de confirmar.

## Alcance

### P0 · imprescindible para la primera versión multicanción

- Motor independiente de los datos de “Mis 36”.
- Esquema versionado para canción, acorde y voicing.
- Biblioteca local con crear, abrir, duplicar, archivar, importar y exportar.
- Constructor de acordes con doce fundamentales, cualidades iniciales y bajo opcional.
- Posiciones personalizadas con notas, octavas, mano y digitación opcional.
- Adaptador que convierte “Mis 36” al nuevo esquema sin tocar el origen.
- Reproducción y edición de la canción seleccionada.
- Persistencia local robusta y sincronización por recurso con revisiones.
- Compatibilidad funcional con Safari/iPad.

### P1 · siguiente etapa

- Búsqueda, filtros, etiquetas y favoritos.
- Transposición asistida conservando la escritura musical correcta.
- Historial accesible desde la interfaz.
- Plantillas de estructura de canción.
- Recomendaciones pedagógicas de digitación y enlace.
- Importación de formatos adicionales después de definir contratos específicos.

### P2 · futuro

- Cuentas, colaboración y bibliotecas compartidas.
- Marketplace o publicación pública de canciones.
- Transcripción automática desde audio.
- Integración MIDI avanzada.
- Aplicaciones nativas.

## Fuera de alcance de la primera versión

- **Reconocer acordes desde una grabación:** requiere otro producto y otro modelo de errores.
- **Compartir contenido públicamente:** introduce permisos, moderación y derechos de autor.
- **Colaboración simultánea:** la sincronización inicial seguirá siendo personal.
- **Rediseño visual total:** se hará cuando la nueva estructura esté estable.
- **Animaciones decorativas complejas:** dependen del nuevo reloj musical y no validan
  la biblioteca.

## Reglas de producto

1. Una canción se identifica por un ID estable, no por su título.
2. Archivar es la acción normal; eliminar definitivamente requiere confirmación reforzada.
3. Los acordes estándar pueden generarse, pero la posición concreta siempre es editable.
4. Una canción referencia una versión inmutable de un voicing o guarda una copia
   autocontenida; nunca depende de contenido mutable sin control de versión.
5. Las alteraciones enarmónicas deben conservar la intención escrita (`F` no siempre
   equivale visualmente a `E#`).
6. El contenido heredado permanece disponible hasta completar la verificación y el
   periodo de reversión.

## Preguntas de producto abiertas

Las decisiones no bloqueantes están registradas en
[`06-DECISIONES.md`](06-DECISIONES.md). Antes de diseñar la interfaz final deben
resolverse:

- cualidades de acorde incluidas en el primer lanzamiento;
- diferencia visible entre acorde global y posición exclusiva de una canción;
- política de eliminación definitiva y duración de la papelera;
- formato inicial de importación además del JSON propio.
