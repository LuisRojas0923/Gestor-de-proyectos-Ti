# Plan de Creación de Skills para el Agente (Gestor de Proyectos TI)

Basado en las reglas del área de trabajo (documentadas en `.agent/rules/`), este plan define la estructura y el comportamiento de las nuevas "skills" (habilidades) que el asistente deberá adoptar de forma natural al generar o modificar código en este proyecto.

## 1. Skill: Arquitectura de Base de Datos PostgreSQL (`skill_postgresql`)
**Objetivo**: Asegurar que todas las consultas y scripts de base de datos sean 100% compatibles con PostgreSQL.
*   **Regla Base**: `regla-bd.md`
*   **Comportamientos a inyectar**:
    *   Siempre usar la sintaxis oficial de PostgreSQL (ej. RETURNING, UUIDs, timestamptz, tipos JSONB cuando sea útil).
    *   No sugerir nunca dialectos de MySQL, SQL Server u Oracle.
    *   Considerar el manejo de secuencias y triggers estándar en PG.

## 2. Skill: Arquitectura de Archivos y Refactorización (`skill_clean_architecture`)
**Objetivo**: Mantener el código legible, predecible y altamente mantenible.
*   **Regla Base**: `regla-dis.md`
*   **Comportamientos a inyectar**:
    *   **Límite de 500 líneas**: Si al proponer un cambio, un archivo se acerca o supera las 500 líneas, proactivamente pausar y proponer dividir la lógica (ej. crear hooks personalizados `useX.ts`, extraer funciones a `utils/` o componentes a archivos aislados).
    *   **Estructura de Directorios Front-end**: Obligar a que absolutamente todas las páginas nuevas de React creadas se alojen dentro de carpetas exclusivas con su respectivo `index.ts`, separando sus estilos o complementos lógicos. Nunca generar componentes "sueltos".

## 3. Skill: Implementación de UI - Sistema de Diseño (`skill_design_system_ui`)
**Objetivo**: Forzar el uso exclusivo del Sistema de Diseño en componentes y estilos.
*   **Reglas Base**: `regla-dise.md` y `regla-prin-dise.md`
*   **Comportamientos a inyectar**:
    *   **Nunca HTML crudo para tipografía o layout básico**: Restringir estrictamente la creación de etiquetas `<p>`, `<h1>`, `<button>`, `<div>` simple si pueden ser reemplazadas por `<Text>`, `<Title>`, `<Button>`, `<MaterialCard>`.
    *   **Mapeo Mental de Atoms/Molecules**: Configurar a la IA para buscar siempre primero en el directorio de `components/atoms` y `components/molecules` del proyecto antes de escribir código.
    *   **Tematización Responsiva**: Toda propuesta CSS/Tailwind debe evitar colores `hard-codeados` como (ej. `bg-blue-500`) y en su lugar emplear variables dinámicas nativas (ej. `bg-[var(--color-surface)]`) para habilitar el modo Dark/Light orgánicamente.
    *   **Responsividad Móvil Obligatoria**: Toda pantalla debe pensarse en `mobile-first`, insertando automáticamente prefijos de Tailwind (ej. `w-full md:w-auto`, `<div className="flex flex-col md:flex-row">`).
    *   **Regla del Buscador de OTs**: Manejo maestro del `z-index`, `position: absolute` y portales para que interfaces flotantes superpuestas (como OTs en módulos de gasto) no se recorten bajo un `overflow: hidden`.

## Pasos para la Creación de las Skills
1. Revisaremos cada una de las plantillas del skill.
2. Si un skill requiere scripts adicionales o configuraciones (como el listado de todos los componentes atómicos exactos que existen en tu proyecto actual), ejecutaremos comandos para mapearlos y guardar el contexto.
3. Se generarán los archivos `.md` de estas skills dentro del entorno para que sean parte del cerebro permanente y guiíen todo el desarrollo a futuro.

---
**¿Deseas que profundice en la estructura de las carpetas de las skills o quieres que comencemos implementando (escribiendo el código de) la primera skill en base a tu proyecto?**
