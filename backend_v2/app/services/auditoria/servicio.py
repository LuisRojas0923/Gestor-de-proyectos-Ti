"""Servicio central de auditoría de acciones de usuario."""
import logging
import re
from typing import Any, Dict, Optional

from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auditoria.accion_usuario import (
    AccionAuditoria,
    AuditoriaAccionUsuario,
)

logger = logging.getLogger(__name__)

_CLAVES_SENSIBLES = frozenset({
    "password",
    "contrasena",
    "contrasena_actual",
    "nueva_contrasena",
    "access_token",
    "token",
    "secret",
    "clave",
    "hash_contrasena",
    "documento",
    "cedula",
    "imei",
    "serial",
})

_CLAVES_SENSIBLES_LINEAS = frozenset({
    "nombre",
    "nombre_asociado",
    "documento_asignado",
    "documento_cobro",
    "icc",
    "pin",
    "puk",
})


def _enmascarar_valor(clave: str, valor: Any, modulo: Optional[str]) -> Any:
    claves_sensibles = _CLAVES_SENSIBLES
    if modulo == "lineas_corporativas":
        claves_sensibles = claves_sensibles | _CLAVES_SENSIBLES_LINEAS
    if clave.lower() in claves_sensibles:
        return "[REDACTED]"
    if isinstance(valor, dict):
        return _enmascarar_datos(valor, modulo=modulo)
    if isinstance(valor, list):
        return [
            _enmascarar_valor(clave, item, modulo)
            if not isinstance(item, dict)
            else _enmascarar_datos(item, modulo=modulo)
            for item in valor
        ]
    return valor


def _enmascarar_datos(
    datos: Optional[Dict[str, Any]], *, modulo: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    if not datos:
        return None
    return {k: _enmascarar_valor(k, v, modulo) for k, v in datos.items()}


def _anonimizar_identidad_entidad(
    modulo: str,
    entidad_tipo: Optional[str],
    entidad_id: Optional[str],
    ruta: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    if modulo != "lineas_corporativas" or entidad_tipo != "persona_linea":
        return entidad_id, ruta
    ruta_segura = re.sub(
        r"(/personas/)[^/?]+", r"\1[REDACTED]", ruta or ""
    ) or None
    return "[REDACTED]", ruta_segura


def inferir_accion_desde_metodo(metodo: str) -> AccionAuditoria:
    mapping = {
        "POST": AccionAuditoria.CREAR,
        "PUT": AccionAuditoria.ACTUALIZAR,
        "PATCH": AccionAuditoria.ACTUALIZAR,
        "DELETE": AccionAuditoria.ELIMINAR,
        "GET": AccionAuditoria.CONSULTAR,
    }
    return mapping.get(metodo.upper(), AccionAuditoria.OTRO)


def inferir_modulo_desde_ruta(ruta: str) -> str:
    if "/comisiones" in ruta:
        return "comisiones"
    partes = [p for p in ruta.split("/") if p]
    if len(partes) >= 3 and partes[0] == "api" and partes[1] == "v2":
        return partes[2].replace("-", "_")
    if partes:
        return partes[0]
    return "sistema"


def inferir_resultado_desde_codigo(codigo: int) -> str:
    if codigo < 400:
        return "exito"
    if codigo in (401, 403):
        return "denegado"
    return "fallo"


class ServicioAuditoria:
    @staticmethod
    async def registrar(
        db: AsyncSession,
        *,
        usuario_id: str,
        modulo: str,
        accion: AccionAuditoria | str,
        resultado: str = "exito",
        usuario_nombre: Optional[str] = None,
        rol: Optional[str] = None,
        entidad_tipo: Optional[str] = None,
        entidad_id: Optional[str] = None,
        metodo_http: Optional[str] = None,
        ruta: Optional[str] = None,
        codigo_respuesta: Optional[int] = None,
        direccion_ip: Optional[str] = None,
        agente_usuario: Optional[str] = None,
        correlacion_id: Optional[str] = None,
        datos_anteriores: Optional[Dict[str, Any]] = None,
        datos_nuevos: Optional[Dict[str, Any]] = None,
        metadatos: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Inserta un evento de auditoría. Nunca propaga excepciones."""
        try:
            accion_val = accion.value if isinstance(accion, AccionAuditoria) else accion
            entidad_id, ruta = _anonimizar_identidad_entidad(
                modulo, entidad_tipo, entidad_id, ruta
            )
            stmt = insert(AuditoriaAccionUsuario).values(
                usuario_id=usuario_id,
                usuario_nombre=usuario_nombre,
                rol=rol,
                modulo=modulo,
                accion=accion_val,
                entidad_tipo=entidad_tipo,
                entidad_id=entidad_id,
                metodo_http=metodo_http,
                ruta=ruta,
                codigo_respuesta=codigo_respuesta,
                resultado=resultado,
                direccion_ip=direccion_ip,
                agente_usuario=agente_usuario,
                correlacion_id=correlacion_id,
                datos_anteriores=_enmascarar_datos(datos_anteriores, modulo=modulo),
                datos_nuevos=_enmascarar_datos(datos_nuevos, modulo=modulo),
                metadatos=_enmascarar_datos(metadatos, modulo=modulo),
            )
            await db.execute(stmt)
            await db.commit()

            # Notificar al dashboard de auditoría en tiempo real
            try:
                from app.services.auditoria.ws_manager import auditoria_ws_manager
                await auditoria_ws_manager.broadcast_update()
            except Exception as ws_exc:
                logger.warning("Error enviando actualización WS: %s", ws_exc)
        except Exception as exc:
            logger.error("Error registrando auditoría de acción: %s", exc)
            try:
                await db.rollback()
            except Exception:
                pass

    @staticmethod
    async def listar_eventos(
        db: AsyncSession,
        *,
        usuario_id: Optional[str] = None,
        usuario_nombre: Optional[str] = None,
        rol: Optional[str] = None,
        modulo: Optional[str] = None,
        accion: Optional[str] = None,
        entidad_tipo: Optional[str] = None,
        entidad_id: Optional[str] = None,
        metodo_http: Optional[str] = None,
        ruta: Optional[str] = None,
        codigo_respuesta: Optional[int] = None,
        direccion_ip: Optional[str] = None,
        resultado: Optional[str] = None,
        fecha_desde: Optional[Any] = None,
        fecha_hasta: Optional[Any] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditoriaAccionUsuario], int]:
        filtros = []
        if usuario_id:
            filtros.append(AuditoriaAccionUsuario.usuario_id == usuario_id)
        if usuario_nombre:
            filtros.append(AuditoriaAccionUsuario.usuario_nombre == usuario_nombre)
        if rol:
            filtros.append(AuditoriaAccionUsuario.rol == rol)
        if modulo:
            filtros.append(AuditoriaAccionUsuario.modulo == modulo)
        if accion:
            filtros.append(AuditoriaAccionUsuario.accion == accion)
        if entidad_tipo:
            filtros.append(AuditoriaAccionUsuario.entidad_tipo == entidad_tipo)
        if entidad_id:
            filtros.append(AuditoriaAccionUsuario.entidad_id == entidad_id)
        if metodo_http:
            filtros.append(AuditoriaAccionUsuario.metodo_http == metodo_http)
        if ruta:
            filtros.append(AuditoriaAccionUsuario.ruta == ruta)
        if codigo_respuesta is not None:
            filtros.append(AuditoriaAccionUsuario.codigo_respuesta == codigo_respuesta)
        if direccion_ip:
            filtros.append(AuditoriaAccionUsuario.direccion_ip == direccion_ip)
        if resultado:
            filtros.append(AuditoriaAccionUsuario.resultado == resultado)
        if fecha_desde:
            filtros.append(AuditoriaAccionUsuario.timestamp >= fecha_desde)
        if fecha_hasta:
            filtros.append(AuditoriaAccionUsuario.timestamp <= fecha_hasta)

        count_stmt = select(func.count()).select_from(AuditoriaAccionUsuario)
        if filtros:
            count_stmt = count_stmt.where(*filtros)
        total = (await db.execute(count_stmt)).scalar() or 0

        offset = max(page - 1, 0) * page_size
        query = (
            select(AuditoriaAccionUsuario)
            .order_by(AuditoriaAccionUsuario.timestamp.desc())
            .offset(offset)
            .limit(page_size)
        )
        if filtros:
            query = query.where(*filtros)

        rows = (await db.execute(query)).scalars().all()
        return list(rows), int(total)

    @staticmethod
    async def obtener_por_id(
        db: AsyncSession, evento_id: int
    ) -> Optional[AuditoriaAccionUsuario]:
        result = await db.execute(
            select(AuditoriaAccionUsuario).where(AuditoriaAccionUsuario.id == evento_id)
        )
        return result.scalar_one_or_none()
