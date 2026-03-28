from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from sqlmodel import select, and_, func
from ...database import obtener_db
from ..auth.profile_router import (
    obtener_usuario_actual_db,
)  # Importado para auth dinamico
from ...services.inventario.servicio import ServicioInventario
from ...models.inventario.conteo import (
    ConteoInventario,
    AsignacionInventario,
    ConfiguracionInventario,
)
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

router = APIRouter()


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
        # Total de items maestros con saldo o legalización
        stmt_total = select(func.count(ConteoInventario.id))
        total = (await db.execute(stmt_total)).scalar()

        # Conciliados: diferencia < 0.01 (en términos de inventario)
        # Aquí definimos la lógica de "Conciliado" de forma estricta para el monitor
        stmt_conciliados = select(func.count(ConteoInventario.id)).where(
            ConteoInventario.estado == "CONCILIADO"
        )
        conciliados = (await db.execute(stmt_conciliados)).scalar()

        # Discrepantes
        stmt_discrepantes = select(func.count(ConteoInventario.id)).where(
            ConteoInventario.estado == "DISCREPANTE"
        )
        discrepantes = (await db.execute(stmt_discrepantes)).scalar()

        # En Reconteo
        stmt_reconteo = select(func.count(ConteoInventario.id)).where(
            ConteoInventario.estado == "RECONTEO"
        )
        reconteo = (await db.execute(stmt_reconteo)).scalar()

        # Ubicación Errónea
        stmt_erroneos = select(func.count(ConteoInventario.id)).where(
            ConteoInventario.estado == "UBICACIÓN ERRÓNEA"
        )
        erroneos = (await db.execute(stmt_erroneos)).scalar()

        porcentaje = round((conciliados / total * 100), 2) if total > 0 else 0

        return {
            "total": total,
            "conciliados": conciliados,
            "erroneos": erroneos,
            "discrepantes": discrepantes,
            "reconteo": reconteo,
            "porcentaje_avance": porcentaje,
        }
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


@router.post("/asignar")
async def crear_asignacion(data: AsignacionBase, db: AsyncSession = Depends(obtener_db)):
    try:
        nueva = AsignacionInventario(**data.dict())
        db.add(nueva)
        await db.commit()
        await db.refresh(nueva)
        return nueva
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
) -> List[Dict[str, Any]]:
    """Obtiene los productos asignados al usuario actual filtrando por estado."""
    try:
        cedula_usuario = usuario.cedula

        # 1. Buscar asignación
        stmt_asig = select(AsignacionInventario).where(AsignacionInventario.cedula == cedula_usuario)
        result_asig = await db.execute(stmt_asig)
        asignacion = result_asig.scalar_one_or_none()

        if not asignacion:
            return []

        # El operario solo ve lo que esté marcado como PENDIENTE o RECONTEO
        # Si estante o nivel están vacíos en la asignación, actúa como comodín (ve todo el bloque/estante)
        stmt_inv = select(ConteoInventario).where(and_(
            ConteoInventario.bodega == asignacion.bodega,
            ConteoInventario.bloque == asignacion.bloque,
            ConteoInventario.estado.in_(["PENDIENTE", "RECONTEO"])
        ))
        
        if asignacion.estante and asignacion.estante.strip():
            estantes_lista = [e.strip() for e in asignacion.estante.split(',') if e.strip()]
            if len(estantes_lista) > 1:
                stmt_inv = stmt_inv.where(ConteoInventario.estante.in_(estantes_lista))
            else:
                stmt_inv = stmt_inv.where(ConteoInventario.estante == estantes_lista[0])
            
        if asignacion.nivel and asignacion.nivel.strip():
            stmt_inv = stmt_inv.where(ConteoInventario.nivel == asignacion.nivel)
            
        result_inv = await db.execute(stmt_inv)
        productos = result_inv.scalars().all()
        
        return [
            {
                "id": p.id, 
                "bodega": p.bodega, 
                "bloque": p.bloque, 
                "estante": p.estante, 
                "nivel": p.nivel, 
                "codigo": p.codigo, 
                "descripcion": p.descripcion,
                "unidad": p.unidad,
                "cant_c1": p.cant_c1,
                "cant_c2": p.cant_c2,
                "cant_c3": p.cant_c3,
                "cant_c4": p.cant_c4,
                "obs_c1": p.obs_c1,
                "obs_c2": p.obs_c2,
                "obs_c3": p.obs_c3,
                "obs_c4": p.obs_c4,
                "user_c1": p.user_c1,
                "user_c2": p.user_c2,
                "user_c3": p.user_c3,
                "user_c4": p.user_c4,
                "estado": p.estado
            } for p in productos
        ]
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_mis_asignaciones: {e}")
        raise HTTPException(status_code=503, detail="Error al consultar mis asignaciones")
    except Exception as e:
        print(f"Error inesperado en obtener_mis_asignaciones: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cobertura-asignacion")
async def obtener_cobertura_asignacion(db: AsyncSession = Depends(obtener_db)):
    try:
        # 1. Obtener todas las ubicaciones únicas que tienen algo por contar (saldo > 0 o invporlegalizar > 0)
        # o simplemente todas las ubicaciones presentes en el maestro
        stmt_master = text("""
            SELECT DISTINCT bodega, bloque, estante, nivel 
            FROM conteoinventario 
            WHERE (cantidad_sistema > 0 OR invporlegalizar > 0)
        """)
        res_master = await db.execute(stmt_master)
        ubicaciones_fisicas = [f"{r[0]}-{r[1]}-{r[2]}-{r[3]}" for r in res_master.all()]
        
        # 2. Obtener asignaciones actuales
        stmt_asig = select(AsignacionInventario)
        res_asig = await db.execute(stmt_asig)
        asignaciones = res_asig.scalars().all()
        
        # 3. Cruzar datos
        # Un área está cubierta si existe al menos una asignación que la contenga (considerando comodines)
        pendientes = []
        cubiertas = 0
        
        for u in ubicaciones_fisicas:
            parts = u.split('-')
            b, bl, es, ni = parts[0], parts[1], parts[2], parts[3]
            
            esta_cubierta = False
            for asig in asignaciones:
                # Lógica de coincidencia con comodines (Fase v4.2)
                match_bodega = asig.bodega == b
                match_bloque = (not asig.bloque) or (asig.bloque == bl)
                match_estante = (not asig.estante) or (asig.estante == es)
                match_nivel = (not asig.nivel) or (asig.nivel == ni)
                
                if match_bodega and match_bloque and match_estante and match_nivel:
                    esta_cubierta = True
                    break
            
            if esta_cubierta:
                cubiertas += 1
            else:
                pendientes.append(u)
                
        total = len(ubicaciones_fisicas)
        porcentaje = round((cubiertas / total * 100), 1) if total > 0 else 0
        
        return {
            "cobertura": porcentaje,
            "total_ubicaciones_pendientes": total,
            "cubiertos": cubiertas,
            "faltantes": pendientes[:50] # Top 50 para no saturar respuesta
        }
    except SQLAlchemyError as e:
        print(f"Error DB en obtener_cobertura_asignacion: {e}")
        raise HTTPException(status_code=503, detail="Error al calcular cobertura de personal")


@router.post("/guardar-conteo")
async def guardar_conteo(
    actualizacion: ConteoUpdate,
    db: AsyncSession = Depends(obtener_db),
    usuario: Any = Depends(obtener_usuario_actual_db),
) -> Dict[str, Any]:
    """Guarda conteo y recalcula 'estado' e 'inteligencia' de discrepancia."""
    try:
        stmt = select(ConteoInventario).where(ConteoInventario.id == actualizacion.id)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        r = actualizacion.ronda
        cant = actualizacion.cantidad
        
        if r == 1:
            item.cant_c1 = cant
            item.obs_c1 = actualizacion.observaciones
            item.user_c1 = usuario.cedula
        elif r == 2:
            item.cant_c2 = cant
            item.obs_c2 = actualizacion.observaciones
            item.user_c2 = usuario.cedula
        elif r == 3:
            item.cant_c3 = cant
            item.obs_c3 = actualizacion.observaciones
            item.user_c3 = usuario.cedula
        elif r == 4:
            item.cant_c4 = cant
            item.obs_c4 = actualizacion.observaciones
            item.user_c4 = usuario.cedula

        # 2. Lógica de Estado e Inteligencia Persistente
        # Valor teórico local
        teorico_local = (item.cantidad_sistema or 0.0) + (item.invporlegalizar or 0.0)
        item.cantidad_final = teorico_local
        item.diferencia = cant - teorico_local

        # Obtener configuración para saber la ronda activa global
        stmt_config = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
        res_config = await db.execute(stmt_config)
        config = res_config.scalar_one_or_none()
        r_activa = config.ronda_activa if config else 1

        # 2.1 Validación por Rondas (Humano vs Humano / Humano vs Sistema)
        if r == 1:
            nuevo_estado = "CONCILIADO" if cant == teorico_local else "RECONTEO"
        elif r == 2:
            nuevo_estado = "CONCILIADO" if cant == item.cant_c1 else "RECONTEO"
        elif r == 3:
            nuevo_estado = (
                "CONCILIADO"
                if (cant == item.cant_c1 or cant == item.cant_c2)
                else "DISCREPANTE"
            )
        else:  # r == 4
            nuevo_estado = "CONCILIADO"

        # --- Actualización masiva de diferencia_total para este código (dentro del mismo inventario) ---
        stmt_sku_all = select(ConteoInventario).where(
            ConteoInventario.codigo == item.codigo,
            ConteoInventario.conteo == item.conteo
        )
        result_sku_all = await db.execute(stmt_sku_all)
        rows_sku = result_sku_all.scalars().all()
        
        sum_fisico_global = 0.0
        teorico_unido = 0.0
        
        for r_sku in rows_sku:
            f_val = 0.0
            if r_activa == 1:
                f_val = r_sku.cant_c1 or 0.0
            elif r_activa == 2:
                f_val = r_sku.cant_c2 or 0.0
            elif r_activa == 3:
                f_val = r_sku.cant_c3 or 0.0
            elif r_activa == 4:
                f_val = r_sku.cant_c4 or 0.0
            
            if r_sku.id == item.id:
                f_val = cant
                
            sum_fisico_global += f_val
            if teorico_unido == 0:
                teorico_unido = (r_sku.cantidad_sistema or 0.0) + (r_sku.invporlegalizar or 0.0)

        dif_global_final = sum_fisico_global - teorico_unido
        
        for r_sku in rows_sku:
            r_sku.diferencia_total = dif_global_final
            
            if abs(dif_global_final) < 0.01:
                # Si el balance global es cero, todo el código está CONCILIADO
                r_sku.estado = "CONCILIADO"
            else:
                if r_sku.id == item.id:
                    # El ítem actual sigue la lógica de rondas normal o "UBICACIÓN ERRÓNEA"
                    # Si el local no cuadra pero el global sí (ya checado arriba),
                    # pero aquí dif_global_final != 0, entonces evaluamos el estado calculado antes.
                    r_sku.estado = nuevo_estado

        item.estado = nuevo_estado
        await db.commit()
        return {
            "exito": True,
            "mensaje": "Conteo procesado",
            "estado": item.estado,
            "diferencia_local": item.diferencia,
        }
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
        resultado = await ServicioInventario.importar_conteo_excel(
            file_content, conteo, db, limpiar_previo
        )
        return resultado
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
    # 1. Truncar tabla de tránsito antes de nueva carga (usualmente se reemplaza el reporte de tránsito)
    await db.execute(text("TRUNCATE TABLE transitoinventario"))

    # 2. Importar usando el servicio
    return await ServicioInventario.importar_transito_excel(content, db)


@router.post("/cargar-legacy")
async def cargar_legacy(
    file: UploadFile = File(...),
    ronda: int = Form(...),  # 1, 2, o 3
    db: AsyncSession = Depends(obtener_db),
) -> Dict[str, Any]:
    """Carga masiva de resultados de conteo (Legacy) para validación histórica."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel")

    if ronda not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La ronda debe ser 1, 2 o 3")

    content = await file.read()
    return await ServicioInventario.importar_legacy_excel(content, ronda, db)


@router.get("/plantilla-maestra")
async def descargar_plantilla_maestra():
    """Genera y descarga la plantilla Excel para la carga maestra de inventario."""
    buf = ServicioInventario.generar_plantilla_maestra()
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
    buf = ServicioInventario.generar_plantilla_transito()
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
