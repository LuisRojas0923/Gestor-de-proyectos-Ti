from types import SimpleNamespace

from app.services.erp.empleados_service import EmpleadosService


class _ResultadoFake:
    def __init__(self, rows=None, total=0, existe=False):
        self._rows = rows or []
        self._total = total
        self._existe = existe

    def fetchall(self):
        return self._rows

    def first(self):
        return SimpleNamespace(total=self._total, existe=self._existe)


class _SesionFake:
    def __init__(self, columnas_existentes=None):
        self.queries = []
        self.columnas_existentes = columnas_existentes or set()

    def execute(self, query, params):
        sql = str(query)
        self.queries.append((sql, params))
        if "information_schema.columns" in sql:
            key = (params["tabla"], params["columna"])
            return _ResultadoFake(existe=key in self.columnas_existentes)
        if "COUNT" in sql:
            return _ResultadoFake(total=1)
        return _ResultadoFake(rows=[
            SimpleNamespace(
                nrocedula="123",
                nombre="Juan Perez",
                cargo="Operario",
                area="Produccion",
                quien_reporta="Regional Norte" if ("contrato", "regional") in self.columnas_existentes else None,
                autoriza_he=True if ("beneficio", "autorizacionhorasextras") in self.columnas_existentes else None,
            )
        ])


def test_listar_empleados_paginado_no_usa_columnas_opcionales_erp():
    sesion = _SesionFake()

    respuesta = EmpleadosService.listar_empleados_paginado(sesion, limit=50, offset=0)

    sql_ejecutado = "\n".join(
        sql for sql, _params in sesion.queries if "from establecimiento" in sql.lower()
    ).lower()
    assert "riesgoarl" not in sql_ejecutado
    assert "autorizahe" not in sql_ejecutado
    assert "autorizacionhorasextras" not in sql_ejecutado
    assert "fechainicio" not in sql_ejecutado
    assert "beneficio" not in sql_ejecutado
    assert respuesta == {
        "items": [
            {
                "cedula": "123",
                "nombre": "Juan Perez",
                "cargo": "Operario",
                "area": "Produccion",
                "quien_reporta": None,
                "nivel_riesgo_arl": None,
                "autoriza_he": None,
            }
        ],
        "total": 1,
    }


def test_listar_empleados_paginado_incluye_autorizacion_y_reporta_si_existen():
    sesion = _SesionFake(columnas_existentes={
        ("contrato", "regional"),
        ("contrato", "numerocontrato"),
        ("beneficio", "contrato"),
        ("beneficio", "autorizacionhorasextras"),
        ("beneficio", "estado"),
    })

    respuesta = EmpleadosService.listar_empleados_paginado(sesion, limit=50, offset=0)

    assert respuesta["items"][0]["quien_reporta"] == "Regional Norte"
    assert respuesta["items"][0]["autoriza_he"] is True
