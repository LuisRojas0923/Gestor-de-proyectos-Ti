"""Regresiones de formatos Excel para planillas regionales."""
from io import BytesIO

import pytest
from openpyxl import Workbook

from app.services.novedades_nomina.planillas_regionales_1q_extractor import (
    extraer_planillas_regionales_1q,
)
from app.services.novedades_nomina.planillas_regionales_2q_extractor import (
    extraer_planillas_regionales_2q,
)


def _crear_excel(nombre_hoja: str) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = nombre_hoja
    sheet.append([
        "CEDULA", "EMPLEADO", "EMPRESA", "SUCURSAL",
        "CANTIDAD", "CANT. HORAS", "NOVEDAD",
    ])
    sheet.append(["100000001", "ASOCIADO DEMO", "REFRIDCOL", "CALI", 2, 16, "VAC"])
    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


@pytest.mark.parametrize(
    ("extractor", "concepto"),
    [
        (extraer_planillas_regionales_1q, "1Q VAC"),
        (extraer_planillas_regionales_2q, "2Q VAC"),
    ],
)
def test_formato_real_acepta_hoja_tabla(extractor, concepto):
    rows, summary, warnings = extractor([_crear_excel("Tabla")])

    assert warnings == []
    assert summary["total_filas"] == 1
    assert rows[0]["concepto"] == concepto


def test_formato_legacy_conserva_hoja_plantilla():
    rows, summary, warnings = extraer_planillas_regionales_1q(
        [_crear_excel("PLANTILLA")]
    )

    assert warnings == []
    assert summary["total_asociados"] == 1
    assert rows[0]["cedula"] == "100000001"


def test_hoja_desconocida_reporta_advertencia():
    rows, summary, warnings = extraer_planillas_regionales_1q(
        [_crear_excel("OTRA HOJA")]
    )

    assert rows == []
    assert summary["total_filas"] == 0
    assert "PLANTILLA" in warnings[0]
