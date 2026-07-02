"""
Tests del Sprint S5 — Eventos de novedades (AUS/LIC/VAC/INC).

Cobertura:
  - crear: OK con código válido de categoría S5
  - crear: rechaza código de categoría REM u otra
  - crear: rechaza código inexistente
  - crear: rechaza fecha_fin < fecha_inicio
  - crear: rechaza empleado sin horario_pactado
  - crear: detecta solapamiento con evento activo del mismo (cedula, codigo)
  - crear: evento ANULADO no bloquea un nuevo evento en el mismo rango
  - listar: filtros (cedula, codigo, fechas, estado)
  - obtener: 404 si no existe
  - actualizar: solo en BORRADOR; rechaza en CONFIRMADO/ANULADO
  - actualizar: revalida solapamiento si cambia rango o codigo
  - confirmar: BORRADOR → CONFIRMADO; rechaza en otros estados
  - anular: requiere justificación ≥ 5 chars; CONFIRMADO o BORRADOR → ANULADO

Usa cédulas con prefijo TEST-S5- para evitar choques con datos reales.
"""
import pytest
from datetime import date, datetime
from sqlmodel import select
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaHorarioPactado,
)
from app.models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento
from app.models.novedades_nomina.schemas_horas_extras import (
    NovedadEventoCreate,
    NovedadEventoUpdate,
    NovedadAnularRequest,
)
from app.services.novedades_nomina.horas_extras_novedades import (
    crear_novedad_evento,
    listar_novedades,
    obtener_novedad,
    actualizar_novedad,
    confirmar_novedad,
    anular_novedad,
)


# ---------------------------------------------------------------------------
# Fixtures y helpers
# ---------------------------------------------------------------------------

CEDULA = "TEST-S5-1107068093"
CEDULA_SIN_HORARIO = "TEST-S5-SIN-HORARIO"


async def _setup_horario(db_session, cedula: str = CEDULA) -> None:
    """Crea un horario_pactado mínimo para que el empleado sea válido."""
    existe = (
        await db_session.execute(
            select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
        )
    ).scalar_one_or_none()
    if existe:
        return
    hp = NominaHorarioPactado(
        cedula=cedula,
        minutos_jornada_ordinaria=480,
        horas_semana_ordinaria=48,
        es_jornada_nocturna=False,
        autoriza_he_default=True,
        fuente_sincronizacion="TEST",
    )
    db_session.add(hp)
    await db_session.commit()


async def _cleanup(db_session, cedula: str) -> None:
    await db_session.execute(
        delete(NominaNovedadEvento).where(NominaNovedadEvento.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    await db_session.commit()


def _payload(
    cedula: str = CEDULA,
    codigo: str = "LIC",
    fecha_inicio: date = date(2026, 7, 1),
    fecha_fin: date = date(2026, 7, 5),
    observaciones: str | None = "Vacaciones de prueba",
) -> NovedadEventoCreate:
    return NovedadEventoCreate(
        cedula=cedula,
        codigo_novedad=codigo,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        observaciones=observaciones,
    )


# ---------------------------------------------------------------------------
# Crear
# ---------------------------------------------------------------------------

class TestCrearNovedad:
    @pytest.mark.asyncio
    async def test_crear_ok(self, db_session):
        await _setup_horario(db_session)
        try:
            evento = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            assert evento.id is not None
            assert evento.estado == "BORRADOR"
            assert evento.cedula == CEDULA
            assert evento.codigo_novedad == "LIC"
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_crear_rechaza_codigo_inexistente(self, db_session):
        await _setup_horario(db_session)
        try:
            with pytest.raises(ValueError, match="no existe"):
                await crear_novedad_evento(
                    db_session, _payload(codigo="NOPE"), "TEST-USER"
                )
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_crear_rechaza_categoria_fuera_de_s5(self, db_session):
        """REM (retiro) es de S5c, no se permite crear aquí."""
        await _setup_horario(db_session)
        try:
            with pytest.raises(ValueError, match="no existe|novedad soportada"):
                await crear_novedad_evento(
                    db_session, _payload(codigo="REM"), "TEST-USER"
                )
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_crear_rechaza_fecha_fin_menor(self, db_session):
        await _setup_horario(db_session)
        try:
            with pytest.raises(ValueError, match="fecha_fin"):
                await crear_novedad_evento(
                    db_session,
                    _payload(fecha_inicio=date(2026, 7, 5), fecha_fin=date(2026, 7, 1)),
                    "TEST-USER",
                )
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_crear_rechaza_sin_horario_pactado(self, db_session):
        await _cleanup(db_session, CEDULA_SIN_HORARIO)
        with pytest.raises(ValueError, match="horario_pactado"):
            await crear_novedad_evento(
                db_session, _payload(cedula=CEDULA_SIN_HORARIO), "TEST-USER"
            )

    @pytest.mark.asyncio
    async def test_crear_rechaza_solapamiento_mismo_codigo(self, db_session):
        await _setup_horario(db_session)
        try:
            await crear_novedad_evento(
                db_session, _payload(fecha_inicio=date(2026, 7, 1), fecha_fin=date(2026, 7, 5)),
                "TEST-USER",
            )
            with pytest.raises(ValueError, match="solapa"):
                await crear_novedad_evento(
                    db_session,
                    _payload(fecha_inicio=date(2026, 7, 4), fecha_fin=date(2026, 7, 10)),
                    "TEST-USER",
                )
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_crear_permite_evento_anulado_en_mismo_rango(self, db_session):
        """Un evento ANULADO no bloquea nuevos eventos en el mismo rango."""
        await _setup_horario(db_session)
        try:
            ev1 = await crear_novedad_evento(
                db_session,
                _payload(fecha_inicio=date(2026, 8, 1), fecha_fin=date(2026, 8, 5)),
                "TEST-USER",
            )
            await anular_novedad(db_session, ev1.id, "test cleanup", "TEST-USER")

            # Ahora se debe poder crear otro evento en el mismo rango
            ev2 = await crear_novedad_evento(
                db_session,
                _payload(fecha_inicio=date(2026, 8, 1), fecha_fin=date(2026, 8, 5)),
                "TEST-USER",
            )
            assert ev2.id != ev1.id
            assert ev2.estado == "BORRADOR"
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_crear_codigos_de_todas_las_categorias_s5(self, db_session):
        """INC, VAC, AUS, LIC, PNR, RET, SAN, DXT — todas válidas en S5."""
        await _setup_horario(db_session)
        try:
            # Meses distintos para no chocar (sep..nov)
            meses = [9, 10, 11, 12, 9, 10, 11, 12]
            for i, codigo in enumerate(["INC", "VAC", "AUS", "LIC", "PNR", "RET", "SAN", "DXT"]):
                fi = date(2026, meses[i], 1)
                ff = date(2026, meses[i], 3)
                ev = await crear_novedad_evento(
                    db_session,
                    _payload(codigo=codigo, fecha_inicio=fi, fecha_fin=ff),
                    "TEST-USER",
                )
                assert ev.codigo_novedad == codigo
        finally:
            await _cleanup(db_session, CEDULA)


# ---------------------------------------------------------------------------
# Listar
# ---------------------------------------------------------------------------

class TestListarNovedades:
    @pytest.mark.asyncio
    async def test_filtra_por_cedula(self, db_session):
        await _setup_horario(db_session)
        try:
            await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            items = await listar_novedades(db_session, cedula=CEDULA)
            assert len(items) >= 1
            assert all(i.cedula == CEDULA for i in items)
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_filtra_por_estado_y_codigo(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            await confirmar_novedad(db_session, ev.id, "TEST-USER")
            items = await listar_novedades(db_session, codigo="LIC", estado="CONFIRMADO")
            assert all(i.codigo_novedad == "LIC" and i.estado == "CONFIRMADO" for i in items)
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_filtra_por_rango_fechas(self, db_session):
        await _setup_horario(db_session)
        try:
            await crear_novedad_evento(
                db_session,
                _payload(fecha_inicio=date(2026, 10, 1), fecha_fin=date(2026, 10, 3)),
                "TEST-USER",
            )
            items = await listar_novedades(
                db_session, fecha_desde=date(2026, 9, 25), fecha_hasta=date(2026, 10, 31)
            )
            assert any(i.cedula == CEDULA for i in items)
        finally:
            await _cleanup(db_session, CEDULA)


# ---------------------------------------------------------------------------
# Obtener
# ---------------------------------------------------------------------------

class TestObtenerNovedad:
    @pytest.mark.asyncio
    async def test_obtener_existente(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            got = await obtener_novedad(db_session, ev.id)
            assert got is not None
            assert got.id == ev.id
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_obtener_inexistente(self, db_session):
        got = await obtener_novedad(db_session, 999_999)
        assert got is None


# ---------------------------------------------------------------------------
# Actualizar
# ---------------------------------------------------------------------------

class TestActualizarNovedad:
    @pytest.mark.asyncio
    async def test_actualiza_observaciones_en_borrador(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            upd = await actualizar_novedad(
                db_session,
                ev.id,
                NovedadEventoUpdate(observaciones="actualizado"),
                "TEST-USER",
            )
            assert upd.observaciones == "actualizado"
            assert upd.updated_at is not None
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_no_actualiza_en_confirmado(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            await confirmar_novedad(db_session, ev.id, "TEST-USER")
            with pytest.raises(ValueError, match="BORRADOR"):
                await actualizar_novedad(
                    db_session,
                    ev.id,
                    NovedadEventoUpdate(observaciones="x"),
                    "TEST-USER",
                )
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_actualizar_rango_detecta_solapamiento(self, db_session):
        """
        La detección de solapamiento en S5 es por (cedula, codigo).
        Mover un LIC a un rango que solapa con otro LIC del mismo empleado
        debe fallar. (La detección cross-codigo se difiere a S5b.)
        """
        await _setup_horario(db_session)
        try:
            await crear_novedad_evento(
                db_session,
                _payload(fecha_inicio=date(2026, 11, 1), fecha_fin=date(2026, 11, 3)),
                "TEST-USER",
            )
            ev2 = await crear_novedad_evento(
                db_session,
                _payload(
                    codigo="LIC",
                    fecha_inicio=date(2026, 11, 20),
                    fecha_fin=date(2026, 11, 25),
                ),
                "TEST-USER",
            )
            with pytest.raises(ValueError, match="solapa"):
                await actualizar_novedad(
                    db_session,
                    ev2.id,
                    NovedadEventoUpdate(fecha_inicio=date(2026, 11, 2)),
                    "TEST-USER",
                )
        finally:
            await _cleanup(db_session, CEDULA)


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------

class TestConfirmarNovedad:
    @pytest.mark.asyncio
    async def test_borrador_a_confirmado(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            conf = await confirmar_novedad(db_session, ev.id, "TEST-USER")
            assert conf.estado == "CONFIRMADO"
            assert conf.confirmado_at is not None
            assert conf.confirmado_by == "TEST-USER"
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_no_confirmar_en_confirmado(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            await confirmar_novedad(db_session, ev.id, "TEST-USER")
            with pytest.raises(ValueError, match="BORRADOR"):
                await confirmar_novedad(db_session, ev.id, "TEST-USER")
        finally:
            await _cleanup(db_session, CEDULA)


class TestAnularNovedad:
    @pytest.mark.asyncio
    async def test_borrador_a_anulado_con_justificacion(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            anulado = await anular_novedad(db_session, ev.id, "se equivocó de fechas", "TEST-USER")
            assert anulado.estado == "ANULADO"
            assert anulado.anulado_justificacion == "se equivocó de fechas"
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_confirmado_a_anulado(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            await confirmar_novedad(db_session, ev.id, "TEST-USER")
            anulado = await anular_novedad(db_session, ev.id, "anulación retroactiva", "TEST-USER")
            assert anulado.estado == "ANULADO"
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_anular_sin_justificacion_rechaza(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            with pytest.raises(ValueError, match="justificaci"):
                await anular_novedad(db_session, ev.id, "x", "TEST-USER")
        finally:
            await _cleanup(db_session, CEDULA)

    @pytest.mark.asyncio
    async def test_no_anular_dos_veces(self, db_session):
        await _setup_horario(db_session)
        try:
            ev = await crear_novedad_evento(db_session, _payload(), "TEST-USER")
            await anular_novedad(db_session, ev.id, "primera anulación", "TEST-USER")
            with pytest.raises(ValueError, match="anulada"):
                await anular_novedad(db_session, ev.id, "segunda vez", "TEST-USER")
        finally:
            await _cleanup(db_session, CEDULA)
