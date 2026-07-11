from datetime import datetime, timedelta

import pytest

from app.services.auditoria.servicio_estadisticas import ServicioAuditoriaEstadisticas


def test_validar_rango_acepta_periodo_de_hasta_90_dias():
    fecha_desde = datetime(2026, 4, 1)
    fecha_hasta = fecha_desde + timedelta(days=90)

    ServicioAuditoriaEstadisticas.validar_rango(fecha_desde, fecha_hasta)


def test_validar_rango_rechaza_fechas_invertidas():
    with pytest.raises(ValueError, match="fecha_desde no puede ser posterior"):
        ServicioAuditoriaEstadisticas.validar_rango(
            datetime(2026, 4, 2),
            datetime(2026, 4, 1),
        )


def test_validar_rango_rechaza_periodos_mayores_a_90_dias():
    with pytest.raises(ValueError, match="no puede superar 90 días"):
        ServicioAuditoriaEstadisticas.validar_rango(
            datetime(2026, 1, 1),
            datetime(2026, 4, 2),
        )


@pytest.mark.parametrize(
    ("fecha_desde", "fecha_hasta"),
    [
        (None, None),
        (datetime(2026, 4, 1), None),
        (None, datetime(2026, 4, 30)),
    ],
)
def test_normalizar_rango_completa_limites_omitidos(fecha_desde, fecha_hasta):
    desde_normalizado, hasta_normalizado = (
        ServicioAuditoriaEstadisticas.normalizar_rango(
            fecha_desde,
            fecha_hasta,
        )
    )

    assert desde_normalizado is not None
    assert hasta_normalizado is not None
    assert timedelta(0) <= hasta_normalizado - desde_normalizado <= timedelta(days=90)
