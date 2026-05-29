---
name: Spec-Driven Development & RIPER Protocol
description: Metodología estructurada de desarrollo guiada por especificaciones técnicas, control de estado y puertas de aprobación humana para agentes de IA en Gestor-de-proyectos-Ti.
---

# Spec-Driven Development (SDD) & Protocolo RIPER

Esta habilidad implementa la filosofía de **Desarrollo Guiado por Especificaciones (Spec-Driven Development)** y el flujo de control **RIPER** (Research, Innovate, Plan, Execute, Review). Asegura que el desarrollo sea predecible, seguro y libre de código "basura" o deuda técnica no planificada.

---

## 📜 Filosofía de SDD

1. **La intención es la verdad**: El código es solo un artefacto secundario generado a partir de la intención del diseño. La especificación técnica escrita (`The Spec File`) es el único punto de partida válido.
2. **Control por Compas de Aprobación (Gated Gates)**: Las transiciones críticas del ciclo de vida del agente requieren aprobación humana explícita.
3. **Persistencia sobre Memoria**: Dado que la memoria del chat del agente es efímera, todo plan y decisión crítica debe guardarse inmediatamente en archivos markdown persistentes en el disco (`implementation_plan.md`, `task.md`, `walkthrough.md`).

---

## 🔄 El Ciclo de Vida RIPER

El desarrollo sigue obligatoriamente estas cinco etapas estructuradas:

### 1️⃣ RESEARCH (Investigación & Mapeo)
* **Estado del Agente**: `[LOCKED]` (Prohibido escribir o modificar código de la aplicación).
* **Acción**:
  - Analizar las capas implicadas en el backend (`router → service → model`) y en el frontend (`pages → components → hooks`).
  - Buscar dependencias existentes en la base de datos (tablas de PostgreSQL, esquemas en `docs/ESQUEMA_BASE_DATOS.md`).
  - Identificar lagunas de información, asunciones o ambigüedades en los requisitos de negocio.
  - Opcional: Generar un mapa de enlaces o CodeMap local en `docs/specs/` si la tarea abarca múltiples módulos.

### 2️⃣ SPECIFY (Especificación del Diseño)
* **Estado del Agente**: `[LOCKED]`
* **Acción**:
  - Crear o actualizar el archivo de especificación en la carpeta `docs/specs/` (ej: `docs/specs/YYYY-MM-DD_funcionalidad.md`).
  - El archivo de especificación debe describir los objetivos, modelos de datos en español, lógica de negocio general, y firmas de interfaces (API / Componentes UI), sin la lógica detallada del código.
  - La especificación debe actualizarse retrospectivamente ("Reverse Sync") si se descubren cambios en la arquitectura durante la ejecución.

### 3️⃣ PLAN (Planificación Técnica - El Contrato)
* **Estado del Agente**: `[LOCKED]`
* **Acción**:
  - Crear el artefacto `implementation_plan.md`.
  - **Estructura del Plan**:
    - **Cambios en base de datos**: Script de migración SQL o alembic necesario.
    - **Backend**: Rutas y archivos a modificar, signaturas de funciones con tipos.
    - **Frontend**: Componentes del sistema de diseño a importar/usar, páginas a crear y rutas de navegación.
    - **Checklist Atómico**: Tareas desglosadas numeradas para hacer seguimiento en `task.md`.
  - **⛔ PAUSA Y APROBACIÓN**: Detente aquí. No puedes escribir código fuente hasta que el desarrollador dé el visto bueno al plan técnico.

### 4️⃣ EXECUTE (Ejecución y Construcción)
* **Estado del Agente**: `[ACTIVE]` (Se permite escribir código y correr pruebas).
* **Acción**:
  - Crear el artefacto `task.md` para seguir el progreso del checklist aprobado.
  - **TDD (Test-Driven Development) Obligatorio**:
    - Crear primero el archivo de pruebas correspondiente en `testing/backend/`.
    - Ejecutar y mostrar el fallo de la prueba (`pytest`).
    - Implementar el código estrictamente según lo planificado.
    - Asegurar que los ficheros de código no superen las **500 líneas** (según las reglas de diseño del proyecto).
    - Usar los componentes del sistema de diseño (sin etiquetas HTML crudas ni estilos Tailwind ad-hoc).

### 5️⃣ REVIEW (Revisión & Cierre)
* **Estado del Agente**: `[LOCKED]`
* **Acción**:
  - Ejecutar todas las pruebas unitarias y de integración del backend y frontend.
  - Asegurar la conformidad del linter (`npm run lint` en frontend).
  - Actualizar `walkthrough.md` con los resultados, diffs significativos y capturas de pantalla si hay cambios visuales.

---

## ⚡ Flujo Rápido (Fast Flow)
Para tareas muy simples y directas (corrección de textos, typos, ajustes visuales de CSS puro que no alteren componentes principales o documentación):
- Se permite el modo rápido: **Bypass** directo a la ejecución.
- Al finalizar, sincroniza los cambios en los documentos de arquitectura si es necesario.
