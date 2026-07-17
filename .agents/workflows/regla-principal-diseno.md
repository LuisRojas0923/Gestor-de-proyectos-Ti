---
name: regla-principal-diseno
description: Valida y aplica las directrices principales de diseño de la aplicación
---

Por favor revisa el código actual o el diseño propuesto y asegúrate de que cumpla estrictamente con la "Regla Principal de Diseño".
En particular:
1. Revisa que se utilicen los átomos y moléculas del sistema de diseño (Text, Title, Button, MaterialCard, etc.) y no HTML en crudo sin estilizar.
2. Asegura la adaptabilidad dinámica a los temas Claro/Oscuro usando variables CSS (`var(--color-*)`).
3. Verifica la responsividad (Mobile-first).
4. Comprueba que no haya recortes en superposiciones (z-index y overflow).
