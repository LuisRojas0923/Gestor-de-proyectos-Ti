"""Bloqueantes de autorización y ERP detectados en segunda revisión."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response
from sqlalchemy.exc import IntegrityError

from app.api.auth import alcance_empleados_router
from app.api.biometria import biometria_router
from app.api.novedades_nomina.routers import horas_extras as router_he
from app.api.novedades_nomina.routers import horas_extras_novedades as router_novedades
from app.models.novedades_nomina.horas_extras import NominaCatalogoNovedad
from app.models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento
from app.models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem, OverrideAutorizaHECreate,
    PreLiquidacionConfirmar, PreLiquidacionInput,
)
from app.models.auth.schemas_alcance_empleados import RelacionesGestorUpdate
from app.services.erp.empleados_service import EmpleadosService
from app.services.erp.empleados_horarios_service import agregar_disponibilidad_semanal
from app.services.novedades_nomina import horas_extras_erp_validacion
from testing.backend.test_erp_empleados_service import _SesionFake
from testing.backend.test_horarios_plantillas_service import _sesion_reversible


def _pre_payload(cedula="1.007.021.351"):
    return PreLiquidacionInput(
        cedula=cedula, anio=2026, semana_iso=28,
        horas_por_dia=[8, 8, 8, 8, 8, 0, 0], es_jornada_nocturna=False,
    )


def _confirmar_payload(cedula="1.007.021.351"):
    return PreLiquidacionConfirmar(
        cedula=cedula, anio=2026, semana_iso=28,
        fecha_inicio=date(2026, 7, 6), fecha_fin=date(2026, 7, 12),
        nivel_riesgo_arl="III", factor_prestacional=0.5,
        salario_base_mensual=3_000_000, valor_hora_ordinaria=12_500,
        detalles=[ConfirmarDetalleItem(
            codigo_novedad="HED", horas=1, factor_hora_ordinaria=1.25,
            valor_bruto=15_625, carga_prestacional=8_000,
            costo_total=23_625, fuente="PORTAL",
        )],
        usuario_confirma="cliente",
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "endpoint,payload",
    [
        (router_he.ejecutar_pre_liquidacion_endpoint, _pre_payload()),
        (router_he.confirmar_pre_liquidacion_endpoint, _confirmar_payload()),
    ],
)
async def test_preliquidacion_idor_corta_antes_de_erp(monkeypatch, endpoint, payload):
    monkeypatch.setattr(router_he, "autorizar_cedula", AsyncMock(side_effect=PermissionError()))
    erp = AsyncMock(side_effect=AssertionError("ERP no debe ejecutarse"))
    monkeypatch.setattr(router_he, "resolver_parametros_empleado_erp", erp)
    with pytest.raises(HTTPException) as exc:
        await endpoint(payload=payload, db=SimpleNamespace(), usuario=SimpleNamespace(id="GEST"))
    assert exc.value.status_code == 404
    erp.assert_not_awaited()


@pytest.mark.asyncio
async def test_preliquidacion_usa_cedula_canonica_antes_de_erp(monkeypatch):
    monkeypatch.setattr(router_he, "autorizar_cedula", AsyncMock(return_value="1007021351"))
    erp = AsyncMock(side_effect=HTTPException(503, "ERP no disponible"))
    monkeypatch.setattr(router_he, "resolver_parametros_empleado_erp", erp)
    payload = _pre_payload()
    with pytest.raises(HTTPException) as exc:
        await router_he.ejecutar_pre_liquidacion_endpoint(
            payload=payload, db=SimpleNamespace(), usuario=SimpleNamespace(id="GEST")
        )
    assert exc.value.status_code == 503
    assert payload.cedula == "1007021351"
    assert erp.await_args.args[0] == "1007021351"


@pytest.mark.asyncio
async def test_integrity_relaciones_es_409_no_503(monkeypatch):
    monkeypatch.setattr(
        alcance_empleados_router, "obtener_resultado_relaciones_idempotente",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        alcance_empleados_router, "validar_cedulas_erp_worker", lambda cedulas: set(cedulas)
    )
    monkeypatch.setattr(
        alcance_empleados_router, "cambiar_relaciones",
        AsyncMock(side_effect=IntegrityError("insert", {}, Exception("unique"))),
    )
    payload = RelacionesGestorUpdate(
        solicitud_id=uuid4(), cedulas_agregar=["100"], cedulas_quitar=[]
    )
    with pytest.raises(HTTPException) as exc:
        await alcance_empleados_router.guardar_relaciones(
            payload, SimpleNamespace(state=SimpleNamespace()), "GESTOR", SimpleNamespace(),
            SimpleNamespace(id="ADMIN", rol="admin"),
        )
    assert exc.value.status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize("tipo", ["calculo", "novedad"])
async def test_id_indirecto_fuera_alcance_no_consulta_recurso(monkeypatch, tipo):
    if tipo == "calculo":
        monkeypatch.setattr(
            router_he, "autorizar_calculo_id", AsyncMock(side_effect=LookupError())
        )
        cargar = AsyncMock(side_effect=AssertionError("No debe cargar cálculo"))
        monkeypatch.setattr(router_he, "obtener_calculo_completo", cargar)
        llamada = router_he.obtener_calculo_endpoint(
            calculo_id=99, db=SimpleNamespace(), usuario=SimpleNamespace(id="GEST")
        )
    else:
        monkeypatch.setattr(
            router_novedades, "autorizar_novedad_id", AsyncMock(side_effect=LookupError())
        )
        cargar = AsyncMock(side_effect=AssertionError("No debe cargar novedad"))
        monkeypatch.setattr(router_novedades, "obtener_novedad", cargar)
        llamada = router_novedades.obtener_novedad_endpoint(
            novedad_id=99, db=SimpleNamespace(), usuario=SimpleNamespace(id="GEST")
        )
    with pytest.raises(HTTPException) as exc:
        await llamada
    assert exc.value.status_code == 404
    cargar.assert_not_awaited()


class _BiometriaAdminFake:
    def __init__(self):
        self.permitidas = None

    async def obtener_asistencias_admin(
        self, _db, _usuario, permitidas, limit, offset, *_filtros
    ):
        self.permitidas = permitidas
        return {"items": [], "total": 0, "limit": limit, "offset": offset}


@pytest.mark.asyncio
@pytest.mark.parametrize("permitidas", [{"100"}, set()])
async def test_geoface_gestor_relacionado_y_no_relacionado_con_cache(
    monkeypatch, permitidas
):
    monkeypatch.setattr(
        biometria_router, "cedulas_permitidas", AsyncMock(return_value=permitidas)
    )
    service = _BiometriaAdminFake()
    response = Response()
    await biometria_router.asistencias_admin(
        response=response, fecha_desde=None, fecha_hasta=None, usuario_id=None,
        zona_id=None, resultado=None, limit=20, offset=0,
        usuario=SimpleNamespace(id="GEST", rol="gestor"), db=SimpleNamespace(),
        service=service,
    )
    assert service.permitidas == permitidas
    assert response.headers["Cache-Control"] == "no-store, private"


def test_geoface_admin_mantiene_dependencia_rbac():
    ruta = next(
        item for item in biometria_router.router.routes
        if item.path.endswith("/admin/asistencias")
    )
    dependencias = {dependencia.call for dependencia in ruta.dependant.dependencies}
    assert biometria_router.requerir_permiso_biometria in dependencias


def test_jefe_contractual_prioriza_contrato_activo_mas_reciente():
    sesion = _SesionFake(columnas_existentes={
        ("contrato", "jefe"), ("contrato", "fechainicio"),
        ("contrato", "numerocontrato"),
    })
    EmpleadosService.listar_empleados_paginado(sesion, limit=20, offset=0)
    sql = next(sql for sql, _ in sesion.queries if "select distinct on" in sql.lower())
    normalizado = " ".join(sql.lower().split())
    assert "order by e.nrocedula, c.fechainicio desc nulls last, c.numerocontrato desc nulls last" in normalizado


@pytest.mark.asyncio
async def test_erp_caido_devuelve_503_y_cierra_frontera(monkeypatch):
    monkeypatch.setattr(
        horas_extras_erp_validacion, "SessionErp",
        lambda: (_ for _ in ()).throw(ConnectionError("ERP caído")),
    )
    with pytest.raises(HTTPException) as exc:
        await horas_extras_erp_validacion.resolver_parametros_empleado_erp("100")
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_disponibilidad_bloquea_vac_inc_lic(db_session):
    async with _sesion_reversible(db_session) as session:
        categorias = [("VACACION", "VACACIONES"), ("INCAPACIDAD", "INCAPACIDAD"), ("LICENCIA", "LICENCIA")]
        items = []
        for indice, (categoria, motivo) in enumerate(categorias):
            codigo = f"T{uuid4().hex[:8]}"
            cedula = f"70{indice}{str(uuid4().int)[:18]}"
            session.add(NominaCatalogoNovedad(
                codigo=codigo, descripcion_corta=motivo, categoria=categoria,
                subcategoria="TEST", estado="ACTIVO",
            ))
            session.add(NominaNovedadEvento(
                cedula=cedula, codigo_novedad=codigo,
                fecha_inicio=date(2026, 7, 6), fecha_fin=date(2026, 7, 12),
                estado="CONFIRMADO",
            ))
            items.append({"cedula": cedula, "activo": True, "autoriza_he": True})
        await session.commit()
        resultado = await agregar_disponibilidad_semanal(session, items, 2026, 28)
        assert [item["motivo_no_disponible"] for item in resultado] == [motivo for _, motivo in categorias]
        assert all(item["disponible_semana"] is False for item in resultado)


def _override_payload():
    return OverrideAutorizaHECreate(
        cedula="1.007.021.351", autoriza_he_override=True,
        motivo="Autorización de prueba", autorizado_por="Jefatura",
    )


@pytest.mark.asyncio
async def test_post_override_relacionado_canoniza_antes_de_mutar(monkeypatch):
    autorizar = AsyncMock(return_value="1007021351")
    mutar = AsyncMock(return_value=SimpleNamespace())
    monkeypatch.setattr(router_he, "autorizar_cedula", autorizar)
    monkeypatch.setattr(router_he, "crear_override_autoriza_he", mutar)
    payload = _override_payload()

    await router_he.crear_override(
        payload=payload, db=SimpleNamespace(),
        usuario=SimpleNamespace(id="GEST", cedula=None, rol="gestor"),
    )

    assert payload.cedula == "1007021351"
    assert mutar.await_args.args[1].cedula == "1007021351"
    assert autorizar.await_count == 1


@pytest.mark.asyncio
async def test_post_override_no_relacionado_no_muta(monkeypatch):
    monkeypatch.setattr(
        router_he, "autorizar_cedula", AsyncMock(side_effect=PermissionError())
    )
    mutar = AsyncMock(side_effect=AssertionError("No debe mutar"))
    monkeypatch.setattr(router_he, "crear_override_autoriza_he", mutar)

    with pytest.raises(HTTPException) as exc:
        await router_he.crear_override(
            payload=_override_payload(), db=SimpleNamespace(),
            usuario=SimpleNamespace(id="GEST", rol="gestor"),
        )
    assert exc.value.status_code == 404
    mutar.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("rol", ["gestor", "admin"])
async def test_get_overrides_relacionado_o_admin_canoniza_y_no_cache(monkeypatch, rol):
    consultar = AsyncMock(return_value=[])
    monkeypatch.setattr(router_he, "listar_overrides_cedula", consultar)
    if rol == "gestor":
        monkeypatch.setattr(
            router_he, "autorizar_cedula", AsyncMock(return_value="1007021351")
        )
        db = SimpleNamespace()
    else:
        db = None
    response = Response()

    await router_he.listar_overrides(
        response=response, cedula="1.007.021.351", estado="ACTIVO", db=db,
        usuario=SimpleNamespace(id="ADMIN", rol=rol),
    )

    consultar.assert_awaited_once_with(db, "1007021351", "ACTIVO")
    assert response.headers["Cache-Control"] == "no-store, private"


@pytest.mark.asyncio
async def test_get_overrides_no_relacionado_no_consulta(monkeypatch):
    monkeypatch.setattr(
        router_he, "autorizar_cedula", AsyncMock(side_effect=PermissionError())
    )
    consultar = AsyncMock(side_effect=AssertionError("No debe consultar"))
    monkeypatch.setattr(router_he, "listar_overrides_cedula", consultar)

    with pytest.raises(HTTPException) as exc:
        await router_he.listar_overrides(
            response=Response(), cedula="1007021351", estado=None,
            db=SimpleNamespace(), usuario=SimpleNamespace(id="GEST", rol="gestor"),
        )
    assert exc.value.status_code == 404
    consultar.assert_not_awaited()
