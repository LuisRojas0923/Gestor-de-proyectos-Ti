from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from sqlmodel import select, func, update, or_
from ...database import obtener_db
from ..auth.profile_router import obtener_usuario_actual_db
from ...services.inventario.servicio import ServicioInventario
from ...services.inventario.excel_servicio import ServicioExcelInventario
from ...services.inventario.analytics_servicio import ServicioAnalyticsInventario
from ...models.inventario.conteo import (
    ConteoInventario,
    AsignacionInventario,
    ConfiguracionInventario,
)
from typing import Dict, Any, Optional
from pydantic import BaseModel

router = APIRouter()


# El helper _natural_sort_key fue movido a ServicioInventario para cumplimiento de Arquitectura Limpia.


class ConteoUpdate(BaseModel):
    id: int
    cantidad: float
    observaciones: str = ""
    ronda: int  # 1, 2, 3 o 4


class InventoryConfigUpdate(BaseModel):
    ronda_activa: int
    conteo_nombre: Optional[str] = None


class AsignacionBase(BaseModel):
    cedula: str
    nombre: str
    cargo: Optional[str] = None
    bodega: str
    bloque: str
    estante: Optional[str] = ""
    nivel: Optional[str] = ""
    cedula_companero: Optional[str] = None
    nombre_companero: Optional[str] = None


@router.get("/config")
async def obtener_config_inventario(db: AsyncSession = Depends(obtener_db)):
    try:
        stmt = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
        result = await db.execute(stmt)
        config = result.scalar_one_or_none()
        if not config:
            return {"ronda_activa": 1, "conteo_nombre": ""}
        return config
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_config_inventario: {e}")
        raise HTTPException(status_code=503, detail="Error de conexión a la base de datos")


@router.post("/config")
async def actualizar_config_inventario(
    data: InventoryConfigUpdate, db: AsyncSession = Depends(obtener_db)
):
    try:
        stmt = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
        result = await db.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            config = ConfiguracionInventario(id=1)
            db.add(config)

        config.ronda_activa = data.ronda_activa
        if data.conteo_nombre is not None:
            config.conteo_nombre = data.conteo_nombre
        config.ultima_actualizacion = datetime.now()

        await db.commit()
        await db.refresh(config)
        return config
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en actualizar_config_inventario: {e}")
        raise HTTPException(status_code=503, detail="No se pudo actualizar la configuración del inventario")


@router.get("/stats")
async def obtener_estadisticas_inventario(db: AsyncSession = Depends(obtener_db)):
    try:
        return await ServicioAnalyticsInventario.obtener_resumen_estadistico(db)
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_estadisticas_inventario: {e}")
        raise HTTPException(status_code=503, detail="Error al calcular estadísticas")


@router.get("/lista")
async def obtener_lista_inventario(
    bodega: Optional[str] = None,
    estado: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db),
):
    try:
        stmt = select(ConteoInventario)
        if bodega:
            stmt = stmt.where(ConteoInventario.bodega == bodega)
        if estado:
            stmt = stmt.where(ConteoInventario.estado == estado)

        stmt = stmt.order_by(ConteoInventario.bodega, ConteoInventario.bloque)
        result = await db.execute(stmt)
        return result.scalars().all()
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_lista_inventario: {e}")
        raise HTTPException(status_code=503, detail="Error al listar el inventario")


@router.get("/asignaciones")
async def obtener_asignaciones(db: AsyncSession = Depends(obtener_db)):
    try:
        stmt = select(AsignacionInventario).order_by(AsignacionInventario.id.desc())
        result = await db.execute(stmt)
        return result.scalars().all()
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_asignaciones: {e}")
        raise HTTPException(status_code=503, detail="Error al consultar asignaciones")


@router.get("/asignaciones/resumen")
async def obtener_resumen_asignaciones(db: AsyncSession = Depends(obtener_db)):
    """Vista administrativa resumida con cálculo de progreso y ítems por pareja (Backend-side)."""
    try:
        return await ServicioAnalyticsInventario.obtener_vista_admin_asignaciones(db)
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_resumen_asignaciones: {e}")
        raise HTTPException(status_code=503, detail="Error al calcular resumen de asignaciones")
    except Exception as e:
        print(f"Error inesperado en obtener_resumen_asignaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/asignar")
async def crear_asignacion(data: AsignacionBase, db: AsyncSession = Depends(obtener_db)):
    try:
        # 1. Ya no bloqueamos asignaciones duplicadas de ubicación (Conflictos 409)
        # Esto permite que múltiples parejas sean asignadas a ubicaciones masivas sin sub-clasificar (Ej. Bodega completa)
        # para que se dividan el trabajo operativamente dividiéndose los ítems.

        # 2. Asignar o reutilizar el número de pareja
        stmt_pareja = select(AsignacionInventario.numero_pareja).where(AsignacionInventario.cedula == data.cedula)
        res_pareja = await db.execute(stmt_pareja)
        pareja_existente = res_pareja.scalars().first()
        
        if pareja_existente:
            nuevo_numero = pareja_existente
        else:
            stmt_max = select(func.max(AsignacionInventario.numero_pareja))
            res_max = await db.execute(stmt_max)
            max_pareja = res_max.scalar() or 0
            nuevo_numero = max_pareja + 1

        # 3. Crear asignación
        nueva = AsignacionInventario(
            **data.dict(),
            numero_pareja=nuevo_numero
        )
        db.add(nueva)
        await db.commit()
        await db.refresh(nueva)
        return nueva
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en crear_asignacion: {e}")
        raise HTTPException(status_code=500, detail="No se pudo crear la asignación")


@router.delete("/asignar/{id}")
async def eliminar_asignacion(id: int, db: AsyncSession = Depends(obtener_db)):
    try:
        stmt = select(AsignacionInventario).where(AsignacionInventario.id == id)
        res = await db.execute(stmt)
        asig = res.scalar_one_or_none()
        if not asig:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")
        await db.delete(asig)
        await db.commit()
        return {"exito": True}
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en eliminar_asignacion: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar asignación")


@router.patch("/asignar/{id}")
async def actualizar_asignacion(
    id: int, data: AsignacionBase, db: AsyncSession = Depends(obtener_db)
):
    try:
        stmt = select(AsignacionInventario).where(AsignacionInventario.id == id)
        res = await db.execute(stmt)
        asig = res.scalar_one_or_none()
        if not asig:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")

        # Actualizar campos
        asig.cedula = data.cedula
        asig.nombre = data.nombre
        asig.cargo = data.cargo
        asig.bodega = data.bodega
        asig.bloque = data.bloque
        asig.estante = data.estante
        asig.nivel = data.nivel
        asig.cedula_companero = data.cedula_companero
        asig.nombre_companero = data.nombre_companero

        await db.commit()
        await db.refresh(asig)
        return asig
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en actualizar_asignacion: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar asignación")


@router.get("/mis-asignaciones")
async def obtener_mis_asignaciones(
    db: AsyncSession = Depends(obtener_db),
    usuario: Any = Depends(obtener_usuario_actual_db),
) -> Dict[str, Any]:
    """Obtiene los productos asignados al usuario actual delegando la lógica al servicio."""
    try:
        return await ServicioInventario.obtener_productos_por_operario(usuario.cedula, db)
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_mis_asignaciones: {e}")
        raise HTTPException(status_code=503, detail="Error al consultar mis asignaciones")
    except Exception as e:
        print(f"Error inesperado en obtener_mis_asignaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/ronda-vista")
async def actualizar_ronda_vista(
    ronda: int,
    db: AsyncSession = Depends(obtener_db),
    usuario: Any = Depends(obtener_usuario_actual_db)
):
    """Actualiza la ronda que el operario está visualizando actualmente con validación de progreso."""
    try:
        cedula = usuario.cedula if hasattr(usuario, "cedula") else None
        if not cedula:
            raise HTTPException(status_code=400, detail="Usuario sin cédula válida")

        # 1. Obtener la ronda actual para validar si es un avance
        stmt_actual = select(AsignacionInventario.ronda_vista).where(
            or_(AsignacionInventario.cedula == cedula, AsignacionInventario.cedula_companero == cedula)
        ).limit(1)
        res_actual = await db.execute(stmt_actual)
        current_ronda = res_actual.scalar() or 1

        # 2. Si intenta avanzar, corregir validación de 100% de progreso
        if ronda > current_ronda:
            res_progreso = await ServicioInventario.obtener_productos_por_operario(cedula, db)
            
            # Validar según la ronda que intenta dejar
            if current_ronda == 1 and res_progreso.get("progreso_c1", 0) < 100:
                raise HTTPException(
                    status_code=400, 
                    detail="Debes terminar el Conteo 1 al 100% antes de pasar a la siguiente ronda."
                )
            elif current_ronda == 2 and res_progreso.get("progreso_c2", 0) < 100:
                raise HTTPException(
                    status_code=400, 
                    detail="Debes terminar el Conteo 2 al 100% antes de pasar a la siguiente ronda."
                )

        # 3. Actualizar todas las asignaciones de este usuario en esta sesión
        stmt = (
            update(AsignacionInventario)
            .where(or_(AsignacionInventario.cedula == cedula, AsignacionInventario.cedula_companero == cedula))
            .values(ronda_vista=ronda)
        )
        await db.execute(stmt)
        await db.commit()
        return {"status": "ok", "ronda": ronda}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error al actualizar ronda vista: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cobertura-asignacion")
async def obtener_cobertura_asignacion(db: AsyncSession = Depends(obtener_db)):
    """Cobertura simplificada a nivel bodega: cubierta si tiene al menos 1 pareja."""
    try:
        return await ServicioAnalyticsInventario.obtener_cobertura_bodegas(db)
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_cobertura_asignacion: {e}")
        raise HTTPException(status_code=503, detail="Error al calcular cobertura de personal")


@router.post("/guardar-conteo")
async def guardar_conteo(
    actualizacion: ConteoUpdate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Any = Depends(obtener_usuario_actual_db),
) -> Dict[str, Any]:
    """Guarda conteo delegando el impacto multidimensional al servicio."""
    try:
        resultado = await ServicioInventario.registrar_conteo_unidad(
            item_id=actualizacion.id,
            cantidad=actualizacion.cantidad,
            observaciones=actualizacion.observaciones,
            ronda=actualizacion.ronda,
            usuario_cedula=usuario.cedula,
            db=db
        )
        if not resultado["exito"]:
            raise HTTPException(status_code=404, detail=resultado.get("error", "Error desconocido"))
        return resultado
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en guardar_conteo: {e}")
        raise HTTPException(status_code=503, detail="Error de base de datos al guardar conteo")
    except Exception as e:
        print(f"Error inesperado en guardar_conteo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en guardar_conteo: {e}")
        raise HTTPException(status_code=503, detail="Error de base de datos al guardar conteo")
    except Exception as e:
        print(f"Error inesperado en guardar_conteo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cargar-excel")
async def cargar_maestra_inventario(
    file: UploadFile = File(...),
    conteo: str = Form("Anual_2026"),
    limpiar_previo: bool = Form(False),
    db: AsyncSession = Depends(obtener_db),
):
    try:
        if not file.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="El archivo debe ser un Excel")
        file_content = await file.read()
        resultado = await ServicioExcelInventario.importar_conteo_excel(
            file_content, conteo, db, limpiar_previo
        )
        return resultado
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        print(f"Error DB en cargar_maestra_inventario: {e}")
        raise HTTPException(status_code=503, detail="Error de base de datos durante la carga masiva")
    except Exception as e:
        print(f"Error inesperado en cargar_maestra_inventario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cargar-transito")
async def cargar_transito(
    file: UploadFile = File(...), db: AsyncSession = Depends(obtener_db)
) -> Dict[str, Any]:
    """Carga masiva de mercancía en tránsito (InvPorLegalizar - Modelo B)"""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel")

    content = await file.read()
    return await ServicioExcelInventario.importar_transito_excel(content, db)


@router.post("/cargar-legacy")
async def cargar_legacy(
    file: UploadFile = File(...),
    ronda: int = Form(...),
    db: AsyncSession = Depends(obtener_db),
) -> Dict[str, Any]:
    """Carga masiva de resultados de conteo (Legacy) para validación histórica."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel")

    if ronda not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La ronda debe ser 1, 2 o 3")

    content = await file.read()
    return await ServicioExcelInventario.importar_legacy_excel(content, ronda, db)


@router.patch("/asignar/habilitar-c2/{id}")
async def habilitar_conteo2(
    id: int,
    habilitar: bool = Form(...),
    db: AsyncSession = Depends(obtener_db)
) -> Dict[str, Any]:
    """Habilita o deshabilita el acceso al Conteo 2 para una pareja específica."""
    try:
        stmt = select(AsignacionInventario).where(AsignacionInventario.id == id)
        res = await db.execute(stmt)
        asig = res.scalar_one_or_none()
        
        if not asig:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")
            
        asig.habilitado_c2 = habilitar
        await db.commit()
        
        return {"exito": True, "habilitado": habilitar}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plantilla-maestra")
async def descargar_plantilla_maestra():
    """Genera y descarga la plantilla Excel para la carga maestra de inventario."""
    buf = ServicioExcelInventario.generar_plantilla_maestra()
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=plantilla_inventario_maestra.xlsx"
        },
    )


@router.get("/plantilla-transito")
async def descargar_plantilla_transito():
    """Genera y descarga la plantilla Excel para la carga de tránsito detallado."""
    buf = ServicioExcelInventario.generar_plantilla_transito()
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=plantilla_transito_detallado.xlsx"
        },
    )


@router.get("/health")
async def health_check():
    return {"status": "ok", "module": "inventario_2026"}
