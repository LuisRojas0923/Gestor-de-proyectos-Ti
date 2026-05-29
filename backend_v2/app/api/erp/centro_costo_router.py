from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import obtener_erp_db
from app.api.auth.router import obtener_usuario_actual_db
from app.models.auth.usuario import Usuario
from app.services.erp.centro_costo_service import CentroCostoErpService
from app.api.erp.centro_costo_schemas import (
    UenCreate, UenOut,
    SubcentroCreate, SubcentroOut,
    EspecialidadCreate, EspecialidadOut
)
from typing import List

router = APIRouter()

def verificar_admin(usuario: Usuario = Depends(obtener_usuario_actual_db)) -> Usuario:
    """Verifica que el usuario actual tenga rol de administrador"""
    if usuario.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para administrar la configuración de Centros de Costos."
        )
    return usuario


# ──────────────────────────────────────────────
# Endpoints de UEN
# ──────────────────────────────────────────────

@router.get("/uen", response_model=List[UenOut])
def listar_uen(
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Obtiene el listado de UENs configurados en el ERP"""
    return CentroCostoErpService.obtener_todos_uen(db_erp)


@router.post("/uen", response_model=UenOut)
def crear_actualizar_uen(
    payload: UenCreate,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Crea o actualiza una UEN en el ERP"""
    return CentroCostoErpService.crear_o_actualizar_uen(db_erp, payload)


@router.delete("/uen/{codigo}", response_model=UenOut)
def desactivar_uen(
    codigo: str,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Desactiva lógicamente una UEN en el ERP"""
    res = CentroCostoErpService.cambiar_estado_uen(db_erp, codigo, False)
    if not res:
        raise HTTPException(status_code=404, detail="UEN no encontrada")
    return res


@router.post("/uen/{codigo}/activar", response_model=UenOut)
def activar_uen(
    codigo: str,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Activa una UEN en el ERP"""
    res = CentroCostoErpService.cambiar_estado_uen(db_erp, codigo, True)
    if not res:
        raise HTTPException(status_code=404, detail="UEN no encontrada")
    return res


# ──────────────────────────────────────────────
# Endpoints de Subcentro de Costo
# ──────────────────────────────────────────────

@router.get("/subcentro", response_model=List[SubcentroOut])
def listar_subcentros(
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Obtiene el listado de Subcentros de Costo configurados en el ERP"""
    return CentroCostoErpService.obtener_todos_subcentro(db_erp)


@router.post("/subcentro", response_model=SubcentroOut)
def crear_actualizar_subcentro(
    payload: SubcentroCreate,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Crea o actualiza un Subcentro en el ERP"""
    return CentroCostoErpService.crear_o_actualizar_subcentro(db_erp, payload)


@router.delete("/subcentro/{codigo}", response_model=SubcentroOut)
def desactivar_subcentro(
    codigo: str,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Desactiva lógicamente un Subcentro en el ERP"""
    res = CentroCostoErpService.cambiar_estado_subcentro(db_erp, codigo, False)
    if not res:
        raise HTTPException(status_code=404, detail="Subcentro no encontrado")
    return res


@router.post("/subcentro/{codigo}/activar", response_model=SubcentroOut)
def activar_subcentro(
    codigo: str,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Activa un Subcentro en el ERP"""
    res = CentroCostoErpService.cambiar_estado_subcentro(db_erp, codigo, True)
    if not res:
        raise HTTPException(status_code=404, detail="Subcentro no encontrado")
    return res


# ──────────────────────────────────────────────
# Endpoints de Especialidades
# ──────────────────────────────────────────────

@router.get("/especialidad", response_model=List[EspecialidadOut])
def listar_especialidades(
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Obtiene el listado de Especialidades configuradas en el ERP"""
    return CentroCostoErpService.obtener_todos_especialidad(db_erp)


@router.post("/especialidad", response_model=EspecialidadOut)
def crear_actualizar_especialidad(
    payload: EspecialidadCreate,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Crea o actualiza una Especialidad en el ERP"""
    return CentroCostoErpService.crear_o_actualizar_especialidad(db_erp, payload)


@router.delete("/especialidad/{codigo}", response_model=EspecialidadOut)
def desactivar_especialidad(
    codigo: str,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Desactiva lógicamente una Especialidad en el ERP"""
    res = CentroCostoErpService.cambiar_estado_especialidad(db_erp, codigo, False)
    if not res:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    return res


@router.post("/especialidad/{codigo}/activar", response_model=EspecialidadOut)
def activar_especialidad(
    codigo: str,
    db_erp: Session = Depends(obtener_erp_db),
    _admin: Usuario = Depends(verificar_admin)
):
    """Activa una Especialidad en el ERP"""
    res = CentroCostoErpService.cambiar_estado_especialidad(db_erp, codigo, True)
    if not res:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    return res
