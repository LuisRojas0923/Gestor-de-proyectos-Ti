from datetime import date

import pytest
from sqlalchemy import delete
from sqlmodel import select

from app.api.novedades_nomina.routers import horas_extras as horas_extras_router
from app.api.novedades_nomina.routers.horas_extras import confirmar_pre_liquidacion_endpoint
from app.models.auth.usuario import Usuario
from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCostoOt,
    NominaHorarioPactado,
    NominaParametroLegal,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem,
    PreLiquidacionConfirmar,
)


ANIO = 2026
SEMANA = 25
OT_ID = 9001
OT_CODIGO = "OT-TEST-S2-001"
CODIGO_GLOBAL_BOLSA = "BOLSA_GLOBAL_HABILITADA"


def _detalle() -> ConfirmarDetalleItem:
    valor_bruto = 31_250.0
    carga = valor_bruto * 0.52436
    return ConfirmarDetalleItem(
        codigo_novedad="HED",
        horas=2.0,
        factor_hora_ordinaria=1.25,
        valor_bruto=valor_bruto,
        carga_prestacional=carga,
        costo_total=valor_bruto + carga,
    )


def _payload(cedula: str) -> PreLiquidacionConfirmar:
    return PreLiquidacionConfirmar(
        cedula=cedula,
        anio=ANIO,
        semana_iso=SEMANA,
        fecha_inicio=date(ANIO, 6, 16),
        fecha_fin=date(ANIO, 6, 22),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        detalles=[_detalle()],
        ot_id=OT_ID,
        ot_codigo=OT_CODIGO,
        usuario_confirma="USUARIO-FALSIFICADO",
    )


def _usuario_test() -> Usuario:
    return Usuario(
        id="TEST-USER-ENDPOINT-S2",
        cedula="TEST-USER-ENDPOINT-S2",
        hash_contrasena="hash-test",
        nombre="Usuario Test HE S2",
        rol="admin",
    )


async def _cleanup(db_session, cedula: str):
    await db_session.execute(
        delete(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id.in_(
                select(NominaCalculoSemanal.id).where(NominaCalculoSemanal.cedula == cedula)
            )
        )
    )
    await db_session.execute(delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula))
    await db_session.execute(delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == cedula))
    await db_session.execute(delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula))
    await db_session.execute(delete(NominaCostoOt).where(NominaCostoOt.ot_id == OT_ID))
    await db_session.execute(delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula))
    await db_session.execute(delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL_BOLSA))
    await db_session.commit()


@pytest.mark.asyncio
async def test_endpoint_ignora_usuario_confirma_del_cliente(db_session, monkeypatch):
    async def resolver_fake(_cedula, _db_erp):
        return 3_000_000.0, "III"

    async def validar_importes_fake(_db, _payload, _salario_erp, _nivel_erp):
        return None

    monkeypatch.setattr(horas_extras_router, "resolver_parametros_empleado_erp", resolver_fake)
    monkeypatch.setattr(horas_extras_router, "validar_importes_confirmacion", validar_importes_fake)

    cedula = "TEST-S2-ENDPOINT-AUDIT"
    await _cleanup(db_session, cedula)
    try:
        respuesta = await confirmar_pre_liquidacion_endpoint(
            payload=_payload(cedula),
            db=db_session,
            usuario=_usuario_test(),
        )

        calc = await db_session.get(NominaCalculoSemanal, respuesta.calculo_id)
        assert calc is not None
        assert calc.calculado_por == "TEST-USER-ENDPOINT-S2"
        assert calc.confirmado_por == "TEST-USER-ENDPOINT-S2"
    finally:
        await _cleanup(db_session, cedula)
