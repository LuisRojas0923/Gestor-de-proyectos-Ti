"""
Servicio principal de Requisición de Personal (RP)
Lógica de negocio: generación RP, transiciones de estado, historial, validaciones de rol.
"""
import logging
from typing import Optional, List
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlmodel import select as sqlmodel_select

from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP
from app.models.rrhh.catalogos import AprobadorAreaRP, AreaRP
from app.models.auth.usuario import Usuario, RelacionUsuario
from app.models.rrhh.historial import (
    HistorialRequisicion,
    RequisicionEquipoOficina,
    RequisicionEquipoTecnologico,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Generación del número RP (atómica / sin duplicados)
# ──────────────────────────────────────────────
async def generar_numero_rp(db: AsyncSession) -> tuple[str, int]:
    """
    Genera un consecutivo global único bloqueando la tabla para evitar
    condiciones de carrera en inserciones concurrentes.
    Retorna (rp_formateado, consecutivo_entero).
    Ejemplo: ('RP-0042', 42)
    """
    await db.execute(text("LOCK TABLE requisiciones_personal IN EXCLUSIVE MODE"))
    result = await db.execute(
        text(
            "SELECT COALESCE(MAX(consecutivo), 0) + 1 AS siguiente "
            "FROM requisiciones_personal"
        )
    )
    row = result.fetchone()
    consecutivo = row.siguiente if row else 1
    rp = f"RP-{consecutivo:05d}"
    return rp, consecutivo


# ──────────────────────────────────────────────
# Obtener aprobador según área
# ──────────────────────────────────────────────
async def obtener_aprobador_de_area(db: AsyncSession, area_id: int) -> Optional[AprobadorAreaRP]:
    """Retorna el aprobador activo asignado al área. None si no hay configurado."""
    result = await db.execute(
        sqlmodel_select(AprobadorAreaRP).where(
            AprobadorAreaRP.area_id == area_id,
            AprobadorAreaRP.activo == True,
        )
    )
    return result.scalars().first()


# ──────────────────────────────────────────────
# Registrar evento en historial
# ──────────────────────────────────────────────
async def registrar_historial(
    db: AsyncSession,
    requisicion_id: int,
    estado_anterior: Optional[str],
    estado_nuevo: str,
    usuario_nombre: str,
    usuario_email: str,
    observacion: Optional[str] = None,
):
    evento = HistorialRequisicion(
        requisicion_id=requisicion_id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        usuario_nombre=usuario_nombre,
        usuario_email=usuario_email,
        observacion=observacion,
    )
    db.add(evento)


# ──────────────────────────────────────────────
# Guardar / Actualizar equipos
# ──────────────────────────────────────────────
async def _crear_vacantes_en_jerarquia(db: AsyncSession, req: RequisicionPersonal):
    """Crea usuarios virtuales (vacantes) y sus relaciones en el organigrama."""
    if not req.correo_solicitante:
        logger.warning(f"[Vacantes] Requisición {req.rp} no tiene correo de solicitante.")
        return
        
    res_solicitante = await db.execute(
        sqlmodel_select(Usuario).where(Usuario.correo == req.correo_solicitante)
    )
    solicitante = res_solicitante.scalar_one_or_none()
    if not solicitante:
        logger.warning(f"[Vacantes] Solicitante con correo {req.correo_solicitante} no encontrado en la tabla de usuarios.")
        return

    for i in range(1, req.numero_personas_requeridas + 1):
        vacante_id = f"VAC-{req.rp}-{i}"
        
        res_vacante = await db.execute(
            sqlmodel_select(Usuario).where(Usuario.id == vacante_id)
        )
        vacante = res_vacante.scalar_one_or_none()
        
        if not vacante:
            vacante = Usuario(
                id=vacante_id,
                cedula=vacante_id,
                nombre=f"[VACANTE] {req.cargo_nombre or 'Cargo no definido'}",
                cargo=req.cargo_nombre,
                area=req.area_nombre,
                rol="usuario",
                esta_activo=True,
                hash_contrasena="*disabled*",
            )
            db.add(vacante)
            await db.flush()

            relacion = RelacionUsuario(
                usuario_id=vacante_id,
                superior_id=solicitante.id,
                tipo_relacion="lineal",
                esta_activa=True
            )
            db.add(relacion)
            logger.info(f"[Vacantes] Creada vacante {vacante_id} reportando a {solicitante.id}")


async def _limpiar_vacantes_en_jerarquia(db: AsyncSession, req: RequisicionPersonal):
    """Inactiva los usuarios virtuales de vacante asociados a la RP."""
    if not req.rp:
        return
        
    prefix = f"VAC-{req.rp}-%"
    await db.execute(
        text(
            "UPDATE relaciones_usuarios SET esta_activa = False "
            "WHERE usuario_id LIKE :prefix"
        ),
        {"prefix": prefix}
    )
    await db.execute(
        text(
            "UPDATE usuarios SET esta_activo = False "
            "WHERE id LIKE :prefix"
        ),
        {"prefix": prefix}
    )
    logger.info(f"[Vacantes] Limpieza ejecutada para vacantes de {req.rp}")
