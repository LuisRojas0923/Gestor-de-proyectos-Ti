# Security/RBAC review - Plan trazabilidad diaria HE

Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ❌
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: N/A
- Secrets guard: N/A
- No print(): N/A
- PII redacted: ❌

## Hallazgos por severidad

### BLOQUEANTE
1. **PII real expuesta en el documento del plan.** El hallazgo de partida incluye una cédula completa de empleado y un cálculo productivo concreto. Antes de versionar o compartir el plan, debe anonimizarse/maskearse (`empleado_hash`, `cedula=***5512`, fixture sintético). CWE-200.
2. **Trazabilidad inmutable no queda garantizada por el modelo propuesto.** La tabla snapshot se declara histórica, pero la regla sobre borrar/anular es ambigua y no exige append-only, prohibición de UPDATE/DELETE, correcciones por evento compensatorio, actor derivado del JWT, hash/checksum o vínculo a evento de workflow. Implementado así, un ajuste posterior podría sobrescribir evidencia diaria sin rastro. CWE-345, CWE-840.
3. **Evidencia GeoFace/fuente manual puede exponer biometría/GPS o ser usada sin autorización fuerte.** El plan propone `fuente_evidencia_id` y mostrar `OT/evidencia` en frontend, pero no separa metadatos de evidencia biométrica cruda ni define permisos específicos para fotos/coordenadas. Tampoco exige validación servidor para contradicciones MANUAL/AJUSTE vs GeoFace con motivo y usuario autorizado. CWE-200, CWE-359, CWE-863.

### ALTO
1. **RBAC insuficientemente especificado para endpoints nuevos.** “Agregar endpoint o extender detalle” y “registrar endpoint nuevo en RBAC si aplica” es débil. Debe definirse ruta, método, dependencia exacta y pruebas 401/403. Para evidencia/auditoría conviene permiso granular nuevo (`nomina_horas_extras.auditoria` o `.evidencia`) en `rbac_manifest.py` y `auditoria_manifest.py`, no solo `nomina_horas_extras.leer`.
2. **Validación de identificadores y enums incompleta.** Campos `cedula`, `codigo_calculado`, `fuente_horario`, `ot_codigo`, `novedad_codigo` y referencias de evidencia deben ser `Enum`/`Literal` o `Field(pattern=...)`; evitar strings libres para prevenir datos corruptos/inyección en reportes. CWE-20.
3. **Integridad de fuentes no modelada.** Un `fuente_evidencia_id integer nullable` no prueba si corresponde a `registros_asistencia`, documento manual, ERP o ajuste. Se requiere tipo de evidencia, FK/tabla de evidencia, estado verificado, timestamp de marca, zona, match exitoso/umbral, y hash de documento si es manual.

### MEDIO
1. **PII y minimización de datos en lectura/frontend no están definidos.** La pantalla de trazabilidad debería mostrar metadatos mínimos por defecto y ocultar salario/costos, coordenadas exactas, URLs de foto y nombres salvo permiso explícito; evitar persistencia en localStorage/caches de frontend.
2. **Consistencia monetaria/auditable.** El plan usa `numeric/float`; para horas/costos confirmados debe usarse `NUMERIC/Decimal` con escala fija y constraints/checks para que los totales semanales sean suma reproducible del detalle diario.
3. **Pruebas de seguridad faltantes.** Además de tests funcionales, agregar tests 401/403 por permiso granular, evidencia no accesible por lector común, MANUAL/AJUSTE sin motivo rechazado, intento de editar/anular snapshot deja evento y no borra evidencia.

## RBAC/config impact
- `rbac_manifest.py` ya contiene permisos granulares de Horas Extras (`leer`, `planificar`, `confirmar`, `compensar`, `admin`), pero el plan debe exigir un permiso adicional o una política explícita para evidencia/auditoría diaria si se expone GeoFace o GPS.
- Si se extiende `GET /horas-extras/calculos/{id}`, proteger snapshots con `requiere_permiso_he_leer`; si incluye evidencia biométrica o geolocalización, separar endpoint y exigir permiso más restrictivo.
- Registrar cobertura en `auditoria_manifest.py` para lectura de evidencia sensible y mutaciones de ajuste/anulación.

## Cambios sugeridos al plan antes de implementar
1. Redactar la cédula real y usar identificadores sintéticos en el documento.
2. Añadir sección “Seguridad y auditoría inmutable” con: append-only, no hard delete, corrección por evento, hash de snapshot, `creado_por`, `confirmado_por`, `origen_ip/request_id` si existe, y vínculo a workflow.
3. Definir contrato de endpoints: rutas/métodos, dependencia `Depends(requiere_permiso_he_*)`, permiso granular para evidencia, y pruebas 401/403.
4. Cambiar campos libres a enums/patrones y `Decimal/NUMERIC` para dinero/horas.
5. Separar evidencia GeoFace cruda de metadatos de auditoría; no retornar URLs de foto/GPS exacto en detalle diario estándar.
6. Hacer obligatorios motivo + usuario autorizado + evidencia/hash para `MANUAL` y `AJUSTE`, especialmente si contradicen GeoFace.

## Blocking reasons
- El plan contiene PII real.
- La inmutabilidad/auditoría no está expresada como requisito verificable.
- La exposición de evidencia GeoFace y permisos de lectura no están definidos con menor privilegio.

Severity: BLOQUEANTE
