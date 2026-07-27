# Registro de decisiones

Actualizado: 27 de julio de 2026
Estado: decisiones aceptadas y preguntas que deben resolverse antes de su entrega.

## Participantes y responsabilidades

| Rol | Responsabilidad principal |
|---|---|
| Profesor de piano | pedagogía, digitación, inversiones y aprendizaje |
| Pianista | comodidad, anticipación, fluidez y ejecución real |
| Experto en UX musical | mínima fricción mientras se toca y canta |
| Felipe · front-end | arquitectura, implementación, audio y persistencia |
| Javier · diseño | identidad, jerarquía visual y sensación orgánica |
| Fernando · UX | flujos, clics, seguridad, estados y accesibilidad |

El comité asesora. Las decisiones de alcance y publicación corresponden al
responsable del producto.

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

## Decisiones que requieren prototipo

### D-P02 · Rango y estrategia de muestras de piano

Responsables: Felipe y pianista.
Bloquea: aceptación completa del constructor.

Definir registro permitido, muestra más cercana, transposición máxima aceptable y
conducta cuando una nota no tiene muestra.

## Preguntas abiertas

| ID | Pregunta | Responsable | Bloquea |
|---|---|---|---|
| Q-01 | ¿Qué cualidades exactas entran en P0 además del mínimo propuesto? | Profesor + pianista | Constructor final |
| Q-02 | ¿Cómo se distingue visualmente “posición de biblioteca” de “posición exclusiva de canción”? | Fernando + Javier | Diseño de acordes |
| Q-03 | ¿Cuánto tiempo permanece una canción archivada antes de permitir borrado definitivo? | Producto | Eliminación |
| Q-04 | ¿Qué formato se importa después del JSON propio: texto de acordes, ChordPro u otro? | Producto + ingeniería | P1, no P0 |
| Q-05 | ¿Se guardan portadas o solo metadatos textuales en P0? | Javier + producto | No bloqueante |
| Q-06 | ¿Una canción puede fijar tempo por sección en P0? | Pianista + profesor | Modelo si se aprueba |
| Q-07 | ¿Cómo se comunica la actualización de un voicing usado por varias canciones? | Fernando | Sincronización |
| Q-08 | ¿Cuál es el periodo de convivencia de v1 y v2 después de activar producción? | Producto + ingeniería | Activación |

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
