"""Hash y validacion del snapshot diario usado para reversiones."""
import hashlib
import hmac
import json
from datetime import date, datetime, time

from ...models.novedades_nomina.schemas_horas_extras_trazabilidad import (
    CalculoDiarioDetalleIn,
)


def _json_default(value):
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    return value


def calcular_hash_snapshot(data: dict) -> str:
    payload = json.dumps(
        data,
        default=_json_default,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def validar_hash_snapshot(detalle) -> None:
    data = {
        campo: getattr(detalle, campo)
        for campo in CalculoDiarioDetalleIn.model_fields
    }
    data.update({
        "calculo_id": detalle.calculo_id,
        "cedula": detalle.cedula,
        "anio": detalle.anio,
        "semana_iso": detalle.semana_iso,
    })
    esperado = calcular_hash_snapshot(data)
    if not detalle.hash_snapshot or not hmac.compare_digest(
        detalle.hash_snapshot, esperado
    ):
        raise ValueError("El snapshot diario no supera la validacion de integridad")
