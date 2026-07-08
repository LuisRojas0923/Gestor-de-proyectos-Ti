from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, text
from typing import List, Optional, Union
from datetime import date
from pydantic import BaseModel

from ...database import obtener_erp_db, obtener_db
from ...services.erp import ViaticosService, ViaticosQueryService
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.models.auditoria.accion_usuario import AuditoriaAccionUsuario

router = APIRouter(prefix="/viaticos")

# --- Schemas ---


class AuditarDescargaRequest(BaseModel):
    tipo_archivo: str
    cedula_consultada: Optional[str] = None
    nombre_consultado: Optional[str] = None


class OTResponse(BaseModel):
    numero: str
    especialidad: Optional[str] = None
    cliente: Optional[str] = None
    ciudad: Optional[str] = None
    centrocosto: Optional[str] = None
    subcentrocosto: Optional[str] = None


class LineaGasto(BaseModel):
    categoria: str
    fecha: Union[date, str]
    ot: str
    ot_id: Optional[str] = None
    cc: str
    scc: str
    valorConFactura: float
    valorSinFactura: float
    observaciones: Optional[str] = None
    adjuntos: Optional[List[dict]] = []


class ReporteViaticos(BaseModel):
    reporte_id: Optional[str] = None
    empleado_cedula: str
    empleado_nombre: str
    area: str
    cargo: str
    centrocosto: Optional[str] = None
    ciudad: str
    observaciones_gral: Optional[str] = None
    gastos: List[LineaGasto]
    usuario_id: str
    estado: Optional[str] = "INICIAL"


# --- Endpoints ---


@router.get("/categorias", response_model=List[dict])
def obtener_categorias_legalizacion(db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene las categorías de legalización disponibles en el ERP"""
    try:
        return ViaticosQueryService.obtener_categorias_legalizacion(db_erp)
    except Exception as e:
        print(f"ERROR ERP categorias: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al consultar categorías: {str(e)}"
        )


@router.get("/ots", response_model=List[OTResponse])
def buscar_ots(query: Optional[str] = None, db_erp: Session = Depends(obtener_erp_db)):
    """Busca OTs en la tabla otviaticos del ERP"""
    try:
        resultado = ViaticosQueryService.buscar_ots(db_erp, query)
        return [OTResponse(**row) for row in resultado]
    except Exception as e:
        print(f"ERROR ERP: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al consultar OTs en ERP: {str(e)}"
        )


@router.get("/ot/{numero}/combinaciones", response_model=List[OTResponse])
def obtener_combinaciones_ot(numero: str, db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene todas las combinaciones de CC/SCC para una OT específica"""
    try:
        resultado = ViaticosQueryService.obtener_combinaciones_ot(db_erp, numero)
        return [OTResponse(**row) for row in resultado]
    except Exception as e:
        print(f"ERROR ERP combinaciones: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al consultar combinaciones de OT: {str(e)}"
        )


@router.post("/enviar")
async def enviar_reporte(
    reporte: ReporteViaticos, db_erp: Session = Depends(obtener_erp_db)
):
    """Recibe un reporte de viaticos y lo guarda en la tabla de transito del ERP (Solid)"""
    try:
        # Convertir el modelo Pydantic a dict para el servicio
        reporte_id = ViaticosService.enviar_reporte(db_erp, reporte.model_dump())

        return {
            "status": "success",
            "reporte_id": reporte_id,
            "count": len(reporte.gastos),
            "mensaje": "Reporte enviado correctamente a la tabla de tránsito del ERP",
        }
    except Exception as e:
        print(f"ERROR ENVIAR ERP: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al guardar reporte en transito: {str(e)}"
        )


@router.get("/reporte/{reporte_id}/detalle")
async def obtener_detalle_reporte(
    reporte_id: str, db_erp: Session = Depends(obtener_erp_db)
):
    """Obtiene el detalle completo de las líneas de un reporte en tránsito"""
    try:
        return ViaticosQueryService.obtener_detalle_reporte(db_erp, reporte_id)
    except Exception as e:
        print(f"ERROR GET DETALLE REPORTE: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al obtener detalle del reporte: {str(e)}"
        )


@router.get("/estado-cuenta")
def obtener_estado_cuenta(
    cedula: str,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db_erp: Session = Depends(obtener_erp_db),
):
    """Obtiene el estado de cuenta detallado de viáticos desde el ERP"""
    try:
        return ViaticosQueryService.obtener_estado_cuenta(db_erp, cedula, desde, hasta)
    except Exception as e:
        print(f"ERROR ERP Estado Cuenta: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al obtener estado de cuenta: {str(e)}"
        )


@router.get("/estado-cuenta/xlsx")
def exportar_estado_cuenta_xlsx(
    cedula: str,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db_erp: Session = Depends(obtener_erp_db),
):
    """Genera y descarga el estado de cuenta en formato XLSX"""
    try:
        buffer = ViaticosService.exportar_estado_cuenta_xlsx(db_erp, cedula, desde, hasta)
        filename = f"Estado_Cuenta_{cedula}_{date.today().strftime('%Y%m%d')}.xlsx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        print(f"ERROR ERP Export XLSX: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al generar archivo XLSX: {str(e)}"
        )


@router.get("/reportes/{cedula}")
async def obtener_reportes_viaticos(
    cedula: str, db_erp: Session = Depends(obtener_erp_db)
):
    """Obtiene el listado agrupado de legalizaciones desde la tabla de cabecera"""
    try:
        return ViaticosQueryService.obtener_resumen_legalizaciones(db_erp, cedula)
    except Exception as e:
        print(f"ERROR GET REPORTES ERP: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener listado de legalizaciones: {str(e)}",
        )


@router.delete("/reporte/{reporte_id}")
async def eliminar_reporte(reporte_id: str, db_erp: Session = Depends(obtener_erp_db)):
    """Elimina permanentemente un reporte en tránsito (cabecera y detalle)"""
    try:
        ViaticosService.eliminar_reporte(db_erp, reporte_id)
        return {
            "status": "success",
            "mensaje": f"Reporte {reporte_id} eliminado correctamente",
        }
    except Exception as e:
        print(f"ERROR DELETE REPORTE ERP: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar el reporte: {str(e)}"
        )


@router.get("/director/legalizaciones")
async def obtener_legalizaciones_director(db_erp: Session = Depends(obtener_erp_db)):
    """Obtiene TODAS las legalizaciones del portal (vista exclusiva director)"""
    try:
        return ViaticosQueryService.obtener_todas_legalizaciones(db_erp)
    except Exception as e:
        print(f"ERROR GET LEGALIZACIONES DIRECTOR: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al obtener legalizaciones: {str(e)}"
        )


@router.post("/estado-cuenta/auditar-descarga")
async def auditar_descarga_estado_cuenta(
    payload: AuditarDescargaRequest,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Registra la descarga de PDF o Excel del estado de cuenta de viáticos,
    con un control de frecuencia (caché) de 4 horas y 30 minutos por usuario y acción.
    """
    if payload.tipo_archivo not in ("pdf", "xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no soportado. Debe ser 'pdf' o 'xlsx'"
        )

    usuario_id = str(usuario_actual.id)
    usuario_nombre = usuario_actual.nombre or "Desconocido"
    rol = usuario_actual.rol or "usuario"
    modulo = "viaticos"
    accion = "exportar"
    ruta = f"/api/v2/viaticos/estado-cuenta/{payload.tipo_archivo}"

    # 1. Comprobar si ya existe un registro en las últimas 4h 30m
    limite = func.now() - text("INTERVAL '4 hours 30 minutes'")
    stmt = select(AuditoriaAccionUsuario).where(
        AuditoriaAccionUsuario.usuario_id == usuario_id,
        AuditoriaAccionUsuario.modulo == modulo,
        AuditoriaAccionUsuario.accion == accion,
        AuditoriaAccionUsuario.ruta == ruta,
        AuditoriaAccionUsuario.timestamp >= limite
    ).limit(1)

    result = await db.execute(stmt)
    registro_existente = result.scalar_one_or_none()

    if registro_existente:
        return {"status": "cached", "mensaje": "Registro omitido por límite de frecuencia (4h 30m)"}

    # 2. Si no existe, insertar nuevo registro de auditoría
    metadatos = {}
    if payload.cedula_consultada:
        metadatos["cedula_consultada"] = payload.cedula_consultada
    if payload.nombre_consultado:
        metadatos["nombre_consultado"] = payload.nombre_consultado

    nuevo_registro = AuditoriaAccionUsuario(
        usuario_id=usuario_id,
        usuario_nombre=usuario_nombre,
        rol=rol,
        modulo=modulo,
        accion=accion,
        ruta=ruta,
        metodo_http="POST",
        codigo_respuesta=200,
        resultado="exito",
        metadatos=metadatos if metadatos else None,
    )
    db.add(nuevo_registro)
    await db.commit()

    return {"status": "logged", "mensaje": "Acción registrada en auditoría"}
