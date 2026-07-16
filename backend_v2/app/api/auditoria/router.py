"""API de consulta de auditoría de acciones de usuario."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.database import obtener_db
from app.models.auditoria.accion_usuario import (
    AuditoriaAccionPublica,
    AuditoriaEventosPaginados,
    AuditoriaEstadisticas,
)
from app.models.auth.usuario import Usuario
from app.services.auditoria.servicio import ServicioAuditoria
from app.services.auditoria.servicio_estadisticas import ServicioAuditoriaEstadisticas
from app.services.auth.servicio import ServicioAuth

router = APIRouter()

MODULO_AUDITORIA = "auditoria_sistema"


async def requiere_permiso_auditoria(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
) -> Usuario:
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if MODULO_AUDITORIA not in permisos:
        raise HTTPException(status_code=403, detail="Sin permiso para consultar auditoría")
    return usuario


@router.get("/eventos", response_model=AuditoriaEventosPaginados)
async def listar_eventos_auditoria(
    usuario_id: Optional[str] = Query(None),
    usuario_nombre: Optional[str] = Query(None),
    rol: Optional[str] = Query(None),
    modulo: Optional[str] = Query(None),
    accion: Optional[str] = Query(None),
    entidad_tipo: Optional[str] = Query(None),
    entidad_id: Optional[str] = Query(None),
    metodo_http: Optional[str] = Query(None),
    ruta: Optional[str] = Query(None),
    codigo_respuesta: Optional[int] = Query(None),
    direccion_ip: Optional[str] = Query(None),
    resultado: Optional[str] = Query(None),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_auditoria),
):
    items, total = await ServicioAuditoria.listar_eventos(
        db,
        usuario_id=usuario_id,
        usuario_nombre=usuario_nombre,
        rol=rol,
        modulo=modulo,
        accion=accion,
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        metodo_http=metodo_http,
        ruta=ruta,
        codigo_respuesta=codigo_respuesta,
        direccion_ip=direccion_ip,
        resultado=resultado,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        page=page,
        page_size=page_size,
    )
    return AuditoriaEventosPaginados(
        items=[AuditoriaAccionPublica.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/eventos/{evento_id}", response_model=AuditoriaAccionPublica)
async def obtener_evento_auditoria(
    evento_id: int,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_auditoria),
):
    evento = await ServicioAuditoria.obtener_por_id(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento de auditoría no encontrado")
    return AuditoriaAccionPublica.model_validate(evento)


@router.get("/estadisticas", response_model=AuditoriaEstadisticas)
async def obtener_estadisticas_auditoria(
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_permiso_auditoria),
):
    """Retorna las estadísticas, KPIs y agrupaciones para el dashboard de auditoría."""
    try:
        return await ServicioAuditoriaEstadisticas.obtener_estadisticas(
            db,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


from app.services.auditoria.ws_manager import auditoria_ws_manager

@router.websocket("/ws/dashboard")
async def websocket_auditoria_dashboard(
    websocket: WebSocket,
    db: AsyncSession = Depends(obtener_db)
):
    """Canal WebSocket para notificar actualizaciones al Dashboard de Auditoría"""
    # 1. Extraer Token de subprotocols (evitando logs del query string)
    subprotocols = websocket.scope.get("subprotocols", [])
    token = subprotocols[0] if subprotocols else None

    # 2. Validar Token de Autenticación de forma canónica
    if not token:
        await websocket.close(code=1008, reason="Token faltante")
        return

    usuario, error_reason = await ServicioAuth.validar_token_ws(db, token, modulo_requerido=MODULO_AUDITORIA)
    if not usuario:
        await websocket.close(code=1008, reason=error_reason)
        return

    await websocket.accept(subprotocol=token)
    await auditoria_ws_manager.connect(websocket)
    try:
        while True:
            # Mantener la conexión abierta
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        auditoria_ws_manager.disconnect(websocket)
