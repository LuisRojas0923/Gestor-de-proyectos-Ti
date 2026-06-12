"""
Servicio de tokens MCP: emision, listado y revocacion de tokens de larga
duracion para integraciones con Model Context Protocol (Claude Desktop, Cursor).

Reglas de negocio (ver docs/PLAN_SERVIDOR_MCP.md seccion 4.3):
- Vigencia: 30 dias default, 90 dias maximo
- Scope: 'read' (default) | 'write' (opt-in)
- Cada emision y revocacion queda registrada en auditoria_eventos
- Anti-orfandad: un token MCP no puede generar otro token MCP
"""
from datetime import datetime, timedelta
from typing import Literal, Optional
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth.auditoria_evento import AuditoriaEvento
from app.models.auth.usuario import Sesion, Usuario
from app.services.auth.servicio import ServicioAuth
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
    direccion_ip: Optional[str] = None,
) -> dict:
    """Emite un token MCP de larga duracion para un usuario ya autenticado.

    Raises:
        HTTPException 400 si vigencia fuera de rango o scope invalido.
        HTTPException 403 si el usuario esta inactivo.
    """
    if vigencia_dias < 1 or vigencia_dias > VIGENCIA_MAXIMA_DIAS:
        raise HTTPException(
            400,
            f"vigencia_dias debe estar entre 1 y {VIGENCIA_MAXIMA_DIAS}",
        )
    if scope not in SCOPES_PERMITIDOS:
        raise HTTPException(400, f"scope debe ser uno de {SCOPES_PERMITIDOS}")
    if not usuario.esta_activo:
        raise HTTPException(403, "Usuario inactivo no puede generar tokens MCP")

    jti = str(uuid4())
    tiempo_expiracion = timedelta(days=vigencia_dias)
    # get_bogota_now() retorna naive (sin tzinfo) para compatibilidad
    # con la columna expira_en TIMESTAMP WITHOUT TIME ZONE.
    expires = get_bogota_now() + tiempo_expiracion
    token = ServicioAuth.crear_token_acceso(
        datos={"sub": usuario.cedula, "rol": usuario.rol, "scope": scope},
        tiempo_expiracion=tiempo_expiracion,
        tipo_token="mcp",  # [CONTROLADO]
        jti=jti,  # CRITICO: mismo jti en JWT y en DB para validar revocacion
    )

    nueva_sesion = Sesion(
        usuario_id=usuario.id,
        token_sesion=token,
        tipo_sesion="mcp",
        jti=jti,
        scope=scope,
        expira_en=expires,
        direccion_ip=direccion_ip,
        nombre_usuario=usuario.nombre,
        rol_usuario=usuario.rol,
    )
    db.add(nueva_sesion)
    await db.commit()
    await db.refresh(nueva_sesion)

    await _auditar(
        db,
        usuario,
        "mcp_token_generado",
        exitosa=True,
        motivo_detalle=f"scope={scope} dias={vigencia_dias} {motivo}".strip(),
        direccion_ip=direccion_ip,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "jti": jti,
        "expires_at": expires.isoformat(),
        "scope": scope,
        "vigencia_dias": vigencia_dias,
    }


async def listar_tokens_mcp_activos(
    db: AsyncSession, usuario: Usuario
) -> list[dict]:
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
            "expira_en": s.expira_en.isoformat() if s.expira_en else None,
            "creado_en": s.creado_en.isoformat() if s.creado_en else None,
            "ultima_actividad_en": (
                s.ultima_actividad_en.isoformat()
                if s.ultima_actividad_en
                else None
            ),
        }
        for s in result.scalars().all()
    ]


async def revocar_token_mcp(
    db: AsyncSession, usuario: Usuario, jti: str
) -> bool:
    """Revoca un token MCP por jti. Solo el dueno puede revocar sus tokens."""
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
    await _auditar(
        db,
        usuario,
        "mcp_token_revocado",
        exitosa=True,
        motivo_detalle=f"jti={jti}",
        direccion_ip=None,
    )
    return True


async def _auditar(
    db: AsyncSession,
    usuario: Usuario,
    motivo: str,
    exitosa: bool,
    motivo_detalle: str = "",
    direccion_ip: Optional[str] = None,
) -> None:
    """Inserta evento de auditoria para tokens MCP. El audit nunca debe
    tumbar el flujo de emision/revocacion (try/except interno)."""
    try:
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
        try:
            await db.rollback()
        except Exception:
            pass
