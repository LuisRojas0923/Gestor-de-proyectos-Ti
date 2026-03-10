import os
import hashlib
import logging
import traceback
from datetime import datetime

from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlmodel import Session, select, func, delete
from ...database import obtener_db, obtener_erp_db_opcional
from ...services.erp.empleados_service import EmpleadosService
from ...models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroCrudo, NominaRegistroNormalizado, NominaConcepto,
    NominaUploadResponse, NominaResumenSubcat
)
from ...services.novedades_nomina.extractor import NominaExtractor
from ...services.novedades_nomina.processor import NominaProcessor
from ...services.novedades_nomina.grancoop_extractor import extraer_grancoop
from ...services.novedades_nomina.bogota_extractor import extraer_bogota_libranza
from ...services.novedades_nomina.davivienda_extractor import extraer_davivienda_libranza
from ...services.novedades_nomina.occidente_extractor import extraer_occidente_libranza
from ...services.novedades_nomina.camposanto_extractor import extraer_camposanto
from ...services.novedades_nomina.hdi_extractor import extraer_hdi
from ...services.novedades_nomina.recordar_extractor import extraer_recordar
from ...services.novedades_nomina.beneficiar_extractor import extraer_beneficiar
from ...services.novedades_nomina.polizas_vehiculos_extractor import extraer_polizas_vehiculos
from ...services.novedades_nomina.otros_gerencia_extractor import extraer_otros_gerencia
from ...services.novedades_nomina.medicina_prepagada_extractor import extraer_medicina_prepagada
from ...services.novedades_nomina.control_descuentos_extractor import extraer_control_descuentos
from ...services.novedades_nomina.celulares_extractor import extraer_celulares
from ...services.novedades_nomina.embargos_extractor import extraer_embargos




logger = logging.getLogger(__name__)

router = APIRouter()


STORAGE_DIR = "uploads/nomina"
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.post("/diagnostico-pdf")
async def diagnostico_pdf(
    file: UploadFile = File(...),
):
    """ENDPOINT TEMPORAL DE DIAGNÓSTICO - ver texto extraído por pdfplumber de un PDF."""
    import pdfplumber, io, re
    contenido = await file.read()
    texto = ""
    paginas = []
    with pdfplumber.open(io.BytesIO(contenido)) as pdf:
        for i, page in enumerate(pdf.pages[:3]):
            txt = page.extract_text() or ""
            texto += txt + "\n"
            paginas.append({"pagina": i+1, "texto_repr": repr(txt[:1500])})
    
    # Probar regex principal
    PATTERN = re.compile(
        r"Documento\s+No[:\s]+(\d+)\s+Nombre[:\s]+(.+?)\s+\$\s*([\d.,]+)",
        re.IGNORECASE,
    )
    matches = PATTERN.findall(texto)
    
    # Líneas con "Documento"
    lineas_doc = [repr(l) for l in texto.splitlines() if "documento" in l.lower()][:20]
    
    return {
        "paginas": paginas,
        "regex_matches": [{"cedula": m[0], "nombre": m[1], "valor": m[2]} for m in matches[:10]],
        "lineas_con_documento": lineas_doc,
        "total_texto_chars": len(texto),
    }

@router.get("/catalogo")
async def obtener_catalogo():
    """Devuelve el catálogo de categorías y subcategorías"""
    return {
        "LIBRANZAS": ["BOGOTA LIBRANZA", "DAVIVIENDA LIBRANZA", "OCCIDENTE LIBRANZA"],
        "FUNEBRES": ["CAMPOSANTO", "RECORDAR"],
        "COOPERATIVAS": ["BENEFICIAR", "GRANCOOP"],
        "OTROS": ["OTROS GERENCIA", "POLIZAS VEHICULOS", "SEGUROS HDI", "MEDICINA PREPAGADA"],
        "DESCUENTOS": ["CONTROL DE DESCUENTOS", "CELULARES", "RETENCIONES", "EMBARGOS"],
        "NOVEDADES": ["PLANILLAS REGIONALES", "NOVEDADES ADMON", "COMISIONES"]
    }

@router.post("/archivos", response_model=NominaUploadResponse)
async def cargar_archivo(
    mes: int = Form(...),
    año: int = Form(...),
    subcategoria: str = Form(...),
    categoria: Optional[str] = Form(None),
    file: UploadFile = File(...),
    session: Session = Depends(obtener_db)
):
    """Carga un archivo y guarda sus metadatos"""
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Verificar si ya existe
    result = await session.execute(select(NominaArchivo).where(NominaArchivo.hash_archivo == file_hash))
    existing = result.scalars().first()
    if existing:
        return existing

    # Guardar en disco
    ext = file.filename.split('.')[-1].lower()
    filename = f"{file_hash}.{ext}"
    path = os.path.join(STORAGE_DIR, filename)
    with open(path, "wb") as f:
        f.write(content)
    
    archivo = NominaArchivo(
        nombre_archivo=file.filename,
        hash_archivo=file_hash,
        tamaño_bytes=len(content),
        tipo_archivo=ext,
        ruta_almacenamiento=path,
        mes_fact=mes,
        año_fact=año,
        categoria=categoria or "VARIOS",
        subcategoria=subcategoria,
        estado="Cargado"
    )
    
    session.add(archivo)
    await session.commit()
    await session.refresh(archivo)
    return archivo

@router.post("/archivos/{archivo_id}/procesar")
async def procesar_archivo(
    archivo_id: int, 
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    """Extrae, normaliza y clasifica los registros de un archivo"""
    archivo = await session.get(NominaArchivo, archivo_id)
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    archivo.estado = "Procesando"
    # Limpiar registros previos por si se está reprocesando
    await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.archivo_id == archivo_id))
    await session.execute(delete(NominaRegistroCrudo).where(NominaRegistroCrudo.archivo_id == archivo_id))
    await session.commit()
    
    try:
        with open(archivo.ruta_almacenamiento, "rb") as f:
            content = f.read()
        
        registros_normalizados = []
        raw_count = 0

        subcat_clean = str(archivo.subcategoria or "").strip().upper()
        logger.info(f"Procesando archivo ID {archivo.id} con subcategoria limpia: '{subcat_clean}'")

        # CASOS ESPECIALES: Usar extractores específicos
        if subcat_clean == "MEDICINA PREPAGADA":
            rows, summary, warnings_txt = extraer_medicina_prepagada([content])
            raw_count = len(rows)
            
            # Enriquecimiento y validación ERP para MEDICINA PREPAGADA
            mapa_erp = {}
            if db_erp:
                cedulas_unicas = list(set(r["cedula"] for r in rows))
                mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

            for i, row in enumerate(rows):
                info = mapa_erp.get(row["cedula"])
                estado_val = "OK" if info else "NO_CLASIFICADO"
                if info and info.get("estado", "").upper() != "ACTIVO":
                    estado_val = "ADVERTENCIA"

                reg = NominaRegistroNormalizado(
                    archivo_id=archivo.id,
                    fecha_creacion=datetime.now(),
                    mes_fact=archivo.mes_fact, año_fact=archivo.año_fact,
                    cedula=row["cedula"],
                    nombre_asociado=info["nombre"] if info else "",
                    valor=row["valor"],
                    empresa=info["empresa"] if info else "",
                    concepto=row["concepto"],
                    categoria_final="OTROS",
                    subcategoria_final="MEDICINA PREPAGADA",
                    estado_validacion=estado_val,
                    fila_origen=i + 1,
                )
                session.add(reg)
                registros_normalizados.append(reg)

        elif subcat_clean == "OTROS GERENCIA":
            rows, summary, warnings_txt = extraer_otros_gerencia([content])
            raw_count = len(rows)
            
            mapa_erp = {}
            if db_erp:
                cedulas_unicas = list(set(r["cedula"] for r in rows))
                mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

            for i, row in enumerate(rows):
                info = mapa_erp.get(row["cedula"])
                reg = NominaRegistroNormalizado(
                    archivo_id=archivo.id,
                    fecha_creacion=datetime.now(),
                    mes_fact=archivo.mes_fact, año_fact=archivo.año_fact,
                    cedula=row["cedula"],
                    nombre_asociado=info["nombre"] if info else "",
                    valor=row["valor"],
                    empresa=info["empresa"] if info else "",
                    concepto=row["concepto"],
                    categoria_final="OTROS",
                    subcategoria_final="OTROS GERENCIA",
                    estado_validacion="OK" if info else "NO_CLASIFICADO",
                    fila_origen=i + 1,
                )
                session.add(reg)
                registros_normalizados.append(reg)

        elif subcat_clean == "CONTROL DE DESCUENTOS":
            rows, summary, warnings_txt = extraer_control_descuentos([content])
            raw_count = len(rows)
            
            mapa_erp = {}
            if db_erp:
                cedulas_unicas = list(set(r["cedula"] for r in rows))
                mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

            for i, row in enumerate(rows):
                info = mapa_erp.get(row["cedula"])
                reg = NominaRegistroNormalizado(
                    archivo_id=archivo.id,
                    fecha_creacion=datetime.now(),
                    mes_fact=archivo.mes_fact, año_fact=archivo.año_fact,
                    cedula=row["cedula"],
                    nombre_asociado=info["nombre"] if info else "",
                    valor=row["valor"],
                    empresa=info["empresa"] if info else "",
                    concepto=row["concepto"],
                    categoria_final="DESCUENTOS",
                    subcategoria_final="CONTROL DE DESCUENTOS",
                    estado_validacion="OK" if info else "NO_CLASIFICADO",
                    fila_origen=i + 1,
                )
                session.add(reg)
                registros_normalizados.append(reg)

        elif subcat_clean == "CELULARES":
            rows, summary, warnings_txt = extraer_celulares([content])
            raw_count = len(rows)
            
            mapa_erp = {}
            if db_erp:
                cedulas_unicas = list(set(r["cedula"] for r in rows))
                mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

            for i, row in enumerate(rows):
                info = mapa_erp.get(row["cedula"])
                reg = NominaRegistroNormalizado(
                    archivo_id=archivo.id,
                    fecha_creacion=datetime.now(),
                    mes_fact=archivo.mes_fact, año_fact=archivo.año_fact,
                    cedula=row["cedula"],
                    nombre_asociado=info["nombre"] if info else "",
                    valor=row["valor"],
                    empresa=info["empresa"] if info else "",
                    concepto=row["concepto"],
                    categoria_final="DESCUENTOS",
                    subcategoria_final="CELULARES",
                    estado_validacion="OK" if info else "NO_CLASIFICADO",
                    fila_origen=i + 1,
                )
                session.add(reg)
                registros_normalizados.append(reg)

        else:
            # FLUJO GENÉRICO
            raw_records = NominaExtractor.extract_from_binary(content, archivo.tipo_archivo)
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
        
    except Exception as e:
        archivo.estado = "Error"
        archivo.error_log = str(e)
        import traceback
        logger.error(f"Error procesando archivo {archivo_id}: {traceback.format_exc()}")
        await session.commit()
        raise HTTPException(status_code=500, detail=f"Error al procesar: {str(e)}")


@router.get("/archivos/{archivo_id}/preview", response_model=List[NominaRegistroNormalizado])
async def obtener_preview(
    archivo_id: int, 
    skip: int = 0, 
    limit: int = 50, 
    session: Session = Depends(obtener_db)
):
    """Devuelve los registros normalizados de un archivo (paginado)"""
    statement = select(NominaRegistroNormalizado).where(NominaRegistroNormalizado.archivo_id == archivo_id).offset(skip).limit(limit)
    result = await session.execute(statement)
    return result.scalars().all()

@router.get("/subcategorias/resumen", response_model=List[NominaResumenSubcat])
async def obtener_resumen_mensual(
    mes: int, 
    año: int, 
    session: Session = Depends(obtener_db)
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
    
    result = await session.execute(statement)
    results = result.all()
    return [{"subcategoria": r[0], "total_registros": r[1], "total_valor": r[2]} for r in results]

@router.get("/subcategorias/{subcat}")
async def obtener_detalles_subcategoria(
    subcat: str, 
    mes: int, 
    año: int, 
    skip: int = 0, 
    limit: int = 100,
    session: Session = Depends(obtener_db)
):
    """Devuelve registros mensuales de una subcategoría específica"""
    statement = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == subcat,
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == año
    ).offset(skip).limit(limit)
    
    result = await session.execute(statement)
    return result.scalars().all()

@router.get("/historial")
async def obtener_historial(
    mes: Optional[int] = None,
    año: Optional[int] = None,
    subcategoria: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(obtener_db),
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
    
    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0

    # Ordenar y paginar
    statement = statement.order_by(NominaArchivo.creado_en.desc()).offset(skip).limit(limit)
    result = await session.execute(statement)
    rows = result.all()

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


@router.post("/exportar-solid")
async def exportar_a_solid(
    mes: int,
    año: int,
    session: Session = Depends(obtener_db)
):
    """Genera el payload mensual para Solid ERP"""
    statement = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == año
    )
    result = await session.execute(statement)
    registros = result.scalars().all()
    
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


@router.post("/grancoop/preview")
async def preview_grancoop(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa PDFs de GRANCOOP, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_grancoop(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    # ── Enriquecimiento con ERP ──────────────────────
    warnings_detalle = []  # Lista de {cedula, nombre, motivo}

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row["nombre_asociado"]
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        # Generar warnings estructurados (una sola entrada por cédula)
        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya:
                continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row["nombre_asociado"],
                    "motivo": "No encontrada en ERP",
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row["nombre_asociado"],
                    "motivo": f"Estado: {estado}",
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── Separar filas válidas de filas con warning ──
    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    # Mapa de motivo por cédula para marcar estado_validacion
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    # Recalcular summary con datos válidos y warnings separados
    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows) 

    # ── Persistencia (TODAS las filas: válidas + warning) ──────────────
    from sqlalchemy import delete
    from datetime import datetime

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "GRANCOOP",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"grancoop_{mes}_{anio}.pdf",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest(),
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="pdf",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="COOPERATIVAS",
        subcategoria="GRANCOOP",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    # Guardar filas válidas con estado OK
    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes,
            año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="COOPERATIVAS",
            subcategoria_final="GRANCOOP",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    # Guardar filas con warning (inactivos, no encontrados, etc.)
    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes,
            año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="COOPERATIVAS",
            subcategoria_final="GRANCOOP",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }


@router.get("/grancoop/datos")
async def obtener_datos_grancoop(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos GRANCOOP guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "GRANCOOP",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes,
        "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

# ── BENEFICIAR ─────────────────────────────────────────────────────────────

@router.post("/beneficiar/preview")
async def preview_beneficiar(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de BENEFICIAR, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_beneficiar(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    # ── Retirados con pago externo ────────────────────────────────────────────
    RETIRADOS_PAGO_EXTERNO: dict = {
        "16783959": {"nombre": "DELGADO REINA ALEXANDER", "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
        "31977462": {"nombre": "PARRA TRUJILLO LILIANA",  "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
    }

    warnings_detalle = []
    cedulas_solo_informativas: set = set(RETIRADOS_PAGO_EXTERNO.keys())
    cedulas_sin_erp = cedulas_solo_informativas

    if db_erp is not None:
        cedulas_para_erp = list(
            set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp)
        )
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)

        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            if ced in cedulas_ya:
                continue
            cedulas_ya.add(ced)
            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": "No encontrada en ERP",
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": f"Estado: {estado}",
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── Aplicar retirados con pago externo ───────────────────────────
    for row in rows:
        ced = row["cedula"]
        if ced in RETIRADOS_PAGO_EXTERNO:
            ret = RETIRADOS_PAGO_EXTERNO[ced]
            row["nombre_asociado"] = ret["nombre"]
            row["empresa"] = ret["empresa"]
            row["estado_erp"] = "RETIRADO"
            if not any(w["cedula"] == ced for w in warnings_detalle):
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": ret["nombre"],
                    "motivo": ret["motivo"],
                })

    cedulas_warning = set(
        w["cedula"] for w in warnings_detalle
        if w["cedula"] not in cedulas_solo_informativas
    )
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)
    summary["archivos_procesados"] = len(archivos_binarios)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "BENEFICIAR",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"beneficiar_{mes}_{anio}.xls",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xls",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="COOPERATIVAS",
        subcategoria="BENEFICIAR",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="COOPERATIVAS",
            subcategoria_final="BENEFICIAR",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="COOPERATIVAS",
            subcategoria_final="BENEFICIAR",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()
    
    # Formateo de salida con claves en minuscula
    formatted_rows = []
    for r in rows_validas:
        formatted_rows.append({
            "cedula": r["cedula"],
            "nombre_asociado": r.get("nombre_asociado", ""),
            "empresa": r.get("empresa", ""),
            "valor": r["valor"],
            "concepto": r["concepto"]
        })

    return {
        "rows": formatted_rows,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }


@router.get("/beneficiar/datos")
async def obtener_datos_beneficiar(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos BENEFICIAR guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "BENEFICIAR",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0

    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle),
        "archivos_procesados": 1
    }

    return {
        "rows": rows,
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── SEGUROS HDI ─────────────────────────────────────────────────────────────

@router.post("/hdi/preview")
async def preview_hdi(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa PDFs de SEGUROS HDI, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_hdi(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row["nombre_asociado"]
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row["nombre_asociado"], "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row["nombre_asociado"], "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── Base de Contratistas HDI ──────────────────────────────────────────────
    CONTRATISTAS_HDI = {
        "16206046": {"nombre": "JIMENEZ ARBELAEZ CARLOS HERNAN", "empresa": "CONTRATISTA"},
        "31239413": {"nombre": "TORRES ALEGRIAS ROSALBA",         "empresa": "CONTRATISTA"},
    }

    # ── Retirados con pago externo HDI ────────────────────────────────────────
    # Se contabilizan en el total pero aparecen en warnings con motivo informativo.
    RETIRADOS_PAGO_EXTERNO_HDI: dict = {
        "16783959": {"nombre": "DELGADO REINA ALEXANDER", "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
        "31977462": {"nombre": "PARRA TRUJILLO LILIANA",  "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
    }
    cedulas_solo_informativas_hdi: set = set(RETIRADOS_PAGO_EXTERNO_HDI.keys())

    # Aplicar contratistas: prioridad máxima, se eliminan de warnings si estaban
    for row in rows:
        ced = row["cedula"]
        if ced in CONTRATISTAS_HDI:
            row["nombre_asociado"] = CONTRATISTAS_HDI[ced]["nombre"]
            row["empresa"] = CONTRATISTAS_HDI[ced]["empresa"]
            row["estado_erp"] = "ACTIVO"
            warnings_detalle = [w for w in warnings_detalle if w["cedula"] != ced]

    # Aplicar retirados con pago externo: se contabilizan pero aparecen en warnings
    for row in rows:
        ced = row["cedula"]
        if ced in RETIRADOS_PAGO_EXTERNO_HDI:
            ret = RETIRADOS_PAGO_EXTERNO_HDI[ced]
            row["nombre_asociado"] = ret["nombre"]
            row["empresa"] = ret["empresa"]
            row["estado_erp"] = "RETIRADO"
            # Eliminar warning genérico del ERP si existía, agregar el informativo
            warnings_detalle = [w for w in warnings_detalle if w["cedula"] != ced]
            warnings_detalle.append({
                "cedula": ced,
                "nombre": ret["nombre"],
                "motivo": ret["motivo"],
            })

    # Las cédulas 'solo informativas' se mantienen en rows_validas aunque estén en warnings
    cedulas_warning = set(
        w["cedula"] for w in warnings_detalle
        if w["cedula"] not in cedulas_solo_informativas_hdi
    )
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "SEGUROS HDI",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"hdi_{mes}_{anio}.pdf",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="pdf",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="SEGUROS HDI",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="SEGUROS HDI",
            estado_validacion="OK",
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="SEGUROS HDI",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/hdi/datos")
async def obtener_datos_hdi(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos SEGUROS HDI guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "SEGUROS HDI",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── CAMPOSANTO ────────────────────────────────────────────────────────────────

@router.post("/camposanto/preview")
async def preview_camposanto(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """
    Procesa PDFs de CAMPOSANTO (Metropolitano), enriquece con ERP, guarda en BD.

    Flujo especial:
    1. Extraer registros del PDF.
    2. Aplicar mapa de reemplazo de cédulas (ej: 48572702 → 31231202).
    3. Enriquecer con ERP usando la cédula ya reemplazada.
    4. Aplicar tabla de excepciones (contratistas conocidos).
    """
    # ── Mapa de reemplazo de cédulas ─────────────────────────────────────────
    # Cuando el PDF trae una cédula incorrecta o provisional que debe ser
    # sustituida por la cédula real antes de consultar el ERP.
    REEMPLAZOS_CEDULA: dict = {
        "48572702": "31231202",   # Cédula provisional → cédula real en ERP
    }

    # ── Tabla de excepciones de Camposanto ────────────────────────────────────
    # Contratistas cuyo empresa no está en ERP y se marca manualmente.
    # Clave: cédula → {"nombre": ..., "empresa": ...}
    EXCEPCIONES_CAMPOSANTO: dict = {
        "16206046": {"nombre": "JIMENEZ CARLOS HERNAN", "empresa": "CONTRATISTA"},
        "31239413": {"nombre": "TORRES ROSALBA",        "empresa": "CONTRATISTA"},
    }

    # ── Retirados con pago externo ────────────────────────────────────────────
    # Personas RETIRADAS que realizan pago externo. Se contabilizan en el total
    # pero aparecen en el cuadro informativo de advertencias con motivo específico.
    # Clave: cédula → {"nombre": ..., "empresa": ..., "motivo": ...}
    RETIRADOS_PAGO_EXTERNO: dict = {
        "16783959": {"nombre": "DELGADO REINA ALEXANDER", "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
        "31977462": {"nombre": "PARRA TRUJILLO LILIANA",  "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
    }

    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_camposanto(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    # ── PASO 2: Reemplazo de cédulas ─────────────────────────────────────────
    for row in rows:
        ced_original = row["cedula"]
        if ced_original in REEMPLAZOS_CEDULA:
            ced_nueva = REEMPLAZOS_CEDULA[ced_original]
            row["cedula"] = ced_nueva
            warnings_txt.append(
                f"Cédula reemplazada: {ced_original} → {ced_nueva} "
                f"({row.get('nombre_asociado', '')})"
            )

    warnings_detalle = []

    # Conjunto de cédulas que aparecen en warnings pero SÍ se contabilizan
    cedulas_solo_informativas: set = set(RETIRADOS_PAGO_EXTERNO.keys())

    # ── PASO 3: Enriquecimiento con ERP ──────────────────────────────────────
    # Excluir del ERP: contratistas (EXCEPCIONES) y retirados con pago externo
    cedulas_sin_erp = set(EXCEPCIONES_CAMPOSANTO.keys()) | cedulas_solo_informativas

    if db_erp is not None:
        cedulas_para_erp = list(
            set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp)
        )
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)

        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            if ced in cedulas_ya:
                continue
            cedulas_ya.add(ced)
            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": "No encontrada en ERP",
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": f"Estado: {estado}",
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── PASO 4: Aplicar tabla de excepciones (contratistas) ──────────────────
    for row in rows:
        ced = row["cedula"]
        if ced in EXCEPCIONES_CAMPOSANTO:
            exc = EXCEPCIONES_CAMPOSANTO[ced]
            row["nombre_asociado"] = exc["nombre"]
            row["empresa"] = exc["empresa"]
            row["estado_erp"] = "ACTIVO"  # No cae en warnings

    # ── PASO 5: Aplicar retirados con pago externo ───────────────────────────
    # Se fijan nombre/empresa y se agregan a warnings_detalle con motivo informativo.
    # A diferencia del ERP normal, NO se excluyen del total (cedulas_solo_informativas).
    for row in rows:
        ced = row["cedula"]
        if ced in RETIRADOS_PAGO_EXTERNO:
            ret = RETIRADOS_PAGO_EXTERNO[ced]
            row["nombre_asociado"] = ret["nombre"]
            row["empresa"] = ret["empresa"]
            row["estado_erp"] = "RETIRADO"
            # Agregar al cuadro informativo si no está ya
            if not any(w["cedula"] == ced for w in warnings_detalle):
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": ret["nombre"],
                    "motivo": ret["motivo"],
                })

    # ── Separar filas válidas de filas con problemas ──────────────────────────
    # Las cédulas 'solo informativas' (retirados con pago externo) aparecen en
    # warnings_detalle pero se mantienen en rows_validas para ser contabilizadas.
    cedulas_warning = set(
        w["cedula"] for w in warnings_detalle
        if w["cedula"] not in cedulas_solo_informativas  # ← Excluir informativas
    )
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "CAMPOSANTO",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"camposanto_{mes}_{anio}.pdf",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest(),
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="pdf",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="FUNEBRES",
        subcategoria="CAMPOSANTO",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="FUNEBRES",
            subcategoria_final="CAMPOSANTO",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="FUNEBRES",
            subcategoria_final="CAMPOSANTO",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }


@router.get("/camposanto/datos")
async def obtener_datos_camposanto(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos CAMPOSANTO guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "CAMPOSANTO",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0

    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows,
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── RECORDAR ──────────────────────────────────────────────────────────────────

@router.post("/recordar/preview")
async def preview_recordar(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de RECORDAR, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_recordar(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    # ── Retirados con pago externo ────────────────────────────────────────────
    # Personas RETIRADAS que realizan pago externo. Se contabilizan en el total
    # pero aparecen en el cuadro informativo de advertencias.
    RETIRADOS_PAGO_EXTERNO: dict = {
        "16783959": {"nombre": "DELGADO REINA ALEXANDER", "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
        "31977462": {"nombre": "PARRA TRUJILLO LILIANA",  "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
    }

    warnings_detalle = []
    cedulas_solo_informativas: set = set(RETIRADOS_PAGO_EXTERNO.keys())
    cedulas_sin_erp = cedulas_solo_informativas

    if db_erp is not None:
        cedulas_para_erp = list(
            set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp)
        )
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)

        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            if ced in cedulas_ya:
                continue
            cedulas_ya.add(ced)
            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": "No encontrada en ERP",
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": f"Estado: {estado}",
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── Aplicar retirados con pago externo ───────────────────────────
    for row in rows:
        ced = row["cedula"]
        if ced in RETIRADOS_PAGO_EXTERNO:
            ret = RETIRADOS_PAGO_EXTERNO[ced]
            row["nombre_asociado"] = ret["nombre"]
            row["empresa"] = ret["empresa"]
            row["estado_erp"] = "RETIRADO"
            if not any(w["cedula"] == ced for w in warnings_detalle):
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": ret["nombre"],
                    "motivo": ret["motivo"],
                })

    cedulas_warning = set(
        w["cedula"] for w in warnings_detalle
        if w["cedula"] not in cedulas_solo_informativas
    )
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "RECORDAR",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"recordar_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="FUNEBRES",
        subcategoria="RECORDAR",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="FUNEBRES",
            subcategoria_final="RECORDAR",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="FUNEBRES",
            subcategoria_final="RECORDAR",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/recordar/datos")
async def obtener_datos_recordar(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos RECORDAR guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "RECORDAR",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0

    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows,
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── BOGOTA LIBRANZA ─────────────────────────────────────────────────────────────

@router.post("/bogota_libranza/preview")
async def preview_bogota_libranza(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de BOGOTA LIBRANZA, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_bogota_libranza(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                # Reemplazamos nombre_asociado por el nombre del ERP
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "BOGOTA LIBRANZA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"bogota_libranza_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="LIBRANZAS",
        subcategoria="BOGOTA LIBRANZA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="LIBRANZAS",
            subcategoria_final="BOGOTA LIBRANZA",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="LIBRANZAS",
            subcategoria_final="BOGOTA LIBRANZA",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    # Formatear la respuesta con el orden y nombres de columnas solicitados
    # CEDULA, EMPLEADO, VALOR MES, EMPRESA, CONCEPTO.
    formatted_rows = []
    for r in rows_validas:
        formatted_rows.append({
            "CEDULA": r["cedula"],
            "EMPLEADO": r.get("nombre_asociado", ""),
            "VALOR MES": r["valor"],
            "EMPRESA": r.get("empresa", ""),
            "CONCEPTO": "LIBRANZA BOGOTA"
        })

    return {
        "rows": formatted_rows,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/bogota_libranza/datos")
async def obtener_datos_bogota_libranza(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos BOGOTA LIBRANZA guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "BOGOTA LIBRANZA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "CEDULA": r.cedula,
            "EMPLEADO": r.nombre_asociado or "",
            "VALOR MES": r.valor,
            "EMPRESA": r.empresa,
            "CONCEPTO": "LIBRANZA BOGOTA",
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["CEDULA"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── MEDICINA PREPAGADA ─────────────────────────────────────────────────────────────

@router.post("/medicina_prepagada/preview")
async def preview_medicina_prepagada(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Medicina Prepagada, guarda por periodo y devuelve preview."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_medicina_prepagada(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })

    # Persistencia periodo-base
    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "MEDICINA PREPAGADA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"medicina_prepagada_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="MEDICINA PREPAGADA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows):
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="MEDICINA PREPAGADA",
            estado_validacion=row.get("estado_erp", "OK"),
            fila_origen=idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": [{
            "CEDULA": r["cedula"],
            "NOMBRE": r.get("nombre_asociado", ""),
            "EMPRESA": r.get("empresa", ""),
            "VALOR": r["valor"],
            "CONCEPTO": r["concepto"]
        } for r in rows],
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/medicina_prepagada/datos")
async def obtener_datos_medicina_prepagada(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Obtiene datos MEDICINA PREPAGADA guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "MEDICINA PREPAGADA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    return {
        "rows": [{
            "CEDULA": r.cedula,
            "NOMBRE": r.nombre_asociado,
            "EMPRESA": r.empresa,
            "VALOR": r.valor,
            "CONCEPTO": r.concepto
        } for r in registros],
        "summary": {
            "total_asociados": len(set(r.cedula for r in registros)),
            "total_filas": len(registros),
            "total_valor": sum(r.valor for r in registros),
            "mes": mes,
            "anio": anio
        }
    }


# ── OTROS GERENCIA ─────────────────────────────────────────────────────────────

@router.post("/otros_gerencia/preview")
async def preview_otros_gerencia(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Otros Gerencia, guarda por periodo y devuelve preview."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_otros_gerencia(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })

    # Persistencia periodo-base
    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "OTROS GERENCIA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"otros_gerencia_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="OTROS GERENCIA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows):
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="OTROS GERENCIA",
            estado_validacion=row.get("estado_erp", "OK"),
            fila_origen=idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": [{
            "CEDULA": r["cedula"],
            "NOMBRE": r.get("nombre_asociado", ""),
            "EMPRESA": r.get("empresa", ""),
            "VALOR": r["valor"],
            "CONCEPTO": r["concepto"]
        } for r in rows],
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/otros_gerencia/datos")
async def obtener_datos_otros_gerencia(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Obtiene datos OTROS GERENCIA guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "OTROS GERENCIA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    return {
        "rows": [{
            "CEDULA": r.cedula,
            "NOMBRE": r.nombre_asociado,
            "EMPRESA": r.empresa,
            "VALOR": r.valor,
            "CONCEPTO": r.concepto
        } for r in registros],
        "summary": {
            "total_asociados": len(set(r.cedula for r in registros)),
            "total_filas": len(registros),
            "total_valor": sum(r.valor for r in registros),
            "mes": mes,
            "anio": anio
        }
    }

@router.post("/l_davivienda/preview")
async def preview_davivienda_libranza(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Sube 1..N archivos de LIBRANZA DAVIVIENDA, extrae la data, cruza con ERP y lo guarda."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_davivienda_libranza(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "LIBRANZA DAVIVIENDA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"davivienda_libranza_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="LIBRANZAS",
        subcategoria="LIBRANZA DAVIVIENDA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="LIBRANZAS",
            subcategoria_final="LIBRANZA DAVIVIENDA",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="LIBRANZAS",
            subcategoria_final="LIBRANZA DAVIVIENDA",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    # Formatear salida para Frontend
    formatted_rows = []
    for r in rows_validas:
        formatted_rows.append({
            "CEDULA": r["cedula"],
            "EMPLEADO": r.get("nombre_asociado", ""),
            "VALOR MES": r["valor"],
            "EMPRESA": r.get("empresa", ""),
            "CONCEPTO": "LIBRANZA DAVIVIENDA"
        })

    return {
        "rows": formatted_rows,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/l_davivienda/datos")
async def obtener_datos_davivienda_libranza(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos LIBRANZA DAVIVIENDA guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "LIBRANZA DAVIVIENDA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "CEDULA": r.cedula,
            "EMPLEADO": r.nombre_asociado or "",
            "VALOR MES": r.valor,
            "EMPRESA": r.empresa,
            "CONCEPTO": "LIBRANZA DAVIVIENDA",
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["CEDULA"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }

@router.post("/occidente_libranza/preview")
async def preview_occidente_libranza(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de LIBRANZA OCCIDENTE, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_occidente_libranza(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "OCCIDENTE LIBRANZA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"occidente_libranza_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="LIBRANZAS",
        subcategoria="OCCIDENTE LIBRANZA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="LIBRANZAS",
            subcategoria_final="OCCIDENTE LIBRANZA",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="LIBRANZAS",
            subcategoria_final="OCCIDENTE LIBRANZA",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/occidente_libranza/datos")
async def obtener_datos_occidente_libranza(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos LIBRANZA OCCIDENTE guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "OCCIDENTE LIBRANZA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }

@router.post("/camposanto/preview")
async def preview_camposanto(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa PDF de CAMPOSANTO, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_camposanto(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "CAMPOSANTO",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"camposanto_{mes}_{anio}.pdf",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="pdf",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="CAMPOSANTO",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="CAMPOSANTO",
            estado_validacion="OK",
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="CAMPOSANTO",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/camposanto/datos")
async def obtener_datos_camposanto(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos CAMPOSANTO guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "CAMPOSANTO",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── POLIZAS VEHICULOS ─────────────────────────────────────────────────────────────

@router.post("/polizas-vehiculos/preview")
async def preview_polizas_vehiculos(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de POLIZAS VEHICULOS, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_polizas_vehiculos(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    # ── Retirados con pago externo ────────────────────────────────────────────
    RETIRADOS_PAGO_EXTERNO = {
        "16783959": {"nombre": "DELGADO REINA ALEXANDER", "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
        "31977462": {"nombre": "PARRA TRUJILLO LILIANA",  "empresa": "REFRIDCOL", "motivo": "RETIRADO - Pago externo"},
    }

    warnings_detalle = []
    cedulas_solo_informativas = set(RETIRADOS_PAGO_EXTERNO.keys())
    cedulas_sin_erp = cedulas_solo_informativas

    if db_erp is not None:
        cedulas_para_erp = list(
            set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp)
        )
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)

        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp:
                continue
            if ced in cedulas_ya:
                continue
            cedulas_ya.add(ced)
            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": "No encontrada en ERP",
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": row.get("nombre_asociado", "Desconocido"),
                    "motivo": f"Estado: {estado}",
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # ── Aplicar retirados con pago externo ───────────────────────────
    for row in rows:
        ced = row["cedula"]
        if ced in RETIRADOS_PAGO_EXTERNO:
            ret = RETIRADOS_PAGO_EXTERNO[ced]
            row["nombre_asociado"] = ret["nombre"]
            row["empresa"] = ret["empresa"]
            row["estado_erp"] = "RETIRADO"
            if not any(w["cedula"] == ced for w in warnings_detalle):
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": ret["nombre"],
                    "motivo": ret["motivo"],
                })

    cedulas_warning = set(
        w["cedula"] for w in warnings_detalle
        if w["cedula"] not in cedulas_solo_informativas
    )
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    
    # Usuario solicitó: "Solo en esta subcategroria necesito que me aparezcan los warnings y se contabilcen igual."
    # Por lo tanto, NO filtramos las rows_validas separándolas de rows_warning. Ambas van juntas a la DB y a la UI.
    rows_validas = rows 
    rows_warning = [] # Vacío porque ya están en rows_validas

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len([r for r in rows if r["cedula"] in cedulas_warning])

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "POLIZAS VEHICULOS",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"polizas_vehiculos_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="SEGUROS",
        subcategoria="POLIZAS VEHICULOS",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="SEGUROS",
            subcategoria_final="POLIZAS VEHICULOS",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="SEGUROS",
            subcategoria_final="POLIZAS VEHICULOS",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }


@router.get("/polizas-vehiculos/datos")
async def obtener_datos_polizas_vehiculos(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos POLIZAS VEHICULOS guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "POLIZAS VEHICULOS",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0

    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle),
        "archivos_procesados": 1
    }

    return {
        "rows": rows,
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── OTROS GERENCIA ─────────────────────────────────────────────────────────────

@router.post("/otros-gerencia/preview")
async def preview_otros_gerencia(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de OTROS GERENCIA, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_otros_gerencia(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "OTROS GERENCIA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"otros_gerencia_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="OTROS GERENCIA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="OTROS GERENCIA",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="OTROS GERENCIA",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/otros-gerencia/datos")
async def obtener_datos_otros_gerencia(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos OTROS GERENCIA guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "OTROS GERENCIA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# ── MEDICINA PREPAGADA ─────────────────────────────────────────────────────────

@router.post("/medicina-prepagada/preview")
async def preview_medicina_prepagada(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de MEDICINA PREPAGADA, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_medicina_prepagada(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "MEDICINA PREPAGADA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"medicina_prepagada_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="OTROS",
        subcategoria="MEDICINA PREPAGADA",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="MEDICINA PREPAGADA",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="OTROS",
            subcategoria_final="MEDICINA PREPAGADA",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows_validas,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/medicina-prepagada/datos")
async def obtener_datos_medicina_prepagada(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos MEDICINA PREPAGADA guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "MEDICINA PREPAGADA",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


@router.post("/control_descuentos/preview")
async def preview_control_descuentos(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de CONTROL DE DESCUENTOS, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_control_descuentos(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []
    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or ""
                row["empresa"] = info["empresa"] or ""
                row["estado_erp"] = info["estado"]
            else:
                row["nombre_asociado"] = ""
                row["empresa"] = ""
                row["estado_erp"] = "NO ENCONTRADO"
                warnings_detalle.append({
                    "cedula": ced,
                    "nombre": "Desconocido",
                    "motivo": "No encontrada en ERP"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # Persistencia
    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "CONTROL DE DESCUENTOS",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"control_descuentos_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="DESCUENTOS",
        subcategoria="CONTROL DE DESCUENTOS",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows):
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="DESCUENTOS",
            subcategoria_final="CONTROL DE DESCUENTOS",
            estado_validacion="OK" if row.get("estado_erp") != "NO ENCONTRADO" else "NO_CLASIFICADO",
            fila_origen=idx + 1,
        )
        session.add(reg)

    await session.commit()

    return {
        "rows": rows,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }

@router.get("/control_descuentos/datos")
async def obtener_datos_control_descuentos(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos CONTROL DE DESCUENTOS guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "CONTROL DE DESCUENTOS",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for r in registros:
        data_item = {
            "cedula": r.cedula,
            "nombre_asociado": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": r.concepto,
            "estado_validacion": r.estado_validacion
        }
        rows.append(data_item)
        total_valor += r.valor
        if r.estado_validacion != "OK":
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "rows": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }


# --- ENDPOINTS CELULARES ---

@router.post("/celulares/preview")
async def celulares_preview(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de CELULARES (CLARO), enriquece con ERP, guarda en BD."""
    try:
        archivos_binarios = []
        for f in files:
            contenido = await f.read()
            archivos_binarios.append(contenido)

        rows, summary, warnings_txt = extraer_celulares(archivos_binarios)
        summary["mes"] = mes
        summary["anio"] = anio

        # APLICAR EXCEPCIONES GLOBALES ANTES DEL ENRIQUECIMIENTO
        for r in rows:
            c_raw = str(r["cedula"]).strip()
            c = c_raw[:-2] if c_raw.endswith('.0') else c_raw
            if c == "900902500":
                r["nombre"] = "CRUZTOR"
                r["empresa"] = "CRUZTOR"
                r["estado_erp"] = "Activo"

        warnings_detalle = []
        if db_erp is not None:
            # Consultar solo los que NO son excepciones
            cedulas_a_consultar = []
            for r in rows:
                if "nombre" not in r:
                    c_raw = str(r["cedula"]).strip()
                    c = c_raw[:-2] if c_raw.endswith('.0') else c_raw
                    cedulas_a_consultar.append(c)
            
            cedulas_unicas = list(set(cedulas_a_consultar))
            mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

            for row in rows:
                c_raw = str(row["cedula"]).strip()
                ced = c_raw[:-2] if c_raw.endswith('.0') else c_raw
                
                # CASO ESPECIAL: CRUZTOR (Siempre se factura, incluso si no está en ERP)
                if ced == "900902500":
                    row["nombre"] = "CRUZTOR"
                    row["empresa"] = "CRUZTOR"
                    row["estado_erp"] = "Excepción"
                    warnings_detalle.append({
                        "cedula": ced,
                        "nombre": "CRUZTOR (Excepción)",
                        "motivo": "No encontrada en ERP - Se factura por excepción"
                    })
                    continue

                info = mapa_erp.get(ced)
                if info:
                    row["nombre"] = info["nombre"] or ""
                    row["empresa"] = info["empresa"] or ""
                    row["estado_erp"] = info["estado"]
                else:
                    row["nombre"] = "NO ENCONTRADO"
                    row["empresa"] = "NO ENCONTRADA"
                    row["estado_erp"] = "NO ENCONTRADO"
                    warnings_detalle.append({
                        "cedula": ced,
                        "nombre": "Desconocido",
                        "motivo": "No encontrada en ERP"
                    })
        else:
            warnings_txt.append("ERP no disponible: datos no enriquecidos.")

        # Persistencia (siguiendo el patrón de Control de Descuentos)
        from sqlalchemy import delete
        stmt_del = delete(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final == "CELULARES",
            NominaRegistroNormalizado.mes_fact == mes,
            NominaRegistroNormalizado.año_fact == anio,
        )
        await session.execute(stmt_del)

        archivo = NominaArchivo(
            nombre_archivo=f"celulares_{mes}_{anio}.xlsx",
            hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
            tamaño_bytes=sum(len(b) for b in archivos_binarios),
            tipo_archivo="xlsx",
            ruta_almacenamiento="memory",
            mes_fact=mes,
            año_fact=anio,
            categoria="DESCUENTOS",
            subcategoria="CELULARES",
            estado="Procesado",
        )
        session.add(archivo)
        await session.flush()

        for idx, row in enumerate(rows):
            reg = NominaRegistroNormalizado(
                archivo_id=archivo.id,
                fecha_creacion=datetime.now(),
                mes_fact=mes, año_fact=anio,
                cedula=row["cedula"],
                nombre_asociado=row.get("nombre", ""),
                valor=row["valor"],
                empresa=row.get("empresa", ""),
                concepto=row["concepto"],
                categoria_final="DESCUENTOS",
                subcategoria_final="CELULARES",
                estado_validacion="OK" if row.get("estado_erp") != "NO ENCONTRADO" else "NO_CLASIFICADO",
                fila_origen=idx + 1,
            )
            session.add(reg)

        await session.commit()

        return {
            "filas": rows,
            "summary": summary,
            "warnings": warnings_txt,
            "warnings_detalle": warnings_detalle,
        }
    except Exception as e:
        logger.error(f"Error en celulares_preview: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/celulares/datos")
async def get_celulares_datos(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db)
):
    """Devuelve datos CELULARES guardados para un mes/año."""
    try:
        stmt = select(NominaRegistroNormalizado).where(
            NominaRegistroNormalizado.subcategoria_final == "CELULARES",
            NominaRegistroNormalizado.mes_fact == mes,
            NominaRegistroNormalizado.año_fact == anio,
        )
        result = await session.execute(stmt)
        registros = result.scalars().all()

        rows = []
        warnings_detalle = []
        total_valor = 0.0
        
        for r in registros:
            data_item = {
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "empresa": r.empresa,
                "valor": r.valor,
                "concepto": r.concepto,
                "estado_validacion": r.estado_validacion
            }
            rows.append(data_item)
            total_valor += r.valor
            if r.estado_validacion != "OK":
                warnings_detalle.append({
                    "cedula": r.cedula,
                    "nombre": r.nombre_asociado or "",
                    "motivo": r.estado_validacion
                })

        summary = {
            "mes": mes, "anio": anio,
            "total_asociados": len(set(r["cedula"] for r in rows)),
            "total_filas": len(rows),
            "total_valor": total_valor,
            "total_warnings": len(warnings_detalle)
        }

        return {
            "filas": rows, 
            "summary": summary,
            "warnings_detalle": warnings_detalle
        }
    except Exception as e:
        logger.error(f"Error en get_celulares_datos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── EMBARGOS ─────────────────────────────────────────────────────────────

@router.post("/embargos/preview")
async def preview_embargos(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    """Procesa Excel de EMBARGOS, enriquece con ERP, guarda en BD."""
    archivos_binarios = []
    for f in files:
        contenido = await f.read()
        archivos_binarios.append(contenido)

    rows, summary, warnings_txt = extraer_embargos(archivos_binarios)
    summary["mes"] = mes
    summary["anio"] = anio

    warnings_detalle = []

    if db_erp is not None:
        cedulas_unicas = list(set(r["cedula"] for r in rows))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_unicas)

        for row in rows:
            ced = row["cedula"]
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"] = info["nombre"] or row.get("nombre_asociado", "")
                row["empresa"] = info["empresa"] or row.get("empresa", "")
                row["estado_erp"] = info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"

        cedulas_ya = set()
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_ya: continue
            cedulas_ya.add(ced)

            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": "No encontrada en ERP"
                })
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({
                    "cedula": ced, "nombre": row.get("nombre_asociado", "Desconocido"), "motivo": f"Estado: {estado}"
                })
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    cedulas_warning = set(w["cedula"] for w in warnings_detalle)
    motivo_por_cedula = {w["cedula"]: w["motivo"] for w in warnings_detalle}
    
    # IMPORTANTE para los warning tables y data en las UI, igual persistimos
    rows_validas = [r for r in rows if r["cedula"] not in cedulas_warning]
    rows_warning = [r for r in rows if r["cedula"] in cedulas_warning]

    summary["total_asociados"] = len(set(r["cedula"] for r in rows_validas))
    summary["total_filas"] = len(rows_validas)
    summary["total_valor"] = sum(r["valor"] for r in rows_validas)
    summary["total_warnings"] = len(warnings_detalle)
    summary["total_filas_con_warnings"] = len(rows)

    from sqlalchemy import delete
    from datetime import datetime
    import hashlib

    stmt_del = delete(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "EMBARGOS",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    await session.execute(stmt_del)

    archivo = NominaArchivo(
        nombre_archivo=f"embargos_{mes}_{anio}.xlsx",
        hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none",
        tamaño_bytes=sum(len(b) for b in archivos_binarios),
        tipo_archivo="xlsx",
        ruta_almacenamiento="memory",
        mes_fact=mes,
        año_fact=anio,
        categoria="DESCUENTOS",
        subcategoria="EMBARGOS",
        estado="Procesado",
    )
    session.add(archivo)
    await session.flush()

    for idx, row in enumerate(rows_validas):
        motivo = motivo_por_cedula.get(row["cedula"], "OK")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="DESCUENTOS",
            subcategoria_final="EMBARGOS",
            estado_validacion=motivo,
            fila_origen=idx + 1,
        )
        session.add(reg)

    for idx, row in enumerate(rows_warning):
        motivo = motivo_por_cedula.get(row["cedula"], "ADVERTENCIA")
        reg = NominaRegistroNormalizado(
            archivo_id=archivo.id,
            fecha_creacion=datetime.now(),
            mes_fact=mes, año_fact=anio,
            cedula=row["cedula"],
            nombre_asociado=row.get("nombre_asociado", ""),
            valor=row["valor"],
            empresa=row.get("empresa", ""),
            concepto=row["concepto"],
            categoria_final="DESCUENTOS",
            subcategoria_final="EMBARGOS",
            estado_validacion=motivo,
            fila_origen=len(rows_validas) + idx + 1,
        )
        session.add(reg)

    await session.commit()

    # Formatear la respuesta con el orden y nombres de columnas solicitados
    # #, CEDULA, NOMBRE, EMPRESA, VALOR, CONCEPTO.
    formatted_rows = []
    for i, r in enumerate(rows_validas, 1):
        formatted_rows.append({
            "#": i,
            "cedula": r["cedula"],
            "nombre": r.get("nombre_asociado", ""),
            "empresa": r.get("empresa", ""),
            "valor": r["valor"],
            "concepto": "EMBARGO",
            "estado_erp": r.get("estado_erp", "")
        })

    return {
        "filas": formatted_rows,
        "summary": summary,
        "warnings": warnings_txt,
        "warnings_detalle": warnings_detalle,
    }


@router.get("/embargos/datos")
async def obtener_datos_embargos(
    mes: int = Query(...),
    anio: int = Query(...),
    session: Session = Depends(obtener_db),
):
    """Devuelve datos de EMBARGOS guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(
        NominaRegistroNormalizado.subcategoria_final == "EMBARGOS",
        NominaRegistroNormalizado.mes_fact == mes,
        NominaRegistroNormalizado.año_fact == anio,
    )
    result = await session.execute(stmt)
    registros = result.scalars().all()

    rows = []
    warnings_detalle = []
    total_valor = 0.0
    
    for idx, r in enumerate(registros, 1):
        data_item = {
            "#": idx,
            "cedula": r.cedula,
            "nombre": r.nombre_asociado or "",
            "empresa": r.empresa,
            "valor": r.valor,
            "concepto": "EMBARGO",
            "estado_validacion": r.estado_validacion
        }
        
        if r.estado_validacion == "OK":
            rows.append(data_item)
            total_valor += r.valor
        elif r.estado_validacion.startswith("RETIRADO"):
            rows.append(data_item)
            total_valor += r.valor
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })
        else:
            warnings_detalle.append({
                "cedula": r.cedula,
                "nombre": r.nombre_asociado or "",
                "motivo": r.estado_validacion
            })

    summary = {
        "mes": mes, "anio": anio,
        "total_asociados": len(set(r["cedula"] for r in rows)),
        "total_filas": len(rows),
        "total_valor": total_valor,
        "total_warnings": len(warnings_detalle)
    }

    return {
        "filas": rows, 
        "summary": summary,
        "warnings_detalle": warnings_detalle
    }
