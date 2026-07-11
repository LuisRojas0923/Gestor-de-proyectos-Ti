import logging
import hashlib
import hmac
import json
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ...config import config
from ...database import SessionErp
from ...models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionConfirmar,
    PreLiquidacionResultado,
)
from ..erp import EmpleadosService
from .horas_extras_calculo import _parametros_jornada_semana
from .horas_extras_parametros import obtener_reglas_calculo
from .horas_extras_service import listar_catalogo_vigente, obtener_factor_por_nivel


logger = logging.getLogger(__name__)


def _consultar_empleado_erp_worker(cedula: str) -> dict | None:
    db_erp = SessionErp()
    try:
        return EmpleadosService.obtener_empleado_por_cedula_sync(db_erp, cedula)
    finally:
        db_erp.close()


async def resolver_parametros_empleado_erp(
    cedula: str, _db_erp_ignorado=None
) -> tuple[float, str]:
    try:
        empleado = await run_in_threadpool(_consultar_empleado_erp_worker, cedula)
    except Exception as exc:
        logger.error("Error consultando empleado ERP para HE")
        raise HTTPException(status_code=503, detail="Error al consultar el empleado en ERP") from exc
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado o inactivo en el ERP")

    salario = empleado.get("salario_base_mensual")
    if salario is None or float(salario) <= 0:
        raise HTTPException(
            status_code=400,
            detail="El empleado no tiene salario base mensual vigente en ERP",
        )
    return float(salario), str(empleado.get("nivel_riesgo_arl") or "I")


def _casi_igual(a: float, b: float, tolerancia: float = 0.01) -> bool:
    return abs(float(a) - float(b)) <= tolerancia


def _numero(valor: float) -> float:
    return round(float(valor), 6)


def _texto_opcional(valor: Any) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


def _detalles_canonicos(detalles: list[Any]) -> list[dict[str, Any]]:
    canonicos = [
        {
            "codigo_novedad": detalle.codigo_novedad,
            "horas": _numero(detalle.horas),
            "factor_hora_ordinaria": _numero(detalle.factor_hora_ordinaria),
            "valor_bruto": _numero(detalle.valor_bruto),
            "carga_prestacional": _numero(detalle.carga_prestacional),
            "costo_total": _numero(detalle.costo_total),
        }
        for detalle in detalles
    ]
    return sorted(canonicos, key=lambda d: (d["codigo_novedad"], d["horas"], d["valor_bruto"]))


def _detalle_diario_canonico(detalles: list[Any]) -> list[dict[str, Any]]:
    canonicos = []
    for detalle in detalles or []:
        canonicos.append({
            "fecha": str(detalle.fecha),
            "dia_semana": int(detalle.dia_semana),
            "hora_entrada": str(detalle.hora_entrada or ""),
            "hora_salida": str(detalle.hora_salida or ""),
            "minutos_almuerzo": int(detalle.minutos_almuerzo),
            "horas_trabajadas": _numero(detalle.horas_trabajadas),
            "horas_ordinarias": _numero(detalle.horas_ordinarias),
            "horas_extras": _numero(detalle.horas_extras),
            "codigo_calculado": detalle.codigo_calculado,
            "horas_concepto": None if detalle.horas_concepto is None else _numero(detalle.horas_concepto),
            "factor_hora_ordinaria": None if detalle.factor_hora_ordinaria is None else _numero(detalle.factor_hora_ordinaria),
            "valor_bruto": _numero(detalle.valor_bruto),
            "carga_prestacional": _numero(detalle.carga_prestacional),
            "costo_total": _numero(detalle.costo_total),
            "es_festivo": bool(detalle.es_festivo),
            "nombre_festivo": _texto_opcional(detalle.nombre_festivo),
            "es_domingo": bool(detalle.es_domingo),
            "es_jornada_nocturna": bool(detalle.es_jornada_nocturna),
            "novedad_codigo": _texto_opcional(detalle.novedad_codigo),
            "novedad_evento_id": detalle.novedad_evento_id,
            "fuente_horario": detalle.fuente_horario,
            "fuente_evidencia_id": detalle.fuente_evidencia_id,
            "ot_id": detalle.ot_id,
            "ot_codigo": _texto_opcional(detalle.ot_codigo),
            "observaciones": _texto_opcional(detalle.observaciones),
        })
    return sorted(canonicos, key=lambda d: (d["dia_semana"], d["codigo_calculado"] or ""))


def _datos_firma_calculo(calculo: PreLiquidacionResultado | PreLiquidacionConfirmar) -> dict[str, Any]:
    return {
        "cedula": calculo.cedula,
        "anio": int(calculo.anio),
        "semana_iso": int(calculo.semana_iso),
        "fecha_inicio": str(getattr(calculo, "fecha_inicio", None) or ""),
        "fecha_fin": str(getattr(calculo, "fecha_fin", None) or ""),
        "ot_id": getattr(calculo, "ot_id", None),
        "ot_codigo": _texto_opcional(getattr(calculo, "ot_codigo", None)),
        "observaciones": _texto_opcional(getattr(calculo, "observaciones", None)),
        "nivel_riesgo_arl": calculo.nivel_riesgo_arl,
        "factor_prestacional": _numero(calculo.factor_prestacional),
        "salario_base_mensual": _numero(calculo.salario_base_mensual),
        "valor_hora_ordinaria": _numero(calculo.valor_hora_ordinaria),
        "detalles": _detalles_canonicos(calculo.detalles),
        "detalle_diario": _detalle_diario_canonico(getattr(calculo, "detalle_diario", [])),
    }


def firmar_pre_liquidacion(calculo: PreLiquidacionResultado | PreLiquidacionConfirmar) -> str:
    mensaje = json.dumps(
        _datos_firma_calculo(calculo),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hmac.new(config.jwt_secret_key.encode("utf-8"), mensaje, hashlib.sha256).hexdigest()


async def validar_importes_confirmacion(
    db: AsyncSession,
    payload: PreLiquidacionConfirmar,
    salario_erp: float,
    nivel_erp: str,
) -> None:
    firma_esperada = firmar_pre_liquidacion(payload)
    if not hmac.compare_digest(payload.firma_calculo or "", firma_esperada):
        raise HTTPException(status_code=400, detail="La firma de la pre-liquidación no es válida; recalcula")
    if any(detalle.fuente != "PORTAL" for detalle in payload.detalles):
        raise HTTPException(status_code=400, detail="La fuente de los detalles de pre-liquidación no es válida")

    factor_obj = await obtener_factor_por_nivel(db, nivel_erp)
    if factor_obj is None:
        raise HTTPException(status_code=400, detail="No hay factor prestacional vigente para el nivel ARL ERP")

    reglas = await obtener_reglas_calculo(db)
    _horas_semana, divisor_hora = _parametros_jornada_semana(payload.anio, payload.semana_iso, reglas)
    valor_hora = salario_erp / divisor_hora
    catalogo = {n.codigo: n for n in await listar_catalogo_vigente(db)}

    if not _casi_igual(payload.factor_prestacional, factor_obj.factor_prestacional):
        raise HTTPException(status_code=400, detail="El factor prestacional no coincide con el nivel ARL vigente")
    if not _casi_igual(payload.valor_hora_ordinaria, valor_hora):
        raise HTTPException(status_code=400, detail="El valor hora no coincide con el salario ERP vigente")

    for detalle in payload.detalles:
        novedad = catalogo.get(detalle.codigo_novedad)
        if novedad is None:
            raise HTTPException(status_code=400, detail=f"Código de novedad inválido: {detalle.codigo_novedad}")
        factor = novedad.factor_hora_ordinaria
        valor_bruto = detalle.horas * valor_hora * factor
        carga = valor_bruto * factor_obj.factor_prestacional
        costo = valor_bruto + carga
        if not _casi_igual(detalle.factor_hora_ordinaria, factor):
            raise HTTPException(status_code=400, detail=f"Factor inválido para {detalle.codigo_novedad}")
        if not _casi_igual(detalle.valor_bruto, valor_bruto):
            raise HTTPException(status_code=400, detail=f"Valor bruto inválido para {detalle.codigo_novedad}")
        if not _casi_igual(detalle.carga_prestacional, carga):
            raise HTTPException(status_code=400, detail=f"Carga prestacional inválida para {detalle.codigo_novedad}")
        if not _casi_igual(detalle.costo_total, costo):
            raise HTTPException(status_code=400, detail=f"Costo total inválido para {detalle.codigo_novedad}")
