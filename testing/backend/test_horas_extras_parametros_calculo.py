"""Tests de parametros editables para reglas de horas extras."""
from datetime import date

import pytest
from fastapi.routing import APIRoute
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaFactorPrestacionalRiesgo,
    NominaParametroLegal,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    ParametroCalculoUpdate,
    ParametrosCalculoUpdateRequest,
    PreLiquidacionInput,
)
from app.services.novedades_nomina.horas_extras_parametros import (
    CODIGOS_PARAMETROS_CALCULO,
    actualizar_parametros_calculo,
    listar_parametros_calculo,
)
from app.services.novedades_nomina.horas_extras_service import ejecutar_pre_liquidacion


CODIGO_TEST = "TEST-PARAM-HE"


def test_parametros_calculo_route_no_duplica_prefijo_y_exige_permiso_he():
    from app.main import app

    rutas = {getattr(route, "path", "") for route in app.routes}
    ruta_esperada = "/api/v2/novedades-nomina/horas-extras/parametros-calculo"
    assert ruta_esperada in rutas
    assert "/api/v2/novedades-nomina/horas-extras/horas-extras/parametros-calculo" not in rutas

    route = next(
        route for route in app.routes
        if isinstance(route, APIRoute) and route.path == ruta_esperada
    )
    dependencias = {getattr(dep.call, "__name__", "") for dep in route.dependant.dependencies}
    assert "requiere_permiso_he_admin" in dependencias


async def _cleanup(db_session):
    await db_session.execute(
        delete(NominaParametroLegal).where(
            NominaParametroLegal.codigo.in_(CODIGOS_PARAMETROS_CALCULO)
        )
    )
    await db_session.execute(
        delete(NominaCatalogoNovedad).where(NominaCatalogoNovedad.codigo == "HED")
    )
    await db_session.execute(
        delete(NominaFactorPrestacionalRiesgo).where(
            NominaFactorPrestacionalRiesgo.nivel_riesgo == "III"
        )
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_lista_reglas_confirmadas_por_defecto(db_session):
    await _cleanup(db_session)
    try:
        reglas = await listar_parametros_calculo(db_session)
        por_codigo = {r.codigo: r for r in reglas.parametros}

        assert por_codigo["HORAS_ORDINARIAS_SEMANALES_VIGENTE"].valor == "42"
        assert por_codigo["DIVISOR_HORA_ORDINARIA_VIGENTE"].valor == "210"
        assert por_codigo["HORA_NOCTURNA_INICIO"].valor == "19:00"
        assert por_codigo["HORA_NOCTURNA_FIN"].valor == "06:00"
    finally:
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_actualiza_parametro_legal_editable(db_session):
    await _cleanup(db_session)
    try:
        payload = ParametrosCalculoUpdateRequest(
            parametros=[
                ParametroCalculoUpdate(
                    codigo="HORA_NOCTURNA_INICIO",
                    valor="20:00",
                    observaciones="Ajuste de prueba",
                )
            ]
        )

        reglas = await actualizar_parametros_calculo(db_session, payload, "TEST-USER")
        por_codigo = {r.codigo: r for r in reglas.parametros}

        assert por_codigo["HORA_NOCTURNA_INICIO"].valor == "20:00"
        assert por_codigo["HORA_NOCTURNA_INICIO"].observaciones == "Ajuste de prueba"
    finally:
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_calculo_usa_divisor_vigente_editado(db_session):
    await _cleanup(db_session)
    try:
        from sqlmodel import select as _select
        existente_hed = (
            await db_session.execute(
                _select(NominaCatalogoNovedad).where(
                    NominaCatalogoNovedad.codigo == "HED"
                )
            )
        ).scalar_one_or_none()
        if existente_hed is None:
            db_session.add(
                NominaCatalogoNovedad(
                    codigo="HED",
                    descripcion_corta="Hora extra diurna",
                    categoria="HORA_EXTRA",
                    subcategoria="DIURNA",
                    factor_hora_ordinaria=1.25,
                    acredita_bolsa=True,
                    descuenta_bolsa=True,
                    requiere_autorizacion=True,
                    unidad="HORAS",
                    estado="ACTIVO",
                    vigente_desde=date(2026, 1, 1),
                )
            )
        existente_arl = (
            await db_session.execute(
                _select(NominaFactorPrestacionalRiesgo).where(
                    NominaFactorPrestacionalRiesgo.nivel_riesgo == "III"
                )
            )
        ).scalar_one_or_none()
        if existente_arl is None:
            db_session.add(
                NominaFactorPrestacionalRiesgo(
                    nivel_riesgo="III",
                    nivel_macro="OPERATIVO",
                    factor_prestacional=0.52436,
                    vigente_desde=date(2026, 1, 1),
                )
            )
        await db_session.commit()
        await actualizar_parametros_calculo(
            db_session,
            ParametrosCalculoUpdateRequest(
                parametros=[
                    ParametroCalculoUpdate(
                        codigo="DIVISOR_HORA_ORDINARIA_VIGENTE",
                        valor="200",
                    )
                ]
            ),
            "TEST-USER",
        )

        resultado = await ejecutar_pre_liquidacion(
            db_session,
            PreLiquidacionInput(
                cedula=CODIGO_TEST,
                anio=2026,
                semana_iso=30,
                horas_por_dia=[9.0, 9.0, 9.0, 9.0, 9.0, 0.0, 0.0],
                salario_base_mensual=3_000_000,
                nivel_riesgo_arl="III",
            ),
        )

        assert resultado.valor_hora_ordinaria == pytest.approx(15_000)
    finally:
        await _cleanup(db_session)
