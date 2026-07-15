# Build - Selector de plantillas en el planificador

**Fecha:** 2026-07-13
**Estado:** aprobado

## Alcance

- `SelectorPlantillaPlanificador` carga exclusivamente plantillas activas.
- `HorarioMasivoCard` expone un slot en el espacio indicado de la barra compacta.
- La barra distribuye horario manual y plantilla en columnas independientes desde `xl`, apilándolas en tamaños menores.
- Los `select` nativos heredan `color-scheme: dark` y colores de superficie para evitar menús blancos en tema oscuro.
- `crearOverridesDesdePlantilla` transforma los siete dias sin borrar novedades ni OT.
- El endpoint GET del catalogo acepta `nomina_horas_extras.planificar` o `nomina_horas_extras.plantillas_horario.administrar`.
- Consultar plantillas inactivas exige `nomina_horas_extras.plantillas_horario.administrar` también en backend.
- Las mutaciones del catalogo mantienen el permiso administrativo existente.

No se agregaron permisos al manifiesto RBAC ni se modificaron modelos, migraciones o contratos persistidos.

## Evidencia

```powershell
docker compose exec -T frontend npm run test -- --run src/tests/PlanificadorPlantillas.test.tsx src/tests/PlanificadorSemanalView.test.tsx
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python -m pytest testing/backend/test_horas_extras_rbac_granular.py testing/backend/test_horarios_plantillas.py -q
docker compose exec -T frontend npx eslint <archivos-focales>
docker compose exec -T frontend npm run build
```

- Frontend: 23 passed.
- Backend: 17 passed.
- ESLint focal: passed.
- Vite build: passed, 4027 modulos.

## Revisiones

| Revisor | Decision |
|---|---|
| Frontend | approved |
| Backend | approved |
| Seguridad/RBAC | approved |
| Documentacion/pruebas | approved |

## Riesgos controlados

- La seleccion no aplica automáticamente; exige el boton `Aplicar` para evitar cambios accidentales.
- El boton permanece deshabilitado sin empleados o sin plantilla seleccionada.
- Un error de carga ofrece reintento y no altera el borrador.
- El selector usa el atomo `Select` nativo, admite teclado y ocupa todo el ancho disponible en movil.
- El planificador conserva revisión manual, pre-calculo, guardado y confirmacion posteriores.
