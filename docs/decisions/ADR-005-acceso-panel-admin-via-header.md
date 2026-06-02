# ADR-005: Acceso a Panel de Administración vía Header — RBAC Dinámico y Anti-patrón sessionStorage

**Estado:** Propuesto
**Fecha:** 2026-06-02
**Autores:** opencode (orquestador), con feedback de security-rbac-reviewer, backend-reviewer, frontend-reviewer
**Plan relacionado:** `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header_v2.md`
**Bitácora:** `docs/bitacora/2026-06-02-acceso-administracion-header.md`

---

## Contexto

El endpoint `POST /api/v2/config/verify-admin` está protegido actualmente con `if usuario_actual.rol != "admin": raise HTTPException(403)`. Esto es funcional pero presenta tres problemas:

1. **Lista de roles administrativos duplicada** en al menos 5 archivos (4 frontend + 1 backend), con divergencias (e.g., `manager` aparece en `PortalLayout.tsx` y `Sidebar.tsx` pero NO en `ProtectedRoute.tsx`).
2. **Whitelist hardcodeada** ignora el motor RBAC dinámico del proyecto (`PermisoRol JOIN ModuloSistema WHERE categoria='panel'`), que ya existe en `admin_router.actualizar_analista` (líneas 121-156).
3. **Cambio de UX** (mover flecha de retroceso al logo) introduce el flag `sessionStorage.fromAdmin` como gate cosmético, que nunca se limpia en logout, abriendo un vector de session fixation.

Adicionalmente, se debe ampliar la whitelist para que roles como `analyst`, `director`, `admin_sistemas`, `admin_mejoramiento` también puedan re-verificar identidad antes de acceder al panel maestro (sus permisos de `categoria='panel'` ya se lo permiten).

---

## Decisión

### 1. RBAC dinámico como Single Source of Truth (SSOT)

**Decisión:** El endpoint `/verify-admin` **NO** mantiene una whitelist hardcodeada de roles. En su lugar, consulta el motor RBAC dinámico:

```python
# backend_v2/app/services/auth/servicio.py
@staticmethod
async def tiene_acceso_panel_admin(db: AsyncSession, usuario: Usuario) -> bool:
    stmt = (
        select(PermisoRol.rol)
        .join(ModuloSistema, ModuloSistema.id == PermisoRol.modulo)
        .where(
            PermisoRol.rol == usuario.rol,
            PermisoRol.permitido == True,
            ModuloSistema.categoria.in_(["panel", "analistas"]),
        )
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none() is not None
```

**Justificación:**
- Cualquier admin puede revocar el acceso a `panel_maestro` para un rol vía UI de permisos → el cambio surte efecto inmediato en `/verify-admin` sin tocar código.
- Elimina la duplicación en 5+ archivos.
- Coherente con `skill_rbac_autodiscovery`.
- El motor RBAC ya existe y está probado.

### 2. `manager` queda fuera de la whitelist por defecto

**Decisión:** El plan v1 proponía añadir `manager` a la whitelist. Se **rechaza** porque:
- `ProtectedRoute.tsx:23` (isAdminRole) **NO** incluye `manager`.
- El seed `RolSistema` en `admin_router.py:271-280` tampoco lo incluye como rol administrativo.
- Incluirlo solo en `/verify-admin` pero no en el resto de guards = bypass silencioso latente.

**Procedimiento futuro** (documentado para futuros mantenedores): si un `manager` necesita acceso al panel, debe:
1. Añadir `manager` a `RolSistema` seed.
2. Asignar permisos `categoria='panel'` desde la UI de admin.
3. El endpoint `/verify-admin` lo aceptará automáticamente vía RBAC dinámico.

### 3. `sessionStorage.fromAdmin` se mantiene pero con ciclo de vida explícito

**Decisión:** El flag es un artefacto puramente cosmético (UX para mostrar/ocultar la flecha de retorno). **No** se usa para autorizar nada en el backend. La autorización real es `/verify-admin` + JWT + RBAC en cada endpoint protegido.

**Ciclo de vida obligatorio:**
- **Set:** en `onUnlock` exitoso de `AdminLoginLock` (`sessionStorage.setItem('fromAdmin', 'true')`).
- **Read:** en `handleLogoClick` de `PortalLayout.tsx` (lazy init + onClick).
- **Clear:** en TODOS los handlers de logout:
  - `AppContext.tsx` reducer `LOGOUT` (línea ~154)
  - `Sidebar.tsx` `handleLogout` (línea ~52)
  - `ServicePortal.tsx` `onLogout` (línea ~154)
- **Clear en cleanup:** `useEffect` cleanup en `PortalLayout` al desmontar.

**Riesgo aceptado:** un XSS o bookmarklet podría setear `fromAdmin=true` para saltarse el modal, pero **no escala privilegios** porque el backend re-valida en cada endpoint protegido. El flag solo ahorra un paso de UI.

### 4. Rate limiting + audit log obligatorios en `/verify-admin`

**Decisión:** Se añade `slowapi` middleware con límite 5 intentos/5 minutos por `(usuario_id, IP)`. Se crea tabla `auditoria_evento` para registrar todo intento (éxito/fallo) con `timestamp`, `usuario_id`, `rol`, `ip`, `user_agent`, `resultado`. **Nunca** se loguea la contraseña (ni en claro ni hasheada).

---

## Consecuencias

### Positivas
- ✅ Una sola fuente de verdad para roles administrativos.
- ✅ Cambios de permisos por admin surten efecto sin redeploy.
- ✅ Vector de fuerza bruta mitigado con rate limiting.
- ✅ Trazabilidad completa para auditorías de seguridad.
- ✅ No más drift entre listas hardcodeadas.

### Negativas (aceptadas)
- ⚠️ Mayor complejidad en el endpoint (rate limit, audit, RBAC dinámico).
- ⚠️ Tabla `auditoria_evento` requiere migración Alembic.
- ⚠️ `sessionStorage.fromAdmin` sigue siendo un olor a session fixation, pero con ciclo de vida explícito.
- ⚠️ `manager` queda fuera del alcance (justificadamente).

### Neutras
- El contrato HTTP de `/verify-admin` no cambia → no rompe clientes.
- La UI del header cambia visiblemente (flecha → logo interactivo) pero el flujo funcional es el mismo.
- **Migración:** la tabla `auditoria_evento` se crea mediante el sistema propio de migraciones del proyecto en `app/core/migrations/manager.py` (función `crear_tabla_auditoria_evento(conn)`), NO con Alembic. Esto es coherente con el patrón existente (`actividades_migration.py`, `structural_blindaje.py`, `saneamiento_secuencias.py`).

---

## Alternativas Consideradas

### A) Mantener whitelist hardcodeada con 5 roles
- **Pro:** Cambio más simple, sin migración.
- **Contra:** Drift inevitable, bypass silencioso si un rol se olvida, contradice `skill_rbac_autodiscovery`.
- **Rechazada.**

### B) Reemplazar `sessionStorage.fromAdmin` por cookie HttpOnly firmada
- **Pro:** Resistente a XSS, manejo automático de expiración.
- **Contra:** Requiere cambio mayor en la arquitectura de auth (middleware de cookies, CSRF tokens), fuera del alcance del plan.
- **Rechazada** (para este plan; recomendada para roadmap futuro).

### C) Mover el "gate" a un botón explícito con icono `ShieldCheck` en lugar del logo
- **Pro:** UX más clara, menos propensa a clicks accidentales.
- **Contra:** Añade elemento visual nuevo, contradice el objetivo del plan (simplificar header).
- **Rechazada.**

### D) Usar tokens de corta duración (JWT con claim `scope: "admin_unlock"`, TTL 5min)
- **Pro:** El frontend no necesita reenviar password en cada acción.
- **Contra:** Refactor mayor en `ModuleMasterPanel`, fuera de alcance.
- **Rechazada** (para este plan; recomendada para roadmap futuro).

### E) 2FA para los 5 roles administrativos
- **Pro:** Seguridad máxima.
- **Contra:** Cambio masivo, requiere app authenticator o SMS provider, impacto en UX.
- **Rechazada** (para este plan; roadmap Q3 2026).

---

## Notas de Implementación

- **Migración Alembic:** crear tabla `auditoria_evento` con PK, FK a `usuarios.id`, índice en `(usuario_id, timestamp)`.
- **slowapi:** añadir dependencia en `pyproject.toml`, configurar en `main.py` con `Limiter(key_func=get_remote_address)`.
- **Hook `useIsAdmin`:** consumir el rol desde `AppContext` y centralizar la lista en `frontend/src/constants/roles.ts` (espejo del backend).
- **Tests obligatorios:** 13 backend (RBAC) + 8 security (rate limit, audit, anti-leak) + 8 frontend (PortalLayout) + 9 a11y (AdminLoginLock) + 3 hook = **41 tests**.

---

## Referencias

- `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header.md` (plan v1, rechazado)
- `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header_REVISIONES.md` (informe de revisión)
- `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header_v2.md` (plan v2, este ADR lo acompaña)
- `backend_v2/app/api/auth/config_router.py` (endpoint modificado)
- `backend_v2/app/api/auth/admin_router.py:121-156` (precedente de RBAC dinámico)
- `backend_v2/app/core/rbac_manifest.py` (manifiesto de módulos)
- `frontend/src/pages/ServicePortal/PortalLayout.tsx` (componente modificado)
- `frontend/src/components/auth/ProtectedRoute.tsx:23` (referencia para isAdminRole)
