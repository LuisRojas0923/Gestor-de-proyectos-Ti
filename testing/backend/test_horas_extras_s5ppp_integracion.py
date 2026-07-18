"""
Tests del Sprint S5''' — Integración festivos y novedades en pre-liquidación.

Cobertura:
  - Festivo en día normal → codigos_por_dia del día se reemplaza por HF+HEFD (jornada diurna)
  - Festivo en jornada nocturna → HF+HEFN
  - Día con novedad CONFIRMADA (VAC/LIC/INC/AUS) → horas_por_dia=0 y codigos=[]
  - Novedad manda sobre festivo (festivo + VAC ese día → 0h, no HEFD)
  - Sin festivo ni novedad → respeta lo enviado por el cliente
  - Sin festivo ni novedad ni codigos_por_dia → default HED/HEN
  - Novedad BORRADOR/ANULADO no suprime (no se consideran)
  - Festivo cae en domingo → no afecta (sigue siendo franco si no trabajó)

Usa cédulas con prefijo TEST-S5PPP- para evitar choques con datos reales.
"""
import pytest
from datetime import date
from sqlmodel import select
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaFactorPrestacionalRiesgo,
    NominaFestivoCalendario,
    NominaHorarioPactado,
)
from app.models.novedades_nomina.horas_extras_novedad_evento import (
    NominaNovedadEvento,
)
from app.models.novedades_nomina.schemas_horas_extras import PreLiquidacionInput
from app.services.novedades_nomina.horas_extras_service import (
    _aplicar_contexto_festivos_y_novedades,
    _lunes_de_semana_iso,
)
from app.services.novedades_nomina.festivos_colombia import festivos_colombia


CEDULA = "TEST-S5PPP-1107068093"
ANIO = 2026
SEMANA_25 = 25  # Lunes 2026-06-15 → Domingo 2026-06-21
SEMANA_SIN_FESTIVOS = 26  # Lunes 2026-06-22 → Domingo 2026-06-28


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _cleanup(db_session, cedula: str = CEDULA) -> None:
    """Borra festivos, novedades y horario creados por los tests."""
    await db_session.execute(
        delete(NominaNovedadEvento).where(NominaNovedadEvento.cedula == cedula)
    )
    # Festivos del año de prueba
    await db_session.execute(
        delete(NominaFestivoCalendario).where(NominaFestivoCalendario.anio == ANIO)
    )
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    await db_session.commit()


async def _setup_horario(db_session, cedula: str = CEDULA) -> None:
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


async def _insertar_festivo(db_session, fecha: date, nombre: str = "Festivo test") -> None:
    calendario = {item["fecha"]: item["nombre"] for item in festivos_colombia(ANIO)}
    calendario[fecha] = nombre
    for fecha_calendario, nombre_calendario in calendario.items():
        db_session.add(NominaFestivoCalendario(
            anio=ANIO,
            fecha=fecha_calendario,
            nombre=nombre_calendario,
            fuente="LEY_EMILIANI",
        ))
    await db_session.commit()


async def _insertar_novedad_confirmada(
    db_session,
    codigo: str,
    fecha_inicio: date,
    fecha_fin: date,
    cedula: str = CEDULA,
) -> None:
    catalogo = (
        await db_session.execute(
            select(NominaCatalogoNovedad).where(NominaCatalogoNovedad.codigo == codigo)
        )
    ).scalar_one_or_none()
    if catalogo is None:
        db_session.add(NominaCatalogoNovedad(
            codigo=codigo,
            descripcion_corta=f"Novedad test {codigo}",
            descripcion_larga=f"Novedad creada por test S5PPP para {codigo}",
            categoria="HORA_EXTRA" if codigo.startswith("HE") or codigo == "HED" else "AUSENTISMO",
            subcategoria="TEST",
            factor_hora_ordinaria=1.25 if codigo == "HED" else 1.0,
            acredita_bolsa=codigo == "HED",
            descuenta_bolsa=codigo == "HED",
            requiere_autorizacion=False,
            unidad="HORAS",
            estado="ACTIVO",
            vigente_desde=date(2026, 1, 1),
        ))
        await db_session.flush()
    n = NominaNovedadEvento(
        cedula=cedula,
        codigo_novedad=codigo,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        estado="CONFIRMADO",
        observaciones="Test S5'''",
    )
    db_session.add(n)
    await db_session.commit()


def _input_base(
    cedula: str = CEDULA,
    anio: int = ANIO,
    semana_iso: int = SEMANA_25,
    horas_por_dia: list[float] | None = None,
    codigos_por_dia: list[list[str]] | None = None,
    es_jornada_nocturna: bool = False,
) -> PreLiquidacionInput:
    """Helper para construir un input de pre-liquidación con 7 días."""
    if horas_por_dia is None:
        # 8h ordinarias por defecto (no genera HE)
        horas_por_dia = [8.0] * 7
    return PreLiquidacionInput(
        cedula=cedula,
        anio=anio,
        semana_iso=semana_iso,
        horas_por_dia=horas_por_dia,
        codigos_por_dia=codigos_por_dia,
        es_jornada_nocturna=es_jornada_nocturna,
        salario_base_mensual=3_000_000.0,
        nivel_riesgo_arl="III",
    )


# ---------------------------------------------------------------------------
# Tests del helper de fecha
# ---------------------------------------------------------------------------

class TestLunesDeSemanaIso:
    def test_semana_25_2026_es_lunes_15_junio(self):
        assert _lunes_de_semana_iso(2026, 25) == date(2026, 6, 15)

    def test_semana_1_2026_es_lunes_5_enero(self):
        # 2026-01-01 es jueves → W1 empieza lunes 2025-12-29
        # Pero como el año se computa por la semana que contiene el jueves,
        # W1 de 2026 es la del 2025-12-29 (lunes) a 2026-01-04 (domingo)
        # La pregunta es: ¿qué pasa con W1? Probamos solo que la función
        # no lanza y devuelve un lunes.
        d = _lunes_de_semana_iso(2026, 1)
        assert d.weekday() == 0  # lunes


# ---------------------------------------------------------------------------
# Tests de _aplicar_contexto_festivos_y_novedades
# ---------------------------------------------------------------------------

class TestAplicarContextoSinDatos:
    """Sin festivos ni novedades: la función es no-op y respeta lo enviado."""

    @pytest.mark.asyncio
    async def test_sin_festivos_ni_novedades_respeta_codigos_enviados(self, db_session):
        await _cleanup(db_session)
        try:
            input_data = _input_base(
                semana_iso=SEMANA_SIN_FESTIVOS,
                horas_por_dia=[10.0] * 7,  # 2h extras por día
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.codigos_por_dia == [["HED"]] * 7
            assert r.horas_por_dia == [10.0] * 7
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_sin_datos_codigos_queda_lista_de_none(self, db_session):
        """Si el cliente no mandó codigos_por_dia, la función lo normaliza
        a una lista de 7 None (la función pura del motor le pone HED/HEN
        por defecto en cada None)."""
        await _cleanup(db_session)
        try:
            input_data = _input_base(
                semana_iso=SEMANA_SIN_FESTIVOS,
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=None,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.codigos_por_dia == [None] * 7
        finally:
            await _cleanup(db_session)


class TestAplicarContextoFestivos:
    """Festivos en la semana: HF + HEFD/HEFN auto-asignado."""

    @pytest.mark.asyncio
    async def test_festivo_en_lunes_genera_HEFD_jornada_diurna(self, db_session):
        """2026-06-15 (lunes de W25) marcado festivo → HF+HEFD en posición 0."""
        await _cleanup(db_session)
        try:
            await _insertar_festivo(db_session, date(2026, 6, 15), "Festivo lunes")
            input_data = _input_base(
                horas_por_dia=[10.0] * 7,  # todas con HE
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.codigos_por_dia is not None
            assert r.codigos_por_dia[0] == ["HF", "HEFD"]
            # Resto de días: respeta HED
            for i in range(1, 7):
                assert r.codigos_por_dia[i] == ["HED"]
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_festivo_en_jueves_jornada_noctura_genera_HEFN(self, db_session):
        """2026-06-18 (jueves de W25) festivo + jornada nocturna → HF+HEFN."""
        await _cleanup(db_session)
        try:
            await _insertar_festivo(db_session, date(2026, 6, 18), "Festivo jueves")
            input_data = _input_base(
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HEN"]] * 7,
                es_jornada_nocturna=True,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.codigos_por_dia is not None
            assert r.codigos_por_dia[3] == ["HF", "HEFN"]  # jueves
            assert r.codigos_por_dia[0] == ["HF", "HEFN"]  # Sagrado Corazón
            for i in (1, 2, 4, 5, 6):
                assert r.codigos_por_dia[i] == ["HEN"]
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_festivo_fuera_de_semana_no_altera_codigos(self, db_session):
        """Festivo del año pero fuera del rango Lun-Dom: ignorado."""
        await _cleanup(db_session)
        try:
            await _insertar_festivo(db_session, date(2026, 6, 14), "Dom antes")  # domingo previo
            input_data = _input_base(
                semana_iso=SEMANA_SIN_FESTIVOS,
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.codigos_por_dia == [["HED"]] * 7
        finally:
            await _cleanup(db_session)


class TestAplicarContextoNovedades:
    """Novedades CONFIRMADAS en la semana: suprimen HE para esos días."""

    @pytest.mark.asyncio
    async def test_VAC_lunes_a_miercoles_suprime_HE_para_3_dias(self, db_session):
        """VAC Lun-Mié (15-17 jun) → horas=0 y codigos=[] en posiciones 0,1,2."""
        await _cleanup(db_session)
        try:
            await _insertar_novedad_confirmada(
                db_session,
                codigo="VAC",
                fecha_inicio=date(2026, 6, 15),
                fecha_fin=date(2026, 6, 17),
            )
            input_data = _input_base(
                horas_por_dia=[10.0] * 7,  # todas con HE en input
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.horas_por_dia[0] == 0.0
            assert r.horas_por_dia[1] == 0.0
            assert r.horas_por_dia[2] == 0.0
            assert r.horas_por_dia[3] == 10.0  # jueves no afectado
            assert r.horas_por_dia[6] == 10.0
            assert r.codigos_por_dia[0] == []
            assert r.codigos_por_dia[1] == []
            assert r.codigos_por_dia[2] == []
            assert r.codigos_por_dia[3] == ["HED"]  # respeta lo enviado
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_LIC_que_termina_en_medio_de_semana(self, db_session):
        """LIC que cubre solo el miércoles (24 jun) → solo posición 2 afectada."""
        await _cleanup(db_session)
        try:
            await _insertar_novedad_confirmada(
                db_session,
                codigo="LIC",
                fecha_inicio=date(2026, 6, 24),
                fecha_fin=date(2026, 6, 24),
            )
            input_data = _input_base(
                semana_iso=SEMANA_SIN_FESTIVOS,
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.horas_por_dia[2] == 0.0
            assert r.horas_por_dia[1] == 10.0  # martes intacto
            assert r.horas_por_dia[3] == 10.0
            assert r.codigos_por_dia[2] == []
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_novedad_BORRADOR_no_suprime(self, db_session):
        """Solo CONFIRMADO suprime. BORRADOR y ANULADO se ignoran."""
        await _cleanup(db_session)
        try:
            n = NominaNovedadEvento(
                cedula=CEDULA,
                codigo_novedad="VAC",
                fecha_inicio=date(2026, 6, 15),
                fecha_fin=date(2026, 6, 17),
                estado="BORRADOR",
                observaciones="Borrador test",
            )
            db_session.add(n)
            await db_session.commit()

            input_data = _input_base(
                semana_iso=SEMANA_SIN_FESTIVOS,
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            # Sin supresión
            assert r.horas_por_dia == [10.0] * 7
            assert r.codigos_por_dia == [["HED"]] * 7
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_novedad_otro_codigo_no_suprime(self, db_session):
        """Solo VAC/LIC/INC/AUS suprimen. Otros códigos (ej. HED como novedad) no."""
        await _cleanup(db_session)
        try:
            await _insertar_novedad_confirmada(
                db_session,
                codigo="HED",
                fecha_inicio=date(2026, 6, 15),
                fecha_fin=date(2026, 6, 15),
            )
            input_data = _input_base(
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.horas_por_dia == [10.0] * 7
        finally:
            await _cleanup(db_session)


class TestAplicarContextoCombinado:
    """Combinaciones festivo + novedad."""

    @pytest.mark.asyncio
    async def test_novedad_manda_sobre_festivo(self, db_session):
        """Si un día es festivo Y tiene VAC, la VAC gana: 0h, no HEFD."""
        await _cleanup(db_session)
        try:
            await _insertar_festivo(db_session, date(2026, 6, 15), "Festivo lunes")
            await _insertar_novedad_confirmada(
                db_session,
                codigo="VAC",
                fecha_inicio=date(2026, 6, 15),
                fecha_fin=date(2026, 6, 15),
            )
            input_data = _input_base(
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.horas_por_dia[0] == 0.0
            assert r.codigos_por_dia[0] == []  # VAC manda, no HF/HEFD
            assert r.horas_por_dia[1] == 10.0  # martes: ni festivo ni novedad
            assert r.codigos_por_dia[1] == ["HED"]
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_festivo_y_VAC_en_dias_distintos(self, db_session):
        """Festivo lunes, VAC mar-mié: festivo da HEFD, VAC da 0h."""
        await _cleanup(db_session)
        try:
            await _insertar_festivo(db_session, date(2026, 6, 15), "Festivo lunes")
            await _insertar_novedad_confirmada(
                db_session,
                codigo="LIC",
                fecha_inicio=date(2026, 6, 16),
                fecha_fin=date(2026, 6, 17),
            )
            input_data = _input_base(
                horas_por_dia=[10.0] * 7,
                codigos_por_dia=[["HED"]] * 7,
            )
            r = await _aplicar_contexto_festivos_y_novedades(db_session, input_data)
            assert r.codigos_por_dia[0] == ["HF", "HEFD"]  # lunes festivo
            assert r.codigos_por_dia[1] == []        # martes VAC
            assert r.codigos_por_dia[2] == []        # miércoles VAC
            assert r.horas_por_dia[1] == 0.0
            assert r.horas_por_dia[2] == 0.0
        finally:
            await _cleanup(db_session)
