# Security/RBAC rereview — Fase 1P, cuatro hallazgos

**Fecha:** 2026-07-17
**Alcance:** exclusivamente los cuatro hallazgos bloqueantes/altos previos del delta
**Veredicto técnico:** `APROBADO`

Security/RBAC review: approved

## Checklist results

- Auth en endpoints: N/A
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: N/A
- Secrets guard: ✅
- No print(): N/A
- PII redacted: ✅

## Cierre de hallazgos

1. `bootstrap_admin.py` ya no importa `ServicioAuth` ni configuración JWT: usa
   `bcrypt` directamente. El migrador conserva `ENVIRONMENT=production` sin
   recibir `JWT_SECRET_KEY`, y la regresión importa `app.manage` en un proceso
   productivo sin JWT.
2. `verificar_manifiesto_rbac` exige existencia del módulo, no activación. El
   UPSERT actualiza metadatos sin sobrescribir `esta_activo`, por lo que un
   módulo no crítico inactivo permanece como estado válido.
3. Bootstrap y `verificar_admin_preexistente` exigen exclusivamente un usuario
   activo con rol `admin`, consistente con endpoints y procedimientos
   `SECURITY DEFINER` administrativos.
4. El desbloqueo deriva `_identificador_cedula()` y busca/elimina las claves por
   el identificador SHA-256, sin volver a introducir la cédula en las claves.

## Evidencia considerada

- Suites focales aportadas: **47 passed**.
- Aceptación PostgreSQL/Redis/FastAPI real: **1 passed en 215.25 s**.
- Esta rerevisión read-only inspeccionó el working tree; no reejecutó pruebas.

## Blocking reasons

Ninguno en el delta acotado. La deuda fuera de alcance permanece documentada y
no se utilizó para condicionar este veredicto.

Findings: 0 BLOQUEANTE, 0 ALTO, 0 MEDIO, 0 BAJO.
RBAC/config impact: los cuatro contratos quedaron alineados.
Severity: BAJO
