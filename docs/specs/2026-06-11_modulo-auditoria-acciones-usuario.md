# Especificación Técnica: Módulo de Auditoría de Acciones de Usuario

## Estado
- **Fase**: SPECIFY (pendiente aprobación humana para PLAN → EXECUTE)
- **Autor**: Agente IA (sesión con el usuario)
- **Fecha**: 2026-06-11

---

## 1. Contexto y diagnóstico

### 1.1 Situación actual (fragmentada)

| Artefacto | Alcance | Limitación |
|---|---|---|
| `auditoria_eventos` | Solo eventos sensibles de auth (`/verify-admin`, tokens MCP) | Schema rígido (`resultado`, `motivo`, `endpoint`); no sirve para CRUD general |
| `registro_actividades` | Bitácora de seguimiento por **desarrollo** | Dominio de negocio, no trazabilidad de usuario |
| `reservation_audit` | Cambios en reservas de salas | Aislado al módulo |
| `historial_tickets` | Cambios en tickets | Aislado al módulo |
| `nomina_auditoria_estado` | Transiciones de workflow de nómina | Aislado al módulo |

**Conclusión:** No existe un registro transversal de *qué hizo cada usuario, en qué módulo, sobre qué entidad y con qué resultado*.

### 1.2 Objetivo

Construir un **módulo centralizado de auditoría** que registre las acciones de los usuarios autenticados en el sistema, con:

- Trazabilidad legal a largo plazo (sin FK a `usuarios` — mismo criterio que `auditoria_eventos`)
- Consulta y filtrado para administradores
- Inserción **no bloqueante** (fallo del log nunca tumba la operación de negocio)
- Enmascaramiento de PII y secretos (contraseñas, tokens, datos financieros sensibles)

---

## 2. Alcance funcional

### 2.1 Qué se audita (Fase 1 — MVP)

| Categoría | Acciones | Método de captura |
|---|---|---|
| **Auth** | login exitoso/fallido, logout, cambio contraseña | Explícito en `ServicioAuth` + middleware |
| **Mutaciones HTTP** | POST, PUT, PATCH, DELETE en `/api/v2/*` | Middleware HTTP |
| **Consultas sensibles** | Exportaciones, descargas masivas, listados admin | Explícito en servicios (opt-in por endpoint) |
| **RBAC** | Cambio de rol/permisos de usuario | Explícito en servicios de admin |

### 2.2 Qué NO se audita (Fase 1)

- GET de lectura rutinaria (generaría millones de filas sin valor)
- Health checks, `/docs`, assets estáticos
- Cuerpos completos de archivos binarios (solo metadata: nombre, tamaño, hash opcional)
- Acciones del job de métricas en background (sin usuario)

### 2.3 UI (Fase 1)

Página de panel **"Auditoría del Sistema"** con:

- Tabla paginada con filtros: fecha, usuario, módulo, acción, entidad, resultado
- Detalle de un evento (diff JSON `datos_anteriores` / `datos_nuevos` cuando aplique)
- Solo roles con permiso `auditoria_sistema.ver`

---

## 3. Modelo de datos

### 3.1 Tabla `auditoria_acciones_usuario`

```sql
CREATE TABLE IF NOT EXISTS auditoria_acciones_usuario (
    id              SERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Actor (sin FK — retención legal)
    usuario_id      VARCHAR(50) NOT NULL,
    usuario_nombre  VARCHAR(255),
    rol             VARCHAR(50),
    -- Qué hizo
    modulo          VARCHAR(80) NOT NULL,      -- ej: 'tickets', 'desarrollos', 'auth'
    accion          VARCHAR(50) NOT NULL,    -- enum: crear|actualizar|eliminar|consultar|exportar|login|logout|otro
    entidad_tipo    VARCHAR(80),             -- ej: 'ticket', 'desarrollo', 'usuario'
    entidad_id      VARCHAR(100),            -- ID de la entidad afectada
  -- Contexto HTTP
    metodo_http     VARCHAR(10),
    ruta            VARCHAR(255),
    codigo_respuesta SMALLINT,
    resultado       VARCHAR(20) NOT NULL DEFAULT 'exito',  -- exito|fallo|denegado
    -- Trazabilidad
    direccion_ip    VARCHAR(45),
    agente_usuario  TEXT,
    correlacion_id  VARCHAR(36),             -- UUID por request (header X-Request-ID o generado)
    -- Datos del cambio (JSONB, enmascarados)
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    metadatos        JSONB                   -- contexto extra libre
);

CREATE INDEX IF NOT EXISTS idx_aud_acc_usuario_ts ON auditoria_acciones_usuario (usuario_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aud_acc_modulo_ts  ON auditoria_acciones_usuario (modulo, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_aud_acc_entidad    ON auditoria_acciones_usuario (entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_aud_acc_timestamp  ON auditoria_acciones_usuario (timestamp DESC);
```

**Notas de diseño:**
- `auditoria_eventos` **se mantiene** para eventos de seguridad críticos (verify-admin, MCP). Opcionalmente Fase 2 puede unificar vistas.
- Campos sensibles en JSONB pasan por `enmascarar_pii()` existente en `ServicioAuth`.
- Lista negra de claves JSON: `password`, `contrasena`, `access_token`, `token`, `secret`, `clave`.

### 3.2 Enum `AccionAuditoria`

```python
class AccionAuditoria(str, Enum):
    CREAR = "crear"
    ACTUALIZAR = "actualizar"
    ELIMINAR = "eliminar"
    CONSULTAR = "consultar"
    EXPORTAR = "exportar"
    LOGIN = "login"
    LOGOUT = "logout"
    OTRO = "otro"
```

---

## 4. Arquitectura backend

### 4.1 Capas (patrón existente)

```
router (auditoria) → servicio (ServicioAuditoria) → modelo (AuditoriaAccionUsuario)
middleware (http)  → servicio (fire-and-forget)
otros servicios    → servicio (llamada explícita con contexto rico)
```

### 4.2 `ServicioAuditoria`

```python
class ServicioAuditoria:
    @staticmethod
    async def registrar(
        db: AsyncSession,
        *,
        usuario_id: str,
        modulo: str,
        accion: AccionAuditoria,
        resultado: str = "exito",
        usuario_nombre: str | None = None,
        rol: str | None = None,
        entidad_tipo: str | None = None,
        entidad_id: str | None = None,
        metodo_http: str | None = None,
        ruta: str | None = None,
        codigo_respuesta: int | None = None,
        direccion_ip: str | None = None,
        agente_usuario: str | None = None,
        correlacion_id: str | None = None,
        datos_anteriores: dict | None = None,
        datos_nuevos: dict | None = None,
        metadatos: dict | None = None,
    ) -> None:
        """Inserta evento. NUNCA propaga excepción al caller."""
```

### 4.3 Middleware HTTP (`AuditoriaMiddleware`)

Flujo:

1. Generar/leer `correlacion_id` (header `X-Request-ID` o `uuid4`)
2. Ejecutar request
3. Si `method in (POST, PUT, PATCH, DELETE)` y ruta bajo `/api/v2/`:
   - Extraer `usuario_id` de `request.state` (ya poblado por `obtener_usuario_actual_db`)
   - Inferir `modulo` del primer segmento de ruta (`/api/v2/tickets/...` → `tickets`)
   - Inferir `accion` del método HTTP
   - Registrar con `codigo_respuesta` del response
4. Rutas excluidas: `/health`, `/docs`, `/openapi.json`, `/api/v2/auth/login` (login se audita explícitamente con más detalle)

### 4.4 API de consulta

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/v2/auditoria/eventos` | `auditoria_sistema.ver` | Listado paginado con filtros |
| GET | `/api/v2/auditoria/eventos/{id}` | `auditoria_sistema.ver` | Detalle de un evento |

**Query params:** `usuario_id`, `modulo`, `accion`, `entidad_tipo`, `entidad_id`, `fecha_desde`, `fecha_hasta`, `resultado`, `page`, `page_size`.

### 4.5 RBAC (`rbac_manifest.py`)

```python
{
    "id": "auditoria_sistema",
    "nombre": "Auditoría del Sistema",
    "categoria": "panel",
    "es_critico": True,
    "descripcion": "Consulta de trazabilidad de acciones realizadas por usuarios en el sistema.",
}
```

Permisos: `auditoria_sistema.ver` (solo lectura; los logs son append-only).

---

## 5. Arquitectura frontend

### 5.1 Ruta y navegación

- Ruta: `/panel/auditoria`
- Entrada en menú del panel de administración (visible solo con permiso)
- Página: `frontend/src/pages/AuditoriaSistema/`

### 5.2 Componentes

| Componente | Tipo | Responsabilidad |
|---|---|---|
| `AuditoriaSistemaPage` | page | Orquestación, filtros, paginación |
| `AuditoriaEventosTable` | molecule | Tabla con `skill_high_performance_tables` |
| `AuditoriaEventoDetalle` | molecule | Modal/drawer con diff JSON |
| `useAuditoriaEventos` | hook | Fetch + filtros + paginación |
| `auditoriaService.ts` | service | Cliente Axios |

---

## 6. Plan de implementación (checklist atómico)

### Fase 1 — Backend (TDD)
1. [ ] Migración idempotente `auditoria_acciones_usuario_migration.py`
2. [ ] Modelo `AuditoriaAccionUsuario` + schemas Pydantic
3. [ ] `ServicioAuditoria` con enmascaramiento y try/except
4. [ ] Tests: inserción, enmascaramiento PII, no-propaga-excepción, paginación
5. [ ] Middleware HTTP
6. [ ] Router `/api/v2/auditoria`
7. [ ] Registro en `rbac_manifest.py` + `main.py`
8. [ ] Integración explícita en `login_router` y `profile_router` (cambio contraseña)

### Fase 2 — Frontend
9. [ ] `auditoriaService.ts` + tipos
10. [ ] `AuditoriaSistemaPage` con tabla y filtros
11. [ ] Ruta en `Router.tsx` + entrada menú admin
12. [ ] Tests Vitest del hook y tabla

### Fase 3 — Integración progresiva (post-MVP)
13. [ ] Llamadas explícitas en módulos críticos: `user-admin`, `admin_roles`, `desarrollos`, `tickets`
14. [ ] Retención: job de purga > 24 meses (configurable en `.env`)
15. [ ] Vista unificada que incluya `auditoria_eventos` legacy

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Volumen alto de filas | DB crece rápido | Excluir GET; particionar por mes (Fase 3); índices |
| Latencia por INSERT sync | UX degradada | INSERT en misma transacción solo si es barato; evaluar background task si >5ms |
| Log de secretos | Brecha de seguridad | Lista negra + `enmascarar_pii()` + tests de regresión |
| Usuario anónimo en middleware | Filas huérfanas | Solo auditar si `request.state.usuario_id` existe O es login explícito |

---

## 8. Criterios de aceptación (MVP)

- CA1: Toda mutación autenticada POST/PUT/PATCH/DELETE genera fila en `auditoria_acciones_usuario`
- CA2: Login exitoso y fallido quedan registrados con IP y user-agent
- CA3: Contraseñas y tokens **nunca** aparecen en `datos_anteriores`/`datos_nuevos`
- CA4: Fallo del INSERT de auditoría **no** afecta la respuesta HTTP de negocio
- CA5: Admin con permiso puede filtrar y paginar eventos desde la UI
- CA6: `pytest` y `npm run build` pasan sin errores

---

## 9. Decisiones pendientes (requieren input del usuario)

1. **¿Auditar GET de endpoints admin?** (ej. listado de usuarios) — recomendación: solo exportaciones y endpoints marcados con decorator `@auditar_consulta`
2. **¿Retención?** — recomendación: 24 meses online, archivo frío después
3. **¿Unificar `auditoria_eventos` en Fase 1 o mantener separado?** — recomendación: mantener separado en Fase 1, vista unificada en Fase 3
4. **¿Quién puede ver la auditoría?** — recomendación: solo `admin`, `superadmin`, `auditor` (rol nuevo opcional)
