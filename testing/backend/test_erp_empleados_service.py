from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.novedades_nomina.routers import horas_extras as horas_extras_router
from app.models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem,
    PreLiquidacionConfirmar,
    PreLiquidacionInput,
    PreLiquidacionResultado,
)
from app.services.erp.empleados_service import EmpleadosService
from app.services.novedades_nomina import horas_extras_batch
from app.services.novedades_nomina import horas_extras_erp_validacion


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
            salario=2_850_000,
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
    assert respuesta["salario_base_mensual"] == 2_850_000.0
    assert "b.autorizacionhorasextras" in sql_ejecutado
    assert "b.salario" in sql_ejecutado
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


@pytest.mark.asyncio
async def test_pre_liquidacion_router_sobrescribe_salario_y_arl_desde_erp(monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 2_850_000.0, "I"

    async def autorizacion_fake(_db, _cedula):
        return True, "ERP"

    async def ejecutar_fake(_db, payload):
        assert payload.salario_base_mensual == 2_850_000.0
        assert payload.nivel_riesgo_arl == "I"
        return PreLiquidacionResultado(
            cedula=payload.cedula,
            anio=payload.anio,
            semana_iso=payload.semana_iso,
            nivel_riesgo_arl=payload.nivel_riesgo_arl,
            factor_prestacional=0.5244,
            salario_base_mensual=payload.salario_base_mensual,
            valor_hora_ordinaria=13_571.43,
            total_horas_extras=0,
            total_valor_bruto=0,
            total_carga_prestacional=0,
            total_costo_empresa=0,
            detalles=[],
            advertencias=[],
        )

    async def detalle_diario_fake(_db, _payload, _resultado):
        return []

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)
    monkeypatch.setattr(horas_extras_router, "resolver_autorizacion_he", autorizacion_fake)
    monkeypatch.setattr(horas_extras_router, "ejecutar_pre_liquidacion", ejecutar_fake)
    monkeypatch.setattr(horas_extras_router, "construir_detalle_diario_preliquidacion", detalle_diario_fake)

    payload = PreLiquidacionInput(
        cedula="123",
        anio=2026,
        semana_iso=23,
        horas_por_dia=[8, 8, 8, 8, 8, 0, 0],
        es_jornada_nocturna=False,
    )

    resultado = await horas_extras_router.ejecutar_pre_liquidacion_endpoint(
        payload,
        db=None,
        db_erp=object(),
        _=SimpleNamespace(id=1),
    )

    assert resultado.salario_base_mensual == 2_850_000.0
    assert resultado.nivel_riesgo_arl == "I"
    assert len(resultado.firma_calculo) == 64


@pytest.mark.asyncio
async def test_confirmar_pre_liquidacion_rechaza_salario_o_arl_distinto_a_erp(monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 2_850_000.0, "I"

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)

    payload = PreLiquidacionConfirmar(
        cedula="123",
        anio=2026,
        semana_iso=23,
        fecha_inicio="2026-06-01",
        fecha_fin="2026-06-07",
        nivel_riesgo_arl="III",
        factor_prestacional=0.5244,
        salario_base_mensual=3_000_000.0,
        valor_hora_ordinaria=12_500.0,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=1,
                factor_hora_ordinaria=1.25,
                valor_bruto=15_625,
                carga_prestacional=8_194,
                costo_total=23_819,
                fuente="PORTAL",
            )
        ],
        usuario_confirma="123",
    )
    payload.firma_calculo = horas_extras_erp_validacion.firmar_pre_liquidacion(payload)

    with pytest.raises(HTTPException) as exc:
        await horas_extras_router.confirmar_pre_liquidacion_endpoint(
            payload,
            db=None,
            db_erp=object(),
            usuario=SimpleNamespace(id=1, cedula="123"),
        )

    assert exc.value.status_code == 400
    assert "recalcula" in exc.value.detail


@pytest.mark.asyncio
async def test_confirmar_pre_liquidacion_rechaza_importes_manipulados(monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 2_850_000.0, "I"

    async def factor_fake(_db, _nivel):
        return SimpleNamespace(factor_prestacional=0.5)

    async def reglas_fake(_db):
        return SimpleNamespace(
            fecha_vigencia_jornada_42=__import__("datetime").date(2026, 7, 16),
            horas_ordinarias_semanales_previas=44.0,
            horas_ordinarias_semanales_vigente=42.0,
            divisor_hora_ordinaria_previo=220.0,
            divisor_hora_ordinaria_vigente=210.0,
            horas_ordinarias_diarias=8.0,
            max_he_diarias=2.0,
            max_he_semanales=12.0,
            hora_inicio_nocturna="19:00",
            hora_fin_nocturna="06:00",
        )

    async def catalogo_fake(_db):
        return [SimpleNamespace(codigo="HED", factor_hora_ordinaria=1.25)]

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)
    monkeypatch.setattr(horas_extras_erp_validacion, "obtener_factor_por_nivel", factor_fake)
    monkeypatch.setattr(horas_extras_erp_validacion, "obtener_reglas_calculo", reglas_fake)
    monkeypatch.setattr(horas_extras_erp_validacion, "listar_catalogo_vigente", catalogo_fake)

    payload = PreLiquidacionConfirmar(
        cedula="123",
        anio=2026,
        semana_iso=23,
        fecha_inicio="2026-06-01",
        fecha_fin="2026-06-07",
        nivel_riesgo_arl="I",
        factor_prestacional=0.5,
        salario_base_mensual=2_850_000.0,
        valor_hora_ordinaria=99_999.0,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=1,
                factor_hora_ordinaria=1.25,
                valor_bruto=1,
                carga_prestacional=1,
                costo_total=2,
                fuente="PORTAL",
            )
        ],
        usuario_confirma="123",
    )
    payload.firma_calculo = horas_extras_erp_validacion.firmar_pre_liquidacion(payload)

    with pytest.raises(HTTPException) as exc:
        await horas_extras_router.confirmar_pre_liquidacion_endpoint(
            payload,
            db=None,
            db_erp=object(),
            usuario=SimpleNamespace(id=1, cedula="123"),
        )

    assert exc.value.status_code == 400
    assert "valor hora" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_confirmar_pre_liquidacion_rechaza_detalles_recalculados_sin_firma_valida(monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 2_850_000.0, "I"

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)

    payload_original = PreLiquidacionConfirmar(
        cedula="123",
        anio=2026,
        semana_iso=23,
        fecha_inicio="2026-06-01",
        fecha_fin="2026-06-07",
        nivel_riesgo_arl="I",
        factor_prestacional=0.5,
        salario_base_mensual=2_850_000.0,
        valor_hora_ordinaria=12_954.545455,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=1,
                factor_hora_ordinaria=1.25,
                valor_bruto=16_193.181819,
                carga_prestacional=8_096.590909,
                costo_total=24_289.772728,
                fuente="PORTAL",
            )
        ],
        usuario_confirma="123",
    )
    firma_original = horas_extras_erp_validacion.firmar_pre_liquidacion(payload_original)

    payload_manipulado = payload_original.model_copy(deep=True)
    payload_manipulado.detalles[0].horas = 2
    payload_manipulado.detalles[0].valor_bruto = 32_386.363638
    payload_manipulado.detalles[0].carga_prestacional = 16_193.181819
    payload_manipulado.detalles[0].costo_total = 48_579.545457
    payload_manipulado.firma_calculo = firma_original

    with pytest.raises(HTTPException) as exc:
        await horas_extras_router.confirmar_pre_liquidacion_endpoint(
            payload_manipulado,
            db=None,
            db_erp=object(),
            usuario=SimpleNamespace(id=1, cedula="123"),
        )

    assert exc.value.status_code == 400
    assert "firma" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_confirmar_pre_liquidacion_rechaza_ot_modificada_sin_firma_valida(monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 2_850_000.0, "I"

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)

    payload = PreLiquidacionConfirmar(
        cedula="123",
        anio=2026,
        semana_iso=23,
        fecha_inicio="2026-06-01",
        fecha_fin="2026-06-07",
        nivel_riesgo_arl="I",
        factor_prestacional=0.5,
        salario_base_mensual=2_850_000.0,
        valor_hora_ordinaria=12_954.545455,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=1,
                factor_hora_ordinaria=1.25,
                valor_bruto=16_193.181819,
                carga_prestacional=8_096.590909,
                costo_total=24_289.772728,
                fuente="PORTAL",
            )
        ],
        ot_id=101,
        ot_codigo="OT-101",
        usuario_confirma="123",
    )
    payload.firma_calculo = horas_extras_erp_validacion.firmar_pre_liquidacion(payload)
    payload.ot_id = 202
    payload.ot_codigo = "OT-202"

    with pytest.raises(HTTPException) as exc:
        await horas_extras_router.confirmar_pre_liquidacion_endpoint(
            payload,
            db=None,
            db_erp=object(),
            usuario=SimpleNamespace(id=1, cedula="123"),
        )

    assert exc.value.status_code == 400
    assert "firma" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_confirmar_pre_liquidacion_rechaza_detalle_diario_modificado_sin_firma_valida(monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 2_850_000.0, "I"

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)

    payload = PreLiquidacionConfirmar(
        cedula="123",
        anio=2026,
        semana_iso=23,
        fecha_inicio="2026-06-01",
        fecha_fin="2026-06-07",
        nivel_riesgo_arl="I",
        factor_prestacional=0.5,
        salario_base_mensual=2_850_000.0,
        valor_hora_ordinaria=12_954.545455,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=1,
                factor_hora_ordinaria=1.25,
                valor_bruto=16_193.181819,
                carga_prestacional=8_096.590909,
                costo_total=24_289.772728,
                fuente="PORTAL",
            )
        ],
        detalle_diario=[
            {
                "fecha": f"2026-06-0{dia}",
                "dia_semana": dia,
                "horas_trabajadas": 0.0,
                "horas_ordinarias": 0.0,
                "horas_extras": 0.0,
                "es_festivo": False,
                "es_domingo": dia == 7,
                "es_jornada_nocturna": False,
                "fuente_horario": "PLANIFICADOR",
            }
            for dia in range(1, 8)
        ],
        usuario_confirma="123",
    )
    payload.firma_calculo = horas_extras_erp_validacion.firmar_pre_liquidacion(payload)
    payload.detalle_diario[0].horas_extras = 2.0
    payload.detalle_diario[0].codigo_calculado = "HED"

    with pytest.raises(HTTPException) as exc:
        await horas_extras_router.confirmar_pre_liquidacion_endpoint(
            payload,
            db=None,
            db_erp=object(),
            usuario=SimpleNamespace(id=1, cedula="123"),
        )

    assert exc.value.status_code == 400
    assert "firma" in exc.value.detail.lower()


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
