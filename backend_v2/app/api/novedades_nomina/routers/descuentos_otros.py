import hashlib
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlmodel import Session, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.celulares_extractor import extraer_celulares
from ....services.novedades_nomina.retenciones_extractor import extraer_retenciones
from ....services.novedades_nomina.embargos_extractor import extraer_embargos
from ....services.novedades_nomina.nomina_service import NominaService
from ....services.novedades_nomina.excepcion_service import ExcepcionService

router = APIRouter(tags=["Descuentos - Otros"])

# ── CELULARES ───────────────────────────────────────────────────────────────

@router.get("/celulares/datos")
async def datos_celulares(mes: int, anio: int, session: AsyncSession = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "CELULARES", mes, anio)

@router.post("/celulares/preview")
async def preview_celulares(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    archivos_binarios = [await f.read() for f in files]
    rows, summary, warnings_txt = extraer_celulares(archivos_binarios)
    summary.update({"mes": mes, "anio": anio})
    
    stmt_exc = select(NominaExcepcion).where(
        NominaExcepcion.subcategoria == "CELULARES",
        NominaExcepcion.estado == "ACTIVO"
    )
    try:
        result_exc = await session.execute(stmt_exc)
        excepciones_db = result_exc.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar excepciones para Celulares: {str(e)}")
    
    mapa_excepciones = {
        e.cedula: {
            "id": e.id,
            "nombre": e.nombre_asociado, 
            "empresa": "REFRIDCOL", 
            "motivo": e.tipo,
            "pagador_cedula": e.pagador_cedula,
            "tipo": e.tipo,
            "obj": e
        } for e in excepciones_db
    }

    warnings_detalle = []
    if db_erp is not None:
        cedulas_sin_erp = set(mapa_excepciones.keys())
        cedulas_para_erp = list(set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp: continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = info["nombre"] or "", info["empresa"] or "", info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"
                warnings_detalle.append({"cedula": ced, "nombre": "Desconocido", "motivo": "No encontrada en ERP"})
    
    for row in rows:
        ced = row["cedula"]
        if ced in mapa_excepciones:
            exc = mapa_excepciones[ced]
            if exc.get("tipo") == "SALDO_FAVOR":
                valor_orig = row["valor"]
                valor_final = await ExcepcionService.aplicar_saldo_favor(session, exc["obj"], valor_orig, mes, anio)
                row["valor"] = valor_final
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION_SALDO_FAVOR"
                row["observaciones"] = f"Saldo favor aplicado. Cobro: ${valor_orig:,.0f} -> ${valor_final:,.0f}"
            elif exc.get("tipo") == "PAGO_TERCERO" and exc.get("pagador_cedula"):
                row["observaciones"] = f"Cobro original para {ced} ({exc['nombre']}). Redirigido a pagador {exc['pagador_cedula']}"
                row["cedula"] = exc["pagador_cedula"]
                if db_erp:
                    info_pag = EmpleadosService.consultar_empleados_bulk(db_erp, [exc["pagador_cedula"]])
                    if info_pag.get(exc["pagador_cedula"]):
                        row["nombre_asociado"], row["empresa"] = info_pag[exc["pagador_cedula"]]["nombre"], info_pag[exc["pagador_cedula"]]["empresa"]
                row["estado_erp"] = "REDIRECCIONADO"
            else:
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION"
            warnings_detalle.append({"cedula": row["cedula"], "nombre": row.get("nombre_asociado", ""), "motivo": f"EXCEPCIÓN APLICADA: {exc['motivo']}"})

    try:
        await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "CELULARES", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio))
        archivo = NominaArchivo(nombre_archivo=f"celulares_{mes}_{anio}.xlsx", hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none", tamaño_bytes=sum(len(b) for b in archivos_binarios), tipo_archivo="xlsx", ruta_almacenamiento="memory", mes_fact=mes, año_fact=anio, categoria="DESCUENTOS", subcategoria="CELULARES", estado="Procesado")
        session.add(archivo); await session.flush()
        for idx, row in enumerate(rows):
            reg = NominaRegistroNormalizado(archivo_id=archivo.id, fecha_creacion=datetime.now(), mes_fact=mes, año_fact=anio, cedula=row["cedula"], nombre_asociado=row.get("nombre_asociado", ""), valor=row["valor"], empresa=row.get("empresa", ""), concepto=row["concepto"], categoria_final="DESCUENTOS", subcategoria_final="CELULARES", estado_validacion="OK" if "EXCEPCIÓN APLICADA" in str(row.get("estado_erp")) or row.get("estado_erp") == "ACTIVO" else row.get("estado_erp", "OK"), observaciones=row.get("observaciones"), fila_origen=idx + 1)
            session.add(reg)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar registros de Celulares: {str(e)}")
    return {"rows": rows, "summary": summary, "warnings": warnings_txt, "warnings_detalle": warnings_detalle}

# ── RETENCIONES ─────────────────────────────────────────────────────────────

@router.get("/retenciones/datos")
async def datos_retenciones(mes: int, anio: int, session: AsyncSession = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "RETENCIONES", mes, anio)

@router.post("/retenciones/preview")
async def preview_retenciones(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    archivos_binarios = [await f.read() for f in files]
    rows, summary, warnings_txt = extraer_retenciones(archivos_binarios)
    summary.update({"mes": mes, "anio": anio})
    
    stmt_exc = select(NominaExcepcion).where(
        NominaExcepcion.subcategoria == "RETENCIONES",
        NominaExcepcion.estado == "ACTIVO"
    )
    try:
        result_exc = await session.execute(stmt_exc)
        excepciones_db = result_exc.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar excepciones para Retenciones: {str(e)}")
    
    mapa_excepciones = {e.cedula: {"id": e.id, "nombre": e.nombre_asociado, "empresa": "REFRIDCOL", "motivo": e.tipo, "pagador_cedula": e.pagador_cedula, "tipo": e.tipo, "obj": e} for e in excepciones_db}

    warnings_detalle = []
    if db_erp is not None:
        cedulas_sin_erp = set(mapa_excepciones.keys())
        cedulas_para_erp = list(set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp: continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = info["nombre"] or "", info["empresa"] or "", info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"
                warnings_detalle.append({"cedula": ced, "nombre": "Desconocido", "motivo": "No encontrada en ERP"})
    
    for row in rows:
        ced = row["cedula"]
        if ced in mapa_excepciones:
            exc = mapa_excepciones[ced]
            if exc.get("tipo") == "SALDO_FAVOR":
                valor_orig = row["valor"]
                valor_final = await ExcepcionService.aplicar_saldo_favor(session, exc["obj"], valor_orig, mes, anio)
                row["valor"] = valor_final
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION_SALDO_FAVOR"
                row["observaciones"] = f"Saldo favor aplicado. Cobro: ${valor_orig:,.0f} -> ${valor_final:,.0f}"
            elif exc.get("tipo") == "PAGO_TERCERO" and exc.get("pagador_cedula"):
                row["observaciones"] = f"Cobro original para {ced} ({exc['nombre']}). Redirigido a pagador {exc['pagador_cedula']}"
                row["cedula"] = exc["pagador_cedula"]
                if db_erp:
                    info_pag = EmpleadosService.consultar_empleados_bulk(db_erp, [exc["pagador_cedula"]])
                    if info_pag.get(exc["pagador_cedula"]):
                        row["nombre_asociado"], row["empresa"] = info_pag[exc["pagador_cedula"]]["nombre"], info_pag[exc["pagador_cedula"]]["empresa"]
                row["estado_erp"] = "REDIRECCIONADO"
            else:
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION"
            warnings_detalle.append({"cedula": row["cedula"], "nombre": row.get("nombre_asociado", ""), "motivo": f"EXCEPCIÓN APLICADA: {exc['motivo']}"})

    try:
        await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "RETENCIONES", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio))
        archivo = NominaArchivo(nombre_archivo=f"retenciones_{mes}_{anio}.xlsx", hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none", tamaño_bytes=sum(len(b) for b in archivos_binarios), tipo_archivo="xlsx", ruta_almacenamiento="memory", mes_fact=mes, año_fact=anio, categoria="DESCUENTOS", subcategoria="RETENCIONES", estado="Procesado")
        session.add(archivo); await session.flush()
        for idx, row in enumerate(rows):
            reg = NominaRegistroNormalizado(archivo_id=archivo.id, fecha_creacion=datetime.now(), mes_fact=mes, año_fact=anio, cedula=row["cedula"], nombre_asociado=row.get("nombre_asociado", ""), valor=row["valor"], empresa=row.get("empresa", ""), concepto=row["concepto"], categoria_final="DESCUENTOS", subcategoria_final="RETENCIONES", estado_validacion="OK" if "EXCEPCIÓN APLICADA" in str(row.get("estado_erp")) or row.get("estado_erp") == "ACTIVO" else row.get("estado_erp", "OK"), observaciones=row.get("observaciones"), fila_origen=idx + 1)
            session.add(reg)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar registros de Retenciones: {str(e)}")
    return {"rows": rows, "summary": summary, "warnings": warnings_txt, "warnings_detalle": warnings_detalle}

# ── EMBARGOS ────────────────────────────────────────────────────────────────

@router.get("/embargos/datos")
async def datos_embargos(mes: int, anio: int, session: AsyncSession = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "EMBARGOS", mes, anio)

@router.post("/embargos/preview")
async def preview_embargos(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    archivos_binarios = [await f.read() for f in files]
    rows, summary, warnings_txt = extraer_embargos(archivos_binarios)
    summary.update({"mes": mes, "anio": anio})
    
    stmt_exc = select(NominaExcepcion).where(
        NominaExcepcion.subcategoria == "EMBARGOS",
        NominaExcepcion.estado == "ACTIVO"
    )
    try:
        result_exc = await session.execute(stmt_exc)
        excepciones_db = result_exc.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar excepciones para Embargos: {str(e)}")
    
    mapa_excepciones = {e.cedula: {"id": e.id, "nombre": e.nombre_asociado, "empresa": "REFRIDCOL", "motivo": e.tipo, "pagador_cedula": e.pagador_cedula, "tipo": e.tipo, "obj": e} for e in excepciones_db}

    warnings_detalle = []
    if db_erp is not None:
        cedulas_sin_erp = set(mapa_excepciones.keys())
        cedulas_para_erp = list(set(r["cedula"] for r in rows if r["cedula"] not in cedulas_sin_erp))
        mapa_erp = EmpleadosService.consultar_empleados_bulk(db_erp, cedulas_para_erp)
        for row in rows:
            ced = row["cedula"]
            if ced in cedulas_sin_erp: continue
            info = mapa_erp.get(ced)
            if info:
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = info["nombre"] or "", info["empresa"] or "", info["estado"]
            else:
                row["estado_erp"] = "NO ENCONTRADO"
                warnings_detalle.append({"cedula": ced, "nombre": "Desconocido", "motivo": "No encontrada en ERP"})
    
    for row in rows:
        ced = row["cedula"]
        if ced in mapa_excepciones:
            exc = mapa_excepciones[ced]
            if exc.get("tipo") == "SALDO_FAVOR":
                valor_orig = row["valor"]
                valor_final = await ExcepcionService.aplicar_saldo_favor(session, exc["obj"], valor_orig, mes, anio)
                row["valor"] = valor_final
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION_SALDO_FAVOR"
                row["observaciones"] = f"Saldo favor aplicado. Cobro: ${valor_orig:,.0f} -> ${valor_final:,.0f}"
            elif exc.get("tipo") == "PAGO_TERCERO" and exc.get("pagador_cedula"):
                row["observaciones"] = f"Cobro original para {ced} ({exc['nombre']}). Redirigido a pagador {exc['pagador_cedula']}"
                row["cedula"] = exc["pagador_cedula"]
                if db_erp:
                    info_pag = EmpleadosService.consultar_empleados_bulk(db_erp, [exc["pagador_cedula"]])
                    if info_pag.get(exc["pagador_cedula"]):
                        row["nombre_asociado"], row["empresa"] = info_pag[exc["pagador_cedula"]]["nombre"], info_pag[exc["pagador_cedula"]]["empresa"]
                row["estado_erp"] = "REDIRECCIONADO"
            else:
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION"
            warnings_detalle.append({"cedula": row["cedula"], "nombre": row.get("nombre_asociado", ""), "motivo": f"EXCEPCIÓN APLICADA: {exc['motivo']}"})

    try:
        await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "EMBARGOS", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio))
        archivo = NominaArchivo(nombre_archivo=f"embargos_{mes}_{anio}.xlsx", hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none", tamaño_bytes=sum(len(b) for b in archivos_binarios), tipo_archivo="xlsx", ruta_almacenamiento="memory", mes_fact=mes, año_fact=anio, categoria="DESCUENTOS", subcategoria="EMBARGOS", estado="Procesado")
        session.add(archivo); await session.flush()
        for idx, row in enumerate(rows):
            reg = NominaRegistroNormalizado(archivo_id=archivo.id, fecha_creacion=datetime.now(), mes_fact=mes, año_fact=anio, cedula=row["cedula"], nombre_asociado=row.get("nombre_asociado", ""), valor=row["valor"], empresa=row.get("empresa", ""), concepto=row["concepto"], categoria_final="DESCUENTOS", subcategoria_final="EMBARGOS", estado_validacion="OK" if "EXCEPCIÓN APLICADA" in str(row.get("estado_erp")) or row.get("estado_erp") == "ACTIVO" else row.get("estado_erp", "OK"), observaciones=row.get("observaciones"), fila_origen=idx + 1)
            session.add(reg)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar registros de Embargos: {str(e)}")
    return {"rows": rows, "summary": summary, "warnings": warnings_txt, "warnings_detalle": warnings_detalle}
