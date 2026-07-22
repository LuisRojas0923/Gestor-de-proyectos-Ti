import os
import hashlib
import logging
from datetime import datetime
from pathlib import Path

from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
from sqlmodel import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ...database import obtener_db, obtener_erp_db_opcional
from ...services.erp.empleados_service import EmpleadosService
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroCrudo, NominaRegistroNormalizado,
    NominaUploadResponse, NominaResumenSubcat
)
from ...services.novedades_nomina.extractor import NominaExtractor
from ...services.novedades_nomina.processor import NominaProcessor
from .dependencies import requiere_permiso_comisiones, requiere_permiso_nomina_novedades
from .routers import (
    cooperativas_router, libranzas_router, funebres_router, otros_router,
    descuentos_router, excepciones_router, novedades_router,
    tabla_maestra_router, comisiones_router
)


logger = logging.getLogger(__name__)

router = APIRouter()
dependencia_nomina = [Depends(requiere_permiso_nomina_novedades)]
router.include_router(excepciones_router, dependencies=dependencia_nomina)
router.include_router(descuentos_router, dependencies=dependencia_nomina)
router.include_router(
    comisiones_router,
    prefix="/comisiones",
    dependencies=[Depends(requiere_permiso_comisiones)],
)
router.include_router(otros_router, dependencies=dependencia_nomina)
router.include_router(cooperativas_router, dependencies=dependencia_nomina)
router.include_router(funebres_router, dependencies=dependencia_nomina)
router.include_router(libranzas_router, dependencies=dependencia_nomina)
router.include_router(novedades_router, dependencies=dependencia_nomina)
router.include_router(tabla_maestra_router, dependencies=dependencia_nomina)


STORAGE_DIR = "uploads/nomina"
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.get(
    "/catalogo",
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def obtener_catalogo():
    """Devuelve el catálogo de categorías y subcategorías"""
    return {
        "LIBRANZAS": ["BOGOTA LIBRANZA", "DAVIVIENDA LIBRANZA", "OCCIDENTE LIBRANZA"],
        "FUNEBRES": ["CAMPOSANTO", "RECORDAR"],
        "COOPERATIVAS": ["BENEFICIAR", "GRANCOOP"],
        "OTROS": ["OTROS GERENCIA", "POLIZAS VEHICULOS", "SEGUROS HDI", "MEDICINA PREPAGADA", "GESTION EXCEPCIONES"],
        "DESCUENTOS": ["CONTROL DE DESCUENTOS", "CELULARES", "RETENCIONES", "EMBARGOS"],
        "NOVEDADES": ["PLANILLAS REGIONALES 1Q", "PLANILLAS REGIONALES 2Q"]
    }

@router.post(
    "/archivos",
    response_model=NominaUploadResponse,
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def cargar_archivo(
    mes: int = Form(...),
    año: int = Form(...),
    subcategoria: str = Form(...),
    categoria: Optional[str] = Form(None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(obtener_db)
):
    """Carga un archivo y guarda sus metadatos"""
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Guardar en disco (siempre, por si se perdió físicamente)
    ext = file.filename.split('.')[-1].lower()
    filename = f"{file_hash}.{ext}"
    path = os.path.join(STORAGE_DIR, filename)
    try:
        with open(path, "wb") as f_out:
            f_out.write(content)
    except Exception as e:
        logger.error(f"Error guardando archivo físico: {str(e)}")
        # Continuamos, el error real saltará en la descarga si falla

    # Verificar si ya existe en DB para actualizar metadatos
    try:
        result = await session.execute(select(NominaArchivo).where(NominaArchivo.hash_archivo == file_hash))
        existing = result.scalars().first()
        if existing:
            # Si ya existe, actualizamos su fecha de creación y ruta por si acaso
            existing.creado_en = datetime.now()
            existing.mes_fact = mes
            existing.año_fact = año
            existing.subcategoria = subcategoria.strip()
            existing.ruta_almacenamiento = path
            await session.commit()
            await session.refresh(existing)
            return existing
    except Exception as e:
        logger.error(f"Error al verificar duplicado: {str(e)}")
    
    try:
        archivo = NominaArchivo(
            nombre_archivo=file.filename,
            hash_archivo=file_hash,
            tamaño_bytes=len(content),
            tipo_archivo=ext,
            ruta_almacenamiento=path,
            mes_fact=mes,
            año_fact=año,
            categoria=categoria or "VARIOS",
            subcategoria=subcategoria.strip(),
            estado="Cargado"
        )
        session.add(archivo)
        await session.commit()
        await session.refresh(archivo)
        return archivo
    except Exception as e:
        await session.rollback()
        logger.exception("Error al guardar metadatos del archivo")
        raise HTTPException(status_code=500, detail="No fue posible guardar el archivo.") from e

@router.post(
    "/archivos/{archivo_id}/procesar",
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def procesar_archivo(
    archivo_id: int, 
    session: AsyncSession = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    """Extrae, normaliza y clasifica los registros de un archivo"""
    try:
        archivo = await session.get(NominaArchivo, archivo_id)
    except Exception as e:
        logger.exception("Error al obtener el archivo %s", archivo_id)
        raise HTTPException(status_code=500, detail="No fue posible consultar el archivo.") from e

    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    try:
        def leer_archivo() -> bytes:
            with open(archivo.ruta_almacenamiento, "rb") as f:
                return f.read()

        import asyncio

        content = await asyncio.to_thread(leer_archivo)
        raw_records = await asyncio.to_thread(
            NominaExtractor.extract_from_binary,
            content,
            archivo.tipo_archivo,
        )
    except (OSError, ValueError) as e:
        raise HTTPException(
            status_code=422,
            detail="El archivo no se puede leer o no cumple la estructura requerida.",
        ) from e

    if not raw_records:
        raise HTTPException(
            status_code=422,
            detail="El archivo no contiene registros válidos; se conservaron los datos anteriores.",
        )

    subcat_clean = str(archivo.subcategoria or "").strip().upper()
    try:
        from ...services.novedades_nomina.nomina_service import NominaService

        await NominaService._bloquear_periodo(
            session,
            subcategoria=subcat_clean,
            mes=archivo.mes_fact,
            anio=archivo.año_fact,
        )
        archivo.estado = "Procesando"
        await session.execute(
            delete(NominaRegistroNormalizado).where(
                NominaRegistroNormalizado.archivo_id == archivo_id
            )
        )
        await session.execute(
            delete(NominaRegistroCrudo).where(
                NominaRegistroCrudo.archivo_id == archivo_id
            )
        )
        registros_normalizados = []
        raw_count = len(raw_records)
        logger.info(f"Procesando archivo ID {archivo.id} con subcategoria limpia: '{subcat_clean}'")
        processor = NominaProcessor(session)
        
        for i, raw in enumerate(raw_records):
            # Guardar crudo
            crudo = NominaRegistroCrudo(archivo_id=archivo.id, fila_origen=i+1, payload=raw)
            session.add(crudo)
            
            # Normalizar
            normalizado = await processor.normalize_record(raw, archivo, i+1)
            session.add(normalizado)
            registros_normalizados.append(normalizado)
        
        archivo.estado = "Procesado"
        await session.commit()
        return {"mensaje": f"Procesados {raw_count} registros", "archivo_id": archivo.id}
        
    except Exception as e:
        await session.rollback()
        logger.exception("Error procesando archivo %s", archivo_id)
        try:
            archivo_error = await session.get(NominaArchivo, archivo_id)
            if archivo_error:
                archivo_error.estado = "Error"
                archivo_error.error_log = str(e)
                await session.commit()
        except Exception:
            await session.rollback()
            logger.exception("No se pudo registrar el error del archivo %s", archivo_id)
        raise HTTPException(status_code=500, detail="No fue posible procesar el archivo.") from e


@router.get(
    "/archivos/{archivo_id}/preview",
    response_model=List[NominaRegistroNormalizado],
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def obtener_preview(
    archivo_id: int, 
    skip: int = 0, 
    limit: int = 50, 
    session: AsyncSession = Depends(obtener_db)
):
    """Devuelve los registros normalizados de un archivo (paginado)"""
    statement = select(NominaRegistroNormalizado).where(NominaRegistroNormalizado.archivo_id == archivo_id).offset(skip).limit(limit)
    try:
        result = await session.execute(statement)
        return result.scalars().all()
    except Exception as e:
        logger.exception("Error al consultar preview del archivo %s", archivo_id)
        raise HTTPException(status_code=500, detail="No fue posible consultar el archivo.") from e

@router.get(
    "/archivos/{archivo_id}/descargar",
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def descargar_archivo(
    archivo_id: int, 
    session: AsyncSession = Depends(obtener_db)
):
    """Descarga el archivo original cargado"""
    try:
        archivo = await session.get(NominaArchivo, archivo_id)
    except Exception as e:
        logger.exception("Error al obtener el archivo %s para descarga", archivo_id)
        raise HTTPException(status_code=500, detail="No fue posible consultar el archivo.") from e

    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado en base de datos")
    
    try:
        storage_root = Path(STORAGE_DIR).resolve(strict=True)
        ruta_archivo = Path(archivo.ruta_almacenamiento).resolve(strict=True)
    except (OSError, RuntimeError):
        raise HTTPException(status_code=404, detail="El archivo físico no se encuentra en el servidor")

    if ruta_archivo.parent != storage_root or not ruta_archivo.is_file():
        logger.warning("Ruta de descarga inválida para archivo %s", archivo_id)
        raise HTTPException(status_code=404, detail="El archivo físico no se encuentra en el servidor")
    
    return FileResponse(
        path=str(ruta_archivo),
        filename=archivo.nombre_archivo,
        media_type='application/octet-stream'
    )

@router.get(
    "/subcategorias/resumen",
    response_model=List[NominaResumenSubcat],
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def obtener_resumen_mensual(
    mes: int, 
    año: int, 
    session: AsyncSession = Depends(obtener_db)
):
    """Resumen mensual por subcategoría con conteos y totales"""
    # Consulta agrupada
    statement = select(
        NominaRegistroNormalizado.subcategoria_final.label("subcategoria"),
        func.count(NominaRegistroNormalizado.id).label("total_registros"),
        func.sum(NominaRegistroNormalizado.valor).label("total_valor")
    ).where(
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == año
    ).group_by(NominaRegistroNormalizado.subcategoria_final)
    
    try:
        result = await session.execute(statement)
        results = result.all()
        return [{"subcategoria": r[0], "total_registros": r[1], "total_valor": r[2]} for r in results]
    except Exception as e:
        logger.exception("Error al consultar resumen mensual de nómina")
        raise HTTPException(status_code=500, detail="No fue posible consultar el resumen mensual.") from e

@router.get(
    "/subcategorias/{subcat}",
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def obtener_detalles_subcategoria(
    subcat: str, 
    mes: int, 
    año: int, 
    skip: int = 0, 
    limit: int = 100,
    session: AsyncSession = Depends(obtener_db)
):
    """Devuelve registros mensuales de una subcategoría específica"""
    statement = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == subcat,
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == año
    ).offset(skip).limit(limit)
    
    try:
        result = await session.execute(statement)
        return result.scalars().all()
    except Exception as e:
        logger.exception("Error al consultar la subcategoría %s", subcat)
        raise HTTPException(status_code=500, detail="No fue posible consultar la subcategoría.") from e

@router.get(
    "/historial",
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def obtener_historial(
    mes: Optional[int] = None,
    año: Optional[int] = None,
    subcategoria: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(obtener_db),
):
    """Devuelve el histórico de archivos cargados con filtros opcionales"""
    # Consulta base
    statement = select(
        NominaArchivo,
        func.count(NominaRegistroNormalizado.id).label("total_registros")
    ).outerjoin(
        NominaRegistroNormalizado,
        NominaRegistroNormalizado.archivo_id == NominaArchivo.id
    ).group_by(NominaArchivo.id)

    # Filtros opcionales
    if mes is not None:
        statement = statement.where(NominaArchivo.mes_fact == mes)
    if año is not None:
        statement = statement.where(NominaArchivo.año_fact == año)
    if subcategoria:
        statement = statement.where(NominaArchivo.subcategoria == subcategoria)

    # Conteo total (sin paginación)
    count_stmt = select(func.count(NominaArchivo.id))
    if mes is not None:
        count_stmt = count_stmt.where(NominaArchivo.mes_fact == mes)
    if año is not None:
        count_stmt = count_stmt.where(NominaArchivo.año_fact == año)
    if subcategoria:
        count_stmt = count_stmt.where(NominaArchivo.subcategoria == subcategoria)
    
    try:
        total_result = await session.execute(count_stmt)
        total = total_result.scalar() or 0
    except Exception as e:
        logger.exception("Error al contar archivos del historial")
        raise HTTPException(status_code=500, detail="No fue posible consultar el historial.") from e

    # Ordenar y paginar
    statement = statement.order_by(NominaArchivo.creado_en.desc()).offset(skip).limit(limit)
    try:
        result = await session.execute(statement)
        rows = result.all()
    except Exception as e:
        logger.exception("Error al consultar archivos del historial")
        raise HTTPException(status_code=500, detail="No fue posible consultar el historial.") from e

    archivos = []
    for archivo, total_registros in rows:
        archivos.append({
            "id": archivo.id,
            "nombre_archivo": archivo.nombre_archivo,
            "subcategoria": archivo.subcategoria,
            "categoria": archivo.categoria,
            "mes_fact": archivo.mes_fact,
            "año_fact": archivo.año_fact,
            "estado": archivo.estado,
            "creado_en": archivo.creado_en.isoformat() if archivo.creado_en else None,
            "tamaño_bytes": archivo.tamaño_bytes,
            "tipo_archivo": archivo.tipo_archivo,
            "total_registros": total_registros or 0,
        })

    return {"archivos": archivos, "total": total}


@router.post(
    "/exportar-solid",
    dependencies=[Depends(requiere_permiso_nomina_novedades)],
)
async def exportar_a_solid(
    mes: int,
    año: int,
    session: AsyncSession = Depends(obtener_db)
):
    """Genera el payload mensual para Solid ERP"""
    statement = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == año
    )
    try:
        result = await session.execute(statement)
        registros = result.scalars().all()
    except Exception as e:
        logger.exception("Error al consultar registros para exportación")
        raise HTTPException(status_code=500, detail="No fue posible preparar la exportación.") from e
    
    # Agrupar por subcategoría
    payload = {}
    no_clasificado = []
    
    for reg in registros:
        if reg.estado_validacion == "NO_CLASIFICADO":
            no_clasificado.append(reg)
            continue
            
        sub = reg.subcategoria_final
        if sub not in payload:
            payload[sub] = []
        payload[sub].append({
            "cedula": reg.cedula,
            "nombre": reg.nombre_asociado,
            "valor": reg.valor,
            "empresa": reg.empresa,
            "concepto": reg.concepto,
            "fecha": reg.fecha_creacion.isoformat()
        })
    
    return {
        "mes": mes,
        "año": año,
        "payload_por_subcategoria": payload,
        "no_clasificado": no_clasificado,
        "total_registros": len(registros)
    }
