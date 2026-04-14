from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from sqlmodel import select
from typing import List

from app.database import obtener_db, obtener_erp_db_opcional
from app.models.linea_corporativa import LineaCorporativa, EquipoMovil, EmpleadoLinea
from app.models.linea_corporativa.factura_model import FacturaLinea
from .schemas import (
    LineaCorporativaCreate, LineaCorporativaUpdate, LineaCorporativaOut,
    EquipoMovilCreate, EquipoMovilOut,
    EmpleadoLineaCreate, EmpleadoLineaOut,
    ResumenCORow
)
from datetime import datetime
import polars as pl
import io
from fastapi import UploadFile, File
from sqlalchemy import func
from app.services.erp import EmpleadosService

router = APIRouter()

# --- ENDPOINTS EQUIPOS ---
@router.get("/equipos", response_model=List[EquipoMovilOut])
async def listar_equipos(db: AsyncSession = Depends(obtener_db)):
    try:
        result = await db.execute(select(EquipoMovil))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar equipos: {str(e)}")

@router.post("/equipos", response_model=EquipoMovilOut)
async def crear_equipo(equipo_in: EquipoMovilCreate, db: AsyncSession = Depends(obtener_db)):
    db_obj = EquipoMovil(**equipo_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# --- ENDPOINTS PERSONAS ---
@router.get("/personas", response_model=List[EmpleadoLineaOut])
async def listar_personas(db: AsyncSession = Depends(obtener_db)):
    try:
        result = await db.execute(select(EmpleadoLinea))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar personas: {str(e)}")

@router.post("/personas", response_model=EmpleadoLineaOut)
async def crear_persona(persona_in: EmpleadoLineaCreate, db: AsyncSession = Depends(obtener_db)):
    db_obj = EmpleadoLinea(**persona_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

# --- ENDPOINTS LINEAS ---
@router.get("/", response_model=List[LineaCorporativaOut])
async def listar_lineas(db: AsyncSession = Depends(obtener_db)):
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).order_by(LineaCorporativa.id.desc())
    try:
        result = await db.execute(query)
        return result.scalars().unique().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar líneas: {str(e)}")

@router.get("/alertas-empleados")
async def obtener_alertas_empleados(db_erp: Session = Depends(obtener_erp_db_opcional), db_local: AsyncSession = Depends(obtener_db)):
    if db_erp is None:
        return {"error": "ERP no disponible", "alertas": {}}
    
    try:
        result = await db_local.execute(select(EmpleadoLinea.documento))
        cedulas = [str(c) for c in result.scalars().all() if c]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar cédulas locales: {str(e)}")
    
    if not cedulas:
        return {"alertas": {}}

    alertas = {}
    query = text("""
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
        erp_result = db_erp.execute(query, {"cedulas": tuple(cedulas)}).fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en consulta ERP: {str(e)}")
    
    for row in erp_result:
        cedula = str(row.nrocedula).strip()
        estado = str(row.estado).strip()
        fecha_retiro = row.fecharetiro
        
        reasons = []
        if estado.lower() != 'activo':
            severity = "CRITICAL"
            reasons.append(f"Estado: {estado}")
        if fecha_retiro and str(fecha_retiro)[:10] != '1900-01-01':
            severity = "WARNING" if estado.lower() == 'activo' else "CRITICAL"
            reasons.append(f"Retiro: {fecha_retiro}")
            
        if reasons:
            alertas[cedula] = {
                "inactivo": estado.lower() != 'activo', 
                "clase": severity,
                "motivos": ", ".join(reasons),
                "fecha_retiro": str(fecha_retiro) if fecha_retiro else None
            }
            
    return {"alertas": alertas}

@router.post("/", response_model=LineaCorporativaOut, status_code=status.HTTP_201_CREATED)
async def crear_linea(linea_in: LineaCorporativaCreate, db: AsyncSession = Depends(obtener_db)):
    try:
        existing = await db.execute(select(LineaCorporativa).where(LineaCorporativa.linea == linea_in.linea))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="La linea corporativa ya se encuentra registrada.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al verificar duplicados: {str(e)}")
        
    db_linea = LineaCorporativa(**linea_in.model_dump())
    db.add(db_linea)
    await db.commit()
    await db.refresh(db_linea)
    
    # Reload with relationships
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).where(LineaCorporativa.id == db_linea.id)
    
    try:
        result = await db.execute(query)
        return result.scalar_one()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al recargar línea creada: {str(e)}")

@router.get("/reporte-co", response_model=List[ResumenCORow])
async def reporte_por_centro_costo(periodo: str, db: AsyncSession = Depends(obtener_db)):
    """
    Genera el resumen contable agrupado por Centro de Costo de forma estrictamente financiera (7 columnas).
    """
    try:
        stmt = select(
            FacturaLinea.centro_costo.label("co"),
            func.coalesce(func.sum(FacturaLinea.cargo_mes), 0.0).label("cargo_mes"),
            func.coalesce(func.sum(FacturaLinea.descuento_mes), 0.0).label("descuento_mes"),
            func.coalesce(func.sum(FacturaLinea.impoconsumo), 0.0).label("impoconsumo"),
            func.coalesce(func.sum(FacturaLinea.descuento_iva), 0.0).label("descuento_iva"),
            func.coalesce(func.sum(FacturaLinea.iva_19), 0.0).label("iva_19"),
            func.coalesce(func.sum(FacturaLinea.total), 0.0).label("total")
        ).where(FacturaLinea.periodo == periodo).group_by(FacturaLinea.centro_costo)
        
        result = await db.execute(stmt)
        # Convertir Decimal a float para evitar problemas de serialización JSON si los hay
        rows = []
        for row in result.all():
            data = dict(row._mapping)
            # Asegurar que los valores sean float (SQLAlchemy Numeric -> Decimal)
            for k, v in data.items():
                if k != "co" and v is not None:
                    data[k] = float(v)
            rows.append(ResumenCORow(**data))
        return rows
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error al generar reporte: {str(e)}\n{error_trace}"
        )

@router.get("/{id}", response_model=LineaCorporativaOut)
async def obtener_linea(id: int, db: AsyncSession = Depends(obtener_db)):
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).where(LineaCorporativa.id == id)
    
    try:
        result = await db.execute(query)
        linea = result.scalar_one_or_none()
        if not linea:
            raise HTTPException(status_code=404, detail="Linea no encontrada")
        return linea
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener línea: {str(e)}")

@router.put("/{id}", response_model=LineaCorporativaOut)
async def actualizar_linea(id: int, linea_in: LineaCorporativaUpdate, db: AsyncSession = Depends(obtener_db)):
    db_linea = await db.get(LineaCorporativa, id)
    if not db_linea:
        raise HTTPException(status_code=404, detail="Linea no encontrada")
        
    update_data = linea_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_linea, key, value)
        
    db_linea.updated_at = datetime.utcnow()
    db.add(db_linea)
    await db.commit()
    
    # Reload with relationships
    query = select(LineaCorporativa).options(
        joinedload(LineaCorporativa.equipo),
        joinedload(LineaCorporativa.asignado),
        joinedload(LineaCorporativa.responsable_cobro)
    ).where(LineaCorporativa.id == id)
    
    try:
        result = await db.execute(query)
        return result.scalar_one()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al recargar línea actualizada: {str(e)}")

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_linea(id: int, db: AsyncSession = Depends(obtener_db)):
    db_linea = await db.get(LineaCorporativa, id)
    if not db_linea:
        raise HTTPException(status_code=404, detail="Linea no encontrada")
    
    await db.commit()

# --- ENDPOINTS FACTURACIÓN Y REPORTES ---

@router.post("/importar-factura")
async def importar_factura(
    periodo: str, 
    archivo: UploadFile = File(...), 
    db: AsyncSession = Depends(obtener_db),
    db_erp: Session = Depends(obtener_erp_db_opcional)
):
    """
    Importa el Excel de Claro usando índices de columna fijos (MIN:3, DESC:5, VALOR:6, IMP:7, TOTAL:9).
    """
    content = await archivo.read()
    try:
        # Lectura sin cabeceras para usar índices
        df = pl.read_excel(io.BytesIO(content), read_options={"has_header": False})
        
        # 1. Encontrar el inicio de los datos (donde Columna 3 es 'MIN')
        # Buscamos en la columna index 3 (D)
        base_col = df.columns[3]
        header_row = -1
        for i, val in enumerate(df[base_col]):
            if str(val).strip().upper() == "MIN":
                header_row = i
                break
        
        if header_row == -1:
            raise HTTPException(status_code=400, detail="No se encontró la celda 'MIN' en la columna D (índice 3).")

        # 2. Rebanar y limpiar
        data = df.slice(header_row + 1)
        
        # Mapeo por índices confirmados
        cols = df.columns
        data = data.select([
            pl.col(cols[3]).alias("min"),
            pl.col(cols[5]).alias("descripcion"),
            pl.col(cols[6]).cast(pl.Float64, strict=False).fill_null(0).alias("valor"),
            pl.col(cols[7]).cast(pl.Float64, strict=False).fill_null(0).alias("impuestos"),
            pl.col(cols[9]).cast(pl.Float64, strict=False).fill_null(0).alias("total_fila")
        ])

        # 3. Filtrar MINs válidos
        data = data.filter(pl.col("min").is_not_null())
        
        # 4. Clasificación y Agregación
        c_fijo_pat = "Cargo Fijo|Datos|Claro Sync"
        especiales_pat = "Roaming|NBA|Larga Distancia|Especiales"

        consumos = data.group_by("min").agg([
            pl.col("valor").filter(pl.col("descripcion").cast(pl.Utf8).str.contains(c_fijo_pat)).sum().alias("cargo_mes"),
            pl.col("valor").filter(pl.col("descripcion").cast(pl.Utf8).str.contains(especiales_pat)).sum().alias("especiales"),
            pl.col("impuestos").sum().alias("iva_19"),
            pl.col("total_fila").sum().alias("total")
        ])

        # 5. Procesar e insertar
        registros = 0
        for row in consumos.iter_rows(named=True):
            nro_linea = str(row["min"]).strip()
            
            stmt = select(LineaCorporativa).options(joinedload(LineaCorporativa.asignado)).where(LineaCorporativa.linea == nro_linea)
            db_linea = (await db.execute(stmt)).unique().scalar_one_or_none()
            
            if not db_linea:
                # Auto-crear línea si no existe en la maestra
                db_linea = LineaCorporativa(
                    linea=nro_linea,
                    empresa="CLARO",
                    estatus="POR_GESTION",
                    estado_asignacion="NUEVA_EN_FACTURA",
                    observaciones="Detectada automáticamente en factura"
                )
                db.add(db_linea)
                await db.flush()
                # Recargar para asegurar consistencia
                stmt_new = select(LineaCorporativa).options(joinedload(LineaCorporativa.asignado)).where(LineaCorporativa.id == db_linea.id)
                db_linea = (await db.execute(stmt_new)).unique().scalar_one()

            # Lógica de dispersión proporcional
            p_e_base = (row["cargo_mes"] * db_linea.cobro_fijo_coef) + (row["especiales"] * db_linea.cobro_especiales_coef)
            divisor = (row["cargo_mes"] + row["especiales"]) or 1
            p_e_iva = row["iva_19"] * (p_e_base / divisor)
            
            pago_e = p_e_base + p_e_iva
            pago_r = row["total"] - pago_e

            # Lógica de Centro de Costo: Priorizar ERP, luego Local, luego GENERAL
            centro_costo_final = 'GENERAL'
            if db_linea.documento_asignado and db_erp:
                try:
                    erp_data = await EmpleadosService.obtener_empleado_por_cedula(db_erp, db_linea.documento_asignado)
                    if erp_data and erp_data.get("centrocosto"):
                        centro_costo_final = erp_data["centrocosto"]
                    else:
                        centro_costo_final = getattr(db_linea.asignado, 'centro_costo', 'GENERAL') or 'GENERAL'
                except Exception:
                    centro_costo_final = getattr(db_linea.asignado, 'centro_costo', 'GENERAL') or 'GENERAL'
            elif db_linea.asignado:
                centro_costo_final = db_linea.asignado.centro_costo or 'GENERAL'

            # Si es una línea nueva o sin asignar, marcar C.O como ALERTA
            if centro_costo_final == 'GENERAL' and (not db_linea.documento_asignado or db_linea.estado_asignacion == "NUEVA_EN_FACTURA"):
                centro_costo_final = 'SIN_ASIGNAR'

            factura = FacturaLinea(
                linea_id=db_linea.id,
                periodo=periodo,
                documento_asignado=db_linea.documento_asignado or "SIN_ASIGNAR",
                centro_costo=centro_costo_final,
                cargo_mes=row["cargo_mes"],
                descuento_mes=0.0,
                impoconsumo=0.0,
                descuento_iva=0.0,
                iva_19=row["iva_19"],
                total=row["total"],
                pago_empleado=pago_e,
                pago_refridcol=pago_r
            )
            db.add(factura)
            registros += 1

        await db.commit()
        return {
            "mensaje": "Procesamiento completado exitosamente",
            "periodo": periodo,
            "registros_procesados": registros
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en procesamiento: {str(e)}")

@router.get("/alertas-factura/{periodo}")
async def obtener_alertas_factura(periodo: str, db: AsyncSession = Depends(obtener_db)):
    """
    Retorna las líneas que se importaron pero no tienen asignación (C.O SIN_ASIGNAR).
    """
    try:
        stmt = select(FacturaLinea, LineaCorporativa.linea).join(
            LineaCorporativa, FacturaLinea.linea_id == LineaCorporativa.id
        ).where(
            FacturaLinea.periodo == periodo,
            FacturaLinea.centro_costo == 'SIN_ASIGNAR'
        )
        result = await db.execute(stmt)
        alerts = []
        for f_line, nro in result.all():
            alerts.append({
                "id": f_line.id,
                "linea_id": f_line.linea_id,
                "numero": nro,
                "total": float(f_line.total)
            })
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
