# KI: Patrón de Subcategorías (GranCoop Template)

Este KI documenta cómo replicar el módulo de GRANCOOP para nuevas subcategorías.

## Componentes de Referencia
- **Frontend**: `GrancoopPreview.tsx`
- **Backend Router**: `nomina_router.py` (métodos `preview_grancoop` y `obtener_datos_grancoop`)
- **Backend Service**: `grancoop_extractor.py`

## Checklist de Replicación
- [ ] Crear el extractor en `app/services/novedades_nomina/`.
- [ ] Registrar las rutas en `app/api/novedades_nomina/nomina_router.py`.
- [ ] Crear la página de Preview en frontend replicando el layout de GranCoop.
- [ ] Configurar las rutas en `ServicePortal.tsx`.
- [ ] Verificar que el enrichment ERP use `EmpleadosService.consultar_empleados_bulk`.

## Estructura de Alertas
El sistema de alertas debe separar filas "insalvables" (no encontradas o inactivas) del resumen principal, mostrándolas en el `warnings_detalle`.
