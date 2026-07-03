from types import SimpleNamespace

import pytest

from app.services.erp.empleados_service import EmpleadosService
from app.services.novedades_nomina import horas_extras_batch


_SIN_FILA = object()


class _ResultadoFake:
    def __init__(self, rows=None, total=0, existe=False, row=_SIN_FILA):
        self._rows = rows or []
        self._total = total
        self._existe = existe
        self._row = row

    def fetchall(self):
        return self._rows

    def first(self):
        if self._row is not _SIN_FILA:
            return self._row
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
                ciudadcontratacion="Bogota",
                quien_reporta="Regional Norte" if ("contrato", "regional") in self.columnas_existentes else None,
                autoriza_he=True if ("beneficio", "autorizacionhorasextras") in self.columnas_existentes else None,
            )
        ])


class _SesionEmpleadoPorCedulaFake:
    def __init__(self):
        self.queries = []

    def execute(self, query, params):
        sql = str(query)
        self.queries.append((sql, params))
        return _ResultadoFake(row=SimpleNamespace(
            nrocedula="123",
            nombre="Juan Perez",
            cargo="Operario",
            area="Produccion",
            estado="Activo",
            empresa="Empresa",
            ciudadcontratacion="Bogota",
            viaticante=False,
            baseviaticos=0,
            centrocosto="100",
            jefe="Jefe",
            fecharetiro=None,
            riesgoarl="Riesgo I 0.522%",
            autoriza_he=True,
            correocorporativo="juan@example.com",
        ))


class _SessionErpContextFake:
    def __init__(self):
        self.queries = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params):
        sql = str(query)
        self.queries.append((sql, params))
        return _ResultadoFake(row=None)


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
    assert "ciudadcontratacion" in sql_ejecutado
    assert respuesta == {
        "items": [
            {
                "cedula": "123",
                "nombre": "Juan Perez",
                "cargo": "Operario",
                "area": "Produccion",
                "ciudadcontratacion": "Bogota",
                "quien_reporta": None,
                "nivel_riesgo_arl": None,
                "autoriza_he": None,
            }
        ],
        "total": 1,
    }


@pytest.mark.asyncio
async def test_obtener_empleado_por_cedula_usa_beneficio_por_contrato():
    sesion = _SesionEmpleadoPorCedulaFake()

    respuesta = await EmpleadosService.obtener_empleado_por_cedula(sesion, "123")

    sql_ejecutado = "\n".join(sql for sql, _params in sesion.queries).lower()
    assert respuesta["autoriza_he"] is True
    assert "b.autorizacionhorasextras" in sql_ejecutado
    assert "b.contrato" in sql_ejecutado
    assert "c.numerocontrato" in sql_ejecutado
    assert "b.establecimiento" not in sql_ejecutado
    assert "b.autorizahe" not in sql_ejecutado


@pytest.mark.asyncio
async def test_refrescar_horario_pactado_usa_beneficio_por_contrato(monkeypatch):
    sesion = _SessionErpContextFake()
    monkeypatch.setattr(horas_extras_batch, "SessionErp", lambda: sesion)

    respuesta = await horas_extras_batch.refrescar_horario_pactado_empleado("123")

    sql_ejecutado = "\n".join(sql for sql, _params in sesion.queries).lower()
    assert respuesta is False
    assert "b.autorizacionhorasextras" in sql_ejecutado
    assert "b.contrato" in sql_ejecutado
    assert "c.numerocontrato" in sql_ejecutado
    assert "b.establecimiento" not in sql_ejecutado
    assert "b.autorizahe" not in sql_ejecutado


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


def test_listar_empleados_paginado_busca_en_campos_operativos_erp():
    sesion = _SesionFake(columnas_existentes={
        ("contrato", "regional"),
        ("contrato", "numerocontrato"),
        ("beneficio", "contrato"),
        ("beneficio", "autorizacionhorasextras"),
    })

    EmpleadosService.listar_empleados_paginado(sesion, q="produccion", limit=25, offset=0)

    sql_ejecutado = "\n".join(
        sql for sql, _params in sesion.queries if "from establecimiento" in sql.lower()
    ).lower()
    assert "e.nombre::text ilike :q" in sql_ejecutado
    assert "c.cargo::text ilike :q" in sql_ejecutado
    assert "c.area::text ilike :q" in sql_ejecutado
    assert "c.ciudadcontratacion::text ilike :q" in sql_ejecutado
    assert "c.regional::text ilike :q" in sql_ejecutado
    assert "autorizacionhorasextras" in sql_ejecutado
    assert any(params.get("q") == "%produccion%" for _sql, params in sesion.queries)
