# Entrega 2 · Constructor de acordes

Actualizado: 28 de julio de 2026  
Estado: Propuesta para validación con equipo. Criterio: **utilidad > complejidad**.

## Propósito

Permitir crear y usar posiciones de acordes que no existan en "Mis 36" sin hacer que
la interfaz sea un conservatorio de música. El beneficio debe justificar cada control.

## Decisiones previas que aplican

- **D-002**: Canción, acorde y voicing son conceptos separados.
- **D-003**: Posiciones compartidas se versionan; editar no afecta silenciosamente otras canciones.
- **D-005**: Persistencia local primero (IndexedDB).
- **D-007**: Archivar antes que eliminar.

## Mínimo viable de E2

### A. Qué es un "acorde" en P0

Identidad armónica representada por:

```
Fundamental (Do–Si, 12 opciones)
Cualidad ("Mayor", "menor", "7", "maj7", "m7", "sus4"; ~6–8 opciones)
Bajo alternativo opcional (una nota diferente a la fundamental)
```

**No incluye:** Jazz avanzado (alteraciones, poliacordes), notación clásica extendida,
análisis funcional.

### B. Qué es un "voicing" (posición)

Notas concretas en mano derecha e izquierda:

```
Nota (nombre + octava: Si1–Do7)
Mano (izquierda, derecha)
Digitación opcional (1–5 si existe)
```

Cada voicing es inmutable tras guardar. Editar crea una revisión sin afectar canciones
anteriores.

### C. Flujo mínimo del constructor

```
1. Seleccionar acorde
   └─ Fundamental (selector de 12 notas)
   └─ Cualidad (selector de ~8 opciones)
   └─ Bajo alternativo (selector opcional + 12 notas)

2. Construir posición
   └─ Agregar nota: (octava 2–7, mano L/R, digitación 1–5)
   └─ Quitar nota: clic/toque en nota existente
   └─ Borrar todo y empezar

3. Previsualización
   └─ Sonora: reproducir voicing actual
   └─ Visual: teclado/diagrama mostrando posición

4. Guardar
   └─ Crea voicing inmutable
   └─ Opción: guardar como biblioteca (reutilizable) o canción (exclusiva)
   └─ Confirmación: "¿Usar en esta canción?"
```

### D. Muestras de piano

**Estrategia:** usar las notas Salamander existentes sin resolver todas las combinaciones.

```
Rango: Si1 (MIDI 35) a Do7 (MIDI 96)
Muestra más cercana: buscar la mitad más cercana, transponer con playbackRate
Transposición máxima: ±12 semitonos antes de usar fallback synth
Fallback: si muestra + transposición fallan, osciladores
```

**No incluye:** seleccionar muestra manualmente, comparar calidad de muestras, control
de timbre.

### E. Interfaz visual mínima

**Distinción entre posiciones:**

```
Biblioteca (reutilizable):
  └─ Etiqueta: "Biblioteca" pequeña, gris
  └─ Aparece en selector global de voicings
  └─ Editar crea nueva revisión

Canción (exclusiva):
  └─ Sin etiqueta especial
  └─ Solo en esta canción
  └─ Editar es local; no afecta otras
```

**Sin:** tarjetas flotantes permanentes, expansión visual compleja, pestañas anidadas.

## Preguntas a validar con el equipo

### Q-01 · Cualidades de acorde en P0

**Propuesta mínima:** `Mayor, menor, 7, maj7, m7, sus4` (6 opciones)

**Opciones de expansión:**
- Agregar `m7b5, dim, aug` (+3, total 9) — complejidad mínima
- Incluir notación (slash chords) como texto libre en editor heredado, no en constructor

**Comprobar antes de darlo por bueno:**
- ¿Estas 6 cualidades cubren >90% de "Mis 36" y canciones de referencia?
- ¿Faltan inversiones que afecten digitación?

### Q-02 · Distinción visual biblioteca vs canción

**Propuesta:** Etiqueta discreta "Biblioteca" en pequeño, gris; búsqueda en selector.

**Opciones rechazadas (complejo > beneficio):**
- Colores distintos por tipo
- Áreas separadas en pantalla

**Comprobar antes de darlo por bueno:**
- ¿Es clara la distinción con etiqueta + posición en selector?
- ¿Entiende dónde encuentra voicings compartidos vs exclusivos?

### D-P02 · Muestras y transposición

**Resuelto:** rango 35–96 (Si1–Do7), muestra cercana + transposición ±12, fallback.

**Comprobar antes de darlo por bueno:**
- ¿Este rango cubre todas las posiciones que toca o construiría?
- ¿Transposición ±12 es suficiente o necesita más?
- ¿Es aceptable la calidad de Salamander + transposición para P0?

## Decisiones tomadas (28 de julio de 2026)

### Confirmado
- Cualidades 6–9 (Mayor, menor, 7, maj7, m7, sus4 ± dim, m7b5, aug) cubren >90%
- Rango Si1–Do7 + ±12 semitonos es suficiente
- Flujo base (acorde → posición → preview → guardar) es intuitivo
- Muestras + fallback synth es apropiado para P0

### Aclaraciones antes de código

**1. Inversiones**
- E2 permite construirlas pero sin etiquetar explícitamente ("1ª inversión")
- Decisión: Esperar a E3 para selector de inversión automática
- Impacto P0: Bajo; usuario construye la posición manualmente

**2. Biblioteca vs Canción**
- Etiqueta gris sola es insuficiente
- Cambios: 
  - Radio button en confirmación de guardado (no toggle misterioso)
  - Fondo sutil gris (5% de opacidad) en filas de voicing Biblioteca
  - Filtro de tipo en selector ("Todos", "Biblioteca", "Canción")

**3. Previsualización en iPad**
- Teclado visual debe ser expandible (botón "Mostrar diagrama")
- No forzar scroll infinito
- Botón Play (pequeño icono) para previsualización sonora

**4. Estados de error y transición**
- Cancelar → se descarta sin auto-borrador (decidido)
- Duplicar voicing → sí permitido, confirmación mínima
- Editar voicing Biblioteca → confirmación: "Afectará X canciones"
- Fallback a synth → silencioso (no requiere indicador)

### Wireframe de guardado

```
┌─ Guardar voicing ──────────────┐
│                                │
│ Nombre: [Do Mayor, 2º inv.]   │
│ (editable, autocompletado)    │
│                                │
│ Tipo:                          │
│ ○ Biblioteca                   │
│   "Reutilizable. Cambios      │
│    afectarán otras canciones" │
│ ◉ Canción                      │
│   "Solo en esta canción"       │
│                                │
│ [Cancelar]  [Guardar]          │
└────────────────────────────────┘
```

## Fuera de E2

- No incluye transposición de canción completa (E7)
- No soporta portadas ni metadatos de voicing (Q-05 aplica a E3)
- No sincroniza con nube aún (E5)
- No conecta la UI de construcción a `index.html` aún
- No incluye validación de "cordura" (ej: advertencia si mano izquierda tiene 5 notas; pasa a E3)

## Criteria previos (antes de código)

**No proceder sin validación de:**

- [ ] Wireframe de guardado (radio Biblioteca/Canción con descripciones)
- [ ] Definición de donde aparece fondo gris en filas de Biblioteca
- [ ] Filtro de selector ("Todos", "Biblioteca", "Canción")
- [ ] Decisión sobre auto-borrador vs pérdida al cancelar
- [ ] Definición de "Mostrar diagrama" expandible para iPad

Una vez aclarados, desbloquea implementación.

## Criterios de aceptación

1. Constructor crea voicings con nota, octava, mano y digitación opcional.
2. Previsualización sonora usa muestras + fallback sin bloquear.
3. Guardar muestra radio de tipo (Biblioteca/Canción) con confirmación.
4. Biblioteca y canción son distinguibles: fondo + filtro en selector.
5. Rango Si1–Do7 cubre posiciones reales sin transposición excesiva.
6. 6–9 cualidades de acorde cubren >90% del uso real.
7. Inversiones permitidas pero sin etiquetar (E3 agrega selector automático).
8. Previsualización de teclado es expandible en iPad.
9. 50+ pruebas de construcción, previsualización y guardado.
10. No requiere modelo de análisis armónico, reconocimiento de gesto ni IA.
11. Estados faltantes definidos (cancelar, duplicar, editar biblioteca).

## Dependencias

- E1 completada (audio, motor, selectors) ✅
- Q-01 y Q-02 resueltas; ver `06-DECISIONES.md`
- D-P02 resuelto: rango Si1–Do7 (MIDI 35–96), aplicado en `validateNote`

## Cómo se comprueba lo que aquí se decide

Este documento se escribió como si un comité fuera a revisarlo. No existe tal
comité, así que las comprobaciones tienen que salir del propio producto:

- **Criterio musical** — contrastar contra “Mis 36” y contra el repertorio que se
  quiera añadir. Si una cualidad o un rango no aparecen ahí, la pregunta es teórica.
- **Criterio de interfaz** — probar el flujo en el iPad real, que es el dispositivo
  de uso, no en un viewport emulado.
- **Criterio de implementación** — la suite de pruebas, que desde la PR #9 se
  ejecuta en cada pull request.
