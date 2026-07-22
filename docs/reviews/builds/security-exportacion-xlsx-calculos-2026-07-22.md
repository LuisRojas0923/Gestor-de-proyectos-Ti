# Revisión de seguridad — exportación XLSX de cálculos

**Fecha:** 2026-07-22  
**Decisión:** aprobado con riesgos

## Controles verificados

- Vista y API protegidas por `nomina_horas_extras.leer`.
- Solo se exportan datos ya recibidos y permitidos para el usuario.
- No se crean endpoints, credenciales, persistencia ni transferencias externas.
- El nombre del archivo no contiene PII.
- SheetJS recibe strings, números y fechas; no se generan fórmulas.

## Riesgos no bloqueantes

- El archivo contiene PII y datos salariales que quedan almacenados localmente.
- La exportación cliente no genera un evento auditable en backend.
- La cantidad de filas puede superar 100 porque cada cálculo se expande en varios registros.
- `xlsx@0.18.5` es una dependencia preexistente con actualización recomendada.

No existe bloqueo bajo el modelo actual, donde el permiso de lectura autoriza consultar y exportar los datos cargados.
