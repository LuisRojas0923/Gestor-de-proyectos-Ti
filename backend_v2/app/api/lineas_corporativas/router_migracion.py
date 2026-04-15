"""
Router de Migración Legacy para Líneas Corporativas.
Contiene el endpoint de carga masiva desde el Excel histórico.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from datetime import datetime
import polars as pl
import io
from fastapi import UploadFile, File

from app.database import obtener_db
from app.models.linea_corporativa import LineaCorporativa, EmpleadoLinea

router = APIRouter()


@router.post("/migracion-legacy")
async def migracion_legacy(
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(obtener_db)
):
    """
    Migración masiva desde el Excel histórico (Matriz de 161 registros).
    Usa Polars para procesamiento rápido y mapeo de campos financieros.
    """
    content = await archivo.read()
    
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

    try:
        # Lectura con Polars (Fila 11 como header -> index 10)
        df = pl.read_excel(
            io.BytesIO(content),
            sheet_name="MATRIZ CELULARES",
            read_options={"skip_rows": 10, "has_header": True}
        )
        # Normalizar encabezados (quitar espacios al inicio y final)
        df.columns = [c.strip() for c in df.columns]
        
        count_success = 0
        
        for row in df.iter_rows(named=True):
            # 1. Gestionar Empleado (Asignado)
            doc_asignado = str(row.get("DOCUMENTO DE ASIGNADO") or "").strip()
            if not doc_asignado or doc_asignado == "None":
                doc_asignado = str(row.get("DOCUMENTO DE COBRO") or "").strip()
            
            if not doc_asignado:
                continue

            nombre_asignado = str(row.get("NOMBRE DE ASIGNADO") or "DESCONOCIDO").strip()
            
            # Buscar o crear empleado
            stmt_e = select(EmpleadoLinea).where(EmpleadoLinea.documento == doc_asignado)
            empleado = (await db.execute(stmt_e)).scalar_one_or_none()
            
            if not empleado:
                empleado = EmpleadoLinea(
                    documento=doc_asignado,
                    nombre=nombre_asignado,
                    tipo="INTERNO" if "TERCERO" not in str(row.get("CARGO") or "").upper() else "EXTERNO",
                    cargo=row.get("CARGO"),
                    area=row.get("AREA"),
                    centro_costo=str(row.get("CENTRO DE COSTO") or "").strip()
                )
                db.add(empleado)
                await db.flush()

            # 2. Gestionar Empresa Responsable (Cobro)
            doc_cobro = str(row.get("DOCUMENTO DE COBRO") or "").strip()
            if doc_cobro and doc_cobro != doc_asignado:
                stmt_r = select(EmpleadoLinea).where(EmpleadoLinea.documento == doc_cobro)
                responsable = (await db.execute(stmt_r)).scalar_one_or_none()
                if not responsable:
                    responsable = EmpleadoLinea(
                        documento=doc_cobro,
                        nombre=str(row.get("EMPLEADO DE COBRO") or "EMPRESA").strip(),
                        tipo="EXTERNO"
                    )
                    db.add(responsable)
                    await db.flush()

            # 3. Crear Línea
            nro_linea = str(row.get("LINEA") or "").strip()
            if not nro_linea:
                continue

            # Fecha
            fecha_upd = row.get("FECHA DE ACTUALIZACION")
            if isinstance(fecha_upd, datetime):
                fecha_upd = fecha_upd.date()
            elif isinstance(fecha_upd, str):
                try:
                    fecha_upd = datetime.strptime(fecha_upd, "%d/%m/%Y").date()
                except Exception:
                    fecha_upd = None

            linea_corp = LineaCorporativa(
                linea=nro_linea,
                fecha_actualizacion=fecha_upd,
                empresa=str(row.get("EMPRESA") or "CLARO").strip(),
                estatus=str(row.get("ESTATUS") or "ACTIVA").strip(),
                estado_asignacion=str(row.get("ESTADO DE ASIGNACION") or "ASIGNADA").strip(),
                documento_asignado=doc_asignado,
                documento_cobro=doc_cobro if doc_cobro else doc_asignado,
                nombre_plan=row.get("NOMBRE DEL PLAN ACTUAL"),
                convenio=str(row.get("CONVENIO #1") or ""),
                aprobado_por=row.get("APROBADO POR"),
                observaciones=row.get("OBSERVACIONES"),
                cobro_fijo_coef=map_convenio(row.get("CONVENIO #1")),
                # Snapshots financieros
                cfm_con_iva=clean_money(row.get("CFM CON IVA")),
                cfm_sin_iva=clean_money(row.get("CFM-SIN IVA")),
                descuento_39=clean_money(row.get("DESC,39%")),
                vr_factura=clean_money(row.get("V/R FACTURA")),
                pago_empleado=clean_money(row.get("PAGO EMPLEADO")),
                pago_empresa=clean_money(row.get("PAGO REFRIDCOL")),
                primera_quincena=clean_money(row.get("1ERA Q")),
                segunda_quincena=clean_money(row.get("2DA Q"))
            )
            
            db.add(linea_corp)
            count_success += 1

        await db.commit()
        return {
            "mensaje": "Migración masiva completada exitosamente",
            "lineas_procesadas": count_success
        }

    except Exception as e:
        await db.rollback()
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error en migración: {str(e)}")
