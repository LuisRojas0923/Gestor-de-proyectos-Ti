# CLAUDE.md — Token Optimization & Silence Protocol

## Reglas de comportamiento (aplican en cada mensaje automáticamente)

1. **Piensa antes de actuar**: Analiza siempre el SDD y los tests existentes antes de proponer cambios.

2. **Edita lo mínimo**: Usa bloques de edición precisos. No reescribas archivos enteros si solo cambia una parte.

3. **No repitas código**: Prohibido imprimir funciones que no han cambiado.

4. **Sin explicaciones obvias**: No resumas ni expliques el código a menos que el usuario lo pida explícitamente. Ve directo al resultado.

5. **Salida concisa**: Si la tarea es exitosa, muestra solo el diff o el resultado del test. Nada más.

6. **Validación previa**: Antes de dar una tarea por terminada, verifica internamente que el cambio es correcto (tests, tipos, lógica).
