"""
Sub-router: horario pactado por día (Sprint S5'').

Endpoints:
  GET  /horario/{cedula}/semana   → 7 filas (L-D) con hora_entrada/salida/almuerzo
  PUT  /horario/{cedula}/semana   → reemplazo total de los 7 días

El chequeo de permisos se hace inline (en vez de importar `requiere_permiso_he`
del router padre) para evitar la importación circular que se da cuando
`horas_extras.py` hace include_router de este sub-router.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

from ....database import obtener_db
from ....models.auth.usuario import Usuario
from ....models.novedades_nomina.schemas_horas_extras import (
    HorarioPactadoSemanaRead,
    HorarioPactadoSemanaUpdate,
    HorarioPactadoDiaRead,
)
from ....services.novedades_nomina.horas_extras_horario_semana import (
    obtener_horario_semana,
    actualizar_horario_semana,
)
from .horas_extras_permisos import requiere_permiso_he_planificar

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/horario/{cedula}/semana", response_model=HorarioPactadoSemanaRead)
async def obtener_horario_semana_endpoint(
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Devuelve los 7 días del horario (L-D). Crea la fila padre si no existe."""
    dias = await obtener_horario_semana(db, cedula)
    return HorarioPactadoSemanaRead(
        cedula=cedula,
        dias=[HorarioPactadoDiaRead.model_validate(d) for d in dias],
    )


@router.put("/horario/{cedula}/semana", response_model=HorarioPactadoSemanaRead)
async def actualizar_horario_semana_endpoint(
    payload: HorarioPactadoSemanaUpdate,
    cedula: str = Path(..., min_length=1, max_length=50),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(requiere_permiso_he_planificar),
):
    """Reemplaza los 7 días del horario del empleado."""
    usuario_id = getattr(usuario, "cedula", None) or usuario.id
    try:
        dias = await actualizar_horario_semana(db, cedula, payload.dias, usuario_id)
        await db.commit()
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return HorarioPactadoSemanaRead(
        cedula=cedula,
        dias=[HorarioPactadoDiaRead.model_validate(d) for d in dias],
    )
