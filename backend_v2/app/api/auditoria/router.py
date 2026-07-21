"""API de consulta de auditoría de acciones de usuario."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.database import obtener_db, AsyncSessionLocal
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

from app.core.config import obtener_configuracion

def origin_valido(origin: str) -> bool:
    if not origin:
        return False
    config_core = obtener_configuracion()
    allowed = [o.strip() for o in config_core.ws_origenes_permitidos.split(",") if o.strip()]
    
    # Permitir orígenes de desarrollo local de Vite de forma resiliente
    # ya que localmente el puerto puede cambiar y es un entorno controlado.
    if hasattr(config_core, "entorno") and getattr(config_core, "entorno", "development") != "production":
        allowed.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://localhost:8000"])
        
    return origin in allowed

@router.websocket("/ws/dashboard")
async def websocket_auditoria_dashboard(
    websocket: WebSocket
):
    """Canal WebSocket para notificar actualizaciones al Dashboard de Auditoría"""
    # 0. Validar Origin Allowlist
    origin = websocket.headers.get("origin")
    if not origin_valido(origin):
        await websocket.close(code=1008, reason="Origin no permitido")
        return

    # 1. Extraer Token de subprotocols (evitando reflejar el JWT persistente)
    subprotocols = websocket.scope.get("subprotocols", [])
    token = next((p.strip() for p in subprotocols if p.strip() != "auth"), None)
    if not token:
        token = websocket.query_params.get("token")

    # 2. Validar Token de Autenticación de forma canónica
    if not token:
        await websocket.close(code=1008, reason="Token faltante")
        return

    async with AsyncSessionLocal() as db:
        usuario, error_reason = await ServicioAuth.validar_token_ws(db, token, modulo_requerido=MODULO_AUDITORIA)

    if not usuario:
        await websocket.close(code=1008, reason=error_reason)
        return

    # 3. Aceptar conexión con protocolo seguro en lugar de retornar el token
    subprotocolo_aceptado = "auth" if "auth" in subprotocols else None
    await websocket.accept(subprotocol=subprotocolo_aceptado)

    if not await auditoria_ws_manager.connect(websocket):
        await websocket.close(code=1013, reason="Demasiadas conexiones activas. Intente más tarde.")
        return
    try:
        import asyncio
        import time
        revalidation_interval = 60.0
        deadline = time.monotonic() + revalidation_interval

        while True:
            timeout_val = max(0.1, deadline - time.monotonic())
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=timeout_val)
            except asyncio.TimeoutError:
                pass

            if time.monotonic() >= deadline:
                async with AsyncSessionLocal() as db_reval:
                    re_user, re_error = await ServicioAuth.validar_token_ws(db_reval, token, modulo_requerido=MODULO_AUDITORIA)
                    if not re_user:
                        await websocket.close(code=1008, reason=re_error)
                        return
                deadline = time.monotonic() + revalidation_interval
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        auditoria_ws_manager.disconnect(websocket)
