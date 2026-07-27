# Plan de migración y reversión

Actualizado: 27 de julio de 2026
Estado: obligatorio antes de escribir datos multicanción en producción.

## Objetivo

Convertir los datos vigentes de “Mis 36” en la primera canción de la nueva
biblioteca sin perder eventos, posiciones, duraciones, revisiones ni la posibilidad
de volver a la aplicación actual.

## Fuente de verdad heredada

El sistema actual utiliza:

- documento remoto `mis36-cloud-v1`;
- ajustes `songSync` versión 4;
- rutas `mis36/history/` en Vercel Blob;
- claves locales `mis36-song-sync-v1`, `mis36-cloud-revision` y
  `mis36-cloud-dirty`;
- datos predeterminados de la canción y voicings dentro de `index.html`.

La referencia musical verificada antes de esta iniciativa contiene:

- 81 eventos activos;
- 0 eventos agregados;
- 5 eventos eliminados;
- 2 eventos con duración distinta de cuatro pulsos.

Estos valores son una prueba de regresión, no una regla universal del nuevo modelo.

## Condiciones previas

Antes de ejecutar una migración:

- [ ] repositorio limpio y commit de producción identificado;
- [ ] API heredada responde correctamente;
- [ ] exportación local y documento remoto comparados;
- [ ] snapshot remoto copiado a una ruta de respaldo inmutable;
- [ ] hash SHA-256 del documento de entrada registrado;
- [ ] migrador probado con fixtures y reejecución;
- [ ] bandera de nueva biblioteca desactivada por defecto;
- [ ] procedimiento de reversión ensayado fuera de producción.

No se utiliza un dispositivo nuevo como fuente de verdad.

## Estrategia: migración paralela

La migración no sobrescribe `mis36/`. Escribe recursos nuevos bajo
`piano-library/` y conserva el sistema heredado durante todo el proceso.

### Fase 1 · Contratos sin cambio visible

1. Extraer validadores y el motor de lectura.
2. Crear el esquema `piano-song` versión 1.
3. Crear fixtures que representen el documento heredado correcto.
4. Mantener la interfaz y la API actual sin cambios de ruta.

Salida: el nuevo código puede representar “Mis 36”, pero producción sigue leyendo
el formato heredado.

Durante la Entrega 1, el agregado migrado solo puede cargarse en memoria detrás de
una bandera interna. No se avanza a conversión IndexedDB activa ni a escritura
remota. La reversión consiste en apagar el motor nuevo; no transforma ni restaura
datos.

### Fase 2 · Conversión local en sombra

1. Leer datos predeterminados y aplicar ajustes `songSync`.
2. Convertir secciones, líneas y eventos a IDs estables.
3. Convertir cada acorde y voicing heredado a recursos versionados.
4. Guardar la biblioteca v1 en IndexedDB con estado `shadow`.
5. Comparar el resultado contra la canción renderizada por el sistema heredado.

El migrador guarda la huella del origen. Si vuelve a ejecutarse con la misma huella,
actualiza o reutiliza los mismos IDs deterministas; no crea duplicados.

### Fase 3 · Escritura remota en sombra

1. Copiar el documento heredado a una ruta explícita de respaldo.
2. Escribir catálogo, canción, acordes y voicings bajo `piano-library/`.
3. Leer nuevamente cada recurso desde la nube.
4. Comparar representaciones canónicas y conteos.
5. Marcar la migración `verified`, sin cambiar todavía el lector público.

La operación necesita una clave idempotente derivada de:

```text
mis36 + schemaVersion + hashDelOrigen
```

### Fase 4 · Lectura nueva con bandera

1. Activar la biblioteca solo para pruebas.
2. Abrir “Mis 36” desde el catálogo nuevo.
3. Probar Tocar, Letra, Práctica, Editar, importación, exportación y sincronización.
4. Probar Safari/iPad, bloqueo de pantalla y regreso al navegador.
5. Comparar la secuencia completa de eventos con la versión heredada.

No se activa escritura del usuario hasta aprobar estas pruebas.

### Fase 5 · Escritura nueva

1. Habilitar guardado local por recurso.
2. Habilitar cola de sincronización.
3. Confirmar conflictos independientes por canción, acorde y voicing.
4. Mantener la API heredada disponible en modo lectura/reversión.
5. Vigilar errores, conflictos y cambios de conteos durante el periodo acordado.

### Fase 6 · Biblioteca abierta

Después de validar “Mis 36”:

1. habilitar creación de una segunda canción;
2. habilitar constructor de acordes y posiciones;
3. habilitar duplicar, archivar, importar y exportar;
4. ampliar gradualmente cualidades e importadores.

## Mapeo heredado

| Origen | Destino |
|---|---|
| título fijo “Mis 36” | `song.metadata.title` |
| `sections[index]` | `song.sections[id]` |
| `section.lines[index]` | `section.lines[id]` |
| `section.events` + overrides | `section.events[id]` |
| clave `section:uid` | mapa de migración a `eventId` |
| `event.chord` | `chordId` |
| `event.inversion` | `voicingId` y etiqueta pedagógica |
| `voicings[chord].l` | nota de mano izquierda |
| `voicingVariants` | voicings versionados |
| `event.anchor` | ancla en la línea migrada |
| `event.beats` | duración del evento |
| `deleted` | eventos excluidos + registro de auditoría |
| `added` | eventos normales con procedencia `legacy-custom` |

La migración representa el estado musical efectivo. El historial heredado permanece
como evidencia y no se reescribe retroactivamente.

## Comparación canónica

Para verificar equivalencia se comparan, en orden:

- nombre y orden de secciones;
- texto exacto de cada línea;
- cantidad y orden de eventos activos;
- símbolo del acorde;
- nota de bajo;
- notas y digitaciones de ambas manos;
- inversión o posición;
- línea y ancla;
- duración en pulsos.

Se ignoran IDs nuevos, revisiones y fechas.

## Reversión

### Cuándo revertir

- falta o duplicación de eventos;
- cambio inesperado de acorde, bajo, voicing o duración;
- conflicto que reemplaza otra canción o toda la biblioteca;
- pérdida de datos al recargar o al cambiar de dispositivo;
- fallo de audio o navegación que impide tocar;
- migración no idempotente.

### Cómo revertir

1. Desactivar la bandera de biblioteca nueva.
2. Volver a servir el lector y la API heredados.
3. No copiar datos v2 hacia `mis36/`.
4. Conservar recursos v2 para diagnóstico, marcados como no vigentes.
5. Restaurar una revisión heredada solo si los datos heredados fueron modificados
   por una acción autorizada.
6. Documentar causa, alcance y comparación antes de reintentar.

La reversión de interfaz no exige borrar datos nuevos.

## Prohibiciones

- No borrar `mis36/current.json` ni `mis36/history/`.
- No transformar en sitio los snapshots históricos.
- No hacer una migración destructiva al cargar la página.
- No permitir que la primera apertura de un dispositivo publique datos predeterminados.
- No usar títulos como claves.
- No actualizar todas las canciones cuando cambia un voicing sin confirmación.
- No declarar exitosa la migración únicamente porque el JSON sea válido.

## Registro de migración

Cada ejecución conserva:

```json
{
  "migration": "mis36-to-piano-library-v1",
  "sourceHash": "sha256",
  "sourceRevision": "legacy-revision",
  "targetSongId": "uuid-song",
  "targetRevision": "uuid-revision",
  "status": "shadow|verified|active|rolled-back",
  "checks": {
    "sections": true,
    "lines": true,
    "events": true,
    "voicings": true,
    "durations": true
  },
  "executedAt": "ISO-8601"
}
```

No se incluyen tokens, credenciales ni contenido innecesario en logs.
