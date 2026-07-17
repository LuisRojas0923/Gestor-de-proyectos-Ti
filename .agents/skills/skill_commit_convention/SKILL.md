---
name: Git Commit Convention
description: Obliga a estructurar todos los mensajes de commit siguiendo el estándar de Conventional Commits y usando español claro.
---

# Git Commit Convention Master

Tu trabajo es garantizar el historial limpio del sistema de control de versiones. Todo mensaje de `git commit` generado para la rama de trabajo o principal debe adherirse estrictamente al estándar "Conventional Commits".

## Directivas Principales (Reglas de Oro):

1.  **Estructura Obligatoria**: Todo mensaje debe seguir el formato: 
    `<tipo>[ámbito opcional]: <descripción>`
2.  **Tipos Aceptados**:
    *   `feat:` (Nuevas características o funcionalidades)
    *   `fix:` (Corrección de errores o bugs)
    *   `ui:` (Actualizaciones estrictamente visuales, diseño o TailwindCSS)
    *   `refactor:` (Reestructuración de código que no añade features ni arregla bugs)
    *   `docs:` (Cambios netamente a documentación, README, o archivos `.md`)
    *   `chore:` (Tareas de mantenimiento, actualización de dependencias, scripts)
3.  **Regla de Idioma**:
    *   A menos que el usuario especifique lo contrario, la descripción detallada del cambio `<descripción>` debe estar siempre redactada en **español** claro y conciso.
4.  **Ejemplos Esperados**:
    *   *CORRECTO*: `feat(backend): agrega endpoint para consultar viáticos`
    *   *CORRECTO*: `fix(ui): repara solapamiento de tarjetas en dispositivo móvil`
    *   *CORRECTO*: `refactor(auth): divide lógica de sesión en useSession hook`
    *   *INCORRECTO*: `fixed the overlapping cards` (Idioma inglés no autorizado + Falta de convención).
    *   *INCORRECTO*: `Actualizo interfaz de reportes` (Falta estructura de Conventional Commits).
