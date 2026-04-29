import hashlib
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlmodel import Session, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from ....database import obtener_db, obtener_erp_db_opcional
from ....models.novedades_nomina.nomina import (
    NominaArchivo, NominaRegistroNormalizado, ControlDescuentoActivo, ControlDescuentoConcepto, NominaExcepcion
)
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.control_descuentos_extractor import extraer_control_descuentos
from ....services.novedades_nomina.excepcion_service import ExcepcionService

router = APIRouter(tags=["Descuentos - Control"])

# ── HELPERS ─────────────────────────────────────────────────────────────────

def calcular_fecha_finalizacion(inicio: date, cuotas: int) -> date:
    if cuotas <= 1: return inicio
    curr = inicio
    for _ in range(cuotas - 1):
        if curr.day == 15:
            try: curr = curr.replace(day=30)
            except ValueError:
                next_m = curr.month + 1 if curr.month < 12 else 1
                next_y = curr.year if curr.month < 12 else curr.year + 1
                curr = date(next_y, next_m, 1) - timedelta(days=1)
        else:
            next_m = curr.month + 1 if curr.month < 12 else 1
            next_y = curr.year if curr.month < 12 else curr.year + 1
            curr = date(next_y, next_m, 15)
    return curr

def calcular_saldo_y_estado(registro: ControlDescuentoActivo, hoy: date = None) -> tuple[float, str]:
    if hoy is None: hoy = date.today()
    fi = registro.fecha_inicio
    if hasattr(fi, "date"): fi = fi.date()
    if hoy < fi: return float(registro.valor_descuento), "PENDIENTE"
    cuotas_pasadas, current = 0, fi
    while current <= hoy and cuotas_pasadas < registro.n_cuotas:
        cuotas_pasadas += 1
        if current.day == 15:
            try: current = current.replace(day=30)
            except ValueError:
                next_m = current.month + 1 if current.month < 12 else 1
                next_y = current.year if current.month < 12 else current.year + 1
                current = date(next_y, next_m, 1) - timedelta(days=1)
        else:
            next_m = current.month + 1 if current.month < 12 else 1
            next_y = current.year if current.month < 12 else current.year + 1
            current = date(next_y, next_m, 15)
    saldo = max(0.0, registro.valor_descuento - (cuotas_pasadas * registro.valor_cuota))
    return float(saldo), ("CERRADO" if saldo < 0.01 else "PENDIENTE")

# ── MODELS ──────────────────────────────────────────────────────────────────

class RegistroDescuentoRequest(BaseModel):
    cedula: str
    nombre: str
    empresa: str
    cargo: str = ""
    area: str = ""
    concepto: str
    valor_descuento: float
    n_cuotas: int
    fecha_inicio: date
    observaciones: str = ""

class ConceptoRequest(BaseModel):
    nombre: str
    concepto_nomina: str = "111"
    activo: bool = True

# ── CONTROL DE DESCUENTOS ───────────────────────────────────────────────────

@router.post("/control_descuentos/preview")
async def preview_control_descuentos(mes: int = Form(...), anio: int = Form(...), files: List[UploadFile] = File(...), session: AsyncSession = Depends(obtener_db), db_erp = Depends(obtener_erp_db_opcional)):
    archivos_binarios = [await f.read() for f in files]
    rows, summary, warnings_txt = extraer_control_descuentos(archivos_binarios)
    
    stmt_exc = select(NominaExcepcion).where(
        NominaExcepcion.subcategoria == "CONTROL DE DESCUENTOS",
        NominaExcepcion.estado == "ACTIVO"
    )
    try:
        result_exc = await session.execute(stmt_exc)
        excepciones_db = result_exc.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar excepciones para Control de Descuentos: {str(e)}")
    
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
                row["nombre_asociado"], row["empresa"], row["estado_erp"] = "", "", "NO ENCONTRADO"
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
        await session.execute(delete(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "CONTROL DE DESCUENTOS", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio))
        archivo = NominaArchivo(nombre_archivo=f"control_descuentos_{mes}_{anio}.xlsx", hash_archivo=hashlib.md5(archivos_binarios[0][:1024]).hexdigest() if archivos_binarios else "none", tamaño_bytes=sum(len(b) for b in archivos_binarios), tipo_archivo="xlsx", ruta_almacenamiento="memory", mes_fact=mes, año_fact=anio, categoria="DESCUENTOS", subcategoria="CONTROL DE DESCUENTOS", estado="Procesado")
        session.add(archivo); await session.flush()
        for idx, row in enumerate(rows):
            reg = NominaRegistroNormalizado(archivo_id=archivo.id, fecha_creacion=datetime.now(), mes_fact=mes, año_fact=anio, cedula=row["cedula"], nombre_asociado=row.get("nombre_asociado", ""), valor=row["valor"], empresa=row.get("empresa", ""), concepto=row["concepto"], categoria_final="DESCUENTOS", subcategoria_final="CONTROL DE DESCUENTOS", estado_validacion="OK" if "EXCEPCIÓN APLICADA" in str(row.get("estado_erp")) or row.get("estado_erp") == "ACTIVO" else "NO_CLASIFICADO", observaciones=row.get("observaciones"), fila_origen=idx + 1)
            session.add(reg)
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar registros de Control de Descuentos: {str(e)}")
    return {"rows": rows, "summary": summary, "warnings": warnings_txt, "warnings_detalle": warnings_detalle}

@router.get("/control_descuentos/datos")
async def obtener_datos_control_descuentos(mes: int = Query(...), anio: int = Query(...), session: AsyncSession = Depends(obtener_db)):
    stmt = select(NominaRegistroNormalizado).where(NominaRegistroNormalizado.subcategoria_final == "CONTROL DE DESCUENTOS", NominaRegistroNormalizado.mes_fact == mes, NominaRegistroNormalizado.año_fact == anio)
    try:
        result = await session.execute(stmt); registros = result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar datos de Control de Descuentos: {str(e)}")
    rows, warnings_detalle, total_valor = [], [], 0.0
    for r in registros:
        item = {"cedula": r.cedula, "nombre_asociado": r.nombre_asociado or "", "empresa": r.empresa, "valor": r.valor, "concepto": r.concepto, "estado_validacion": r.estado_validacion}
        rows.append(item); total_valor += r.valor
        if r.estado_validacion != "OK": warnings_detalle.append({"cedula": r.cedula, "nombre": r.nombre_asociado or "", "motivo": r.estado_validacion})
    return {"rows": rows, "summary": {"mes": mes, "anio": anio, "total_asociados": len(set(r["cedula"] for r in rows)), "total_filas": len(rows), "total_valor": total_valor, "total_warnings": len(warnings_detalle)}, "warnings_detalle": warnings_detalle}

@router.get("/control_descuentos/empleado/{cedula}")
async def buscar_empleado_control(cedula: str, db_erp: Session = Depends(obtener_erp_db_opcional)):
    if not db_erp: raise HTTPException(status_code=400, detail="ERP no disponible")
    empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
    if not empleado: raise HTTPException(status_code=404, detail="No encontrado")
    return empleado

@router.post("/control_descuentos/registro")
async def registrar_control_descuento(req: RegistroDescuentoRequest, session: AsyncSession = Depends(obtener_db)):
    try:
        fecha_fin = calcular_fecha_finalizacion(req.fecha_inicio, req.n_cuotas)
        valor_cuota = round(req.valor_descuento / req.n_cuotas, 2)
        nuevo = ControlDescuentoActivo(cedula=req.cedula, nombre=req.nombre.upper(), empresa=req.empresa.upper(), cargo=req.cargo.upper() if req.cargo else None, area=req.area.upper() if req.area else None, concepto=req.concepto.upper(), valor_descuento=req.valor_descuento, n_cuotas=req.n_cuotas, valor_cuota=valor_cuota, concepto_nomina="111", fecha_inicio=req.fecha_inicio, fecha_finalizacion=fecha_fin, observaciones=req.observaciones)
        session.add(nuevo); await session.commit(); await session.refresh(nuevo)
        return {"mensaje": "Registro guardado", "id": nuevo.id}
    except Exception as e: await session.rollback(); raise HTTPException(status_code=500, detail=str(e))

@router.get("/control_descuentos/activos")
async def obtener_activos(session: AsyncSession = Depends(obtener_db)):
    try:
        result = await session.execute(select(ControlDescuentoActivo).order_by(ControlDescuentoActivo.id.desc()))
        registros = result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar descuentos activos: {str(e)}")
    hoy = date.today(); resultado = []
    for r in registros:
        saldo, estado = calcular_saldo_y_estado(r, hoy)
        row_dict = r.model_dump(); row_dict["saldo"], row_dict["estado"] = saldo, estado
        row_dict["fecha_inicio"] = r.fecha_inicio.strftime("%Y-%m-%d") if hasattr(r.fecha_inicio, "strftime") else str(r.fecha_inicio)
        row_dict["fecha_finalizacion"] = r.fecha_finalizacion.strftime("%Y-%m-%d") if hasattr(r.fecha_finalizacion, "strftime") else str(r.fecha_finalizacion)
        resultado.append(row_dict)
    return {"items": resultado}

@router.get("/control_descuentos/conceptos")
async def listar_conceptos(session: AsyncSession = Depends(obtener_db)):
    try:
        statement = select(ControlDescuentoConcepto).order_by(ControlDescuentoConcepto.nombre)
        resultados = await session.execute(statement)
        return resultados.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listando conceptos: {str(e)}")

@router.post("/control_descuentos/conceptos")
async def crear_concepto(req: ConceptoRequest, session: AsyncSession = Depends(obtener_db)):
    try:
        statement = select(ControlDescuentoConcepto).where(ControlDescuentoConcepto.nombre == req.nombre.strip().upper())
        existe = await session.execute(statement)
        if existe.scalars().first(): raise HTTPException(status_code=400, detail="El nombre del concepto ya existe.")
        nuevo = ControlDescuentoConcepto(nombre=req.nombre.strip().upper(), concepto_nomina=req.concepto_nomina.strip(), activo=req.activo)
        session.add(nuevo); await session.commit(); await session.refresh(nuevo)
        return nuevo
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=f"Error creando concepto: {str(e)}")

@router.get("/control_descuentos/tabla-quincenal")
async def obtener_tabla_quincenal(anio: int, mes: int, quincena: int, session: AsyncSession = Depends(obtener_db)):
    if quincena not in (1, 2): raise HTTPException(status_code=400, detail="quincena debe ser 1 o 2")
    try:
        fecha_limite_inf = date(anio, mes, 1)
        result = await session.execute(select(ControlDescuentoActivo).where(ControlDescuentoActivo.fecha_finalizacion >= fecha_limite_inf).order_by(ControlDescuentoActivo.nombre))
        registros = result.scalars().all()
        label_quincena, filas, indice = ("Q1" if quincena == 1 else "Q2"), [], 1
        for r in registros:
            fechas_pago, curr = [], r.fecha_inicio
            if hasattr(curr, "date"): curr = curr.date()
            for _ in range(r.n_cuotas):
                fechas_pago.append(curr)
                if curr.day == 15:
                    try: curr = curr.replace(day=30)
                    except ValueError:
                        next_m = curr.month + 1 if curr.month < 12 else 1
                        next_y = curr.year if curr.month < 12 else curr.year + 1
                        curr = date(next_y, next_m, 1) - timedelta(days=1)
                else:
                    next_m = curr.month + 1 if curr.month < 12 else 1
                    next_y = curr.year if curr.month < 12 else curr.year + 1
                    curr = date(next_y, next_m, 15)
            pertenece = False
            for fp in fechas_pago:
                if fp.year == anio and fp.month == mes:
                    if (quincena == 1 and fp.day == 15) or (quincena == 2 and fp.day >= 28):
                        pertenece = True; break
            if pertenece:
                filas.append({"indice": indice, "cedula": r.cedula, "nombre": r.nombre, "empresa": r.empresa, "valor": r.valor_cuota, "concepto": f"CONTROL DE DESCUENTO {label_quincena}"})
                indice += 1
        total_valor = sum(f["valor"] for f in filas)
        por_empresa = {}
        for f in filas:
            emp = f["empresa"] or "N/A"
            por_empresa[emp] = por_empresa.get(emp, 0) + f["valor"]
        return {"filas": filas, "summary": {"total_registros": len(filas), "total_valor": total_valor, "por_empresa": por_empresa, "anio": anio, "mes": mes, "quincena": label_quincena}}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
