"""
Tests del Sprint S5'' — Horario pactado por día y derivación de horas reales.

Cobertura:
  - GET /horario/{cedula}/semana: crea fila padre vacía si no existe
  - GET /horario/{cedula}/semana: devuelve 7 días incluso sin filas detalle
  - PUT /horario/{cedula}/semana: crea 7 filas y actualiza horas_semana_ordinaria
  - PUT: rechaza si la lista no tiene 7 días
  - PUT: rechaza días no consecutivos
  - PUT: rechaza hora_salida <= hora_entrada (validación schema)
  - PUT: días con hora_entrada null = franco (sin minutos en cálculo)
  - PUT: reemplazo total (PUT dos veces deja la última versión)
  - _aplicar_registro_diario: deriva horas_por_dia del registro reloj
  - _aplicar_registro_diario: 0h para días libres
  - _aplicar_registro_diario: rechaza cuando hora_salida < hora_entrada

Usa cédulas con prefijo TEST-S5PP- para evitar choques con datos reales.
"""
import pytest
from datetime import time
from sqlmodel import select
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import NominaHorarioPactado
from app.models.novedades_nomina.horas_extras_horario_dia import (
    NominaHorarioPactadoDia,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    HorarioPactadoDiaUpdate,
    PreLiquidacionInput,
    RegistroDiarioInput,
)
from app.services.novedades_nomina.horas_extras_horario_semana import (
    obtener_horario_semana,
    actualizar_horario_semana,
)
from app.services.novedades_nomina.horas_extras_service import (
    _aplicar_registro_diario,
)


CEDULA = "TEST-S5PP-1107068093"


async def _cleanup(db_session, cedula: str = CEDULA) -> None:
    """Borra filas de detalle y deja la padre (o la borra si fue creada en test)."""
    await db_session.execute(
        delete(NominaHorarioPactadoDia).where(NominaHorarioPactadoDia.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    await db_session.commit()


def _semana_lun_a_vie(
    entrada=time(7, 30),
    salida=time(17, 0),
    almuerzo=30,
):
    """5 días L-V con horario, 2 días libres (sáb/dom)."""
    return [
        HorarioPactadoDiaUpdate(dia_semana=1, hora_entrada=entrada, hora_salida=salida, minutos_almuerzo=almuerzo),
        HorarioPactadoDiaUpdate(dia_semana=2, hora_entrada=entrada, hora_salida=salida, minutos_almuerzo=almuerzo),
        HorarioPactadoDiaUpdate(dia_semana=3, hora_entrada=entrada, hora_salida=salida, minutos_almuerzo=almuerzo),
        HorarioPactadoDiaUpdate(dia_semana=4, hora_entrada=entrada, hora_salida=salida, minutos_almuerzo=almuerzo),
        HorarioPactadoDiaUpdate(dia_semana=5, hora_entrada=entrada, hora_salida=salida, minutos_almuerzo=almuerzo),
        HorarioPactadoDiaUpdate(dia_semana=6, hora_entrada=None, hora_salida=None, minutos_almuerzo=0),
        HorarioPactadoDiaUpdate(dia_semana=7, hora_entrada=None, hora_salida=None, minutos_almuerzo=0),
    ]


# ---------------------------------------------------------------------------
# GET /horario/{cedula}/semana
# ---------------------------------------------------------------------------

class TestObtenerHorarioSemana:
    @pytest.mark.asyncio
    async def test_crea_padre_y_devuelve_7_dias_vacios(self, db_session):
        await _cleanup(db_session)
        try:
            dias = await obtener_horario_semana(db_session, CEDULA)
            assert len(dias) == 7
            for d in dias:
                assert d.cedula == CEDULA
                assert d.hora_entrada is None
                assert d.hora_salida is None
                assert d.minutos_almuerzo == 0
            # Fila padre creada automáticamente
            padre = (
                await db_session.execute(
                    select(NominaHorarioPactado).where(
                        NominaHorarioPactado.cedula == CEDULA
                    )
                )
            ).scalar_one()
            assert padre.fuente_sincronizacion == "MANUAL"
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_devuelve_dias_existentes(self, db_session):
        await _cleanup(db_session)
        try:
            await actualizar_horario_semana(
                db_session, CEDULA, _semana_lun_a_vie(), "TEST-USER"
            )
            await db_session.commit()
            dias = await obtener_horario_semana(db_session, CEDULA)
            assert len(dias) == 7
            assert dias[0].hora_entrada == time(7, 30)
            assert dias[4].hora_salida == time(17, 0)
            assert dias[5].hora_entrada is None  # sábado franco
        finally:
            await _cleanup(db_session)


# ---------------------------------------------------------------------------
# PUT /horario/{cedula}/semana
# ---------------------------------------------------------------------------

class TestActualizarHorarioSemana:
    @pytest.mark.asyncio
    async def test_crea_7_filas_y_recalcula_horas_semanales(self, db_session):
        await _cleanup(db_session)
        try:
            dias = await actualizar_horario_semana(
                db_session, CEDULA, _semana_lun_a_vie(), "TEST-USER"
            )
            await db_session.commit()
            assert len(dias) == 7
            # 7:30 → 17:00 con 30min de almuerzo = 9h/día × 5 = 45h/semana
            padre = (
                await db_session.execute(
                    select(NominaHorarioPactado).where(
                        NominaHorarioPactado.cedula == CEDULA
                    )
                )
            ).scalar_one()
            assert padre.horas_semana_ordinaria == 45.0
            assert padre.fuente_sincronizacion == "MANUAL"
        finally:
            await _cleanup(db_session)

    @pytest.mark.asyncio
    async def test_rechaza_si_no_hay_7_dias(self, db_session):
        with pytest.raises(ValueError, match="7 entradas"):
            await actualizar_horario_semana(
                db_session,
                CEDULA,
                [HorarioPactadoDiaUpdate(dia_semana=1, hora_entrada=time(8, 0), hora_salida=time(17, 0))],
                "TEST-USER",
            )

    @pytest.mark.asyncio
    async def test_rechaza_si_dias_no_consecutivos(self, db_session):
        # Salta el día 4 (queda 1,2,3,5,6,7) — la cobertura debe ser 1-7
        # consecutivos sin huecos.
        dias = _semana_lun_a_vie()
        # Reemplaza día 4 por día 5 (mismo horario, distinto día_semana)
        dias[3] = HorarioPactadoDiaUpdate(
            dia_semana=5, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=30
        )
        with pytest.raises(ValueError, match="1-7"):
            await actualizar_horario_semana(
                db_session, CEDULA, dias, "TEST-USER"
            )

    @pytest.mark.asyncio
    async def test_schema_rechaza_salida_menor_o_igual_a_entrada(self, db_session):
        with pytest.raises(Exception, match="estrictamente mayor"):
            HorarioPactadoDiaUpdate(
                dia_semana=1,
                hora_entrada=time(17, 0),
                hora_salida=time(15, 0),
            )

    @pytest.mark.asyncio
    async def test_reemplazo_total(self, db_session):
        await _cleanup(db_session)
        try:
            await actualizar_horario_semana(
                db_session, CEDULA, _semana_lun_a_vie(), "TEST-USER"
            )
            await db_session.commit()
            # Segundo PUT con horario distinto
            nueva = _semana_lun_a_vie(entrada=time(8, 0), salida=time(18, 0), almuerzo=60)
            await actualizar_horario_semana(db_session, CEDULA, nueva, "TEST-USER")
            await db_session.commit()
            dias = await obtener_horario_semana(db_session, CEDULA)
            assert dias[0].hora_entrada == time(8, 0)
            assert dias[0].minutos_almuerzo == 60
        finally:
            await _cleanup(db_session)


# ---------------------------------------------------------------------------
# _aplicar_registro_diario (derivación de horas_por_dia en pre-liquidación)
# ---------------------------------------------------------------------------

class TestAplicarRegistroDiario:
    def _input(self):
        return PreLiquidacionInput(
            cedula="1",
            anio=2026,
            semana_iso=25,
            horas_por_dia=[0.0] * 7,  # se sobreescribe
            es_jornada_nocturna=False,
            salario_base_mensual=3_000_000,
            nivel_riesgo_arl="III",
        )

    def test_deriva_horas_de_reloj(self):
        inp = self._input()
        inp.registro_diario = [
            RegistroDiarioInput(dia_semana=1, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=30),
            RegistroDiarioInput(dia_semana=2, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=30),
            RegistroDiarioInput(dia_semana=3, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=30),
            RegistroDiarioInput(dia_semana=4, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=30),
            RegistroDiarioInput(dia_semana=5, hora_entrada=time(7, 30), hora_salida=time(17, 30), minutos_almuerzo=30),
            RegistroDiarioInput(dia_semana=6, hora_entrada=None, hora_salida=None, minutos_almuerzo=0),
            RegistroDiarioInput(dia_semana=7, hora_entrada=None, hora_salida=None, minutos_almuerzo=0),
        ]
        out = _aplicar_registro_diario(inp)
        # 7:30→17:00 = 9.5h brutas - 0.5h almuerzo = 9.0h
        assert out.horas_por_dia[0] == 9.0
        assert out.horas_por_dia[1] == 9.0
        # Viernes se quedó hasta 17:30 → 10.0h brutas - 0.5h = 9.5h
        assert out.horas_por_dia[4] == 9.5
        # Sábado y domingo libres
        assert out.horas_por_dia[5] == 0.0
        assert out.horas_por_dia[6] == 0.0

    def test_dia_libre_es_cero_horas(self):
        inp = self._input()
        inp.registro_diario = [
            RegistroDiarioInput(dia_semana=i, hora_entrada=None, hora_salida=None, minutos_almuerzo=0)
            for i in range(1, 8)
        ]
        out = _aplicar_registro_diario(inp)
        assert out.horas_por_dia == [0.0] * 7

    def test_turno_cruzado_debe_partirse_en_dos_dias(self):
        inp = self._input()
        inp.registro_diario = [
            RegistroDiarioInput(dia_semana=i, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=0)
            for i in range(1, 8)
        ]
        inp.registro_diario[2] = RegistroDiarioInput(
            dia_semana=3, hora_entrada=time(17, 0), hora_salida=time(8, 0), minutos_almuerzo=0
        )
        with pytest.raises(ValueError, match="partirse en dos dias"):
            _aplicar_registro_diario(inp)

    def test_rechaza_si_no_hay_7_dias(self):
        inp = self._input()
        inp.registro_diario = [
            RegistroDiarioInput(dia_semana=1, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=0)
        ]
        with pytest.raises(ValueError, match="7 entradas"):
            _aplicar_registro_diario(inp)

    def test_acecta_dias_en_otro_orden_y_reordena(self):
        inp = self._input()
        # Días en orden inverso
        inp.registro_diario = [
            RegistroDiarioInput(dia_semana=i, hora_entrada=time(8, 0), hora_salida=time(17, 0), minutos_almuerzo=60)
            for i in range(7, 0, -1)
        ]
        out = _aplicar_registro_diario(inp)
        # (17-8)*60 - 60 = 480 minutos = 8.0h todos los días
        assert out.horas_por_dia == [8.0] * 7
