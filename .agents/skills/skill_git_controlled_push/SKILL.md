---
name: Controlled Git Push
description: Prohíbe subir cambios a GitHub (git push) de forma automática. El agente debe esperar siempre a una instrucción explícita del usuario antes de ejecutar cualquier comando de subida remota.
---

# Controlled Git Push (Subida Controlada a GitHub)

Esta skill establece una restricción crítica en el flujo de trabajo de Git para este proyecto.

## Regla de Oro
**NUNCA** ejecutes `git push` o cualquier comando que envíe cambios al repositorio remoto (GitHub) de forma proactiva o automática tras una tarea.

## Instrucciones para el Agente
1. **Preparación Local**: Puedes realizar `git add` y `git commit` cuando yo te diga que los cambios que hiciste estan bien localmente para asegurar el progreso del trabajo, pero detente ahí.
2. **Notificación**: Una vez finalizada la tarea y realizados los commits locales, informa al usuario que los cambios están listos y guardados localmente.
3. **Espera de Confirmación**: Debes esperar a que el usuario diga explícitamente palabras como "sube los cambios", "haz push", "actualiza GitHub" o similares.
4. **Ejecución**: Solo tras recibir dicha instrucción, procede a ejecutar `git push`.

## Excepciones
- No hay excepciones a esta regla a menos que el usuario indique lo contrario para una sesión específica.
