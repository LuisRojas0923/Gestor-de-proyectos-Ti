from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel import Session
from ....database import obtener_db, obtener_erp_db_opcional
from ....services.novedades_nomina.control_descuentos_extractor import extraer_control_descuentos
from ....services.novedades_nomina.celulares_extractor import extraer_celulares
from ....services.novedades_nomina.retenciones_extractor import extraer_retenciones
from ....services.novedades_nomina.embargos_extractor import extraer_embargos
from ....services.erp.empleados_service import EmpleadosService
from ....services.novedades_nomina.nomina_service import NominaService
from ....services.novedades_nomina.nomina_manual_service import NominaManualService

router = APIRouter(tags=["Descuentos"])

from datetime import date, timedelta
from pydantic import BaseModel
from ....models.novedades_nomina.nomina import ControlDescuentoActivo, NominaRegistroNormalizado, NominaArchivo
from sqlalchemy import select, delete
import math

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

def calcular_fecha_finalizacion(inicio: date, cuotas: int) -> date:
    """Calcula la fecha de fin iterando cuotas por quincenas (días 15 y 30 o fin de mes en febrero)."""
    if cuotas <= 1:
        return inicio
    
    current = inicio
    for _ in range(cuotas - 1):
        if current.day == 15:
            # Ir al final del mes
            next_month = current.month + 1 if current.month < 12 else 1
            next_year = current.year if current.month < 12 else current.year + 1
            
            # Chequear si el mes actual es febrero u otro con 30/31 días
            try:
                # Intentar el día 30
                current = current.replace(day=30)
            except ValueError:
                # Si falla (ej. Febrero), buscar el último día del mes restando 1 al primer día del sgte mes
                first_of_next = date(next_year, next_month, 1)
                current = first_of_next - timedelta(days=1)
        else:
            # Si era 28, 29, 30 o 31, ir al 15 del siguiente mes
            next_month = current.month + 1 if current.month < 12 else 1
            next_year = current.year if current.month < 12 else current.year + 1
            current = date(next_year, next_month, 15)
    return current

def calcular_saldo_y_estado(registro: ControlDescuentoActivo, hoy: date = None) -> tuple[float, str]:
    if hoy is None:
        hoy = date.today()
    
    # Asegurar que fi sea un objeto date
    fi = registro.fecha_inicio
    if hasattr(fi, "date"):
        fi = fi.date()
    
    if hoy < fi:
        return float(registro.valor_descuento), "PENDIENTE"
        
    # Contar cuántas cuotas han pasado incluyendo el día exacto de la cuota
    cuotas_pasadas = 0
    current = fi
    
    while current <= hoy and cuotas_pasadas < registro.n_cuotas:
        cuotas_pasadas += 1
        
        # Siguiente cuota
        if current.day == 15:
            try:
                # Intentar el día 30 del mismo mes
                current = current.replace(day=30)
            except ValueError:
                # Si falla (febrero), ir al último día del mes
                next_m = current.month + 1 if current.month < 12 else 1
                next_y = current.year if current.month < 12 else current.year + 1
                first_next = date(next_y, next_m, 1)
                current = first_next - timedelta(days=1)
        else:
            # Si era fin de mes, ir al 15 del siguiente
            next_m = current.month + 1 if current.month < 12 else 1
            next_y = current.year if current.month < 12 else current.year + 1
            current = date(next_y, next_m, 15)

    saldo = registro.valor_descuento - (cuotas_pasadas * registro.valor_cuota)
    if saldo <= 0.01: # por precision flotante
        saldo = 0.0
        
    estado = "CERRADO" if saldo == 0.0 else "PENDIENTE"
    return float(saldo), estado

# CONTROL DE DESCUENTOS - MANUAL
@router.get("/control_descuentos/empleado/{cedula}")
async def buscar_empleado_control(cedula: str, db_erp: Session = Depends(obtener_erp_db_opcional)):
    if not db_erp:
        raise HTTPException(status_code=400, detail="Base de datos ERP no disponible")
    
    try:
        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
        if not empleado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        return empleado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando empleado: {str(e)}")

@router.post("/control_descuentos/registro")
async def registrar_control_descuento(
    req: RegistroDescuentoRequest,
    session: Session = Depends(obtener_db)
):
    try:
        print(f"DEBUG: Intentando registrar descuento para {req.cedula} - {req.nombre}")
        fecha_fin = calcular_fecha_finalizacion(req.fecha_inicio, req.n_cuotas)
        valor_cuota = round(req.valor_descuento / req.n_cuotas, 2)
        
        nuevo = ControlDescuentoActivo(
            cedula=req.cedula,
            nombre=req.nombre.upper(),
            empresa=req.empresa.upper(),
            cargo=req.cargo.upper() if req.cargo else None,
            area=req.area.upper() if req.area else None,
            concepto=req.concepto.upper(),
            valor_descuento=req.valor_descuento,
            n_cuotas=req.n_cuotas,
            valor_cuota=valor_cuota,
            concepto_nomina="111",
            fecha_inicio=req.fecha_inicio,
            fecha_finalizacion=fecha_fin,
            observaciones=req.observaciones
        )
        session.add(nuevo)
        await session.commit()
        await session.refresh(nuevo)
        print(f"DEBUG: Registro exitoso ID={nuevo.id}")
        return {"mensaje": "Registro guardado exitosamente", "id": nuevo.id}
    except Exception as e:
        import traceback
        print(f"ERROR CRÍTICO AL REGISTRAR: {str(e)}")
        print(traceback.format_exc())
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar: {str(e)}")

@router.put("/control_descuentos/registro/{id}")
async def actualizar_control_descuento(
    id: int,
    req: RegistroDescuentoRequest,
    session: Session = Depends(obtener_db)
):
    try:
        registro = await session.get(ControlDescuentoActivo, id)
        if not registro:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        
        fecha_fin = calcular_fecha_finalizacion(req.fecha_inicio, req.n_cuotas)
        valor_cuota = round(req.valor_descuento / req.n_cuotas, 2)
        
        registro.cedula = req.cedula
        registro.nombre = req.nombre.upper()
        registro.empresa = req.empresa.upper()
        registro.cargo = req.cargo.upper() if req.cargo else None
        registro.area = req.area.upper() if req.area else None
        registro.concepto = req.concepto.upper()
        registro.valor_descuento = req.valor_descuento
        registro.n_cuotas = req.n_cuotas
        registro.valor_cuota = valor_cuota
        registro.fecha_inicio = req.fecha_inicio
        registro.fecha_finalizacion = fecha_fin
        registro.observaciones = req.observaciones
        
        session.add(registro)
        await session.commit()
        await session.refresh(registro)
        return {"mensaje": "Registro actualizado exitosamente", "id": registro.id}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar: {str(e)}")

@router.delete("/control_descuentos/registro/{id}")
async def eliminar_control_descuento(
    id: int,
    session: Session = Depends(obtener_db)
):
    try:
        registro = await session.get(ControlDescuentoActivo, id)
        if not registro:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        
        await session.delete(registro)
        await session.commit()
        return {"mensaje": "Registro eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")

@router.get("/control_descuentos/activos")
async def obtener_activos(session: Session = Depends(obtener_db)):
    try:
        result = await session.execute(select(ControlDescuentoActivo).order_by(ControlDescuentoActivo.id.desc()))
        registros = result.scalars().all()
        # Calcular salario al vuelo
        hoy = date.today()
        resultado = []
        for r in registros:
            saldo, estado = calcular_saldo_y_estado(r, hoy)
            row_dict = r.model_dump()
            row_dict["saldo"] = saldo
            row_dict["estado"] = estado
            
            # Formateo robusto de fechas
            fi = r.fecha_inicio
            ff = r.fecha_finalizacion
            row_dict["fecha_inicio"] = fi.strftime("%Y-%m-%d") if hasattr(fi, "strftime") else str(fi)
            row_dict["fecha_finalizacion"] = ff.strftime("%Y-%m-%d") if hasattr(ff, "strftime") else str(ff)
            
            resultado.append(row_dict)
        return {"items": resultado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando registros: {str(e)}")

# CELULARES
@router.get("/celulares/datos")
async def datos_celulares(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "CELULARES", mes, anio)

@router.post("/celulares/preview")
async def preview_celulares(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "DESCUENTOS", "CELULARES", 
            extraer_celulares, "xlsx", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Celulares: {str(e)}")

# RETENCIONES
@router.get("/retenciones/datos")
async def datos_retenciones(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "RETENCIONES", mes, anio)

@router.post("/retenciones/preview")
async def preview_retenciones(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "DESCUENTOS", "RETENCIONES", 
            extraer_retenciones, "xlsx", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Retenciones: {str(e)}")

# EMBARGOS
@router.get("/embargos/datos")
async def datos_embargos(mes: int, anio: int, session: Session = Depends(obtener_db)):
    return await NominaService.obtener_datos_periodo(session, "EMBARGOS", mes, anio)

@router.post("/embargos/preview")
async def preview_embargos(
    mes: int = Form(...),
    anio: int = Form(...),
    files: List[UploadFile] = File(...),
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional),
):
    try:
        return await NominaService.procesar_flujo(
            session, db_erp, files, "DESCUENTOS", "EMBARGOS", 
            extraer_embargos, "xlsx", mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Embargos: {str(e)}")

# EMBARGOS - PROCESAMIENTO MANUAL
@router.post("/embargos/procesar-manual")
async def procesar_manual_embargos(
    payload: Dict = None,
    session: Session = Depends(obtener_db),
    db_erp = Depends(obtener_erp_db_opcional)
):
    if not payload:
        raise HTTPException(status_code=400, detail="Payload no proporcionado")
    
    mes = payload.get("mes")
    anio = payload.get("anio")
    data = payload.get("data")
    
    if not mes or not anio or data is None:
        raise HTTPException(status_code=400, detail="Faltan parámetros: mes, anio o data")
        
    try:
        return await NominaManualService.procesar_manual_embargos(
            session, db_erp, data, mes, anio
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en procesamiento manual: {str(e)}")

@router.get("/embargos/empleado/{cedula}")
async def buscar_empleado_embargos(
    cedula: str, 
    db_erp = Depends(obtener_erp_db_opcional)
):
    if not db_erp:
        raise HTTPException(status_code=400, detail="Base de datos ERP no disponible")
    
    try:
        empleado = await EmpleadosService.obtener_empleado_por_cedula(db_erp, cedula, solo_activos=False)
        if not empleado:
            raise HTTPException(status_code=404, detail="Empleado no encontrado")
        return empleado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando empleado: {str(e)}")

# ==========================================
# GESTIÓN DE CONCEPTOS DE CONTROL DE DESCUENTOS
# ==========================================
from ....models.novedades_nomina.nomina import ControlDescuentoConcepto

class ConceptoRequest(BaseModel):
    nombre: str
    concepto_nomina: str = "111"
    activo: bool = True

@router.get("/control_descuentos/conceptos")
async def listar_conceptos(session: Session = Depends(obtener_db)):
    try:
        statement = select(ControlDescuentoConcepto).order_by(ControlDescuentoConcepto.nombre)
        resultados = await session.execute(statement)
        return resultados.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listando conceptos: {str(e)}")

@router.post("/control_descuentos/conceptos")
async def crear_concepto(req: ConceptoRequest, session: Session = Depends(obtener_db)):
    try:
        # Validar si existe
        statement = select(ControlDescuentoConcepto).where(ControlDescuentoConcepto.nombre == req.nombre.strip().upper())
        existe = await session.execute(statement)
        if existe.scalars().first():
            raise HTTPException(status_code=400, detail="El nombre del concepto ya existe.")
            
        nuevo = ControlDescuentoConcepto(
            nombre=req.nombre.strip().upper(),
            concepto_nomina=req.concepto_nomina.strip(),
            activo=req.activo
        )
        session.add(nuevo)
        await session.commit()
        await session.refresh(nuevo)
        return nuevo
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando concepto: {str(e)}")

@router.put("/control_descuentos/conceptos/{id}")
async def actualizar_concepto(id: int, req: ConceptoRequest, session: Session = Depends(obtener_db)):
    try:
        concepto = await session.get(ControlDescuentoConcepto, id)
        if not concepto:
            raise HTTPException(status_code=404, detail="Concepto no encontrado")
            
        # Verificar duplicidad si cambió el nombre
        nuevo_nombre = req.nombre.strip().upper()
        if concepto.nombre != nuevo_nombre:
            statement = select(ControlDescuentoConcepto).where(ControlDescuentoConcepto.nombre == nuevo_nombre)
            existe = await session.execute(statement)
            if existe.scalars().first():
                raise HTTPException(status_code=400, detail="Ya existe otro concepto con este nombre.")
                
        concepto.nombre = nuevo_nombre
        concepto.concepto_nomina = req.concepto_nomina.strip()
        concepto.activo = req.activo
        session.add(concepto)
        await session.commit()
        await session.refresh(concepto)
        return concepto
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando concepto: {str(e)}")

@router.delete("/control_descuentos/conceptos/{id}")
async def eliminar_concepto(id: int, session: Session = Depends(obtener_db)):
    try:
        concepto = await session.get(ControlDescuentoConcepto, id)
        if not concepto:
            raise HTTPException(status_code=404, detail="Concepto no encontrado")
            
        await session.delete(concepto)
        await session.commit()
        return {"ok": True, "mensaje": "Concepto eliminado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando concepto: {str(e)}")


# ==========================================
# TABLA QUINCENAL DE CONTROL DE DESCUENTOS
# ==========================================

@router.get("/control_descuentos/tabla-quincenal")
async def obtener_tabla_quincenal(
    anio: int,
    mes: int,
    quincena: int,  # 1 = Q1 (día 15), 2 = Q2 (fin de mes)
    session: Session = Depends(obtener_db)
):
    """
    Retorna los registros de control de descuentos que tienen una cuota programada
    en el año/mes/quincena seleccionados.
    """
    if quincena not in (1, 2):
        raise HTTPException(status_code=400, detail="quincena debe ser 1 o 2")

    try:
        # Traer todos los registros que NO hayan terminado antes del periodo solicitado
        # (Filtro básico para no procesar miles de registros antiguos si los hubiera)
        fecha_limite_inf = date(anio, mes, 1)
        result = await session.execute(
            select(ControlDescuentoActivo)
            .where(ControlDescuentoActivo.fecha_finalizacion >= fecha_limite_inf)
            .order_by(ControlDescuentoActivo.nombre)
        )
        registros = result.scalars().all()

        label_quincena = "Q1" if quincena == 1 else "Q2"
        filas = []
        indice = 1
        
        # Fecha objetivo para comparar
        # Si es Q1, buscamos el día 15. Si es Q2, buscamos el día 30 (o fin de mes).
        target_day = 15 if quincena == 1 else 30 
        # Nota: Usamos 30 como referencia para Q2, pero la lógica de proyección maneja fines de mes.

        for r in registros:
            # Proyectar todas las fechas de pago del registro
            fechas_pago = []
            curr = r.fecha_inicio
            if hasattr(curr, "date"): curr = curr.date()
            
            for _ in range(r.n_cuotas):
                fechas_pago.append(curr)
                # Calcular siguiente fecha de pago (ciclo 15/30)
                if curr.day == 15:
                    try:
                        curr = curr.replace(day=30)
                    except ValueError:
                        # Febrero u otros casos especiales de fin de mes
                        next_m = curr.month + 1 if curr.month < 12 else 1
                        next_y = curr.year if curr.month < 12 else curr.year + 1
                        curr = date(next_y, next_m, 1) - timedelta(days=1)
                else:
                    next_m = curr.month + 1 if curr.month < 12 else 1
                    next_y = curr.year if curr.month < 12 else curr.year + 1
                    curr = date(next_y, next_m, 15)

            # Verificar si alguna fecha de pago coincide con el anio/mes/quincena solicitado
            pertenece = False
            for fp in fechas_pago:
                if fp.year == anio and fp.month == mes:
                    if quincena == 1 and fp.day == 15:
                        pertenece = True
                        break
                    if quincena == 2 and fp.day >= 28: # Día 28, 29, 30 o 31 es Q2
                        pertenece = True
                        break
            
            if pertenece:
                filas.append({
                    "indice": indice,
                    "cedula": r.cedula,
                    "nombre": r.nombre,
                    "empresa": r.empresa,
                    "valor": r.valor_cuota,
                    "concepto": f"CONTROL DE DESCUENTO {label_quincena}",
                })
                indice += 1

        total_valor = sum(f["valor"] for f in filas)
        por_empresa: dict = {}
        for f in filas:
            emp = f["empresa"] or "N/A"
            por_empresa[emp] = por_empresa.get(emp, 0) + f["valor"]

        return {
            "filas": filas,
            "summary": {
                "total_registros": len(filas),
                "total_valor": total_valor,
                "por_empresa": por_empresa,
                "anio": anio,
                "mes": mes,
                "quincena": label_quincena,
            }
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generando tabla quincenal: {str(e)}")
