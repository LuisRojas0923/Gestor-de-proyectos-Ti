import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlmodel import select

from app.database import obtener_db, obtener_erp_db_opcional
from app.models.linea_corporativa import EmpleadoLinea


logger = logging.getLogger(__name__)
router = APIRouter()


def _consultar_alertas_erp(db_erp: Session, query, cedulas: list[str]):
    try:
        return db_erp.execute(query, {"cedulas": tuple(cedulas)}).fetchall()
    except Exception as exc:
        raise RuntimeError("No fue posible consultar alertas en ERP") from exc


@router.get("/alertas-empleados")
async def obtener_alertas_empleados(
    db_erp: Session = Depends(obtener_erp_db_opcional),
    db_local: AsyncSession = Depends(obtener_db),
):
    if db_erp is None:
        return {"error": "ERP no disponible", "alertas": {}}

    try:
        result = await db_local.execute(select(EmpleadoLinea.documento))
        cedulas = [str(cedula) for cedula in result.scalars().all() if cedula]
    except Exception as exc:
        logger.error("Error al consultar personas locales")
        raise HTTPException(status_code=500, detail="Error al consultar personas") from exc

    if not cedulas:
        return {"alertas": {}}

    query = text("""
        SELECT DISTINCT ON (E.nrocedula)
            E.nrocedula AS nrocedula,
            C.estado AS estado,
            C.fecharetiro AS fecharetiro
        FROM establecimiento E
        LEFT JOIN contrato C ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
        WHERE TRIM(CAST(E.nrocedula AS TEXT)) IN :cedulas
        ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
    """)
    try:
        erp_result = await run_in_threadpool(
            _consultar_alertas_erp,
            db_erp,
            query,
            cedulas,
        )
    except Exception:
        logger.error("Error al consultar alertas en ERP")
        return {"error": "ERP no disponible", "alertas": {}}

    alertas = {}
    for row in erp_result:
        cedula = str(row.nrocedula).strip()
        estado = str(row.estado).strip()
        fecha_retiro = row.fecharetiro
        motivos = []
        if estado.lower() != "activo":
            severidad = "CRITICAL"
            motivos.append(f"Estado: {estado}")
        if fecha_retiro and str(fecha_retiro)[:10] != "1900-01-01":
            severidad = "WARNING" if estado.lower() == "activo" else "CRITICAL"
            motivos.append(f"Retiro: {fecha_retiro}")
        if motivos:
            alertas[cedula] = {
                "inactivo": estado.lower() != "activo",
                "clase": severidad,
                "motivos": ", ".join(motivos),
                "fecha_retiro": str(fecha_retiro) if fecha_retiro else None,
            }
    return {"alertas": alertas}
