# Calidad, pruebas y criterios de aceptación

Actualizado: 27 de julio de 2026
Estado: contrato mínimo de salida.

## Regla general

No se declara terminada una entrega por apariencia ni por una prueba manual feliz.
Debe demostrar:

- validez del documento;
- persistencia después de recargar;
- recuperación ante error;
- accesibilidad básica;
- comportamiento en Safari/iPad;
- ausencia de regresiones en “Mis 36”;
- reversión o recuperación de datos.

## Pirámide de pruebas

### Unidad

- validación de Song, Chord, Voicing y Note;
- generación de cualidades de acorde;
- escritura enarmónica;
- migraciones e idempotencia;
- comparación canónica;
- cálculo de reloj y transiciones de estado;
- resolución de conflictos.

### Integración

- IndexedDB y cola de sincronización;
- importación y exportación;
- API por recurso y Vercel Blob;
- recuperación de revisiones;
- suspensión y reanudación del audio;
- canción activa entre vistas.

### Flujo completo

- crear una canción;
- construir un acorde nuevo;
- usarlo en la canción;
- cerrar, abrir y reproducir;
- sincronizar en un segundo dispositivo;
- provocar y resolver un conflicto;
- archivar y restaurar;
- migrar “Mis 36” y comparar.

## Criterios transversales

### Datos

- [ ] Todo recurso declara formato, versión, ID y revisión.
- [ ] IDs no dependen de títulos ni posiciones.
- [ ] Un archivo inválido se rechaza sin modificar la biblioteca.
- [ ] Una migración repetida no duplica recursos.
- [ ] Archivar conserva datos e historial.
- [ ] Una escritura fallida deja una copia local identificada como pendiente.
- [ ] No se registran tokens ni documentos musicales completos en consola.

### Acordes y voicings

- [ ] Se puede crear un acorde que no existe en “Mis 36”.
- [ ] Las doce fundamentales están disponibles.
- [ ] Se puede definir un bajo alternativo.
- [ ] Se puede agregar y eliminar una nota concreta.
- [ ] Cada nota conserva altura, octava, escritura y mano.
- [ ] La digitación es opcional y admite 1–5.
- [ ] El usuario puede oír y ver una posición antes de guardarla.
- [ ] Editar una posición crea una revisión o copia; no altera silenciosamente canciones.
- [ ] `C#` y `Db` pueden conservar nombres distintos aunque compartan altura.
- [ ] El respaldo de audio funciona cuando no existe una muestra exacta.

### Canciones

- [ ] Crear una canción requiere únicamente un título.
- [ ] Títulos repetidos no producen colisión.
- [ ] Se pueden editar metadatos, secciones, líneas y eventos.
- [ ] Los eventos se ordenan de manera estable.
- [ ] Se puede duplicar sin compartir IDs editables con el original.
- [ ] Se puede importar y exportar sin pérdida de datos.
- [ ] Archivar oculta la canción de la vista normal.
- [ ] Restaurar devuelve la canción con su historial.
- [ ] La última canción activa vuelve a abrirse si todavía existe.

### Reproductor

- [ ] Tocar, Letra y Práctica utilizan la misma canción activa.
- [ ] Pausa y reanudación mantienen el evento correcto.
- [ ] Detener cancela tareas y deja controles coherentes.
- [ ] Cambiar de canción detiene o confirma la reproducción activa.
- [ ] El acorde siguiente y “Prepárate” usan el reloj musical.
- [ ] Regresar a Safari no dispara eventos atrasados en ráfaga.
- [ ] Cambiar el tempo mantiene el orden de eventos.
- [ ] VoiceOver no recibe una hoja completa reconstruida en cada pulso.

### Sincronización

- [ ] Dispositivo y nube tienen estados separados.
- [ ] La API valida el mismo contrato que el cliente.
- [ ] `baseRevision` impide sobrescrituras accidentales.
- [ ] Un conflicto de una canción no bloquea ni reemplaza otras.
- [ ] La cola reintenta sin duplicar operaciones.
- [ ] Forzar una versión exige una elección explícita.
- [ ] El historial permite recuperar una revisión.
- [ ] Un dispositivo nuevo no publica contenido predeterminado.
- [ ] Trabajar sin conexión no impide seguir editando.

### Accesibilidad y diseño adaptable

- [ ] Todos los controles tienen nombre accesible.
- [ ] Los objetivos táctiles principales miden al menos 44 × 44 px.
- [ ] Foco, selección y error no dependen solo del color.
- [ ] Contraste de texto y controles cumple WCAG 2.1 AA.
- [ ] No existe desplazamiento horizontal accidental a 390, 768 y 1024 px.
- [ ] Editor y transporte respetan áreas seguras de iPad.
- [ ] Movimiento reducido desactiva animaciones no esenciales.
- [ ] El foco vuelve al elemento de origen después de cerrar diálogos.

## Aceptación por entrega

### Entrega 0 · contratos

Dado el documento heredado correcto, cuando se migra dos veces, entonces:

- ambas salidas canónicas son iguales;
- se generan los mismos IDs;
- no se escribe en `mis36/`;
- los conteos y posiciones coinciden.

### Entrega 1 · motor universal

Dadas dos canciones de fixture, cuando se alternan, entonces:

- cada vista muestra únicamente la canción activa;
- reproducción y práctica respetan su tempo y eventos;
- no quedan timers ni resaltados de la canción anterior;
- “Mis 36” conserva su secuencia musical.

### Entrega 2 · acordes

Dado un acorde que no existe en la biblioteca, cuando el usuario lo construye y
agrega una nota, entonces:

- se muestra y reproduce la posición completa;
- puede guardarse y reutilizarse;
- la digitación se conserva;
- editarla después no cambia el uso anterior sin confirmación.

### Entrega 3 · biblioteca local

Dada una biblioteca vacía, cuando se crean, duplican y archivan canciones, entonces:

- todas persisten después de recargar;
- los IDs son distintos;
- la canción archivada puede restaurarse;
- importar un documento inválido no altera las demás.

### Entrega 4 · migración

Dado el snapshot verificado de “Mis 36”, cuando se ejecuta la migración en sombra,
entonces:

- existen 81 eventos activos efectivos;
- permanecen aplicadas las 5 eliminaciones heredadas;
- se conservan las 2 duraciones personalizadas;
- acordes, bajos, notas, digitaciones, líneas y anclas coinciden;
- la aplicación heredada sigue disponible.

Si los datos vigentes cambian antes de migrar, estos conteos se actualizan mediante
una nueva verificación; nunca se fuerza el snapshot antiguo.

### Entrega 5 · nube

Dadas dos sesiones con revisiones distintas, cuando ambas editan el mismo recurso,
entonces:

- la segunda escritura recibe conflicto;
- el usuario ve fecha y origen de ambas versiones;
- elegir una versión no modifica otros recursos;
- la revisión descartada permanece recuperable.

## Matriz mínima de dispositivos

| Superficie | Tamaños o condiciones |
|---|---|
| Safari en iPad | vertical, horizontal, bloqueo y regreso |
| Safari en Mac | reproducción, edición, importación y descarga |
| Navegador basado en Chromium | escritorio y móvil de 390 px |
| Sin conexión | cargar, editar, cerrar y reabrir |
| Con nube | sincronización normal, demora, conflicto y error 5xx |

Las pruebas reales de iPad no se sustituyen únicamente por cambiar el viewport.

## Observabilidad

Registrar sin contenido sensible:

- versión de esquema;
- tipo de operación;
- recurso e ID;
- duración y resultado;
- tipo de error;
- estado de migración;
- número de conflictos.

No registrar letra, documentos completos, tokens ni muestras de audio.

## Condición de publicación

Antes de producción:

- [ ] sintaxis, validadores y pruebas automáticas pasan;
- [ ] no hay cambios no relacionados en Git;
- [ ] migración y reversión fueron ensayadas;
- [ ] profesor y pianista validan equivalencia musical;
- [ ] Fernando valida tareas críticas y mensajes;
- [ ] Javier valida jerarquía visual y adaptación;
- [ ] Felipe confirma API, persistencia y consola;
- [ ] producción se verifica sin escribir datos musicales de prueba.
