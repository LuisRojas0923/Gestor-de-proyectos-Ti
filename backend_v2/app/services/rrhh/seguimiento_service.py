"""
Servicio para el seguimiento de Requisiciones de Personal (RP) y Candidatos por Gestión Humana.
"""
import logging
from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.rrhh.seguimiento import EmpresaTemporal, RequisicionTemporal, CandidatoRequisicion
from app.models.rrhh.solicitud_personal import RequisicionPersonal, EstadoRP

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Gestión de Empresas Temporales
# ──────────────────────────────────────────────
async def get_temporales(db: AsyncSession) -> List[EmpresaTemporal]:
    """Retorna todas las empresas temporales registradas."""
    result = await db.execute(select(EmpresaTemporal).order_by(EmpresaTemporal.nombre))
    return result.scalars().all()


async def create_temporal(db: AsyncSession, nombre: str) -> EmpresaTemporal:
    """Crea una nueva empresa temporal, validando que el nombre sea único."""
    nombre_clean = nombre.strip()
    nombre_upper = nombre_clean.upper()
    
    result = await db.execute(
        select(EmpresaTemporal).where(func.upper(EmpresaTemporal.nombre) == nombre_upper)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ValueError(f"Ya existe una empresa temporal llamada '{nombre_clean}'")
        
    emp = EmpresaTemporal(nombre=nombre_clean, activo=True)
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


async def update_temporal(db: AsyncSession, id: int, nombre: str, activo: bool) -> EmpresaTemporal:
    """Actualiza una empresa temporal existente."""
    emp = await db.get(EmpresaTemporal, id)
    if not emp:
        raise ValueError("Empresa temporal no encontrada")
        
    nombre_clean = nombre.strip()
    nombre_upper = nombre_clean.upper()
    
    result = await db.execute(
        select(EmpresaTemporal)
        .where(func.upper(EmpresaTemporal.nombre) == nombre_upper, EmpresaTemporal.id != id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ValueError(f"Ya existe otra empresa temporal llamada '{nombre_clean}'")
        
    emp.nombre = nombre_clean
    emp.activo = activo
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


async def delete_temporal(db: AsyncSession, id: int) -> None:
    """Elimina una empresa temporal si no tiene relaciones asociadas."""
    emp = await db.get(EmpresaTemporal, id)
    if not emp:
        raise ValueError("Empresa temporal no encontrada")
        
    # Verificar si tiene requisiciones asociadas
    res_req = await db.execute(
        select(func.count()).select_from(RequisicionTemporal).where(RequisicionTemporal.temporal_id == id)
    )
    has_req = res_req.scalar() or 0
    
    # Verificar si tiene candidatos asociados
    res_cand = await db.execute(
        select(func.count()).select_from(CandidatoRequisicion).where(CandidatoRequisicion.temporal_id == id)
    )
    has_cand = res_cand.scalar() or 0
    
    if has_req > 0 or has_cand > 0:
        raise ValueError(
            "No se puede eliminar la empresa temporal porque tiene requisiciones o candidatos asociados. "
            "Te sugerimos marcarla como Inactiva para que no aparezca en nuevas asignaciones."
        )
        
    await db.delete(emp)
    await db.commit()


# ──────────────────────────────────────────────
# Asignación de Requisiciones a Temporales
# ──────────────────────────────────────────────
async def get_requisicion_temporales(db: AsyncSession, requisicion_id: int) -> List[dict]:
    """Retorna las temporales asignadas a una requisición específica con detalles de fechas."""
    stmt = select(RequisicionTemporal, EmpresaTemporal.nombre).join(
        EmpresaTemporal, RequisicionTemporal.temporal_id == EmpresaTemporal.id
    ).where(RequisicionTemporal.requisicion_id == requisicion_id)
    
    res = await db.execute(stmt)
    out = []
    for rt, nombre in res.all():
        out.append({
            "requisicion_id": rt.requisicion_id,
            "temporal_id": rt.temporal_id,
            "nombre_temporal": nombre,
            "fecha_envio": rt.fecha_envio,
            "fecha_envio_hv": rt.fecha_envio_hv
        })
    return out


async def assign_requisicion_temporales(
    db: AsyncSession, requisicion_id: int, temporal_ids: List[int]
) -> List[dict]:
    """Asigna un conjunto de temporales a una requisición, removiendo las no especificadas."""
    res = await db.execute(
        select(RequisicionTemporal).where(RequisicionTemporal.requisicion_id == requisicion_id)
    )
    existing = {rt.temporal_id: rt for rt in res.scalars().all()}
    
    # Agregar nuevas asignaciones
    for tid in temporal_ids:
        if tid not in existing:
            temp = await db.get(EmpresaTemporal, tid)
            if not temp:
                continue
            new_assign = RequisicionTemporal(
                requisicion_id=requisicion_id,
                temporal_id=tid,
                fecha_envio=datetime.utcnow()
            )
            db.add(new_assign)
            
    # Remover asignaciones desmarcadas
    for tid, rt in existing.items():
        if tid not in temporal_ids:
            await db.delete(rt)
            
    # Transición automática de estado si la requisición estaba APROBADA
    req = await db.get(RequisicionPersonal, requisicion_id)
    if req and req.estado == EstadoRP.APROBADA:
        from app.services.rrhh.requisicion_service import registrar_historial
        req.estado = EstadoRP.EN_PROCESO_SELECCION
        req.updated_at = datetime.utcnow()
        db.add(req)
        await registrar_historial(
            db, requisicion_id, EstadoRP.APROBADA, EstadoRP.EN_PROCESO_SELECCION,
            "Gestión Humana", "gestion.humana@refridcol.com",
            "Requisición asignada a empresas temporales. Inicia selección."
        )
        
    await db.commit()
    return await get_requisicion_temporales(db, requisicion_id)


async def update_temporal_envio_hv(
    db: AsyncSession, requisicion_id: int, temporal_id: int, fecha_envio_hv: Optional[datetime]
) -> dict:
    """Registra la fecha en la que una temporal empezó a remitir hojas de vida."""
    stmt = select(RequisicionTemporal).where(
        RequisicionTemporal.requisicion_id == requisicion_id,
        RequisicionTemporal.temporal_id == temporal_id
    )
    res = await db.execute(stmt)
    rt = res.scalar_one_or_none()
    if not rt:
        raise ValueError("Asignación de requisición a temporal no encontrada")
        
    if fecha_envio_hv and fecha_envio_hv.tzinfo is not None:
        fecha_envio_hv = fecha_envio_hv.replace(tzinfo=None)
        
    rt.fecha_envio_hv = fecha_envio_hv
    db.add(rt)
    await db.flush()
    
    temp = await db.get(EmpresaTemporal, temporal_id)
    nombre = temp.nombre if temp else ""
    
    await db.commit()
    return {
        "requisicion_id": rt.requisicion_id,
        "temporal_id": rt.temporal_id,
        "nombre_temporal": nombre,
        "fecha_envio": rt.fecha_envio,
        "fecha_envio_hv": rt.fecha_envio_hv
    }


# ──────────────────────────────────────────────
# Gestión del Pipeline de Candidatos
# ──────────────────────────────────────────────
async def get_candidatos(db: AsyncSession, requisicion_id: int) -> List[dict]:
    """Lista todos los candidatos asociados a una requisición junto con el nombre de su temporal."""
    stmt = select(CandidatoRequisicion, EmpresaTemporal.nombre).join(
        EmpresaTemporal, CandidatoRequisicion.temporal_id == EmpresaTemporal.id
    ).where(CandidatoRequisicion.requisicion_id == requisicion_id).order_by(CandidatoRequisicion.creado_en.desc())
    
    res = await db.execute(stmt)
    out = []
    for cand, nombre_temp in res.all():
        cand_data = cand.model_dump()
        cand_data["nombre_temporal"] = nombre_temp
        out.append(cand_data)
    return out


async def add_candidato(
    db: AsyncSession, requisicion_id: int, temporal_id: int, nombre_candidato: str, observaciones: Optional[str] = None
) -> CandidatoRequisicion:
    """Registra un nuevo candidato en el pipeline."""
    # Verificar que exista la requisición
    req = await db.get(RequisicionPersonal, requisicion_id)
    if not req:
        raise ValueError("Requisición no encontrada")
        
    cand = CandidatoRequisicion(
        requisicion_id=requisicion_id,
        temporal_id=temporal_id,
        nombre_candidato=nombre_candidato.strip(),
        estado="POR_EVALUAR",
        observaciones=observaciones,
        creado_en=datetime.utcnow()
    )
    db.add(cand)
    await db.commit()
    await db.refresh(cand)
    return cand


async def update_candidato(db: AsyncSession, candidato_id: int, data: dict) -> CandidatoRequisicion:
    """Actualiza la información de un candidato, ejecutando el flujo de auto-cierre si aplica."""
    cand = await db.get(CandidatoRequisicion, candidato_id)
    if not cand:
        raise ValueError("Candidato no encontrado")
        
    estado_anterior = cand.estado
    
    if "estado" in data and data["estado"] == "CONTRATADO" and estado_anterior != "CONTRATADO":
        # Contar total de contratados para esta requisición
        count_stmt = select(func.count(CandidatoRequisicion.id)).where(
            CandidatoRequisicion.requisicion_id == cand.requisicion_id,
            CandidatoRequisicion.estado == "CONTRATADO"
        )
        res = await db.execute(count_stmt)
        contratados = res.scalar() or 0
        
        req = await db.get(RequisicionPersonal, cand.requisicion_id)
        if req and contratados >= req.numero_personas_requeridas:
            raise ValueError(
                f"No se puede contratar a este candidato porque ya se han completado "
                f"las {req.numero_personas_requeridas} vacantes solicitadas para esta requisición."
            )

    if "nombre_candidato" in data:
        cand.nombre_candidato = data["nombre_candidato"].strip()
    if "estado" in data:
        cand.estado = data["estado"]
    if "causal_descarte" in data:
        cand.causal_descarte = data["causal_descarte"]
    if "observaciones" in data:
        cand.observaciones = data["observaciones"]
        
    db.add(cand)
    await db.flush()
    
    # Validación de Cierre Automático
    if cand.estado == "CONTRATADO" and estado_anterior != "CONTRATADO":
        # Contar total de contratados para esta requisición
        count_stmt = select(func.count(CandidatoRequisicion.id)).where(
            CandidatoRequisicion.requisicion_id == cand.requisicion_id,
            CandidatoRequisicion.estado == "CONTRATADO"
        )
        res = await db.execute(count_stmt)
        contratados = res.scalar() or 0
        
        req = await db.get(RequisicionPersonal, cand.requisicion_id)
        if req and contratados >= req.numero_personas_requeridas:
            from app.services.rrhh.requisicion_service import registrar_historial
            
            estado_anterior_req = req.estado
            req.estado = EstadoRP.CERRADA
            req.fecha_cierre = datetime.utcnow()
            req.observacion_cierre = f"Cierre automático: se completaron las {req.numero_personas_requeridas} vacantes solicitadas."
            req.responsable_gh_nombre = "Sistema de Seguimiento"
            req.responsable_gh_email = "gestion.humana@refridcol.com"
            db.add(req)
            
            await registrar_historial(
                db, req.id, estado_anterior_req, EstadoRP.CERRADA,
                "Sistema de Seguimiento", "gestion.humana@refridcol.com",
                req.observacion_cierre
            )
            logger.info(f"[RP Auto-Cierre] {req.rp} cerrada automáticamente al alcanzar vacantes.")
            
    await db.commit()
    await db.refresh(cand)
    return cand


# ──────────────────────────────────────────────
# Cálculo Dinámico de Estadísticas
# ──────────────────────────────────────────────
async def get_seguimiento_stats(db: AsyncSession, requisicion_id: int) -> dict:
    """Calcula acumulados y estadísticas detalladas del pipeline de candidatos."""
    # 1. Total HV enviadas (total candidatos registrados)
    total_hv_stmt = select(func.count(CandidatoRequisicion.id)).where(CandidatoRequisicion.requisicion_id == requisicion_id)
    total_hv = (await db.execute(total_hv_stmt)).scalar() or 0
    
    # 2. A (Aplica: Candidatos en APLICA o CONTRATADO)
    aplica_stmt = select(func.count(CandidatoRequisicion.id)).where(
        CandidatoRequisicion.requisicion_id == requisicion_id,
        CandidatoRequisicion.estado.in_(["APLICA", "CONTRATADO"])
    )
    aplica = (await db.execute(aplica_stmt)).scalar() or 0
    
    # 3. N/A (No Aplica)
    no_aplica_stmt = select(func.count(CandidatoRequisicion.id)).where(
        CandidatoRequisicion.requisicion_id == requisicion_id,
        CandidatoRequisicion.estado == "NO_APLICA"
    )
    no_aplica = (await db.execute(no_aplica_stmt)).scalar() or 0
    
    # 4. Contratados
    contratados_stmt = select(func.count(CandidatoRequisicion.id)).where(
        CandidatoRequisicion.requisicion_id == requisicion_id,
        CandidatoRequisicion.estado == "CONTRATADO"
    )
    contratados = (await db.execute(contratados_stmt)).scalar() or 0
    
    # 5. Por Evaluar
    por_evaluar_stmt = select(func.count(CandidatoRequisicion.id)).where(
        CandidatoRequisicion.requisicion_id == requisicion_id,
        CandidatoRequisicion.estado == "POR_EVALUAR"
    )
    por_evaluar = (await db.execute(por_evaluar_stmt)).scalar() or 0
    
    # 6. Agrupación de Causales de Descarte
    causales_stmt = select(CandidatoRequisicion.causal_descarte, func.count(CandidatoRequisicion.id)).where(
        CandidatoRequisicion.requisicion_id == requisicion_id,
        CandidatoRequisicion.causal_descarte != None,
        CandidatoRequisicion.causal_descarte != ""
    ).group_by(CandidatoRequisicion.causal_descarte)
    
    res_causales = await db.execute(causales_stmt)
    causales = {causal: count for causal, count in res_causales.all()}
    
    return {
        "total_hv": total_hv,
        "aplica": aplica,
        "no_aplica": no_aplica,
        "contratados": contratados,
        "por_evaluar": por_evaluar,
        "causales_descarte": causales
    }
