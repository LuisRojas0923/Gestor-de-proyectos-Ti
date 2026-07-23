# Docs/tests review — cierre de hallazgos PR #22 HDI

**Fecha:** 2026-07-22
**Resultado:** `blocked`
**Alcance:** cierre local de RBAC genérico de nómina, contrato HDI estricto, serialización PostgreSQL, regresiones de `NominaService` y accesibilidad/autenticación de `HdiPreview`.

## Evidencia recibida

- Backend focalizado: **48 passed**.
- Health checks: **4 passed, 4 skipped**.
- Frontend focalizado: **3 passed**.
- ESLint focalizado, build frontend, `py_compile` y diff check: **PASS**.
- Este revisor intentó `python -m pytest --collect-only` sobre las tres suites backend focales, pero el Python host no dispone de `pytest`; por ello, los resultados ejecutados anteriores se aceptan como evidencia suministrada y no como ejecución independiente.

## Cobertura verificada

| Hallazgo | Evidencia en pruebas | Estado |
|---|---|---|
| RBAC 401/403 de historial, preview y descarga | `test_nomina_rbac_concurrencia.py:20-45` parametriza las tres rutas para ausencia de token y usuario sin permiso. | Cubierto |
| Esquema HDI exacto e inválidos por fila | `test_hdi_extractor_grupos.py` exige los cinco encabezados canónicos, rechaza faltantes y duplicados, y cubre varios obligatorios inválidos. Sin embargo, no prueba nombre numérico/booleano ni primas mal formadas que contengan dígitos; la implementación actual puede aceptarlos tras `str(...)` o limpieza permisiva. | **Cobertura incompleta; bloquea** |
| Error estructural seguro 422 | `test_nomina_rbac_concurrencia.py:189-212` verifica `ErrorEstructuraNomina` → 422; el mensaje publicado identifica hoja/fila/campo sin incluir valor, cédula, traceback ni error DB. Los `ValueError` restantes conservan detalle genérico. | Cubierto |
| Lock concurrente PostgreSQL real | `test_nomina_rbac_concurrencia.py:64-81` abre dos sesiones con `NullPool`, demuestra que la segunda espera y se libera tras commit de la primera. No es un test basado solo en mocks. | Cubierto por la ejecución reportada |
| Servicio compartido | La suite prueba éxito en Medicina Prepagada, Pólizas Vehículos y Otros Gerencia; fallo de escritura con rollback/no commit; fallo DB posterior a escribir y cancelación durante el flujo con rollback y limpieza. No reproduce cancelación durante `commit()`, ventana en la que el commit puede confirmarse antes de que se marque `transaccion_confirmada`. | Cubierto para los casos pedidos, con riesgo medio adicional |
| Frontend autenticado y accesible | `HdiPreview.test.tsx` cubre cliente `useApi`, GET, POST/FormData, archivo inválido sin POST, nombre accesible y asociación recuperable por label; el componente añade foco visible mediante `peer-focus-visible`. | Cubierto con riesgo bajo de aserción visual parcial |

## Hallazgos documentales

### Bloqueante — La matriz de filas inválidas no garantiza tipos exactos

La revisión backend más reciente (`backend-pr22-hdi-latest-rereview-2026-07-22.md`) confirma que un nombre numérico/booleano puede aceptarse al convertirlo a texto y que una prima léxicamente inválida con dígitos puede convertirse en un importe positivo. Los 48 casos verdes no incluyen esas entradas. Se requieren validación estricta y regresiones que demuestren aborto completo y preservación del período.

### Bloqueante de integración — La revisión Security/RBAC más reciente detecta rutas genéricas aún públicas

Aunque los seis casos 401/403 solicitados para historial, preview y descarga están correctos, `security-pr22-nomina-2026-07-22.md` identifica otras rutas del mismo router genérico con lectura/escritura de nómina sin autenticación/RBAC. También registra divulgación mediante `str(e)` en 500, falta de confinamiento de descarga y la ventana de cancelación durante commit. El dictamen global de PR no puede aprobarse mientras ese gate de seguridad permanezca abierto.

### Media — El catálogo frontend quedó desactualizado

`testing/CATALOGO_PRUEBAS.md:68` todavía describe solo archivo único y rechazo XLS/XLSX. Debe incluir uso del cliente autenticado, POST/FormData y accesibilidad/nombre/foco. La nueva fila backend de seguridad y concurrencia (`:52`) sí registra correctamente la suite nueva y su propósito.

### Media — El reporte final canónico conserva conteos ya superados y no enlaza las re-revisiones vigentes

- `docs/reviews/builds/2026-07-22_pr22-hdi-final.md` aún registra **25 backend / 2 frontend**, no **48 / 3**, y no enumera `nomina_router.py`, `errores.py` ni `test_nomina_rbac_concurrencia.py`.
- Ya existen addenda vigentes de backend, frontend y seguridad, pero el reporte final no los enlaza y por ello todavía presenta una conclusión global superada.

Este reporte deja constancia del cierre, pero el reporte final canónico debe actualizarse o enlazar explícitamente este addendum para evitar conclusiones contradictorias.

### Baja — La aserción de accesibilidad no demuestra por sí sola toda la presentación de foco

Vitest verifica nombre accesible y clase `peer`, mientras el foco visible se confirma principalmente por inspección estática de `peer-focus-visible:ring-*` en la superficie. No bloquea; una prueba futura puede enfocar por teclado y comprobar las clases del elemento visual asociado.

### Baja — Health checks parciales y recolección no repetida

Los cuatro skips dependientes de entorno/token y la ausencia local de `pytest` limitan la verificación independiente, aunque no contradicen los 48 casos focales ni los controles inspeccionados.

## Documentación aplicable

- `docs/ESQUEMA_BASE_DATOS.md`: **no requiere actualización**; no cambian modelos, tablas, columnas, índices ni migraciones.
- ADR: **no requerido**; el lock por período endurece una transacción existente y no cambia una frontera arquitectónica durable. No se modifican `.agents/skills/` ni `.opencode/agent/`, por lo que ADR-006 no aplica.
- Bitácora: no es obligatoria porque este reporte conserva el contexto durable del cierre.
- `errors_memory.json`: ya registra la regresión de Authorization de `HdiPreview` como `ERR-004`.

## Veredicto

```text
Docs/tests review: blocked
Findings: RBAC 401/403 de las tres rutas, 422 seguro, lock PostgreSQL, servicio compartido y accesibilidad tienen evidencia; faltan tipos exactos de filas y permanecen gates de seguridad en el router genérico.
Required tests: nombre numérico/booleano y primas mal formadas con dígitos, con aborto/preservación; 401/403 de todas las rutas sensibles restantes; 500 saneado, confinamiento de descarga y cancelación durante commit. Opcional: error frontend y foco por teclado.
Required docs: actualizar la descripción frontend del catálogo y reconciliar el reporte final con 48 backend, 4/4 health, 3 frontend y las re-revisiones vigentes.
Blocking reasons: contrato de tipos HDI aún permisivo y rutas genéricas de nómina aún sin auth/RBAC según las re-revisiones más recientes.
```
