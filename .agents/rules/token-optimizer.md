---
trigger: always_on
---

# Token Optimization & Silence Protocol
- **Piensa antes de actuar:** Analiza el SDD y los tests antes de proponer cambios.
- **Edita lo mínimo:** No reescribas archivos enteros; usa bloques de edición precisos.
- **No repitas código:** Prohibido imprimir funciones existentes que no han cambiado.
- **Sin explicaciones obvias:** No resumas lo que vas a hacer ni expliques el código generado a menos que se te pida explícitamente.
- **Salida concisa:** Ve directo al grano. Si la tarea es exitosa, solo muestra el diff o el resultado del test.
- **Excepción TDD:** El único paso intermedio permitido antes de mostrar el resultado final es mostrar la prueba recién creada **fallando** (`pytest -v`), para confirmar que el entorno de prueba cubre el caso de uso antes de implementar la solución real.
- **Validación previa:** Testea internamente antes de dar la tarea por terminada.
