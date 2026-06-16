"""
Tests del Sprint S5' — Festivos nacionales (Ley Emiliani + Calendarific).

Cobertura:
  - Pascua correcta para 2024-2030 (validar contra fechas canónicas)
  - Total siempre 18 festivos por año
  - Traslado a lunes cuando festivo cae en domingo (Ley 51/1983)
  - listar_festivos con fuente='auto' (lee DB o calcula Emiliani)
  - listar_festivos con fuente='emiliani' (siempre calcula)
  - sincronizar_festivos con Calendarific exitoso persiste 'CALENDARIFIC'
  - sincronizar_festivos con Calendarific caído usa 'LEY_EMILIANI'
  - cliente Calendarific: key vacía → CalendarificError
  - cliente Calendarific: 5xx → CalendarificError
"""
import pytest
from datetime import date, timedelta
from unittest.mock import patch, AsyncMock
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import NominaFestivoCalendario
from app.services.novedades_nomina.festivos_colombia import pascua, festivos_colombia
from app.services.novedades_nomina.festivos_service import (
    listar_festivos,
    sincronizar_festivos,
)
from app.services.novedades_nomina.calendarific_client import (
    obtener_festivos_calendarific,
    CalendarificError,
)


# ---------------------------------------------------------------------------
# Cálculo de Pascua (algoritmo Meeus/Jones/Butcher)
# ---------------------------------------------------------------------------

class TestPascua:
    @pytest.mark.parametrize("anio,esperado", [
        (2024, date(2024, 3, 31)),
        (2025, date(2025, 4, 20)),
        (2026, date(2026, 4, 5)),
        (2027, date(2027, 3, 28)),
        (2028, date(2028, 4, 16)),
        (2029, date(2029, 4, 1)),
        (2030, date(2030, 4, 21)),
    ])
    def test_pascua_años_conocidos(self, anio, esperado):
        assert pascua(anio) == esperado


# ---------------------------------------------------------------------------
# Festivos Colombia (Ley Emiliani)
# ---------------------------------------------------------------------------

class TestFestivosColombia:
    def test_total_18_por_anio(self):
        for anio in [2024, 2025, 2026, 2027, 2028, 2029, 2030]:
            f = festivos_colombia(anio)
            assert len(f) == 18, f"Año {anio} debería tener 18 festivos, tiene {len(f)}"

    def test_anio_nuevo_siempre_fijo(self):
        for anio in [2025, 2026, 2027, 2028]:
            f = festivos_colombia(anio)
            anio_nuevo = next(x for x in f if x["nombre"] == "Año Nuevo")
            assert anio_nuevo["fecha"] == date(anio, 1, 1)
            assert anio_nuevo["trasladado"] is False

    def test_navidad_siempre_fija(self):
        for anio in [2025, 2026, 2027, 2028]:
            f = festivos_colombia(anio)
            navidad = next(x for x in f if x["nombre"] == "Navidad")
            assert navidad["fecha"] == date(anio, 12, 25)
            assert navidad["trasladado"] is False

    def test_traslado_a_lunes_cuando_cae_en_domingo(self):
        """
        2025-06-29 (San Pedro y San Pablo) cae en domingo → se traslada
        al lunes 2025-06-30 (caso real documentado).
        """
        f = festivos_colombia(2025)
        san_pedro = next(x for x in f if x["nombre"] == "San Pedro y San Pablo")
        assert san_pedro["fecha"] == date(2025, 6, 30)
        assert san_pedro["trasladado"] is True

    def test_no_traslado_si_no_es_domingo(self):
        """2026-01-06 (Reyes Magos) cae en martes → no se traslada."""
        f = festivos_colombia(2026)
        reyes = next(x for x in f if x["nombre"] == "Día de los Reyes Magos")
        assert reyes["fecha"] == date(2026, 1, 6)
        assert reyes["trasladado"] is False

    def test_jueves_y_viernes_santo_coinciden_con_pascua(self):
        """Jueves Santo = Pascua - 3, Viernes Santo = Pascua - 2."""
        for anio in [2025, 2026, 2027]:
            f = festivos_colombia(anio)
            p = pascua(anio)
            jueves = next(x for x in f if x["nombre"] == "Jueves Santo")
            viernes = next(x for x in f if x["nombre"] == "Viernes Santo")
            # Jueves/Viernes Santo no se trasladan (nunca caen en domingo)
            assert jueves["fecha"] == p - timedelta(days=3)
            assert viernes["fecha"] == p - timedelta(days=2)

    def test_2026_todos_santos_se_traslada(self):
        """2026-11-01 (Todos los Santos) cae en domingo → 2026-11-02."""
        f = festivos_colombia(2026)
        ts = next(x for x in f if x["nombre"] == "Día de Todos los Santos")
        assert ts["fecha"] == date(2026, 11, 2)
        assert ts["trasladado"] is True

    def test_orden_cronologico(self):
        """Los festivos vienen ordenados por fecha ascendente."""
        for anio in [2025, 2026, 2027]:
            f = festivos_colombia(anio)
            fechas = [x["fecha"] for x in f]
            assert fechas == sorted(fechas)


# ---------------------------------------------------------------------------
# Service: listar y sincronizar
# ---------------------------------------------------------------------------

async def _cleanup_anio(db_session, anio: int):
    await db_session.execute(
        delete(NominaFestivoCalendario).where(NominaFestivoCalendario.anio == anio)
    )
    await db_session.commit()


class TestListarFestivos:
    @pytest.mark.asyncio
    async def test_auto_sin_db_retorna_emiliani(self, db_session):
        anio = 2099  # año sin sincronizar
        await _cleanup_anio(db_session, anio)
        resultado = await listar_festivos(db_session, anio, fuente="auto")
        assert len(resultado) == 18
        assert all(r["fuente"] == "LEY_EMILIANI" for r in resultado)

    @pytest.mark.asyncio
    async def test_emiliani_ignora_db(self, db_session):
        """fuente='emiliani' siempre calcula, aunque haya datos en DB."""
        anio = 2098
        await _cleanup_anio(db_session, anio)
        resultado = await listar_festivos(db_session, anio, fuente="emiliani")
        assert len(resultado) == 18
        assert all(r["fuente"] == "LEY_EMILIANI" for r in resultado)

    @pytest.mark.asyncio
    async def test_calendarific_sin_datos_retorna_vacio(self, db_session):
        anio = 2097
        await _cleanup_anio(db_session, anio)
        resultado = await listar_festivos(db_session, anio, fuente="calendarific")
        assert resultado == []


class TestSincronizarFestivos:
    @pytest.mark.asyncio
    async def test_con_calendarific_exitoso_persiste_calendarific(self, db_session):
        anio = 2096
        await _cleanup_anio(db_session, anio)
        cf_mock = [
            {"fecha": date(anio, 1, 1), "nombre": "Año Nuevo"},
            {"fecha": date(anio, 5, 1), "nombre": "Día del Trabajo"},
        ]
        with patch(
            "app.services.novedades_nomina.festivos_service.obtener_festivos_calendarific",
            new=AsyncMock(return_value=cf_mock),
        ):
            resultado = await sincronizar_festivos(db_session, anio)

        assert resultado["fuente"] == "CALENDARIFIC"
        assert resultado["cantidad"] == 2
        assert resultado["calendarific_error"] is None

        # Verificar DB
        en_db = await listar_festivos(db_session, anio, fuente="calendarific")
        assert len(en_db) == 2
        assert all(r["fuente"] == "CALENDARIFIC" for r in en_db)
        await _cleanup_anio(db_session, anio)

    @pytest.mark.asyncio
    async def test_con_calendarific_caido_usa_emiliani(self, db_session):
        anio = 2095
        await _cleanup_anio(db_session, anio)
        with patch(
            "app.services.novedades_nomina.festivos_service.obtener_festivos_calendarific",
            new=AsyncMock(side_effect=CalendarificError("API caída")),
        ):
            resultado = await sincronizar_festivos(db_session, anio)

        assert resultado["fuente"] == "LEY_EMILIANI"
        assert resultado["cantidad"] == 18
        assert "API caída" in resultado["calendarific_error"]

        en_db = await listar_festivos(db_session, anio, fuente="auto")
        assert len(en_db) == 18
        assert all(r["fuente"] == "LEY_EMILIANI" for r in en_db)
        await _cleanup_anio(db_session, anio)

    @pytest.mark.asyncio
    async def test_sincronizacion_borra_datos_previos(self, db_session):
        """Sincronizar dos veces seguidas no duplica registros."""
        anio = 2094
        await _cleanup_anio(db_session, anio)
        with patch(
            "app.services.novedades_nomina.festivos_service.obtener_festivos_calendarific",
            new=AsyncMock(side_effect=CalendarificError("")),
        ):
            await sincronizar_festivos(db_session, anio)
            await sincronizar_festivos(db_session, anio)

        en_db = await listar_festivos(db_session, anio, fuente="auto")
        assert len(en_db) == 18
        await _cleanup_anio(db_session, anio)


# ---------------------------------------------------------------------------
# Cliente Calendarific
# ---------------------------------------------------------------------------

class TestCalendarificClient:
    @pytest.mark.asyncio
    async def test_key_vacia_raises(self, monkeypatch):
        from app.config import config
        monkeypatch.setattr(config, "calendarific_api_key", None)
        with pytest.raises(CalendarificError, match="no configurada"):
            await obtener_festivos_calendarific(2026)

    @pytest.mark.asyncio
    async def test_5xx_raises(self, monkeypatch):
        from app.config import config
        import httpx
        monkeypatch.setattr(config, "calendarific_api_key", "fake-key")

        class _MockClient:
            def __init__(self, *a, **kw): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *a): pass
            async def get(self, *a, **kw):
                return httpx.Response(503, text="Service Unavailable")

        monkeypatch.setattr(
            "app.services.novedades_nomina.calendarific_client.httpx.AsyncClient",
            _MockClient,
        )
        with pytest.raises(CalendarificError, match="503"):
            await obtener_festivos_calendarific(2026)
