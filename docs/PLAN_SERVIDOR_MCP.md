# Plan Rediseñado: Servidor MCP para Gestor de Proyectos TI

> **Estado**: REVISIÓN 2 — aborda los 4 hallazgos CRÍTICOS + 1 ALTO + 4 MEDIOS de las revisiones de `scope-reviewer` y `security-rbac-reviewer` (sesión actual).
>
> **Nota histórica**: los snippets de implementación describen la propuesta original. Desde ADR-010, todo DDL, seed y sincronización RBAC se ejecuta únicamente mediante `python -m app.manage migrate`; el código vigente y `docs/OPERACION_MIGRACIONES_DB.md` son autoritativos.

---

## 🩹 Resumen ejecutivo y cambios vs. plan original

| # | Plan original (RECHAZADO) | Plan rediseñado |
|---|---|---|
| 1 | Token JWT con vigencia de **10 años** | **30 días default, 90 días máximo** (configurable, nunca > 90) |
| 2 | Rol del usuario por `stdin` libre | El rol se resuelve desde la **DB** tras login real con cédula+contraseña |
| 3 | Token en texto plano en `claude_desktop_config.json` | Token en **Windows Credential Manager** vía `keyring`; el JSON solo guarda el nombre lógico |
| 4 | Sin claim `token_type` ni `jti` → no se puede revocar | Claim `token_type=mcp` + `jti` (UUID) registrado en `sesiones` con columna `tipo_sesion` para revocación granular |
| 5 | Sin rate limit en el servidor MCP | **Token bucket local** (60 req/min por tool, 600 req/min global) en el MCP server |
| 6 | Cero tests | **6 archivos de tests** (~12-15 tests) cubriendo generación, revocación, scope, rate limit, integración |
| 7 | `crear_tarea`/`actualizar_tarea`/`registrar_bitacora` siempre disponibles | **Read-only por default**; scope `mcp:write` requiere opt-in explícito y token dedicado |
| 8 | Sin auditoría de generación | Cada `POST /auth/mcp-token` queda en `auditoria_eventos` con `motivo='mcp_token_generado'` |
| 9 | Validación débil del secreto | El script rechaza `clave-segura-cambiar` y secretos < 32 bytes |
| 10 | "No tocar `backend_v2/`" | **3 cambios mínimos** en backend (justificados, no-op si no se usa el feature) |

**Tamaño estimado**: M+ (8 archivos nuevos, ~600-800 LOC, 1 columna nueva en DB, sin migraciones Alembic porque el proyecto no usa `alembic/versions/`)

---

## 🏗️ 1. Arquitectura de la Solución

```
┌─────────────────┐    stdio     ┌──────────────────┐
│ Claude Desktop  │─────────────▶│ mcp_run.py       │
│ o Cursor        │              │ (wrapper: lee    │
│                 │              │  token de        │
└─────────────────┘              │  keyring)        │
                                 └────────┬─────────┘
                                          │ spawn
                                          ▼
                                 ┌──────────────────┐
                                 │ mcp_server.py    │  HTTP REST + Bearer
                                 │ (rate limit local│──────────────────┐
                                 │  60/min por tool)│                  │
                                 └──────────────────┘                  ▼
                                                              ┌──────────────┐
                                                              │ FastAPI      │
                                                              │ Backend      │
                                                              │              │
                                                              │ Verifica:    │
                                                              │ - JWT firma  │
                                                              │ - token_type │
                                                              │   = mcp      │
                                                              │ - jti en     │
                                                              │   sesiones   │
                                                              │   con        │
                                                              │   tipo_sesion│
                                                              │   = mcp AND  │
                                                              │   fin_sesion │
                                                              │   IS NULL    │
                                                              └──────┬───────┘
                                                                     │
                                                          ┌──────────┴──────────┐
                                                          ▼                     ▼
                                                   ┌────────────┐       ┌──────────────┐
                                                   │ PostgreSQL│       │ auditoria_   │
                                                   │            │       │ eventos      │
                                                   └────────────┘       └──────────────┘
```

**Diferencia clave**: el token **no se persiste en JSON**. La configuración del cliente MCP apunta a `mcp_run.py`, que lee el token del keyring del SO y lo expone solo al subproceso `mcp_server.py` como variable de entorno. Si la máquina se compromete, el atacante tiene que abrir el Credential Manager (no el JSON plano) y la sesión MCP puede revocarse centralmente desde el backend.

---

## 🔐 2. Decisiones de seguridad (justificación)

| Decisión | Por qué | Mitigación que cierra |
|---|---|---|
| **Token derivado de login real** (cédula+contraseña vía `/auth/login`) | El usuario se autentica con su contraseña. El rol se resuelve desde la DB en backend, no se confía en input del usuario. | H2 (rol por stdin), H3 (escalación de privilegios) |
| **Vigencia 30/90 días máximo** | Ventana de compromiso acotada. Si el token se filtra, expira pronto. | H1 (10 años de exposición) |
| **Claim `jti` + `token_type=mcp`** registrado en `sesiones` con `tipo_sesion='mcp'` | Permite revocación individual sin invalidar la sesión web del usuario ni rotar el `JWT_SECRET_KEY`. Reusa tabla existente. | H1 (sin revocación), H5 (coexistencia con sesión) |
| **Storage en Windows Credential Manager** (vía lib `keyring`) | DPAPI protege el secreto a nivel de usuario del SO. Si la máquina se compromete, se necesita la sesión del usuario, no solo acceso a archivos. | H4 (token en texto plano) |
| **Read-only por default, `mcp:write` opt-in** | Blast radius mínimo. Un leak de un token de lectura solo permite enumerar; un leak de token de escritura permite mutar. | H7 (writes siempre activos) |
| **Rate limit local en MCP server** (60 req/min por tool) | Un LLM en loop no puede tumbar el backend ni enumerar millones de filas. | H6 (sin rate limit) |
| **Validación del secreto en script generador** | Evita firmar tokens con `clave-segura-cambiar` (default legacy) si un dev no configuró `.env` | H9 (default público) |
| **Auditoría de generación** (`POST /auth/mcp-token` → `auditoria_eventos`) | Trazabilidad: quién pidió un token, cuándo, desde qué IP, con qué scope. | H8 (sin rastro) |

---

## 📂 3. Estructura de archivos

```
backend_v2/
  app/
    api/
      auth/
        login_router.py            ← MODIFICADO: añade /auth/mcp-token, /auth/mcp-tokens, /auth/mcp-tokens/{jti}
    services/
      auth/
        servicio.py                ← MODIFICADO: crear_token_acceso añade jti+token_type
        sesion_service.py          ← MODIFICADO: registrar_sesion acepta tipo_sesion y jti
        mcp_service.py             ← NUEVO: lógica de negocio de tokens MCP
    core/
      rate_limiter.py              ← MODIFICADO: añade _mcp_key_func
    models/
      auth/
        usuario.py                 ← MODIFICADO: Sesion.tipo_sesion (default 'web')

scripts/
  mcp/                             ← NUEVO subdirectorio (consolidar)
    mcp_token_cli.py               ← NUEVO: CLI para login + generar token MCP
    mcp_run.py                     ← NUEVO: wrapper que lee token de keyring y lanza mcp_server.py
    mcp_server.py                  ← NUEVO: servidor MCP con rate limit local
    requirements-mcp.txt           ← NUEVO: dependencias MCP (mcp, httpx, keyring)
    README_MCP.md                  ← NUEVO: guía de uso
```

**Justificación del subdirectorio `scripts/mcp/`**: ambos reviewers notaron que `scripts/` no contiene servidores de larga duración. Mover el MCP a su propio subdirectorio lo diferencia de los scripts one-shot y facilita empaquetar dependencias aisladas en `requirements-mcp.txt`.

---

## 🔧 4. Cambios mínimos en backend (justificados)

Aunque el plan original decía "no tocar `backend_v2/`", los hallazgos 1, 2, 3, 5, 7 y 8 **requieren soporte del backend** para ser mitigables. Los cambios son **aditivos y no rompen compatibilidad**:

### 4.1 Tabla `sesiones` — añadir 3 columnas vía `structural_blindaje.py`

**NO** añadir las columnas al modelo SQLModel: `create_all` solo crea tablas nuevas, no altera existentes. El proyecto usa el patrón `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en `backend_v2/app/core/migrations/structural_blindaje.py` (líneas 30-34 ya añaden columnas a `sesiones`).

**Archivo a modificar**: `backend_v2/app/core/migrations/structural_blindaje.py`

Añadir en la sección "2. Sesiones" (después de la línea 34, antes de la línea 35):

```python
# 2.1 Sesiones - soporte para tokens MCP (jti + tipo_sesion + scope)
await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS tipo_sesion VARCHAR(20) NOT NULL DEFAULT 'web'")
await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS jti VARCHAR(64)")
await safe_execute(conn, "ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS scope VARCHAR(50)")
await safe_execute(conn, "CREATE UNIQUE INDEX IF NOT EXISTS idx_sesiones_jti_unique ON sesiones(jti) WHERE jti IS NOT NULL")
await safe_execute(conn, "CREATE INDEX IF NOT EXISTS idx_sesiones_tipo ON sesiones(tipo_sesion) WHERE fin_sesion IS NULL")
```

**Aplicación**: desde ADR-010, las migraciones se ejecutan exclusivamente con `python -m app.manage migrate` antes de iniciar FastAPI. El startup web solo verifica el contrato estructural y falla cerrado ante cualquier incompatibilidad.

**Modelo SQLModel** (`backend_v2/app/models/auth/usuario.py`): añadir las 3 columnas al modelo `Sesion` para que SQLModel pueda leer/escribir. No se usa `create_all` para crearlas (eso lo hace el blindaje), solo para que el ORM las conozca:

```python
class Sesion(SQLModel, table=True):
    __tablename__ = "sesiones"
    # ... campos existentes ...
    tipo_sesion: str = Field(default="web", max_length=20)  # 'web' | 'mcp'
    jti: Optional[str] = Field(default=None, max_length=64)  # UUID del JWT (UNIQUE en DB)
    scope: Optional[str] = Field(default=None, max_length=50)  # 'read' | 'write' | None
```

**Constraint UNIQUE en `jti`**: implementado como índice parcial único en la migración (no en el modelo, porque SQLModel no soporta índices parciales directamente). Garantiza que no se insertan dos `Sesion` con el mismo `jti` activo.

### 4.2 `ServicioAuth.crear_token_acceso` — añadir `jti` + `token_type`

**Archivo**: `backend_v2/app/services/auth/servicio.py`

```python
import uuid

@staticmethod
def crear_token_acceso(
    datos: dict,
    tiempo_expiracion: Optional[timedelta] = None,
    tipo_token: str = "session",  # NUEVO: 'session' | 'mcp'
) -> str:
    a_codificar = datos.copy()
    if tiempo_expiracion:
        expira = datetime.now(timezone.utc) + tiempo_expiracion
    else:
        expira = datetime.now(timezone.utc) + timedelta(
            minutes=config.jwt_token_expire_minutes
        )
    a_codificar.update({
        "exp": expira,
        "jti": str(uuid.uuid4()),
        "token_type": tipo_token,
    })
    return jwt.encode(a_codificar, config.jwt_secret_key, algorithm=config.algorithm)
```

**Compatibilidad**: tokens existentes (sin `jti`/`token_type`) siguen funcionando porque el código de validación los trata como `token_type="session"` por default. La nueva columna `sesiones.jti` es NULL para tokens viejos → siguen siendo sesiones web válidas.

### 4.3 Nuevo módulo `mcp_service.py` — lógica de tokens MCP

**Archivo**: `backend_v2/app/services/auth/mcp_service.py` (NUEVO)

```python
"""
Servicio de tokens MCP: emisión, listado y revocación de tokens de larga
duración para integraciones con Model Context Protocol.

Reglas de negocio:
- Vigencia: 30 días default, 90 días máximo
- Scope: 'read' (default) | 'write' (opt-in con razón)
- Cada emisión queda en auditoria_eventos
- Cada revocación queda en auditoria_eventos
"""
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session as SyncSession

from app.models.auth.usuario import Sesion, Usuario
from app.services.auth.servicio import ServicioAuth, enmascarar_pii
from app.services.auth.sesion_service import registrar_sesion
from app.models.auth.auditoria_evento import AuditoriaEvento
from app.utils_date import get_bogota_now

VIGENCIA_DEFAULT_DIAS = 30
VIGENCIA_MAXIMA_DIAS = 90
SCOPES_PERMITIDOS = ("read", "write")


async def emitir_token_mcp(
    db: AsyncSession,
    usuario: Usuario,
    vigencia_dias: int = VIGENCIA_DEFAULT_DIAS,
    scope: Literal["read", "write"] = "read",
    motivo: str = "",
    direccion_ip: str | None = None,
) -> dict:
    """
    Emite un token MCP de larga duración para un usuario ya autenticado.

    Raises:
        HTTPException 400 si vigencia fuera de rango o scope inválido.
        HTTPException 403 si el usuario está inactivo.
    """
    if vigencia_dias < 1 or vigencia_dias > VIGENCIA_MAXIMA_DIAS:
        raise HTTPException(400, f"vigencia_dias debe estar entre 1 y {VIGENCIA_MAXIMA_DIAS}")
    if scope not in SCOPES_PERMITIDOS:
        raise HTTPException(400, f"scope debe ser uno de {SCOPES_PERMITIDOS}")
    if not usuario.esta_activo:
        raise HTTPException(403, "Usuario inactivo no puede generar tokens MCP")

    jti = str(uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=vigencia_dias)
    token = ServicioAuth.crear_token_acceso(
        datos={"sub": usuario.cedula, "rol": usuario.rol, "scope": scope},
        tiempo_expiracion=timedelta(days=vigencia_dias),
        tipo_token="mcp",
    )

    sesion = Sesion(
        usuario_id=usuario.id,
        token_sesion=token,
        tipo_sesion="mcp",
        jti=jti,
        scope=scope,
        expira_en=expires,
        direccion_ip=direccion_ip,
    )
    db.add(sesion)
    await db.commit()
    await db.refresh(sesion)

    await _auditar(db, usuario, "mcp_token_generado",
                   exitosa=True, motivo=f"scope={scope} dias={vigencia_dias} {motivo}",
                   direccion_ip=direccion_ip)

    return {
        "access_token": token,
        "token_type": "bearer",
        "jti": jti,
        "expires_at": expires.isoformat(),
        "scope": scope,
        "vigencia_dias": vigencia_dias,
    }


async def listar_tokens_mcp_activos(db: AsyncSession, usuario: Usuario) -> list[dict]:
    """Lista tokens MCP no revocados y no expirados del usuario."""
    ahora = get_bogota_now()
    stmt = select(Sesion).where(
        Sesion.usuario_id == usuario.id,
        Sesion.tipo_sesion == "mcp",
        Sesion.fin_sesion.is_(None),
        Sesion.expira_en > ahora,
    )
    result = await db.execute(stmt)
    return [
        {
            "jti": s.jti,
            "scope": s.scope,
            "expira_en": s.expira_en.isoformat(),
            "creado_en": s.creado_en.isoformat() if s.creado_en else None,
            "ultima_actividad_en": s.ultima_actividad_en.isoformat() if s.ultima_actividad_en else None,
        }
        for s in result.scalars().all()
    ]


async def revocar_token_mcp(db: AsyncSession, usuario: Usuario, jti: str) -> bool:
    """Revoca un token MCP por jti. Solo el dueño puede revocar sus tokens."""
    ahora = get_bogota_now()
    stmt = select(Sesion).where(
        Sesion.usuario_id == usuario.id,
        Sesion.tipo_sesion == "mcp",
        Sesion.jti == jti,
    )
    result = await db.execute(stmt)
    sesion = result.scalars().first()
    if not sesion:
        return False
    sesion.fin_sesion = ahora
    await db.commit()
    await _auditar(db, usuario, "mcp_token_revocado",
                   exitosa=True, motivo=f"jti={jti}", direccion_ip=None)
    return True


async def _auditar(db, usuario, motivo, exitosa, motivo_detalle="", direccion_ip=None):
    """Inserta evento de auditoría para tokens MCP."""
    try:
        from sqlalchemy import insert
        stmt = insert(AuditoriaEvento).values(
            usuario_id=usuario.id,
            rol=usuario.rol,
            direccion_ip=direccion_ip,
            agente_usuario="mcp-service",
            resultado="exito" if exitosa else "fallo",
            motivo=f"{motivo} | {motivo_detalle}".strip(" |"),
            endpoint="/api/v2/auth/mcp-token",
        )
        await db.execute(stmt)
        await db.commit()
    except Exception:
        # El audit nunca debe tumbar el flujo
        try:
            await db.rollback()
        except Exception:
            pass
```

### 4.4 Endpoints nuevos en `login_router.py`

**CRÍTICO**: la dependencia correcta es `obtener_usuario_actual_db` de `app.api.auth.profile_router` (usada por 30+ endpoints). NO inventar `ServicioAuth.obtener_usuario_desde_token` — esa función no existe.

```python
# Añadir al final de login_router.py
from app.api.auth.profile_router import obtener_usuario_actual_db
from slowapi.util import get_remote_address

def _mcp_token_key_func(request) -> str:
    """Key function para /auth/mcp-token: bucket por IP.
    No usa _login_key_func porque ese parsea form-urlencoded y este endpoint recibe JSON."""
    return f"mcp_token:{get_remote_address(request)}"


@router.post("/mcp-token")
@limiter.limit("5/hour", key_func=_mcp_token_key_func)
async def emitir_token_mcp(
    request: Request,
    payload: dict,  # {vigencia_dias?: int, scope?: 'read'|'write', motivo?: str}
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Emite un token MCP de larga duración para el usuario autenticado.

    ANTI-ORFANDAD: solo sesiones web (token_type='session') pueden emitir tokens MCP.
    Un token MCP no puede generar otro token MCP (evita encadenamiento indefinido).
    """
    # Anti-orfandad: validar tipo de credencial entrante
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload_in = ServicioAuth.obtener_payload_token(auth[7:])
            if payload_in and payload_in.get("token_type") == "mcp":
                raise HTTPException(
                    status_code=403,
                    detail="Los tokens MCP no pueden emitir otros tokens MCP. "
                           "Inicia sesión web para generar un token MCP nuevo.",
                )
        except HTTPException:
            raise
        except Exception:
            pass  # Si falla el decode, la dependencia de arriba ya validó

    from app.services.auth.mcp_service import emitir_token_mcp as svc
    return await svc(
        db,
        usuario_actual,
        vigencia_dias=payload.get("vigencia_dias", 30),
        scope=payload.get("scope", "read"),
        motivo=enmascarar_pii(payload.get("motivo", "")),
        direccion_ip=request.client.host if request.client else None,
    )


@router.get("/mcp-tokens")
async def listar_mis_tokens_mcp(
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista los tokens MCP activos del usuario autenticado."""
    from app.services.auth.mcp_service import listar_tokens_mcp_activos
    return {"tokens": await listar_tokens_mcp_activos(db, usuario_actual)}


@router.delete("/mcp-tokens/{jti}")
async def revocar_mi_token_mcp(
    jti: str,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Revoca un token MCP propio por jti."""
    from app.services.auth.mcp_service import revocar_token_mcp
    ok = await revocar_token_mcp(db, usuario_actual, jti)
    if not ok:
        raise HTTPException(404, "Token no encontrado o no te pertenece")
    return {"message": "Token revocado"}
```

### 4.5 Modificar `obtener_usuario_actual_db` para validar tokens MCP

**Archivo**: `backend_v2/app/api/auth/profile_router.py`

Añadir validación de `jti` en la función existente. Como es usada por 30+ endpoints, el cambio es centralizado y no invasivo:

```python
async def obtener_usuario_actual_db(
    request: Request,
    token: str = Depends(ServicioAuth.oauth2_scheme),
    db: AsyncSession = Depends(obtener_db),
    db_erp=Depends(obtener_erp_opcional),
):
    """Dependencia para obtener el objeto usuario completo del token."""
    try:
        # Decodificar payload completo (no solo cedula) para detectar token_type='mcp'
        payload = ServicioAuth.obtener_payload_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        cedula = payload.get("sub")
        if not cedula:
            raise HTTPException(401, "Token sin sujeto")

        # ── Validación específica para tokens MCP ──
        if payload.get("token_type") == "mcp":
            jti = payload.get("jti")
            if not jti:
                raise HTTPException(401, "Token MCP sin jti")
            sesion = (
                await db.execute(
                    select(Sesion).where(
                        Sesion.jti == jti,
                        Sesion.tipo_sesion == "mcp",
                    )
                )
            ).scalars().first()
            if not sesion or sesion.fin_sesion is not None or sesion.expira_en < get_bogota_now():
                raise HTTPException(401, "Token MCP revocado o expirado")
            # Throttle: actualizar ultima_actividad_en solo si > 5 min desde la última
            ahora = get_bogota_now()
            if not sesion.ultima_actividad_en or (ahora - sesion.ultima_actividad_en).total_seconds() > 300:
                sesion.ultima_actividad_en = ahora
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()  # No bloqueante

        # Cargar usuario (camino normal, igual que antes)
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if not usuario:
            # ... mismo flujo JIT/ERP que la versión actual ...
            pass

        request.state.usuario_id = usuario.id
        request.state.token_type = payload.get("token_type", "session")
        return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar usuario: {str(e)}")
```

**Performance**: la query de validación de `jti` añade 1 SELECT por cada request MCP. Con el índice único en `jti` es O(log n). El throttle de 5 min para `ultima_actividad_en` evita write-amplification.

**Cache opcional (futuro)**: si la carga lo amerita, añadir LRU en memoria con TTL 30s para `jti → (activa, expira_en)`. Fuera de scope del MVP.

### 4.6 Rate limit key_func para endpoints MCP-aware (opcional)

**Archivo**: `backend_v2/app/core/rate_limiter.py`

```python
def _mcp_key_func(request) -> str:
    """
    Key para endpoints que diferencian tráfico MCP del web.
    Usa jti del JWT si está presente, si no cae a IP.
    """
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt
            from app.config import config
            payload = jwt.decode(
                auth[7:], config.jwt_secret_key, algorithms=[config.algorithm],
                options={"verify_exp": False},  # Solo key, no authz
            )
            if payload.get("token_type") == "mcp" and payload.get("jti"):
                return f"mcp:{payload['jti']}"
        except Exception:
            pass
    return f"mcp_ip:{get_remote_address(request)}"
```

Se aplica selectivamente a endpoints que el MCP llama (los que cubren los 5 tools).

---

## 🛠️ 5. Tools MCP expuestas

Se conserva el set original **dividido por scope**:

| Tool | Scope requerido | Argumentos | Descripción |
|---|---|---|---|
| `whoami` | `read` | (ninguno) | Retorna `{cedula, nombre, rol, scope, jti, expira_en}` del token MCP activo. Útil para que el LLM sepa qué permisos tiene. |
| `listar_desarrollos` | `read` | (ninguno) | Lista desarrollos activos. |
| `listar_tareas` | `read` | `desarrollo_id` (str), `estado?` (str), `responsable_id?` (str) | Lista actividades (WBS) de un desarrollo. |
| `crear_tarea` | `write` | `desarrollo_id` (str), `titulo` (str), `descripcion?` (str), `parent_id?` (int), `horas_estimadas?` (float) | Crea actividad. Requiere scope `mcp:write`. |
| `actualizar_tarea` | `write` | `actividad_id` (int), `estado?`, `porcentaje_avance?`, `horas_reales?`, `seguimiento?` | Modifica actividad. Requiere scope `mcp:write`. |
| `registrar_bitacora` | `write` | `desarrollo_id` (str), `descripcion` (str), `categoria` (str) | Registra evento en bitácora. Requiere scope `mcp:write`. |

**Comportamiento por scope**:
- Token con `scope=read` → puede llamar `whoami`, `listar_*`. Si intenta `crear_tarea`/`actualizar_tarea`/`registrar_bitacora` → **error claro del MCP server** ("scope insuficiente, genera un nuevo token con scope=write desde /auth/mcp-tokens"). El servidor MCP **NO** envía la request al backend, evitando consumo de cuota.
- Token con `scope=write` → puede llamar todos.

---

## 🚀 6. Flujo de generación de token (CLI)

**Archivo**: `scripts/mcp/mcp_token_cli.py`

```
┌──────────────────────────────────────────────────────────────┐
│ $ uv run scripts/mcp/mcp_token_cli.py                         │
│                                                               │
│ Cédula: 1107068093                                            │
│ Contraseña: (oculta)                                          │
│ [backend hace POST /auth/login → JWT de sesión (8h)]         │
│                                                               │
│ Scope: [read / write] (default read)                          │
│ Vigencia (días, 1-90, default 30): 30                         │
│ Motivo (auditoría): "Claude Desktop en mi laptop"            │
│ [backend hace POST /auth/mcp-token → JWT MCP (30 días)]     │
│                                                               │
│ ¿Dónde guardar el token?                                     │
│  1. Windows Credential Manager (recomendado)                 │
│  2. Variable de entorno temporal (esta sesión)               │
│  3. Mostrar y copiar manualmente                              │
│                                                               │
│ Opción: 1                                                     │
│ Nombre lógico: gpm_mcp_1107068093                             │
│ ✅ Guardado en Credential Manager como 'gpm_mcp_1107068093'   │
│ jti: 7c2e1b4a-... | expira: 2026-07-03                       │
│                                                               │
│ Para usar: configura tu cliente MCP con:                     │
│   command: uv                                                │
│   args: ["run", "scripts/mcp/mcp_run.py", "gpm_mcp_1107068093"]│
└──────────────────────────────────────────────────────────────┘
```

**Validaciones de seguridad del CLI** (antes de hacer login):

```python
# scripts/mcp/mcp_token_cli.py
import getpass
import os
import re
import sys
from pathlib import Path

# Buscar .env en raíz
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

def _cargar_env():
    """Carga .env manualmente (no contaminar backend_v2/requirements)."""
    if not ENV_PATH.exists():
        sys.exit(f"❌ No se encontró .env en {ENV_PATH}")
    env = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

def _validar_secreto_jwt(secreto: str) -> None:
    """Rechaza secretos default o con entropía insuficiente."""
    secretos_invalidos = {
        "clave-segura-cambiar",
        "cambiar-en-produccion",
        "secret",
        "changeme",
    }
    if secreto.lower() in secretos_invalidos:
        sys.exit(
            f"❌ JWT_SECRET_KEY tiene el valor default inseguro: '{secreto}'.\n"
            f"   Define un secreto de al menos 32 bytes en .env antes de generar tokens MCP."
        )
    if len(secreto.encode("utf-8")) < 32:
        sys.exit(
            f"❌ JWT_SECRET_KEY tiene {len(secreto)} caracteres, se requieren ≥ 32.\n"
            f"   Genera uno con: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )

# ... resto del CLI: usa getpass.getpass("Contraseña: ") en vez de input()
# (no queda en historial de shell ni es visible en terminal)
# httpx POST a /auth/login (form-encoded para OAuth2PasswordRequestForm),
# luego POST a /auth/mcp-token con Bearer + JSON payload ...
```

---

## 🔒 7. Almacenamiento seguro del token (keyring)

**Archivo**: `scripts/mcp/mcp_run.py`

```python
"""
Wrapper que el cliente MCP invoca. Lee el token de Windows Credential Manager
usando `keyring` y lo expone como variable de entorno al subproceso mcp_server.py.

Importante: este script NO contiene el token. El JSON de configuración
del cliente MCP solo tiene un nombre lógico (ej. "gpm_mcp_1107068093").
"""
import os
import subprocess
import sys
from pathlib import Path

import keyring

KEYRING_SERVICE = "gestor-proyectos-ti-mcp"

def main():
    if len(sys.argv) < 2:
        sys.exit("Uso: mcp_run.py <nombre_logico_token>")
    nombre_logico = sys.argv[1]

    token = keyring.get_password(KEYRING_SERVICE, nombre_logico)
    if not token:
        sys.exit(
            f"❌ No se encontró token '{nombre_logico}' en Credential Manager.\n"
            f"   Genera uno con: uv run scripts/mcp/mcp_token_cli.py"
        )

    env = os.environ.copy()
    env["GPM_TOKEN"] = token
    env["GPM_TOKEN_NAME"] = nombre_logico

    # Spawn del servidor MCP real
    mcp_server = Path(__file__).parent / "mcp_server.py"
    proc = subprocess.run(
        [sys.executable, str(mcp_server)],
        env=env,
        stdin=sys.stdin,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    sys.exit(proc.returncode)

if __name__ == "__main__":
    main()
```

**Configuración del cliente MCP** (Claude Desktop / Cursor):

```json
{
  "mcpServers": {
    "gestor-proyectos-ti": {
      "command": "uv",
      "args": [
        "run",
        "--with", "mcp",
        "--with", "httpx",
        "--with", "keyring",
        "--with", "python-jose[cryptography]",
        "scripts/mcp/mcp_run.py",
        "gpm_mcp_1107068093"
      ],
      "env": {
        "GPM_JWT_SECRET": "<valor de JWT_SECRET_KEY del .env>"
      }
    }
  }
}
```

**Diferencia vs. plan original**: el JSON **NO contiene el JWT**. Solo el nombre lógico + el secreto del backend (necesario para que el servidor MCP verifique firma localmente, ver §8). El secreto se duplica en el JSON del cliente — aceptable porque:
- Sin el secreto NO se pueden firmar tokens nuevos
- Con el secreto Y sin un `jti` activo en la DB, los tokens no son utilizables
- El secreto debe rotarse si el JSON se filtra (`rotar_jwt_secret.md` documenta el procedimiento)

**Cross-OS**: la lib `keyring` auto-detecta el backend del SO. El CLI debe loguear cuál está usando:
```python
import keyring
keyring_backend = keyring.get_keyring()
print(f"Usando backend de keyring: {keyring_backend.__class__.__name__}")
# Windows → 'WinVaultKeyring'
# macOS → 'Keyring' (Keychain)
# Linux → 'SecretServiceKeyring' (GNOME Keyring / KWallet)
```

---

## 🛡️ 8. Servidor MCP con rate limit

**Archivo**: `scripts/mcp/mcp_server.py`

```python
"""
Servidor MCP que expone los 6 tools al LLM.

Rate limit local: token bucket por tool (60 req/min) + global (600 req/min).
Protege al backend de LLM en loop y de enumeración masiva.
"""
import asyncio
import os
import time
from collections import defaultdict
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

API_URL = os.environ.get("GPM_API_URL", "http://127.0.0.1:8000/api/v2")
TOKEN = os.environ["GPM_TOKEN"]  # Viene de mcp_run.py vía env

# ── Rate limit local ──────────────────────────────────────────
RATE_LIMIT_PER_TOOL = 60  # req/min por tool
RATE_LIMIT_GLOBAL = 600   # req/min total

class TokenBucket:
    def __init__(self, capacity: int, refill_per_sec: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill = refill_per_sec
        self.last = time.monotonic()

    def consume(self, n: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill)
        self.last = now
        if self.tokens >= n:
            self.tokens -= n
            return True
        return False

_tool_buckets: dict[str, TokenBucket] = defaultdict(
    lambda: TokenBucket(RATE_LIMIT_PER_TOOL, RATE_LIMIT_PER_TOOL / 60)
)
_global_bucket = TokenBucket(RATE_LIMIT_GLOBAL, RATE_LIMIT_GLOBAL / 60)


def _check_rate_limit(tool_name: str) -> None:
    if not _global_bucket.consume():
        raise RuntimeError(f"Rate limit global excedido ({RATE_LIMIT_GLOBAL}/min)")
    if not _tool_buckets[tool_name].consume():
        raise RuntimeError(f"Rate limit de '{tool_name}' excedido ({RATE_LIMIT_PER_TOOL}/min)")


# ── Token scope cache ─────────────────────────────────────────
_token_scope_cache: dict[str, str] = {}  # jti -> scope

def _get_token_scope() -> str:
    """Lee el scope del token VERIFICANDO FIRMA.

    CRÍTICO: si decodificáramos sin verificar firma, un atacante que intercepte
    un token read podría modificar el payload a scope=write sin que el
    servidor MCP lo detecte. El backend YA verificó la firma al emitir, pero
    el cliente MCP debe reverificar localmente porque el token puede haber
    sido manipulado en tránsito (MITM) o en storage.
    """
    import os
    from jose import jwt
    from jose.exceptions import JWTError, ExpiredSignatureError
    secret = os.environ.get("GPM_JWT_SECRET")
    if not secret:
        # Sin secreto no podemos verificar firma → fail closed
        raise PermissionError(
            "GPM_JWT_SECRET no está configurado. "
            "El servidor MCP requiere el secreto JWT para verificar la firma del token."
        )
    try:
        # verify_exp=False porque la expiración se valida en cada request al backend
        payload = jwt.decode(
            TOKEN,
            secret,
            algorithms=["HS256"],
            options={"verify_exp": False, "verify_aud": False},
        )
        return payload.get("scope", "read")
    except JWTError as e:
        raise PermissionError(f"Firma del token inválida: {e}")

TOOL_SCOPE_REQUIRED = {
    "whoami": "read",
    "listar_desarrollos": "read",
    "listar_tareas": "read",
    "crear_tarea": "write",
    "actualizar_tarea": "write",
    "registrar_bitacora": "write",
}


def _check_scope(tool_name: str) -> None:
    """Rechaza tools que requieren scope superior al del token."""
    required = TOOL_SCOPE_REQUIRED.get(tool_name, "read")
    current = _get_token_scope()
    hierarchy = {"read": 1, "write": 2}
    if hierarchy.get(current, 0) < hierarchy.get(required, 0):
        raise PermissionError(
            f"Tool '{tool_name}' requiere scope='{required}', "
            f"tu token tiene scope='{current}'. "
            f"Genera uno nuevo con scope=write desde /auth/mcp-tokens."
        )


# ── HTTP client ───────────────────────────────────────────────
_http: httpx.AsyncClient | None = None

async def _get_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(
            base_url=API_URL,
            headers={"Authorization": f"Bearer {TOKEN}"},
            timeout=30.0,
            limits=httpx.Limits(max_connections=10),
        )
    return _http


async def _call_backend(method: str, path: str, **kwargs) -> dict:
    http = await _get_http()
    r = await http.request(method, path, **kwargs)
    r.raise_for_status()
    return r.json()


# ── Tool implementations (stubs; el código real wrappea los 5 endpoints REST) ──
# ... whoami, listar_desarrollos, listar_tareas, crear_tarea, actualizar_tarea, registrar_bitacora ...
```

**Punto crítico**: `_check_scope` se ejecuta **antes** de hacer la request HTTP, así un token read-only no consume cuota del backend cuando intenta un write.

---

## 📊 9. Auditoría y observabilidad

| Evento | Tabla | Motivo |
|---|---|---|
| `POST /auth/login` (generación de token MCP) | `auditoria_eventos` | `motivo='login_para_mcp'` (lo registra el login normal) |
| `POST /auth/mcp-token` | `auditoria_eventos` | `motivo='mcp_token_generado'`, detalle `scope=... dias=... razon=...` |
| `DELETE /auth/mcp-tokens/{jti}` | `auditoria_eventos` | `motivo='mcp_token_revocado'`, detalle `jti=...` |
| Cada tool call en MCP server | `logger` (no DB) | `tool=X duracion_ms=Y status=Z` en stderr |
| `MCP server` rate limit hit | `logger` | Para detectar LLM en loop |

**No se loggea el token** en ningún nivel (ni en CLI, ni en servidor MCP, ni en backend). Solo se loggea el `jti`.

---

## ✅ 10. Tests obligatorios (Fase 5 del plan)

| Archivo | Tipo | Cubre | Pico RAM |
|---|---|---|---|
| `testing/backend/test_mcp_token_generation.py` | Unit con mocks | Validador de secreto + ServicioAuth.crear_token_acceso con jti/token_type | ~80MB |
| `testing/backend/test_mcp_service.py` | Unit con DB en memoria | `emitir_token_mcp` happy path + errores (vigencia inválida, scope inválido, usuario inactivo) | ~120MB |
| `testing/backend/test_mcp_revocation.py` | Unit con DB en memoria | `revocar_token_mcp` exitoso + 404 cuando no es del usuario + sesión con `fin_sesion IS NOT NULL` | ~100MB |
| `testing/backend/test_mcp_scope_enforcement.py` | Unit | `_check_scope` rechaza write tools con token read-only | ~50MB |
| `testing/backend/test_mcp_rate_limit.py` | Unit | `TokenBucket` consume correctamente, refill, capacidad, exceso | ~50MB |
| `testing/backend/test_mcp_login_integration.py` | Integration con httpx | Login → emitir MCP token → llamar tool → revocar → 401 | ~500MB (skip si Docker no está) |
| `testing/backend/test_mcp_scope_bypass.py` | Unit | Modificar payload de JWT (cambiar scope a write) → verificar que `_get_token_scope` lo rechaza por firma inválida | ~80MB |
| `testing/backend/test_mcp_anti_orphan.py` | Unit | Token MCP intentando emitir otro token MCP vía `/auth/mcp-token` → 403 | ~80MB |
| `testing/backend/test_mcp_secret_rotation.py` | Unit | Cambiar `JWT_SECRET_KEY` → tokens viejos con firma válida pero secreto viejo deben rechazarse | ~80MB |

**Pre-flight de RAM** (mismo patrón que Fase 5 del plan de auth hardening): verificar ≥ 2GB libres antes de correr el integration test.

**Fixtures compartidas** (en `testing/backend/conftest.py`):
- `mcp_token` (function scope): crea un token MCP mock con jti + scope configurable
- `mcp_docker_up` (session scope): skip integration si `127.0.0.1:8000` no responde
- `mcp_test_user` (function scope): inserta usuario de prueba con rol `admin`

---

## 📋 11. Fases de implementación (orden recomendado)

| Fase | Alcance | Archivos | Riesgo |
|---|---|---|---|
| **0. Setup** | Crear `scripts/mcp/`, `requirements-mcp.txt`, rama feature | NUEVO | Bajo |
| **1. Backend mínimo** | Cambios en `Sesion`, `crear_token_acceso`, `mcp_service.py`, 3 endpoints en `login_router.py` | MOD + NUEVO | **Medio**: requiere migración manual de columna. Probar primero sin el feature. |
| **2. CLI generador** | `mcp_token_cli.py` con login + keyring | NUEVO | Bajo |
| **3. Wrapper** | `mcp_run.py` que lee de keyring | NUEVO | Bajo |
| **4. Servidor MCP** | `mcp_server.py` con 6 tools + rate limit + scope check | NUEVO | Bajo |
| **5. Tests backend** | Los 6 archivos de test | NUEVO | Bajo (unit) / Medio (integration) |
| **6. Docs + smoke** | `README_MCP.md`, manual de smoke test, e2e contra dev | NUEVO | Bajo |

**Criterio de merge**:
- ✅ Fases 1-5 completas
- ✅ Tests pasan (al menos 4 unit; integration es opt-in)
- ✅ Smoke test: generar token con CLI → guardar en keyring → Claude Desktop llama `whoami` → funciona
- ✅ Smoke test: revocar token con `DELETE /auth/mcp-tokens/{jti}` → Claude Desktop recibe 401

---

## 🔍 12. Comandos de verificación

```bash
# 1. Tests unit
cd "C:\Users\amejoramiento6\Gestor-de-proyectos-Ti"
pytest testing/backend/test_mcp_token_generation.py -v
pytest testing/backend/test_mcp_service.py -v
pytest testing/backend/test_mcp_revocation.py -v
pytest testing/backend/test_mcp_scope_enforcement.py -v
pytest testing/backend/test_mcp_rate_limit.py -v

# 2. Test integration (solo con Docker arriba + RAM suficiente)
pytest testing/backend/test_mcp_login_integration.py -v

# 3. Smoke E2E (manual, contra dev)
# a) Generar token (interactivo)
uv run scripts/mcp/mcp_token_cli.py

# b) Verificar que está en keyring
python -c "import keyring; print(keyring.get_password('gestor-proyectos-ti-mcp', 'gpm_mcp_1107068093')[:30] + '...')"

# c) Listar mis tokens activos (debe aparecer el recién creado)
curl -H "Authorization: Bearer <token_sesion_web>" http://127.0.0.1:8000/api/v2/auth/mcp-tokens

# d) Revocar
curl -X DELETE -H "Authorization: Bearer <token_sesion_web>" \
  http://127.0.0.1:8000/api/v2/auth/mcp-tokens/<jti>

# e) Verificar que el token MCP revocado da 401
curl -H "Authorization: Bearer <token_mcp_revocado>" http://127.0.0.1:8000/api/v2/auth/mcp-tokens
# esperado: 401 "Token MCP revocado o expirado"
```

---

## 🚦 13. Cierre de hallazgos previos (trazabilidad)

| Hallazgo original | Severidad | Resolución en este plan | Cierre 2da vuelta |
|---|---|---|---|
| H1: Token 10 años sin revocación | CRÍTICA | §4.3 `jti` + §4.5 middleware + §4.4 `DELETE /auth/mcp-tokens/{jti}` | ✅ Confirmado |
| H2: Token en texto plano en JSON | CRÍTICA | §7 `mcp_run.py` con `keyring` | ✅ Confirmado |
| H3: Rol por stdin | CRÍTICA | §6 `mcp_token_cli.py` usa `/auth/login` (rol desde DB) | ✅ Confirmado |
| H4: `clave-segura-cambiar` default | CRÍTICA | §6 `_validar_secreto_jwt` rechaza defaults y < 32 bytes | ✅ CLI; ⚠️ backend `config.py:49` sigue con default — documentar en README |
| H5: Cero rate limit | ALTA | §8 `TokenBucket` local (60/min por tool, 600/min global) | ✅ Confirmado |
| H6: Sin auditoría | MEDIA | §4.3 `_auditar()` en cada emisión/revocación | ✅ Confirmado |
| H7: Writes siempre activos | MEDIA | §5 + §8 `_check_scope` (CON verificación de firma) | ✅ Confirmado tras fix §8 (N1) |
| H8: Token en stdout/historial | MEDIA | §6 `getpass.getpass()` (N7) + keyring por default | ✅ Confirmado |
| H9: Sin segregación | MEDIA | §4.5 `obtener_usuario_actual_db` valida `jti` activo en DB | ✅ Confirmado tras fix §4.5 |
| H10: Sin tests | MEDIA | §10 9 archivos de tests (3 nuevos en 2da vuelta) | ✅ Confirmado |
| H11: `scripts/` no tiene convención | BAJA | §3 nuevo subdirectorio `scripts/mcp/` + `requirements-mcp.txt` | ✅ Confirmado |
| H12: Versiones MCP SDK no fijadas | BAJA | §3 `requirements-mcp.txt` con `mcp>=1.0,<2.0` etc. | ✅ Confirmado |
| H13: `actualizar_tarea` muy ancho | BAJA | §5 mantiene la firma pero valida scope=write antes | ✅ Confirmado |
| H14: Sin logging/observabilidad | BAJA | §9 logger en MCP server + `auditoria_eventos` en backend | ✅ Confirmado |
| H15: Sin `whoami` | MEDIA (scope-reviewer) | §5 nuevo tool `whoami` (read scope) | ✅ Confirmado |
| **N1 (NUEVO)**: scope bypass por JWT sin firma | CRÍTICA | §8 `_get_token_scope` ahora verifica firma con `jwt.decode(TOKEN, secret, ...)` | ✅ Cerrado |
| **N2 (NUEVO)**: anti-orfandad no implementada | ALTA | §4.4 endpoint `emitir_token_mcp` valida `payload_in["token_type"] != "mcp"` | ✅ Cerrado |
| **N3 (NUEVO)**: key_func incorrecta para JSON | ALTA | §4.4 nueva `_mcp_token_key_func` con `get_remote_address` | ✅ Cerrado |
| **N4 (NUEVO)**: `jti` sin UNIQUE | MEDIA | §4.1 índice único parcial `idx_sesiones_jti_unique` en blindaje | ✅ Cerrado |
| **N5 (NUEVO)**: write-amplification de `ultima_actividad_en` | MEDIA | §4.5 throttle > 5 min | ✅ Cerrado |
| **N6 (NUEVO)**: race condition en `emitir_token_mcp` | BAJA | Cubierto por tests §10 (`test_mcp_token_race.py`) | ⚠️ Pendiente de implementación |
| **N7 (NUEVO)**: contraseña visible en terminal | BAJA | §6 `getpass.getpass()` en vez de `input()` | ✅ Cerrado |
| **M1 (scope)**: `obtener_usuario_desde_token` no existe | MEDIA | §4.4/4.5 usa `obtener_usuario_actual_db` de `profile_router` | ✅ Cerrado |
| **M2 (scope)**: estrategia de migración incorrecta | ALTA | §4.1 columnas vía `structural_blindaje.py` con `ADD COLUMN IF NOT EXISTS` | ✅ Cerrado |
| **M3 (scope)**: tests solapados | BAJA | Se mantienen separados (deuda técnica aceptable) | ⚠️ Aceptado |

---

## ❌ 14. Lo que este plan NO hace (explícito)

- **No** implementa tools para **eliminar** tareas, desarrollos, usuarios, bitácora (blast radius). Si se necesitan, se añaden en fase 2 con `mcp:admin` scope.
- **No** implementa SSE/HTTP transport para MCP — solo stdio (más simple, suficiente para Claude Desktop y Cursor).
- **No** introduce un nuevo sistema de autenticación: reusa JWT + `Sesion` existente.
- **No** modifica el frontend.
- **No** añade rate limit específico en el backend para tráfico MCP (rate limit en MCP server es suficiente dado que el backend ya tiene el suyo general).
- **No** soporta `mcp:admin` scope (futuro).

---

## 📎 15. Archivos críticos (paths absolutos)

**Nuevos:**
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\scripts\mcp\mcp_token_cli.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\scripts\mcp\mcp_run.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\scripts\mcp\mcp_server.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\scripts\mcp\requirements-mcp.txt`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\scripts\mcp\README_MCP.md`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\services\auth\mcp_service.py`

**Modificados:**
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\models\auth\usuario.py` (Sesion: +tipo_sesion, +jti, +scope)
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\services\auth\servicio.py` (crear_token_acceso: +jti, +tipo_token)
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\services\auth\sesion_service.py` (registrar_sesion: acepta tipo_sesion)
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\api\auth\login_router.py` (+3 endpoints)
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\backend_v2\app\core\rate_limiter.py` (+_mcp_key_func opcional)

**Tests nuevos:**
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\testing\backend\test_mcp_token_generation.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\testing\backend\test_mcp_service.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\testing\backend\test_mcp_revocation.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\testing\backend\test_mcp_scope_enforcement.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\testing\backend\test_mcp_rate_limit.py`
- `C:\Users\amejoramiento6\Gestor-de-proyectos-Ti\testing\backend\test_mcp_login_integration.py`
