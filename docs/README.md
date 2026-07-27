# Índice de documentación

Actualizado: 27 de julio de 2026
Estado: dirección de producto aprobada; Entrega 0 implementada en sombra y sin activación.

## Propósito

Estos documentos convierten el consenso del comité de producto, música, diseño y
front-end en un contrato verificable. Deben leerse antes de implementar la
biblioteca multicanción o modificar la persistencia.

## Orden de lectura

| Documento | Responde |
|---|---|
| [01 · Requisitos de producto](01-REQUISITOS-DE-PRODUCTO.md) | ¿Qué problema resolvemos y qué debe incluir la primera versión? |
| [02 · Arquitectura y datos](02-ARQUITECTURA-Y-DATOS.md) | ¿Cómo representaremos canciones, notas, acordes y voicings? |
| [03 · Migración y reversión](03-MIGRACION-Y-REVERSIÓN.md) | ¿Cómo protegemos “Mis 36” y cómo volvemos atrás si algo falla? |
| [04 · Roadmap](04-ROADMAP.md) | ¿En qué orden se construye y qué queda para después? |
| [05 · Calidad y aceptación](05-CALIDAD-Y-ACEPTACION.md) | ¿Qué debe pasar para considerar terminada cada entrega? |
| [06 · Decisiones](06-DECISIONES.md) | ¿Qué decisiones ya están tomadas y cuáles siguen abiertas? |

## Jerarquía de fuentes

Si hay una contradicción, se utiliza este orden:

1. Datos musicales vigentes de “Mis 36” en producción.
2. Decisiones aceptadas en `06-DECISIONES.md`.
3. Requisitos P0 de `01-REQUISITOS-DE-PRODUCTO.md`.
4. Contratos de datos de `02-ARQUITECTURA-Y-DATOS.md`.
5. Roadmap y propuestas futuras.

Cambiar los niveles 1–4 requiere actualizar los documentos afectados en el mismo
commit.

## Glosario

- **Canción:** unidad guardable con metadatos, secciones, letra y eventos musicales.
- **Evento:** entrada de un acorde en una posición de la letra y por una duración.
- **Acorde:** identidad armónica, por ejemplo `C#m7` o `B/D#`.
- **Voicing o posición:** notas concretas, octavas y digitación con las que se toca un acorde.
- **Biblioteca:** catálogo local y remoto de canciones y acordes reutilizables.
- **Motor:** funciones de reproducción, tempo, renderizado y práctica que no dependen
  de una canción específica.
- **Documento heredado:** formato actual `mis36-cloud-v1` y sus ajustes versión 4.
