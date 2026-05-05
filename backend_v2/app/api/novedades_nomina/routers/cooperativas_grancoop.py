import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session, select, delete
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, NominaExcepcion
)
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.grancoop_extractor import extraer_grancoop
from ....services.novedades_nomina.excepcion_service import ExcepcionService

router = APIRouter(tags=["Cooperativas - Grancoop"])

@router.post("/grancoop/preview")
async def preview_grancoop(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: AsyncSession = Depends(obtener_db),
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

    # ── Obtener excepciones dinámicas de la DB ──
    stmt_exc = select(NominaExcepcion).where(
        NominaExcepcion.subcategoria == "GRANCOOP",
        NominaExcepcion.estado == "ACTIVO"
    )
    try:
        result_exc = await session.execute(stmt_exc)
        excepciones_db = result_exc.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar excepciones para Grancoop: {str(e)}")
    
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
            if ced in mapa_excepciones: continue
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
            if ced in cedulas_ya or ced in mapa_excepciones: continue
            cedulas_ya.add(ced)
            estado = row.get("estado_erp", "")
            if estado == "NO ENCONTRADO":
                warnings_detalle.append({"cedula": ced, "nombre": row["nombre_asociado"], "motivo": "No encontrada en ERP"})
            elif estado and estado.upper() != "ACTIVO":
                warnings_detalle.append({"cedula": ced, "nombre": row["nombre_asociado"], "motivo": f"Estado: {estado}"})
        
        for row in rows:
            ced = row["cedula"]
            if ced in mapa_excepciones:
                exc = mapa_excepciones[ced]
                valor_orig = row["valor"]
                
                if exc.get("tipo") == "SALDO_FAVOR":
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
                elif exc.get("tipo") == "EXONERACION":
                    row["valor"] = 0
                    row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION_EXONERADO"
                    row["observaciones"] = f"Exoneración aplicada. Cobro original: ${valor_orig:,.0f} -> $0"
                else:
                    row["nombre_asociado"], row["empresa"], row["estado_erp"] = exc["nombre"], exc["empresa"], "EXCEPCION"
                
                warnings_detalle.append({"cedula": row["cedula"], "nombre": row.get("nombre_asociado", ""), "motivo": f"EXCEPCIÓN APLICADA: {exc['motivo']}"})

        # --- RE-AGRUPACIÓN POR CÉDULA POST-EXCEPCIONES ---
        mapa_agrupado_final = {}
        for r in rows:
            ced_final = r["cedula"]
            if ced_final in mapa_agrupado_final:
                mapa_agrupado_final[ced_final]["valor"] += r["valor"]
                obs_nueva = r.get("observaciones")
                if obs_nueva:
                    obs_prev = mapa_agrupado_final[ced_final].get("observaciones")
                    if obs_prev:
                        if obs_nueva not in obs_prev:
                            mapa_agrupado_final[ced_final]["observaciones"] = f"{obs_prev} | {obs_nueva}"
                    else:
                        mapa_agrupado_final[ced_final]["observaciones"] = obs_nueva
            else:
                mapa_agrupado_final[ced_final] = r.copy()
        
        rows = list(mapa_agrupado_final.values())
    else:
        warnings_txt.append("ERP no disponible: datos no enriquecidos.")

    # Filtrar solo lo que se va a facturar para el resumen y visualización
    rows_facturables = [
        r for r in rows 
        if str(r.get("estado_erp")).upper() == "ACTIVO" 
        or ("EXCEPCION" in str(r.get("estado_erp")).upper() and r.get("estado_erp") != "EXCEPCION_EXONERADO")
        or str(r.get("estado_erp")).upper() == "REDIRECCIONADO"
    ]
    
    # El resto van como warnings (pero se guardan)
    rows_no_facturables = [r for r in rows if r not in rows_facturables]

    summary.update({
        "total_asociados": len(set(r["cedula"] for r in rows_facturables)), 
        "total_filas": len(rows_facturables), 
        "total_valor": sum(r["valor"] for r in rows_facturables), 
        "total_warnings": len(warnings_detalle)
    })

    try:
        # Guardar archivo físico en disco para permitir descargas posteriores
        import os, hashlib
        STORAGE_DIR = "uploads/nomina"
        os.makedirs(STORAGE_DIR, exist_ok=True)
        contenido = archivos_binarios[0] if archivos_binarios else b""
        file_hash = hashlib.sha256(contenido).hexdigest()
        filename = f"{file_hash}.pdf"
        path = os.path.join(STORAGE_DIR, filename)
        with open(path, "wb") as f_out: f_out.write(contenido)

        await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "GRANCOOP", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio))
        archivo = NominaArchivo(nombre_archivo=f"grancoop_{mes}_{anio}.pdf", hash_archivo=file_hash, tamaño_bytes=sum(len(b) for b in archivos_binarios), tipo_archivo="pdf", ruta_almacenamiento=path, mes_fact=mes, año_fact=anio, categoria="COOPERATIVAS", subcategoria="GRANCOOP", estado="Procesado")
        session.add(archivo); await session.flush()
        for idx, row in enumerate(rows_facturables):
            reg = NominaRegistroNormalizado(archivo_id=archivo.id, fecha_creacion=datetime.now(), mes_fact=mes, año_fact=anio, cedula=row["cedula"], nombre_asociado=row.get("nombre_asociado", ""), valor=row["valor"], empresa=row.get("empresa", ""), concepto=row["concepto"], categoria_final="COOPERATIVAS", subcategoria_final="GRANCOOP", estado_validacion="OK" if str(row.get("estado_erp")).upper() == "ACTIVO" else row.get("estado_erp", "OK"), observaciones=row.get("observaciones"), fila_origen=idx + 1)
            session.add(reg)
        for idx, row in enumerate(rows_no_facturables):
            reg = NominaRegistroNormalizado(archivo_id=archivo.id, fecha_creacion=datetime.now(), mes_fact=mes, año_fact=anio, cedula=row["cedula"], nombre_asociado=row.get("nombre_asociado", ""), valor=row["valor"], empresa=row.get("empresa", ""), concepto=row["concepto"], categoria_final="COOPERATIVAS", subcategoria_final="GRANCOOP", estado_validacion=row.get("estado_erp", "ADVERTENCIA"), observaciones=row.get("observaciones"), fila_origen=len(rows_facturables) + idx + 1)
            session.add(reg)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar registros de Grancoop: {str(e)}")

    formatted_rows = [{"cedula": r["cedula"], "nombre_asociado": r.get("nombre_asociado", ""), "empresa": r.get("empresa", ""), "valor": r["valor"], "concepto": r["concepto"]} for r in rows_facturables]
    return {"rows": formatted_rows, "summary": summary, "warnings": warnings_txt, "warnings_detalle": warnings_detalle}

@router.get("/grancoop/datos")
async def obtener_datos_grancoop(mes: int = Query(...), anio: int = Query(...), session: AsyncSession = Depends(obtener_db)):
    """Devuelve datos GRANCOOP guardados para un mes/año."""
    stmt = select(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "GRANCOOP", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio)
    try:
        result = await session.execute(stmt); registros = result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar datos de Grancoop: {str(e)}")

    rows_final = [{"cedula": r.cedula, "nombre_asociado": r.nombre_asociado, "empresa": r.empresa, "valor": r.valor, "concepto": r.concepto, "estado_validacion": r.estado_validacion} 
                  for r in registros 
                  if r.estado_validacion == "OK" or ("EXCEPCION" in str(r.estado_validacion).upper() and r.estado_validacion != "EXCEPCION_EXONERADO") or str(r.estado_validacion).upper() == "REDIRECCIONADO" or str(r.estado_validacion).upper() == "ACTIVO"]
    
    summary_final = {
        "mes": mes, "anio": anio, 
        "total_asociados": len(set(r["cedula"] for r in rows_final)), 
        "total_filas": len(rows_final), 
        "total_valor": sum(r["valor"] for r in rows_final), 
        "total_warnings": len([r for r in registros if r.estado_validacion != "OK" and "EXCEPCION" not in str(r.estado_validacion)])
    }
    return {"rows": rows_final, "summary": summary_final}
