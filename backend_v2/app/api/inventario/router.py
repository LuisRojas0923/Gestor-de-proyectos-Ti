from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from sqlmodel import select, and_, or_, func
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

        # Pendientes Globales (Sin ningún conteo aún)
        stmt_pendientes = select(func.count(ConteoInventario.id)).where(
            ConteoInventario.estado == "PENDIENTE"
        )
        pendientes = (await db.execute(stmt_pendientes)).scalar()

        # Pendientes C1: Sin usuario asignado en C1
        stmt_pc1 = select(func.count(ConteoInventario.id)).where(
            ConteoInventario.user_c1.is_(None)
        )
        pc1 = (await db.execute(stmt_pc1)).scalar()

        # Pendientes C2: Estado RECONTEO y sin usuario en C2
        stmt_pc2 = select(func.count(ConteoInventario.id)).where(
            and_(ConteoInventario.estado == "RECONTEO", ConteoInventario.user_c2.is_(None))
        )
        pc2 = (await db.execute(stmt_pc2)).scalar()

        # Pendientes C3: Estado RECONTEO, con C2 ya hecho, pero sin usuario en C3
        stmt_pc3 = select(func.count(ConteoInventario.id)).where(
            and_(
                ConteoInventario.estado == "RECONTEO", 
                ConteoInventario.user_c2.is_not(None), 
                ConteoInventario.user_c3.is_(None)
            )
        )
        pc3 = (await db.execute(stmt_pc3)).scalar()

        porcentaje = round((conciliados / total * 100), 2) if total > 0 else 0

        return {
            "total": total,
            "conciliados": conciliados,
            "erroneos": erroneos,
            "discrepantes": discrepantes,
            "reconteo": reconteo,
            "pendientes": pendientes,
            "pendientes_c1": pc1,
            "pendientes_c2": pc2,
            "pendientes_c3": pc3,
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
        # 1. Validar si ya existe una asignación para esta ubicación exacta
        # (Considerando bodega, bloque, estante y nivel)
        stmt_conflicto = select(AsignacionInventario).where(and_(
            func.trim(func.upper(AsignacionInventario.bodega)) == func.trim(func.upper(data.bodega)),
            func.trim(func.upper(AsignacionInventario.bloque)) == func.trim(func.upper(data.bloque or "")),
            func.trim(func.upper(AsignacionInventario.estante)) == func.trim(func.upper(data.estante or "")),
            func.trim(func.upper(AsignacionInventario.nivel)) == func.trim(func.upper(data.nivel or ""))
        ))
        res_conflicto = await db.execute(stmt_conflicto)
        conflicto = res_conflicto.scalar_one_or_none()
        
        if conflicto:
            raise HTTPException(
                status_code=409, 
                detail=f"Esta ubicación ya está asignada a la pareja #{conflicto.numero_pareja or '?'}: {conflicto.nombre}"
            )

        # 2. Calcular número de pareja consecutivo
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
) -> List[Dict[str, Any]]:
    """Obtiene los productos asignados al usuario actual filtrando por estado."""
    try:
        # 1. Normalización de Cédula (Ignorar ceros a la izquierda y espacios)
        cedula_usuario_norm = usuario.cedula.strip().lstrip('0')
        print(f"DEBUG: Buscando asignación para cédula normalizada: {cedula_usuario_norm}")

        # 1.1 Buscar asignación usando normalización (Titular o Compañero)
        stmt_asig = select(AsignacionInventario).where(or_(
            func.ltrim(func.trim(AsignacionInventario.cedula), '0') == cedula_usuario_norm,
            func.ltrim(func.trim(AsignacionInventario.cedula_companero), '0') == cedula_usuario_norm
        ))
        result_asig = await db.execute(stmt_asig)
        asignacion = result_asig.scalar_one_or_none()

        if not asignacion:
            print(f"DEBUG: No se encontró asignación para usuario {usuario.cedula}")
            return []

        print(f"DEBUG: Asignación hallada: {asignacion.bodega} - {asignacion.bloque}")

        # 2. Obtener configuración para saber la ronda activa
        stmt_config = select(ConfiguracionInventario).where(ConfiguracionInventario.id == 1)
        res_config = await db.execute(stmt_config)
        config = res_config.scalar_one_or_none()
        r_activa = config.ronda_activa if config else 1

        # 3. Filtrado dinámico según ronda
        # Si es Ronda 1: Mostrar todo lo asignado (permitir correcciones)
        # Si es Ronda > 1: Ocultar los que ya quedaron conciliados en rondas previas
        stmt_inv = select(ConteoInventario).where(and_(
            func.trim(func.upper(ConteoInventario.bodega)) == func.trim(func.upper(asignacion.bodega)),
            func.trim(func.upper(ConteoInventario.bloque)) == func.trim(func.upper(asignacion.bloque)),
        ))

        if r_activa > 1:
            # En rondas avanzadas, solo vemos lo que falta O lo que estamos trabajando en esta ronda
            user_col = getattr(ConteoInventario, f"user_c{r_activa}")
            stmt_inv = stmt_inv.where(or_(
                ConteoInventario.estado.in_(["PENDIENTE", "RECONTEO", "DISCREPANTE"]),
                user_col.is_not(None)
            ))

        # Filtros opcionales (Estante/Nivel) también normalizados
        
        # Filtros opcionales (Estante/Nivel) también normalizados
        if asignacion.estante and asignacion.estante.strip():
            estantes_lista = [e.strip().upper() for e in asignacion.estante.split(',') if e.strip()]
            if len(estantes_lista) > 1:
                stmt_inv = stmt_inv.where(func.trim(func.upper(ConteoInventario.estante)).in_(estantes_lista))
            else:
                stmt_inv = stmt_inv.where(func.trim(func.upper(ConteoInventario.estante)) == estantes_lista[0])
            
        if asignacion.nivel and asignacion.nivel.strip():
            stmt_inv = stmt_inv.where(func.trim(func.upper(ConteoInventario.nivel)) == asignacion.nivel.strip().upper())
            
        result_inv = await db.execute(stmt_inv)
        productos = result_inv.scalars().all()
        
        print(f"DEBUG: Se enviarán {len(productos)} productos al operario")
        
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

        # 4. Desglose detallado por bodega (Requerimiento v4.2)
        desglose_bodega = {}
        ubicaciones_por_bodega = {}
        for u in ubicaciones_fisicas:
            b = u.split('-')[0]
            ubicaciones_por_bodega.setdefault(b, []).append(u)
        
        for b, ubics in ubicaciones_por_bodega.items():
            b_total = len(ubics)
            b_cubiertas = 0
            for u in ubics:
                parts = u.split('-')
                if len(parts) < 3: 
                    continue # Salto si la ubicación no tiene al menos Bodega-Bloque-Estante
                
                bod = parts[0]
                bl = parts[1]
                es = parts[2]
                ni = parts[3] if len(parts) > 3 else ""
                
                for asig in asignaciones:
                    # Validar correspondencia jerárquica
                    asig_estantes = [e.strip() for e in (asig.estante or "").split(',') if e.strip()]
                    
                    if (asig.bodega == bod and 
                        (not asig.bloque or asig.bloque == bl) and 
                        (not asig_estantes or es in asig_estantes) and
                        (not asig.nivel or asig.nivel == ni)):
                        b_cubiertas += 1
                        break
            
            desglose_bodega[b] = {
                "total": b_total,
                "cubiertos": b_cubiertas,
                "porcentaje": round((b_cubiertas / b_total * 100), 1) if b_total > 0 else 0
            }
        
        return {
            "cobertura": porcentaje,
            "total_ubicaciones_pendientes": total,
            "cubiertos": cubiertas,
            "faltantes": pendientes[:50],
            "desglose_bodega": desglose_bodega
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
                r_sku.estado = "CONCILIADO"
            elif r_sku.id == item.id:
                r_sku.estado = nuevo_estado

        if abs(dif_global_final) < 0.01:
            item.estado = "CONCILIADO"
        else:
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
    # 2. Importar usando el servicio (El servicio ya limpia la tabla interna)
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
