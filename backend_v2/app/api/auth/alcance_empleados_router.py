"""Administracion protegida de relaciones gestor-empleado ERP."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auth.schemas_alcance_empleados import (
    EmpleadosAlcanceList,
    GestoresAlcanceList,
    RelacionesGestorResultado,
    RelacionesGestorUpdate,
)
from app.models.auth.usuario import Usuario
from app.services.auth.alcance_empleados_service import (
    cambiar_relaciones,
    cedulas_relacionadas_gestor,
    listar_gestores_alcance,
    obtener_resultado_relaciones_idempotente,
    usuario_tiene_bypass_alcance,
    validar_cambio_relaciones,
)
from app.services.auth.servicio import ServicioAuth
from app.services.auditoria.snapshots import asignar_evento_segura
from app.services.erp.empleados_horarios_service import (
    agregar_disponibilidad_semanal,
    consultar_empleados_erp_worker,
    filtrar_paginar_empleados,
    validar_cedulas_erp_worker,
    validar_semana_iso,
)

PERMISO_ALCANCE_ADMIN = "alcance_empleados.administrar"
router = APIRouter(prefix="/alcance-empleados", tags=["Alcance de empleados"])


async def requerir_admin_alcance(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if PERMISO_ALCANCE_ADMIN not in permisos:
        raise HTTPException(403, "Sin permiso para administrar alcance")
    return usuario


@router.get("/gestores", response_model=GestoresAlcanceList)
async def listar_gestores(
    response: Response, q: Optional[str] = None, limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0), db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requerir_admin_alcance),
):
    items, total = await listar_gestores_alcance(db, q, limit, offset)
    response.headers["Cache-Control"] = "no-store, private"
    return GestoresAlcanceList(items=items, total=total, limit=limit, offset=offset)


@router.get("/gestores/{gestor_id}/empleados", response_model=EmpleadosAlcanceList)
async def listar_empleados_gestor(
    response: Response, gestor_id: str = Path(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$"),
    q: Optional[str] = None, anio: int = Query(default_factory=lambda: date.today().isocalendar().year),
    semana_iso: int = Query(default_factory=lambda: date.today().isocalendar().week),
    cargos: list[str] = Query(default_factory=list),
    areas: list[str] = Query(default_factory=list),
    ciudades: list[str] = Query(default_factory=list),
    jefes: list[str] = Query(default_factory=list),
    autoriza_he: bool | None = None, disponible_semana: bool | None = None,
    relacionado: bool | None = None,
    orden: str = Query("cedula", pattern=r"^(cedula|nombre|cargo|area|ciudad|jefe)$"),
    direccion: str = Query("asc", pattern=r"^(asc|desc)$"),
    limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(obtener_db), _: Usuario = Depends(requerir_admin_alcance),
):
    try:
        validar_semana_iso(anio, semana_iso)
        relacionados = await cedulas_relacionadas_gestor(db, gestor_id)
        resultado = await run_in_threadpool(
            consultar_empleados_erp_worker, q, limit, offset, True, None, True
        )
    except LookupError as exc:
        raise HTTPException(404, "Gestor no encontrado") from exc
    except ValueError as exc:
        raise HTTPException(422, "Semana ISO inválida") from exc
    except Exception as exc:
        raise HTTPException(503, "ERP no disponible") from exc
    items = await agregar_disponibilidad_semanal(
        db, resultado["items"], anio, semana_iso, relacionados
    )
    pagina = filtrar_paginar_empleados(
        items,
        cargos=cargos,
        areas=areas,
        ciudades=ciudades,
        jefes=jefes,
        autoriza_he=autoriza_he,
        disponible_semana=disponible_semana,
        relacionado=relacionado,
        orden=orden,
        direccion=direccion,
        limit=limit,
        offset=offset,
    )
    response.headers["Cache-Control"] = "no-store, private"
    return EmpleadosAlcanceList(**pagina)


@router.put("/gestores/{gestor_id}/relaciones", response_model=RelacionesGestorResultado)
async def guardar_relaciones(
    payload: RelacionesGestorUpdate, request: Request,
    gestor_id: str = Path(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$"),
    db: AsyncSession = Depends(obtener_db), actor: Usuario = Depends(requerir_admin_alcance),
):
    metadatos_auditoria = {
        "cantidad_agregar": len(payload.cedulas_agregar),
        "cantidad_quitar": len(payload.cedulas_quitar),
    }
    asignar_evento_segura(
        request,
        modulo=PERMISO_ALCANCE_ADMIN,
        entidad_tipo="relaciones_gestor_empleado",
        entidad_id=gestor_id,
        metadatos=metadatos_auditoria,
        datos_nuevos=dict(metadatos_auditoria),
    )
    try:
        cambio = validar_cambio_relaciones(
            gestor_id,
            actor.id,
            usuario_tiene_bypass_alcance(actor),
            payload.cedulas_agregar,
            payload.cedulas_quitar,
        )
        replay = await obtener_resultado_relaciones_idempotente(
            db,
            payload.solicitud_id,
            gestor_id,
            actor,
            cambio.cedulas_agregar,
            cambio.cedulas_quitar,
        )
        if replay is not None:
            return replay
        # La consulta bulk al ERP ocurre antes de cualquier escritura local.
        cedulas = sorted(set(cambio.cedulas_agregar + cambio.cedulas_quitar))
        if cedulas:
            try:
                encontradas = await run_in_threadpool(validar_cedulas_erp_worker, cedulas)
            except Exception as exc:
                raise HTTPException(503, "No fue posible validar el ERP") from exc
            if encontradas != set(cedulas):
                raise ValueError("Una o más cédulas no corresponden a empleados activos")
        return await cambiar_relaciones(
            db, payload.solicitud_id, gestor_id, actor,
            cambio.cedulas_agregar, cambio.cedulas_quitar,
        )
    except PermissionError as exc:
        raise HTTPException(403, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(404, "Gestor no encontrado") from exc
    except RuntimeError as exc:
        raise HTTPException(409, "Conflicto de idempotencia") from exc
    except IntegrityError as exc:
        raise HTTPException(409, "Conflicto al actualizar relaciones") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "No fue posible actualizar las relaciones") from exc
