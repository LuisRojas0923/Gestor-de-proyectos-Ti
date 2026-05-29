import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ....database import obtener_db
from ....services.novedades_nomina.tabla_maestra_service import TablaMaestraService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tabla-maestra", tags=["Nómina - Tabla Maestra"])


@router.get("/validar")
async def validar_disponibilidad(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2020, le=2099),
    quincena: str = Query(..., pattern="^(Q1|Q2)$"),
    session: AsyncSession = Depends(obtener_db),
):
    """Valida si todas las subcategorías requeridas tienen datos para el período."""
    try:
        resultado = await TablaMaestraService.validar_disponibilidad(
            session, mes, anio, quincena
        )
        return resultado
    except Exception as e:
        logger.error(f"Error validando disponibilidad tabla maestra: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al validar la disponibilidad de subcategorías",
        )


@router.get("/generar")
async def generar_tabla_maestra(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2020, le=2099),
    quincena: str = Query(..., pattern="^(Q1|Q2)$"),
    session: AsyncSession = Depends(obtener_db),
):
    """Genera la tabla maestra consolidada para el período seleccionado."""
    try:
        resultado = await TablaMaestraService.generar_tabla_maestra(
            session, mes, anio, quincena
        )

        if resultado.get("error"):
            raise HTTPException(
                status_code=400,
                detail={
                    "mensaje": resultado["mensaje"],
                    "faltantes": resultado["faltantes"],
                },
            )

        return resultado
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando tabla maestra: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al generar la tabla maestra",
        )
