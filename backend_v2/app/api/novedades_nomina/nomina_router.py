import hashlib
import logging
from datetime import datetime
from pathlib import Path, PurePath

from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlmodel import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ...database import obtener_db, obtener_erp_db_opcional
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroCrudo, NominaRegistroNormalizado,
    NominaUploadResponse, NominaResumenSubcat
)
from ...services.novedades_nomina.extractor import NominaExtractor
from ...services.novedades_nomina.processor import NominaProcessor
from ...services.novedades_nomina.validacion_archivos_cooperativas import (
    validar_xlsx_seguro,
)
from .dependencies import requiere_permiso_nomina_novedades
from .routers import (
    cooperativas_router, libranzas_router, funebres_router, otros_router,
    descuentos_router, excepciones_router, novedades_router,
    tabla_maestra_router, comisiones_router, horas_extras_router,
)


logger = logging.getLogger(__name__)

router = APIRouter()
DEPENDENCIAS_NOMINA = [Depends(requiere_permiso_nomina_novedades)]
router.include_router(excepciones_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(descuentos_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(
    comisiones_router,
    prefix="/comisiones",
    dependencies=DEPENDENCIAS_NOMINA,
)
router.include_router(otros_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(cooperativas_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(funebres_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(libranzas_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(novedades_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(tabla_maestra_router, dependencies=DEPENDENCIAS_NOMINA)
router.include_router(horas_extras_router)


STORAGE_DIR = Path(__file__).resolve().parents[3] / "uploads" / "nomina"
MAX_BYTES_ARCHIVO_NOMINA = 20 * 1024 * 1024
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

TIPOS_ARCHIVO_NOMINA = {
    "pdf": ({"application/pdf", "application/octet-stream"}, (b"%PDF",)),
    "xls": ({"application/vnd.ms-excel", "application/octet-stream"}, (b"\xd0\xcf\x11\xe0",)),
    "xlsx": (
        {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream",
        },
        (b"PK\x03\x04",),
    ),
    "csv": ({"text/csv", "text/plain", "application/csv"}, ()),
}


def _validar_archivo_nomina(
    nombre_original: str | None,
    content_type: str | None,
    contenido: bytes,
) -> tuple[str, str]:
    nombre = PurePath((nombre_original or "").replace("\\", "/")).name
    extension = PurePath(nombre).suffix.lower().lstrip(".")
    configuracion = TIPOS_ARCHIVO_NOMINA.get(extension)
    if not nombre or configuracion is None:
        raise HTTPException(status_code=400, detail="Extensión de archivo no permitida")
    tipos_mime, firmas = configuracion
    if content_type not in tipos_mime:
        raise HTTPException(status_code=400, detail="Tipo MIME de archivo no permitido")
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    if firmas and not contenido.startswith(firmas):
        raise HTTPException(status_code=400, detail="La firma del archivo no es válida")
    if extension == "xlsx":
        try:
            validar_xlsx_seguro(contenido)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    if extension == "csv" and b"\x00" in contenido:
        raise HTTPException(status_code=400, detail="El contenido CSV no es válido")
    return nombre, extension


def _resolver_ruta_nomina(ruta: str) -> Path:
    ruta_resuelta = Path(ruta).resolve()
    try:
        ruta_resuelta.relative_to(STORAGE_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Ruta de archivo no permitida") from exc
    return ruta_resuelta


@router.get("/catalogo")
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
    content = await file.read(MAX_BYTES_ARCHIVO_NOMINA + 1)
    if len(content) > MAX_BYTES_ARCHIVO_NOMINA:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 20 MB")
    nombre_archivo, ext = _validar_archivo_nomina(
        file.filename,
        file.content_type,
        content,
    )
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Guardar en disco (siempre, por si se perdió físicamente)
    filename = f"{file_hash}.{ext}"
    path = str(STORAGE_DIR / filename)
    try:
        await run_in_threadpool(Path(path).write_bytes, content)
    except Exception as exc:
        logger.error("Error guardando archivo físico de nómina")
        raise HTTPException(status_code=500, detail="Error al guardar el archivo") from exc

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
    except Exception as exc:
        await session.rollback()
        logger.error("Error al verificar archivo duplicado")
        raise HTTPException(status_code=500, detail="Error al verificar el archivo") from exc
    
    try:
        archivo = NominaArchivo(
            nombre_archivo=nombre_archivo,
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
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=500, detail="Error al guardar metadatos del archivo") from exc

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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al obtener el archivo") from exc

    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    archivo.estado = "Procesando"
    # Limpiar registros previos por si se está reprocesando
    try:
        await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.archivo_id == archivo_id))
        await session.execute(delete(NominaRegistroCrudo).where(NominaRegistroCrudo.archivo_id == archivo_id))
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=500, detail="Error al preparar el procesamiento") from exc
    
    try:
        ruta_archivo = _resolver_ruta_nomina(archivo.ruta_almacenamiento)
        content = await run_in_threadpool(ruta_archivo.read_bytes)
        
        registros_normalizados = []
        raw_count = 0

        subcat_clean = str(archivo.subcategoria or "").strip().upper()
        logger.info(f"Procesando archivo ID {archivo.id} con subcategoria limpia: '{subcat_clean}'")

        # FLUJO GENÉRICO
        raw_records = await run_in_threadpool(
            NominaExtractor.extract_from_binary,
            content,
            archivo.tipo_archivo,
        )
        raw_count = len(raw_records)
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
        
    except Exception as exc:
        archivo.estado = "Error"
        archivo.error_log = type(exc).__name__
        logger.error("Error procesando archivo de nómina", exc_info=True)
        await session.commit()
        raise HTTPException(status_code=500, detail="Error al procesar el archivo") from exc


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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al consultar el archivo") from exc

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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al obtener el archivo") from exc

    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado en base de datos")
    
    ruta_archivo = _resolver_ruta_nomina(archivo.ruta_almacenamiento)
    if not ruta_archivo.is_file():
        raise HTTPException(status_code=404, detail="El archivo físico no se encuentra en el servidor")
    
    return FileResponse(
        path=ruta_archivo,
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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al consultar el resumen") from exc

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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al consultar la subcategoría") from exc

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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al consultar el historial") from exc

    # Ordenar y paginar
    statement = statement.order_by(NominaArchivo.creado_en.desc()).offset(skip).limit(limit)
    try:
        result = await session.execute(statement)
        rows = result.all()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al consultar el historial") from exc

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
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al preparar la exportación") from exc
    
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
