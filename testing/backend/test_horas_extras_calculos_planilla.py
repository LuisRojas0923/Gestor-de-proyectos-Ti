from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.routing import APIRoute
from httpx import ASGITransport, AsyncClient

from app.api.novedades_nomina.routers import horas_extras_consultas
from app.api.novedades_nomina.routers.horas_extras_permisos import requiere_permiso_he_leer
from app.database import obtener_db, obtener_erp_db_opcional
from app.services.novedades_nomina.horas_extras_planilla import (
    _consultar_ots_bulk,
    _construir_filas_planilla,
    listar_calculos_planilla,
)
from app.services.novedades_nomina import horas_extras_planilla as planilla_module
from app.services.novedades_nomina.snapshot_integridad import calcular_hash_snapshot
from app.services.erp import empleados_service as empleados_service_module
from app.services.erp.empleados_service import EmpleadosService


def _calculo(**overrides):
    data = {
        "id": 772,
        "cedula": "80167661",
        "anio": 2026,
        "semana_iso": 23,
        "fecha_inicio": date(2026, 6, 1),
        "fecha_fin": date(2026, 6, 7),
        "salario_base_mensual": 3_000_000,
        "valor_hora_ordinaria": 14_286,
        "factor_prestacional": 0.334,
        "total_horas_extras": 1.0,
        "estado": "CONFIRMADO",
        "confirmado_por": "USR-CAMILA",
        "calculado_por": "USR-CAMILA",
        "observaciones": None,
        "detalles": [],
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _diario(**overrides):
    data = {
        "id": 10,
        "calculo_id": 772,
        "cedula": "80167661",
        "anio": 2026,
        "semana_iso": 23,
        "fecha": date(2026, 6, 6),
        "dia_semana": 6,
        "hora_entrada": None,
        "hora_salida": None,
        "minutos_almuerzo": 0,
        "cruza_medianoche": False,
        "horas_trabajadas": 9.0,
        "horas_ordinarias": 8.0,
        "horas_extras": 1.0,
        "codigo_calculado": "HED",
        "novedad_codigo": None,
        "horas_concepto": 1.0,
        "ot_codigo": "3080",
        "observaciones": "Apoyo operativo",
        "costo_total": 23_818,
        "factor_hora_ordinaria": 1.25,
        "valor_bruto": 17_858,
        "carga_prestacional": 5_960,
        "es_festivo": False,
        "nombre_festivo": None,
        "es_domingo": False,
        "es_jornada_nocturna": False,
        "novedad_evento_id": None,
        "fuente_horario": "PLANIFICADOR",
        "fuente_evidencia_id": None,
        "ot_id": None,
        "hash_snapshot": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _con_hash(detalle):
    campos = {
        "fecha", "dia_semana", "hora_entrada", "hora_salida", "minutos_almuerzo",
        "cruza_medianoche", "horas_trabajadas", "horas_ordinarias", "horas_extras",
        "codigo_calculado", "horas_concepto", "factor_hora_ordinaria", "valor_bruto",
        "carga_prestacional", "costo_total", "es_festivo", "nombre_festivo",
        "es_domingo", "es_jornada_nocturna", "novedad_codigo", "novedad_evento_id",
        "fuente_horario", "fuente_evidencia_id", "ot_id", "ot_codigo", "observaciones",
        "calculo_id", "cedula", "anio", "semana_iso",
    }
    detalle.hash_snapshot = calcular_hash_snapshot({campo: getattr(detalle, campo) for campo in campos})
    return detalle


def _asignacion(**overrides):
    data = {
        "anio": 2026,
        "semana_iso": 23,
        "cedula": "80167661",
        "dia_semana": 6,
        "orden": "3080",
        "cc": None,
        "scc": None,
        "sub_indice": "20",
        "categoria_sub_indice": "MANO DE OBRA",
        "descripcion": None,
        "horas": 9.0,
        "porcentaje": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _contexto():
    return {
        "empleados": {
            "80167661": {
                "nombre": "MOLANO ANTURY MIGUEL ANGEL",
                "empresa": "SUMMAR TEMPORALES",
                "ciudadcontratacion": "BOGOTA",
                "quien_reporta": "ADN",
                "autoriza_he": True,
                "salario_base_mensual": 3_300_000,
            }
        },
        "horarios": {},
        "usuarios": {"USR-CAMILA": "CAMILA BAHOZ"},
        "ots": {
            ("3080", "", "", "20"): {
                "descripcion": "",
                "cliente": "ADN",
            }
        },
    }


def _simular_erp_planilla(monkeypatch):
    monkeypatch.setattr(
        EmpleadosService,
        "consultar_empleados_bulk_async",
        AsyncMock(return_value=_contexto()["empleados"]),
    )
    monkeypatch.setattr(
        planilla_module,
        "obtener_reglas_calculo",
        AsyncMock(return_value=None),
    )
    return SimpleNamespace()


def test_construye_fila_salario_y_fila_hora_extra_por_empleado_fecha_ot():
    contexto = _contexto()

    filas = _construir_filas_planilla(
        [_calculo()],
        [_diario(ot_codigo="1007")],
        [_asignacion()],
        **contexto,
    )

    assert [(fila.novedad, fila.cantidad_horas) for fila in filas] == [
        ("SALARIO", 8.0),
        ("HED", 1.0),
    ]
    salario = filas[0]
    assert salario.cedula == "80167661"
    assert salario.empleado == "MOLANO ANTURY MIGUEL ANGEL"
    assert salario.salario == 3_300_000
    assert salario.base_hora == 15_000
    assert salario.aplica_he is True
    assert salario.empresa == "SUMMAR TEMPORALES"
    assert salario.sucursal == "BOGOTA"
    assert salario.fecha == date(2026, 6, 6)
    assert salario.ot_cc == "3080"
    assert salario.sub_subc == "20"
    assert salario.cantidad == 1
    assert salario.ubicacion == "CC"
    assert salario.responsable == "CAMILA BAHOZ"
    assert salario.encargados == "ADN"
    assert salario.cliente == "ADN"
    assert filas[1].costo_total == pytest.approx(25_012.5)


def test_distribuye_salario_por_porcentaje_sin_duplicar_horas_ordinarias():
    asignaciones = [
        _asignacion(orden="3080", sub_indice="20", horas=None, porcentaje=60.0),
        _asignacion(orden="4090", sub_indice="30", horas=None, porcentaje=40.0),
    ]
    contexto = _contexto()
    contexto["ots"][("4090", "", "", "30")] = {
        "descripcion": "Montaje",
        "cliente": "CLIENTE B",
    }

    filas = _construir_filas_planilla(
        [_calculo(total_horas_extras=0)],
        [_diario(codigo_calculado=None, horas_concepto=None, horas_extras=0)],
        asignaciones,
        **contexto,
    )

    assert [(fila.ot_cc, fila.cantidad_horas) for fila in filas] == [
        ("3080", 4.8),
        ("4090", 3.2),
    ]
    assert sum(fila.cantidad_horas for fila in filas) == pytest.approx(8.0)


def test_ubicacion_cc_prioriza_cc_y_scc_sobre_orden_y_subindice():
    filas = _construir_filas_planilla(
        [_calculo()],
        [_diario(ot_codigo="1007")],
        [_asignacion(orden="1007", cc="3080", scc="10", sub_indice="300")],
        **_contexto(),
    )

    assert {(fila.ot_cc, fila.sub_subc, fila.ubicacion) for fila in filas} == {
        ("3080", "10", "CC")
    }


def test_consolida_la_misma_clave_de_negocio_y_omite_repartos_en_cero():
    filas = _construir_filas_planilla(
        [_calculo(total_horas_extras=0)],
        [_diario(codigo_calculado=None, horas_concepto=None, horas_extras=0)],
        [
            _asignacion(cc="3080", scc="10", sub_indice="20", porcentaje=100),
            _asignacion(cc="3080", scc="20", sub_indice="30", porcentaje=0),
            _asignacion(cc="3080", scc="10", sub_indice="40", porcentaje=100),
        ],
        **_contexto(),
    )

    assert len(filas) == 1
    assert (filas[0].cedula, filas[0].fecha, filas[0].ot_cc, filas[0].novedad) == (
        "80167661", date(2026, 6, 6), "3080", "SALARIO"
    )
    assert filas[0].cantidad_horas == 8.0


def test_distribuye_novedad_y_costo_entre_cc_de_la_misma_ot():
    filas = _construir_filas_planilla(
        [_calculo()],
        [_diario(horas_concepto=3.0, costo_total=30_000)],
        [
            _asignacion(cc="CC-1", scc="10", porcentaje=60),
            _asignacion(cc="CC-2", scc="20", porcentaje=40),
        ],
        **_contexto(),
    )

    novedades = [fila for fila in filas if fila.novedad == "HED"]
    assert [
        (fila.ot_cc, fila.cantidad_horas, fila.costo_total)
        for fila in novedades
    ] == [
        ("CC-1", 1.8, 45_022.5),
        ("CC-2", 1.2, 30_015.0),
    ]


def test_calculo_historico_sin_snapshot_conserva_detalles_semanales():
    detalle = SimpleNamespace(
        id=5,
        codigo_novedad="HEN",
        horas=2.0,
        factor_hora_ordinaria=1.75,
        ot_codigo="5000",
        costo_total=40_000,
    )
    contexto = _contexto()

    filas = _construir_filas_planilla(
        [_calculo(detalles=[detalle])],
        [],
        [],
        **contexto,
    )

    assert len(filas) == 1
    assert filas[0].fecha == date(2026, 6, 1)
    assert filas[0].ot_cc == "5000"
    assert filas[0].novedad == "HEN"
    assert filas[0].cantidad_horas == 2.0


def test_endpoint_planilla_esta_antes_de_ruta_dinamica_y_exige_permiso_leer():
    rutas = [
        ruta for ruta in horas_extras_consultas.router.routes
        if isinstance(ruta, APIRoute)
    ]
    indice_planilla = next(i for i, ruta in enumerate(rutas) if ruta.path == "/calculos/planilla")
    indice_detalle = next(i for i, ruta in enumerate(rutas) if ruta.path == "/calculos/{calculo_id}")
    dependencias = {
        getattr(dep.call, "__name__", "")
        for dep in rutas[indice_planilla].dependant.dependencies
    }

    assert indice_planilla < indice_detalle
    assert "requiere_permiso_he_leer" in dependencias


def test_bulk_empleados_incluye_autorizacion_y_jefe_solo_para_planilla(monkeypatch):
    monkeypatch.setattr(empleados_service_module, "_existe_columna", lambda *_args: True)
    row = SimpleNamespace(
        nrocedula="80167661",
        nombre="MOLANO ANTURY MIGUEL ANGEL",
        estado="Activo",
        empresa="SUMMAR TEMPORALES",
        ciudadcontratacion="BOGOTA",
        quien_reporta="ADN",
        autoriza_he=True,
        salario_base_mensual=3_300_000,
        beneficios_activos=1,
        contratos_activos=1,
    )
    resultado = SimpleNamespace(fetchall=lambda: [row])
    db_erp = SimpleNamespace(execute=lambda *_args: resultado)

    empleados = EmpleadosService.consultar_empleados_bulk(
        db_erp,
        ["80167661"],
        incluir_datos_laborales=True,
        incluir_salario=True,
    )

    assert empleados["80167661"]["quien_reporta"] == "ADN"
    assert empleados["80167661"]["autoriza_he"] is True
    assert empleados["80167661"]["salario_base_mensual"] == 3_300_000


def test_bulk_ot_planilla_conserva_combinacion_exacta():
    row = SimpleNamespace(
        orden="1007",
        cc="3080",
        scc="10",
        sub_indice="300",
        descripcion="Montaje",
        cliente="CLIENTE A",
    )
    resultado = SimpleNamespace(fetchall=lambda: [row])
    db_erp = SimpleNamespace(execute=lambda *_args: resultado)

    ots = _consultar_ots_bulk(db_erp, {("1007", "3080", "10", "300")})

    assert ots[("1007", "3080", "10", "300")] == {
        "descripcion": "Montaje",
        "cliente": "CLIENTE A",
    }


@pytest.mark.asyncio
async def test_endpoint_planilla_serializa_columnas_y_conserva_alcance(monkeypatch):
    contexto = _contexto()
    fila = _construir_filas_planilla(
        [_calculo()],
        [_diario(codigo_calculado=None, horas_concepto=None, horas_extras=0)],
        [_asignacion()],
        **contexto,
    )[0]
    listar = AsyncMock(return_value=[fila])
    monkeypatch.setattr(horas_extras_consultas, "listar_calculos_planilla", listar)
    monkeypatch.setattr(
        horas_extras_consultas,
        "cedulas_permitidas",
        AsyncMock(return_value={"80167661"}),
    )
    app = FastAPI()
    app.include_router(horas_extras_consultas.router)
    db = object()
    db_erp = object()
    app.dependency_overrides[obtener_db] = lambda: db
    app.dependency_overrides[obtener_erp_db_opcional] = lambda: db_erp
    app.dependency_overrides[requiere_permiso_he_leer] = lambda: SimpleNamespace(id="USR-CAMILA")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/calculos/planilla")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store, private"
    assert set(response.json()[0]) == {
        "fila_id", "calculo_id", "cedula", "empleado", "salario", "base_hora",
        "aplica_he", "empresa", "sucursal", "fecha", "ot_cc", "sub_subc",
        "especialidad_ot", "cantidad", "ubicacion", "novedad", "cantidad_horas",
        "observaciones", "responsable", "encargados", "cliente", "costo_total", "estado",
    }
    assert listar.await_args.kwargs["cedulas_permitidas"] == {"80167661"}
    assert listar.await_args.kwargs["db_erp"] is db_erp


class _Resultado:
    def __init__(self, valores):
        self.valores = valores

    def scalars(self):
        return self

    def all(self):
        return self.valores


class _Sesion:
    def __init__(self, resultados):
        self.resultados = list(resultados)
        self.sentencias = []

    async def execute(self, sentencia):
        self.sentencias.append(sentencia)
        return _Resultado(self.resultados.pop(0))


@pytest.mark.asyncio
async def test_servicio_resuelve_responsable_por_cedula_y_filtra_periodos_exactos(monkeypatch):
    calculo = _calculo(confirmado_por="101010", calculado_por=None)
    sesion = _Sesion([
        [_con_hash(_diario())],
        [_asignacion()],
        [],
        [SimpleNamespace(id="UUID-1", cedula="101010", nombre="CAMILA BAHOZ")],
    ])
    monkeypatch.setattr(planilla_module, "listar_calculos", AsyncMock(return_value=[calculo]))
    db_erp = _simular_erp_planilla(monkeypatch)

    filas = await listar_calculos_planilla(sesion, db_erp=db_erp)

    assert filas[0].responsable == "CAMILA BAHOZ"
    consulta_asignaciones = str(sesion.sentencias[1])
    assert "cedula, nomina_planificador_dia_ot.anio, nomina_planificador_dia_ot.semana_iso" in consulta_asignaciones


@pytest.mark.asyncio
async def test_snapshot_invalido_degrada_al_detalle_semanal(monkeypatch):
    detalle_semanal = SimpleNamespace(
        id=5,
        codigo_novedad="HEN",
        horas=2.0,
        factor_hora_ordinaria=1.75,
        ot_codigo="5000",
        costo_total=40_000,
    )
    calculo = _calculo(
        confirmado_por=None,
        calculado_por=None,
        detalles=[detalle_semanal],
    )
    sesion = _Sesion([[ _diario(hash_snapshot="alterado") ], [], []])
    monkeypatch.setattr(planilla_module, "listar_calculos", AsyncMock(return_value=[calculo]))
    db_erp = _simular_erp_planilla(monkeypatch)

    filas = await listar_calculos_planilla(sesion, db_erp=db_erp)

    assert [(fila.novedad, fila.cantidad_horas) for fila in filas] == [("HEN", 2.0)]


@pytest.mark.asyncio
async def test_snapshot_rechaza_concepto_calculado_adicional_aun_con_hash_valido(monkeypatch):
    detalle_semanal = SimpleNamespace(
        id=5,
        codigo_novedad="HED",
        horas=1.0,
        factor_hora_ordinaria=1.25,
        ot_codigo="3080",
        costo_total=23_818,
    )
    calculo = _calculo(
        confirmado_por=None,
        calculado_por=None,
        detalles=[detalle_semanal],
    )
    sesion = _Sesion([
        [
            _con_hash(_diario()),
            _con_hash(_diario(id=11, codigo_calculado="HEN", costo_total=10_000)),
        ],
        [],
        [],
    ])
    monkeypatch.setattr(planilla_module, "listar_calculos", AsyncMock(return_value=[calculo]))
    db_erp = _simular_erp_planilla(monkeypatch)

    filas = await listar_calculos_planilla(sesion, db_erp=db_erp)

    assert [(fila.fecha, fila.novedad) for fila in filas] == [
        (date(2026, 6, 1), "HED")
    ]


@pytest.mark.asyncio
async def test_responsable_no_resuelto_no_expone_identificador(monkeypatch):
    calculo = _calculo(confirmado_por="101010", calculado_por=None)
    sesion = _Sesion([[_con_hash(_diario())], [_asignacion()], [], []])
    monkeypatch.setattr(planilla_module, "listar_calculos", AsyncMock(return_value=[calculo]))
    db_erp = _simular_erp_planilla(monkeypatch)

    filas = await listar_calculos_planilla(sesion, db_erp=db_erp)

    assert filas[0].responsable is None


@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [401, 403])
async def test_endpoint_planilla_propaga_rechazos_de_autorizacion(status_code):
    app = FastAPI()
    app.include_router(horas_extras_consultas.router)
    app.dependency_overrides[obtener_db] = lambda: object()
    app.dependency_overrides[obtener_erp_db_opcional] = lambda: None

    def rechazar():
        raise HTTPException(status_code=status_code, detail="No autorizado")

    app.dependency_overrides[requiere_permiso_he_leer] = rechazar
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/calculos/planilla")

    assert response.status_code == status_code


@pytest.mark.asyncio
async def test_endpoint_planilla_oculta_cedula_fuera_de_alcance_sin_consultar_planilla(monkeypatch):
    listar = AsyncMock()
    monkeypatch.setattr(horas_extras_consultas, "listar_calculos_planilla", listar)
    monkeypatch.setattr(
        horas_extras_consultas,
        "cedulas_permitidas",
        AsyncMock(return_value={"80167661"}),
    )
    monkeypatch.setattr(
        horas_extras_consultas,
        "autorizar_cedula",
        AsyncMock(side_effect=PermissionError),
    )
    app = FastAPI()
    app.include_router(horas_extras_consultas.router)
    app.dependency_overrides[obtener_db] = lambda: object()
    app.dependency_overrides[obtener_erp_db_opcional] = lambda: object()
    app.dependency_overrides[requiere_permiso_he_leer] = lambda: SimpleNamespace(id="UUID-1")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/calculos/planilla?cedula=99999999")

    assert response.status_code == 404
    listar.assert_not_awaited()
