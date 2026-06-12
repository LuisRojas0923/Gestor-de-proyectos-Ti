"""Utilidades para snapshots antes/después en auditoría."""
import logging
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from sqlalchemy import inspect as sa_inspect
from starlette.requests import Request

logger = logging.getLogger(__name__)


def serializar_valor_auditoria(valor: Any) -> Any:
    if valor is None:
        return None
    if isinstance(valor, (str, int, float, bool)):
        return valor
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, Enum):
        return valor.value
    if isinstance(valor, dict):
        return {k: serializar_valor_auditoria(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [serializar_valor_auditoria(v) for v in valor]
    return str(valor)


def _es_instancia_orm(modelo: Any) -> bool:
    try:
        return sa_inspect(modelo, raise_exception=False) is not None
    except Exception:
        return False


def _dict_columnas_orm(instancia: Any) -> dict[str, Any]:
    estado = sa_inspect(instancia, raise_exception=False)
    if estado is None:
        return {}
    return {attr.key: getattr(instancia, attr.key) for attr in estado.mapper.column_attrs}


def modelo_a_dict_auditoria(modelo: Any) -> dict[str, Any]:
    if modelo is None:
        return {}
    if isinstance(modelo, dict):
        data = modelo
    elif _es_instancia_orm(modelo):
        data = _dict_columnas_orm(modelo)
    elif hasattr(modelo, "model_dump"):
        data = modelo.model_dump(mode="json")
    else:
        return {"valor": str(modelo)}
    return {k: serializar_valor_auditoria(v) for k, v in data.items()}


def diff_cambios(
    antes: dict[str, Any], despues: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Devuelve solo los campos que cambiaron."""
    cambios_antes: dict[str, Any] = {}
    cambios_despues: dict[str, Any] = {}
    for key in set(antes) | set(despues):
        valor_antes = antes.get(key)
        valor_despues = despues.get(key)
        if valor_antes != valor_despues:
            cambios_antes[key] = valor_antes
            cambios_despues[key] = valor_despues
    return cambios_antes, cambios_despues


def asignar_diff_en_request(
    request: Request,
    datos_anteriores: Optional[dict[str, Any]],
    datos_nuevos: Optional[dict[str, Any]],
) -> None:
    request.state.auditoria_datos_anteriores = datos_anteriores or None
    request.state.auditoria_datos_nuevos = datos_nuevos or None


def _omitir_vacios(datos: dict[str, Any]) -> dict[str, Any]:
    vacios = (None, "", [], {})
    return {
        k: v
        for k, v in datos.items()
        if v not in vacios and not (isinstance(v, (int, float)) and v == 0 and k != "id")
    }


def asignar_creacion_en_request(
    request: Request, payload: Any, *, omitir_campos_vacios: bool = True
) -> None:
    datos = modelo_a_dict_auditoria(payload)
    if omitir_campos_vacios:
        datos = _omitir_vacios(datos)
    asignar_diff_en_request(request, None, datos)


def asignar_actualizacion_en_request(
    request: Request, modelo_antes: Any, modelo_despues: Any
) -> None:
    antes, despues = diff_cambios(
        modelo_a_dict_auditoria(modelo_antes),
        modelo_a_dict_auditoria(modelo_despues),
    )
    asignar_diff_en_request(request, antes or None, despues or None)


def asignar_eliminacion_en_request(request: Request, modelo_antes: Any) -> None:
    asignar_diff_en_request(request, modelo_a_dict_auditoria(modelo_antes), None)


def asignar_creacion_segura(
    request: Request, payload: Any, *, omitir_campos_vacios: bool = True
) -> None:
    try:
        asignar_creacion_en_request(
            request, payload, omitir_campos_vacios=omitir_campos_vacios
        )
    except Exception as exc:
        logger.warning("Auditoría snapshot creación omitida: %s", exc)


def asignar_actualizacion_segura(
    request: Request, modelo_antes: Any, modelo_despues: Any
) -> None:
    try:
        asignar_actualizacion_en_request(request, modelo_antes, modelo_despues)
    except Exception as exc:
        logger.warning("Auditoría snapshot actualización omitida: %s", exc)


def asignar_eliminacion_segura(request: Request, modelo_antes: Any) -> None:
    try:
        asignar_eliminacion_en_request(request, modelo_antes)
    except Exception as exc:
        logger.warning("Auditoría snapshot eliminación omitida: %s", exc)


def asignar_descarga_en_request(
    request: Request,
    *,
    entidad_tipo: str,
    entidad_id: Optional[str] = None,
    metadatos: Optional[dict[str, Any]] = None,
) -> None:
    request.state.auditoria_entidad_tipo = entidad_tipo
    if entidad_id is not None:
        request.state.auditoria_entidad_id = entidad_id
    if metadatos:
        previos = getattr(request.state, "auditoria_metadatos", None) or {}
        request.state.auditoria_metadatos = {**previos, **metadatos}


def asignar_descarga_segura(
    request: Request,
    *,
    entidad_tipo: str,
    entidad_id: Optional[str] = None,
    metadatos: Optional[dict[str, Any]] = None,
) -> None:
    try:
        asignar_descarga_en_request(
            request,
            entidad_tipo=entidad_tipo,
            entidad_id=entidad_id,
            metadatos=metadatos,
        )
    except Exception as exc:
        logger.warning("Auditoría descarga omitida: %s", exc)


def asignar_evento_en_request(
    request: Request,
    *,
    modulo: Optional[str] = None,
    accion: Optional[str] = None,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None,
    metadatos: Optional[dict[str, Any]] = None,
    datos_nuevos: Optional[dict[str, Any]] = None,
) -> None:
    if modulo is not None:
        request.state.auditoria_modulo = modulo
    if accion is not None:
        request.state.auditoria_accion = accion
    if entidad_tipo is not None:
        request.state.auditoria_entidad_tipo = entidad_tipo
    if entidad_id is not None:
        request.state.auditoria_entidad_id = entidad_id
    if metadatos:
        previos = getattr(request.state, "auditoria_metadatos", None) or {}
        request.state.auditoria_metadatos = {**previos, **metadatos}
    if datos_nuevos is not None:
        request.state.auditoria_datos_nuevos = datos_nuevos


def asignar_evento_segura(request: Request, **kwargs: Any) -> None:
    try:
        asignar_evento_en_request(request, **kwargs)
    except Exception as exc:
        logger.warning("Auditoría evento omitida: %s", exc)
