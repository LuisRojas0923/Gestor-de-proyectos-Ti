from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from typing import List
import logging

from app.database import obtener_db, obtener_erp_db_opcional
from app.models.linea_corporativa import LineaCorporativa
from app.models.linea_corporativa.factura_model import FacturaLinea
from app.models.linea_corporativa.factura_detalle_model import FacturaLineaDetalle
from .schemas import (
    LineaCorporativaCreate, LineaCorporativaOut, LineaCorporativaUpdate,
    ResumenCORow, FacturaDetalleRow
)
from datetime import datetime
import polars as pl
import io
import re
from fastapi import UploadFile, File
from sqlalchemy import func
from app.services.erp import EmpleadosService
from app.services.auditoria.snapshots import (
    asignar_actualizacion_segura,
    asignar_creacion_segura,
    asignar_eliminacion_segura,
    asignar_evento_segura,
    modelo_a_dict_auditoria,
)
from app.services.lineas_corporativas.maestros_service import (
    ConflictoIntegridadLineas,
    ErrorPersistenciaLineas,
    LineasCorporativasMaestrosService,
    RecursoEnUsoLineas,
    RecursoNoEncontradoLineas,
)
from app.services.lineas_corporativas.facturas_service import (
    normalizar_periodo_factura,
    preparar_reimportacion_factura,
)
from app.models.auth.usuario import Usuario
from .dependencies import (
    requiere_administrador_lineas_corporativas,
    requiere_permiso_lineas_corporativas,
)
from .maestros_router import router as maestros_router
from .alertas_router import router as alertas_router
from .archivos import leer_excel_seguro
from .router_migracion import router as router_migracion

router = APIRouter(dependencies=[Depends(requiere_permiso_lineas_corporativas)])
router.include_router(maestros_router)
router.include_router(alertas_router)
logger = logging.getLogger(__name__)


def _error_integridad_linea(exc: IntegrityError) -> HTTPException:
    detalle = str(exc.orig) if exc.orig else str(exc)
    if "documento_asignado" in detalle:
        return HTTPException(status_code=400, detail="La cédula asignada no existe")
    if "documento_cobro" in detalle:
        return HTTPException(status_code=400, detail="La cédula de cobro no existe")
    if "equipo_id" in detalle:
        return HTTPException(status_code=400, detail="El equipo seleccionado no existe")
    return HTTPException(status_code=400, detail="Error de integridad de datos")

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
    except Exception as exc:
        logger.error("Error al listar líneas corporativas")
        raise HTTPException(status_code=500, detail="Error al listar líneas") from exc

@router.post("/", response_model=LineaCorporativaOut, status_code=status.HTTP_201_CREATED)
async def crear_linea(
    linea_in: LineaCorporativaCreate,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        existing = await db.execute(select(LineaCorporativa).where(LineaCorporativa.linea == linea_in.linea))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="La linea corporativa ya se encuentra registrada.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error al verificar línea duplicada")
        raise HTTPException(status_code=500, detail="Error al verificar duplicados") from exc
        
    db_linea = LineaCorporativa(**linea_in.model_dump())
    db.add(db_linea)
    try:
        await db.flush()
        await db.refresh(db_linea)
        query = select(LineaCorporativa).options(
            joinedload(LineaCorporativa.equipo),
            joinedload(LineaCorporativa.asignado),
            joinedload(LineaCorporativa.responsable_cobro)
        ).where(LineaCorporativa.id == db_linea.id)
        result = await db.execute(query)
        linea = result.scalar_one()
        await db.commit()
        asignar_evento_segura(
            request,
            modulo="lineas_corporativas",
            accion="crear",
            entidad_tipo="linea_corporativa",
            entidad_id=str(linea.id),
        )
        asignar_creacion_segura(request, linea)
        return linea
    except IntegrityError as exc:
        await db.rollback()
        raise _error_integridad_linea(exc) from exc
    except Exception as exc:
        await db.rollback()
        logger.error("Error al crear línea corporativa")
        raise HTTPException(status_code=500, detail="Error al crear línea") from exc

@router.get("/reporte-co", response_model=List[ResumenCORow])
async def reporte_por_centro_costo(periodo: str, db: AsyncSession = Depends(obtener_db)):
    """
    Genera el resumen contable agrupado por Centro de Costo de forma estrictamente financiera (7 columnas).
    """
    try:
        from sqlalchemy import case
        
        # Expresión para normalizar el C.O: GENERAL -> 9910-99
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
            func.coalesce(func.sum(FacturaLinea.total), 0.0).label("total")
        ).where(FacturaLinea.periodo == periodo).group_by(co_normalized)
        
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
    except Exception as exc:
        logger.error("Error al generar reporte de líneas corporativas")
        raise HTTPException(status_code=500, detail="Error al generar reporte") from exc

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
    except Exception as exc:
        logger.error("Error al obtener línea corporativa")
        raise HTTPException(status_code=500, detail="Error al obtener línea") from exc

@router.put("/{id}", response_model=LineaCorporativaOut)
async def actualizar_linea(
    id: int,
    linea_in: LineaCorporativaUpdate,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    db_linea = await db.get(LineaCorporativa, id)
    if not db_linea:
        raise HTTPException(status_code=404, detail="Linea no encontrada")
        
    datos_anteriores = modelo_a_dict_auditoria(db_linea)
    update_data = linea_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_linea, key, value)
        
    db_linea.updated_at = datetime.utcnow()
    db.add(db_linea)
    
    try:
        await db.flush()
        query = select(LineaCorporativa).options(
            joinedload(LineaCorporativa.equipo),
            joinedload(LineaCorporativa.asignado),
            joinedload(LineaCorporativa.responsable_cobro)
        ).where(LineaCorporativa.id == id)
        result = await db.execute(query)
        linea = result.scalar_one()
        await db.commit()
        asignar_evento_segura(
            request,
            modulo="lineas_corporativas",
            accion="actualizar",
            entidad_tipo="linea_corporativa",
            entidad_id=str(id),
        )
        asignar_actualizacion_segura(request, datos_anteriores, linea)
        return linea
    except IntegrityError as exc:
        await db.rollback()
        raise _error_integridad_linea(exc) from exc
    except Exception as exc:
        await db.rollback()
        logger.error("Error al actualizar línea corporativa")
        raise HTTPException(status_code=500, detail="Error al actualizar línea") from exc

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_linea(
    id: int,
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    try:
        antes = await LineasCorporativasMaestrosService.eliminar_linea(db, id)
    except RecursoNoEncontradoLineas as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RecursoEnUsoLineas as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ConflictoIntegridadLineas as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ErrorPersistenciaLineas as exc:
        raise HTTPException(status_code=500, detail="Error interno al eliminar la línea") from exc
    asignar_evento_segura(
        request,
        modulo="lineas_corporativas",
        accion="eliminar",
        entidad_tipo="linea_corporativa",
        entidad_id=str(id),
    )
    asignar_eliminacion_segura(request, antes)

# --- ENDPOINTS FACTURACIÓN Y REPORTES ---

@router.post("/importar-factura")
async def importar_factura(
    periodo: str,
    request: Request,
    archivo: UploadFile = File(...), 
    db: AsyncSession = Depends(obtener_db),
    db_erp: Session = Depends(obtener_erp_db_opcional),
    _: Usuario = Depends(requiere_administrador_lineas_corporativas),
):
    """
    Importa el Excel de Claro usando índices de columna fijos (MIN:3, DESC:5, VALOR:6, IMP:7, TOTAL:9).
    """
    try:
        periodo = normalizar_periodo_factura(periodo)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    content = await leer_excel_seguro(archivo)
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

        # 3. Filtrar MINs válidos (excluir encabezados y filas no numéricas)
        data = data.filter(
            pl.col("min").is_not_null() &
            pl.col("min").cast(pl.Utf8).str.contains(r"^\d{7,}")
        )
        
        # 3.5 Extraer también NOMBRE (columna index 4) para el detalle crudo
        data_con_nombre = df.slice(header_row + 1).select([
            pl.col(cols[3]).alias("min"),
            pl.col(cols[4]).cast(pl.Utf8).fill_null("").alias("nombre"),
            pl.col(cols[5]).alias("descripcion"),
            pl.col(cols[6]).cast(pl.Float64, strict=False).fill_null(0).alias("valor"),
            pl.col(cols[7]).cast(pl.Float64, strict=False).fill_null(0).alias("iva"),
        ]).filter(
            pl.col("min").is_not_null() &
            pl.col("min").cast(pl.Utf8).str.contains(r"^\d{7,}")
        )

        # 4. Clasificación y Almacenamiento de detalle crudo
        c_fijo_pat = "Cargo Fijo|Datos|Claro Sync"
        especiales_pat = "Roaming|NBA|Larga Distancia|Especiales"

        # El lock evita duplicados si dos importaciones del mismo período compiten.
        periodo = await preparar_reimportacion_factura(db, periodo)

        # Insertar filas crudas con clasificación
        for raw_row in data_con_nombre.iter_rows(named=True):
            desc_str = str(raw_row["descripcion"] or "")
            if re.search(c_fijo_pat, desc_str, re.IGNORECASE):
                criterio = "CARGO FIJO"
            elif re.search(especiales_pat, desc_str, re.IGNORECASE):
                criterio = "ESPECIALES"
            else:
                criterio = "OTROS"

            detalle = FacturaLineaDetalle(
                periodo=periodo,
                min=str(raw_row["min"]).strip(),
                nombre=str(raw_row["nombre"]).strip(),
                descripcion=desc_str.strip(),
                valor=float(raw_row["valor"]),
                iva=float(raw_row["iva"]),
                criterio=criterio
            )
            db.add(detalle)

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
 
            # Lógica de Centro de Costo: Priorizar ERP, luego Local, luego 9910-99
            centro_costo_final = '9910-99'
            if db_linea.documento_asignado and db_erp:
                try:
                    erp_data = await EmpleadosService.obtener_empleado_por_cedula(db_erp, db_linea.documento_asignado)
                    if erp_data and erp_data.get("centrocosto") and erp_data["centrocosto"].strip().upper() != 'GENERAL':
                        centro_costo_final = erp_data["centrocosto"]
                    else:
                        centro_costo_local = getattr(db_linea.asignado, 'centro_costo', '9910-99')
                        centro_costo_final = centro_costo_local if centro_costo_local and centro_costo_local.upper() != 'GENERAL' else '9910-99'
                except Exception:
                    centro_costo_local = getattr(db_linea.asignado, 'centro_costo', '9910-99')
                    centro_costo_final = centro_costo_local if centro_costo_local and centro_costo_local.upper() != 'GENERAL' else '9910-99'
            elif db_linea.asignado:
                centro_costo_local = db_linea.asignado.centro_costo
                centro_costo_final = centro_costo_local if centro_costo_local and centro_costo_local.upper() != 'GENERAL' else '9910-99'

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
        asignar_evento_segura(request, modulo="lineas_corporativas", accion="importar", entidad_tipo="factura_lineas", entidad_id=periodo, metadatos={"periodo": periodo, "registros": registros})
        return {
            "mensaje": "Procesamiento completado exitosamente",
            "periodo": periodo,
            "registros_procesados": registros
        }
    except Exception as exc:
        await db.rollback()
        logger.error("Error al importar factura de líneas corporativas")
        raise HTTPException(status_code=500, detail="Error al procesar la factura") from exc

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
            FacturaLinea.documento_asignado == 'SIN_ASIGNAR'
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
    except Exception as exc:
        logger.error("Error al consultar alertas de factura")
        raise HTTPException(status_code=500, detail="Error al consultar alertas") from exc

@router.get("/detalle-factura/{periodo}", response_model=List[FacturaDetalleRow])
async def obtener_detalle_factura(periodo: str, db: AsyncSession = Depends(obtener_db)):
    """
    Retorna las filas crudas importadas del Excel de Claro para un periodo dado.
    Cada fila contiene: MIN, NOMBRE, DESCRIPCION, VALOR, IVA, CICLO, CRITERIO.
    """
    try:
        stmt = select(FacturaLineaDetalle).where(
            FacturaLineaDetalle.periodo == periodo
        ).order_by(FacturaLineaDetalle.min, FacturaLineaDetalle.criterio)
        
        result = await db.execute(stmt)
        rows = result.scalars().all()
        
        return [
            FacturaDetalleRow(
                id=r.id,
                min=r.min,
                nombre=r.nombre,
                descripcion=r.descripcion,
                valor=float(r.valor),
                iva=float(r.iva),
                ciclo=r.periodo,
                criterio=r.criterio
            )
            for r in rows
        ]
    except Exception as exc:
        logger.error("Error al consultar detalle de factura")
        raise HTTPException(status_code=500, detail="Error al consultar detalle") from exc

# --- INCLUSIÓN DE SUB-ROUTERS ---
router.include_router(router_migracion)
