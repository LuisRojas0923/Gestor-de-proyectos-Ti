"""
Router de Inventario para Líneas Corporativas.
Permite la actualización masiva de líneas y empleados desde el Excel de inventario.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from sqlmodel import select
from datetime import datetime, date
import polars as pl
import io
import re
import csv

from app.database import obtener_db, obtener_erp_db_opcional
from app.models.linea_corporativa import LineaCorporativa, EmpleadoLinea
from app.models.linea_corporativa.factura_model import FacturaLinea

router = APIRouter()

def clean_money(value) -> float:
    if value is None or (isinstance(value, str) and not value.strip()):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s_value = str(value).replace("$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return float(s_value)
    except ValueError:
        return 0.0

def map_convenio(value) -> float:
    if not value:
        return 0.5
    s_val = str(value).strip().replace("%", "")
    try:
        pct = float(s_val)
        return pct / 100.0
    except ValueError:
        return 0.5

@router.post("/importar-inventario")
async def importar_inventario(
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_db)
):
    """
    Sincroniza y actualiza de forma masiva el inventario de líneas y empleados desde el Excel de inventario.
    Detecta automáticamente la fila de encabezado y realiza upserts correspondientes.
    """
    content = await archivo.read()
    
    try:
        # Lectura inicial sin encabezados para detectar la fila de inicio
        df_detect = pl.read_excel(io.BytesIO(content), read_options={"has_header": False})
        
        header_row = -1
        # Buscamos en las primeras 25 filas la que contenga la columna 'LINEA' y 'DOCUMENTO'
        for i, row in enumerate(df_detect.iter_rows()):
            if i > 25:
                break
            row_str = [str(x).strip().upper() for x in row if x is not None]
            if any("LINEA" in val for val in row_str) and any("DOCUMENTO" in val for val in row_str):
                header_row = i
                break
        
        # Leer el dataframe con los encabezados correspondientes
        if header_row != -1:
            df = pl.read_excel(
                io.BytesIO(content),
                read_options={"skip_rows": header_row, "has_header": True}
            )
        else:
            # Fallback
            df = pl.read_excel(io.BytesIO(content), read_options={"has_header": True})
            
        # Normalizar encabezados (quitar espacios)
        df.columns = [c.strip() for c in df.columns]
        
        # Mapear columnas según los nombres típicos del Excel
        col_mapping = {
            "linea": ["LINEA", "NUMERO", "NRO LINEA", "CELULAR"],
            "doc_asignado": ["DOCUMENTO DE ASIGNADO", "DOCUMENTO ASIGNADO", "CEDULA ASIGNADO", "DOCUMENTO"],
            "nombre_asignado": ["NOMBRE DE ASIGNADO", "NOMBRE ASIGNADO", "NOMBRE", "EMPLEADO"],
            "doc_cobro": ["DOCUMENTO DE COBRO", "DOCUMENTO COBRO", "CEDULA COBRO"],
            "nombre_cobro": ["EMPLEADO DE COBRO", "NOMBRE COBRO"],
            "cargo": ["CARGO", "PUESTO"],
            "area": ["AREA", "DEPARTAMENTO"],
            "centro_costo": ["CENTRO DE COSTO", "CECO", "C.O.", "CENTRO COSTO"],
            "empresa": ["EMPRESA", "COMPAÑIA"],
            "estatus": ["ESTATUS", "ESTADO LINEA", "ESTADO"],
            "estado_asignacion": ["ESTADO DE ASIGNACION", "ASIGNACION"],
            "fecha_actualizacion": ["FECHA DE ACTUALIZACION", "FECHA"],
            "nombre_plan": ["NOMBRE DEL PLAN ACTUAL", "PLAN", "NOMBRE PLAN"],
            "convenio": ["CONVENIO #1", "CONVENIO"],
            "aprobado_por": ["APROBADO POR", "APROBADO"],
            "observaciones": ["OBSERVACIONES", "NOTAS"],
            "cfm_con_iva": ["CFM CON IVA"],
            "cfm_sin_iva": ["CFM-SIN IVA", "CFM SIN IVA"],
            "descuento_39": ["DESC,39%", "DESCUENTO 39%", "DESC 39%"],
            "vr_factura": ["V/R FACTURA", "VALOR FACTURA"],
            "pago_empleado": ["PAGO EMPLEADO"],
            "pago_empresa": ["PAGO REFRIDCOL", "PAGO EMPRESA"],
            "primera_quincena": ["1ERA Q", "PRIMERA QUINCENA"],
            "segunda_quincena": ["2DA Q", "SEGUNDA QUINCENA"]
        }
        
        # Crear un diccionario para acceder dinámicamente a las columnas encontradas
        matched_cols = {}
        for key, aliases in col_mapping.items():
            for alias in aliases:
                if alias in df.columns:
                    matched_cols[key] = alias
                    break
        
        # Validar columnas mínimas obligatorias
        if "linea" not in matched_cols:
            raise HTTPException(
                status_code=400, 
                detail="No se encontró la columna de la Línea (LINEA, NUMERO, CELULAR, etc.) en el Excel."
            )
            
        lineas_creadas = 0
        lineas_actualizadas = 0
        empleados_creados = 0
        empleados_actualizados = 0
        
        lineas_excel = set()
        
        for row in df.iter_rows(named=True):
            nro_linea = str(row.get(matched_cols["linea"]) or "").strip()
            if not nro_linea or nro_linea.upper() == "NONE":
                continue
                
            lineas_excel.add(nro_linea)
            
            # 1. Procesar Empleado Asignado
            doc_asignado = str(row.get(matched_cols.get("doc_asignado", "")) or "").strip()
            if not doc_asignado or doc_asignado.upper() == "NONE":
                doc_asignado = str(row.get(matched_cols.get("doc_cobro", "")) or "").strip()
                
            empleado = None
            if doc_asignado and doc_asignado.upper() != "NONE":
                nombre_asignado = str(row.get(matched_cols.get("nombre_asignado", "")) or "DESCONOCIDO").strip()
                stmt_e = select(EmpleadoLinea).where(EmpleadoLinea.documento == doc_asignado)
                empleado = (await db.execute(stmt_e)).scalar_one_or_none()
                
                cargo = row.get(matched_cols.get("cargo", ""))
                area = row.get(matched_cols.get("area", ""))
                centro_costo = str(row.get(matched_cols.get("centro_costo", "")) or "").strip()
                
                # Tipo de empleado
                tipo = "INTERNO"
                if cargo and "TERCERO" in str(cargo).upper():
                    tipo = "EXTERNO"
                
                if not empleado:
                    empleado = EmpleadoLinea(
                        documento=doc_asignado,
                        nombre=nombre_asignado,
                        tipo=tipo,
                        cargo=cargo,
                        area=area,
                        centro_costo=centro_costo
                    )
                    db.add(empleado)
                    empleados_creados += 1
                else:
                    # Actualizar info
                    empleado.nombre = nombre_asignado
                    empleado.tipo = tipo
                    empleado.cargo = cargo if cargo else empleado.cargo
                    empleado.area = area if area else empleado.area
                    empleado.centro_costo = centro_costo if centro_costo else empleado.centro_costo
                    db.add(empleado)
                    empleados_actualizados += 1
                await db.flush()
                
            # 2. Procesar Empleado Responsable (Cobro) si es diferente
            doc_cobro = str(row.get(matched_cols.get("doc_cobro", "")) or "").strip()
            if doc_cobro and doc_cobro.upper() != "NONE" and doc_cobro != doc_asignado:
                stmt_r = select(EmpleadoLinea).where(EmpleadoLinea.documento == doc_cobro)
                responsable = (await db.execute(stmt_r)).scalar_one_or_none()
                
                if not responsable:
                    nombre_cobro = str(row.get(matched_cols.get("nombre_cobro", "")) or "EMPRESA").strip()
                    responsable = EmpleadoLinea(
                        documento=doc_cobro,
                        nombre=nombre_cobro,
                        tipo="EXTERNO"
                    )
                    db.add(responsable)
                    empleados_creados += 1
                    await db.flush()

            # 3. Procesar Línea Corporativa (Upsert)
            stmt_l = select(LineaCorporativa).where(LineaCorporativa.linea == nro_linea)
            linea_db = (await db.execute(stmt_l)).scalar_one_or_none()
            
            # Formatear Fecha
            fecha_upd = row.get(matched_cols.get("fecha_actualizacion", ""))
            if isinstance(fecha_upd, datetime):
                fecha_upd = fecha_upd.date()
            elif isinstance(fecha_upd, str):
                try:
                    fecha_upd = datetime.strptime(fecha_upd, "%d/%m/%Y").date()
                except Exception:
                    try:
                        fecha_upd = datetime.strptime(fecha_upd, "%Y-%m-%d").date()
                    except Exception:
                        fecha_upd = None
            else:
                fecha_upd = None
                
            # Valores de convenios y coeficientes
            val_convenio = str(row.get(matched_cols.get("convenio", "")) or "")
            coef_fijo = map_convenio(val_convenio)
            
            # Preparar mapeo de datos de la fila
            fields_data = {
                "fecha_actualizacion": fecha_upd or date.today(),
                "empresa": str(row.get(matched_cols.get("empresa", "")) or "CLARO").strip(),
                "estatus": str(row.get(matched_cols.get("estatus", "")) or "ACTIVA").strip(),
                "estado_asignacion": str(row.get(matched_cols.get("estado_asignacion", "")) or "ASIGNADA").strip(),
                "documento_asignado": doc_asignado if doc_asignado and doc_asignado.upper() != "NONE" else None,
                "documento_cobro": doc_cobro if doc_cobro and doc_cobro.upper() != "NONE" else (doc_asignado if doc_asignado and doc_asignado.upper() != "NONE" else None),
                "nombre_plan": row.get(matched_cols.get("nombre_plan", "")),
                "convenio": val_convenio,
                "aprobado_por": row.get(matched_cols.get("aprobado_por", "")),
                "observaciones": row.get(matched_cols.get("observaciones", "")),
                "cobro_fijo_coef": coef_fijo,
                "cfm_con_iva": clean_money(row.get(matched_cols.get("cfm_con_iva", ""))),
                "cfm_sin_iva": clean_money(row.get(matched_cols.get("cfm_sin_iva", ""))),
                "descuento_39": clean_money(row.get(matched_cols.get("descuento_39", ""))),
                "vr_factura": clean_money(row.get(matched_cols.get("vr_factura", ""))),
                "pago_empleado": clean_money(row.get(matched_cols.get("pago_empleado", ""))),
                "pago_empresa": clean_money(row.get(matched_cols.get("pago_empresa", ""))),
                "primera_quincena": clean_money(row.get(matched_cols.get("primera_quincena", ""))),
                "segunda_quincena": clean_money(row.get(matched_cols.get("segunda_quincena", "")))
            }
            
            if not linea_db:
                # Crear Línea
                linea_db = LineaCorporativa(
                    linea=nro_linea,
                    **fields_data
                )
                db.add(linea_db)
                lineas_creadas += 1
            else:
                # Actualizar Línea
                for k, v in fields_data.items():
                    setattr(linea_db, k, v)
                linea_db.updated_at = datetime.utcnow()
                db.add(linea_db)
                lineas_actualizadas += 1
                
        # 4. Encontrar líneas en base de datos que NO están en el Excel (Posibles inactivas)
        stmt_todas = select(LineaCorporativa.linea)
        todas_lineas_db = (await db.execute(stmt_todas)).scalars().all()
        lineas_desaparecidas = list(set(todas_lineas_db) - lineas_excel)
        
        await db.commit()
        
        return {
            "mensaje": "Sincronización de inventario completada",
            "lineas_creadas": lineas_creadas,
            "lineas_actualizadas": lineas_actualizadas,
            "empleados_creados": empleados_creados,
            "empleados_actualizados": empleados_actualizados,
            "lineas_no_encontradas_excel": lineas_desaparecidas
        }
        
    except Exception as e:
        await db.rollback()
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al sincronizar inventario: {str(e)}")


@router.get("/cruce/exportar-nomina")
async def exportar_nomina(periodo: str, db: AsyncSession = Depends(obtener_db)):
    """
    Exporta en formato CSV (con delimitador ';') la lista de deducciones de nómina
    para empleados con pago_empleado > 0 en un periodo específico.
    """
    stmt = select(
        FacturaLinea.documento_asignado,
        EmpleadoLinea.nombre,
        FacturaLinea.pago_empleado,
        FacturaLinea.centro_costo
    ).join(
        LineaCorporativa, FacturaLinea.linea_id == LineaCorporativa.id
    ).outerjoin(
        EmpleadoLinea, FacturaLinea.documento_asignado == EmpleadoLinea.documento
    ).where(
        FacturaLinea.periodo == periodo,
        FacturaLinea.pago_empleado > 0
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["DOCUMENTO", "EMPLEADO", "VALOR A DEDUCIR", "CENTRO COSTO", "PERIODO"])
    
    for row in rows:
        writer.writerow([
            row.documento_asignado,
            row.nombre or "DESCONOCIDO",
            f"{row.pago_empleado:.2f}",
            row.centro_costo,
            periodo
        ])
        
    output.seek(0)
    response = StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8-sig')), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=deducciones_nomina_{periodo}.csv"
    return response


@router.get("/cruce/exportar-contable")
async def exportar_contable(periodo: str, db: AsyncSession = Depends(obtener_db)):
    """
    Exporta en formato CSV el resumen contable agrupado por centro de costos
    para un periodo específico.
    """
    from sqlalchemy import case
    
    co_normalized = case(
        (FacturaLinea.centro_costo == 'GENERAL', '9910-99'),
        (FacturaLinea.centro_costo.is_(None), '9910-99'),
        (FacturaLinea.centro_costo == '', '9910-99'),
        else_=FacturaLinea.centro_costo
    ).label("co")

    stmt = select(
        co_normalized,
        func.coalesce(func.sum(FacturaLinea.cargo_mes), 0.0).label("cargo_mes"),
        func.coalesce(func.sum(FacturaLinea.descuento_mes), 0.0).label("descuento_mes"),
        func.coalesce(func.sum(FacturaLinea.impoconsumo), 0.0).label("impoconsumo"),
        func.coalesce(func.sum(FacturaLinea.descuento_iva), 0.0).label("descuento_iva"),
        func.coalesce(func.sum(FacturaLinea.iva_19), 0.0).label("iva_19"),
        func.coalesce(func.sum(FacturaLinea.total), 0.0).label("total"),
        func.coalesce(func.sum(FacturaLinea.pago_empleado), 0.0).label("pago_empleado"),
        func.coalesce(func.sum(FacturaLinea.pago_refridcol), 0.0).label("pago_empresa")
    ).where(FacturaLinea.periodo == periodo).group_by(co_normalized)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow([
        "CENTRO COSTO", "CARGO MES", "DESCUENTO MES", "IMPOCONSUMO", 
        "DESCUENTO IVA", "IVA 19%", "TOTAL FACTURA", "PAGO EMPLEADO", "PAGO EMPRESA"
    ])
    
    for row in rows:
        writer.writerow([
            row.co,
            f"{row.cargo_mes:.2f}",
            f"{row.descuento_mes:.2f}",
            f"{row.impoconsumo:.2f}",
            f"{row.descuento_iva:.2f}",
            f"{row.iva_19:.2f}",
            f"{row.total:.2f}",
            f"{row.pago_empleado:.2f}",
            f"{row.pago_empresa:.2f}"
        ])
        
    output.seek(0)
    response = StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8-sig')), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=comprobante_contable_{periodo}.csv"
    return response


@router.get("/cruce/auditoria")
async def auditoria_cruce(
    periodo: str, 
    db: AsyncSession = Depends(obtener_db),
    db_erp: Session = Depends(obtener_erp_db_opcional)
):
    """
    Realiza un cruce de auditoría entre la facturación del período y el inventario de líneas,
    detectando fugas, empleados inactivos (cruce ERP) y líneas sin asignación.
    """
    try:
        stmt_facturas = select(
            FacturaLinea, LineaCorporativa.linea, LineaCorporativa.estatus
        ).join(
            LineaCorporativa, FacturaLinea.linea_id == LineaCorporativa.id
        ).where(FacturaLinea.periodo == periodo)
        
        result_facturas = await db.execute(stmt_facturas)
        facturas = result_facturas.all()
        
        fugas = []
        retirados = []
        sin_asignacion = []
        
        cedulas = [f.FacturaLinea.documento_asignado for f in facturas if f.FacturaLinea.documento_asignado and f.FacturaLinea.documento_asignado != "SIN_ASIGNAR"]
        
        alertas_erp = {}
        if db_erp and cedulas:
            query_erp = text("""
                SELECT DISTINCT ON (E.nrocedula)
                    E.nrocedula AS nrocedula,
                    C.estado AS estado,
                    C.fecharetiro AS fecharetiro
                FROM establecimiento E
                LEFT JOIN contrato C ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                WHERE TRIM(CAST(E.nrocedula AS TEXT)) IN :cedulas
                ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
            """)
            
            try:
                erp_result = db_erp.execute(query_erp, {"cedulas": tuple(cedulas)}).fetchall()
                for row in erp_result:
                    cedula = str(row.nrocedula).strip()
                    estado = str(row.estado).strip()
                    fecha_retiro = row.fecharetiro
                    
                    if estado.lower() != 'activo' or (fecha_retiro and str(fecha_retiro)[:10] != '1900-01-01'):
                        alertas_erp[cedula] = {
                            "estado": estado,
                            "fecha_retiro": str(fecha_retiro) if fecha_retiro else None
                        }
            except Exception as e:
                print(f"Error consultando ERP en cruce: {str(e)}")

        for f_line, nro, estatus in facturas:
            total_val = float(f_line.total)
            
            if estatus != 'ACTIVA':
                fugas.append({
                    "linea_id": f_line.linea_id,
                    "numero": nro,
                    "estatus": estatus,
                    "total": total_val
                })
                
            if f_line.documento_asignado == 'SIN_ASIGNAR':
                sin_asignacion.append({
                    "linea_id": f_line.linea_id,
                    "numero": nro,
                    "total": total_val
                })
                
            if f_line.documento_asignado in alertas_erp:
                retirados.append({
                    "linea_id": f_line.linea_id,
                    "numero": nro,
                    "documento": f_line.documento_asignado,
                    "estado_erp": alertas_erp[f_line.documento_asignado]["estado"],
                    "fecha_retiro": alertas_erp[f_line.documento_asignado]["fecha_retiro"],
                    "total": total_val
                })
                
        return {
            "fugas": fugas,
            "retirados": retirados,
            "sin_asignacion": sin_asignacion
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en auditoría cruzada: {str(e)}")
