"""TDD del catálogo y aplicación auditable de plantillas de horario."""

from datetime import time

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.core.migrations.horarios_relaciones_migration import migrar_horarios_relaciones
from app.models.auth.usuario import Usuario
from app.models.novedades_nomina.schemas_plantillas_horario import (
    PlantillaHorarioCreate,
    PlantillaHorarioDiaIn,
)
from app.services.novedades_nomina.plantillas_horario_service import (
    validar_dias_plantilla,
)


def _semana_base() -> list[PlantillaHorarioDiaIn]:
    return [
        PlantillaHorarioDiaIn(
            dia_semana=dia,
            hora_entrada=time(7, 30) if dia <= 5 else None,
            hora_salida=time(17, 0) if dia <= 5 else None,
            minutos_almuerzo=30 if dia <= 5 else 0,
            cruza_medianoche=False,
        )
        for dia in range(1, 8)
    ]


def test_plantilla_acepta_exactamente_siete_dias():
    payload = PlantillaHorarioCreate(
        nombre="Administrativo",
        descripcion="Lunes a viernes",
        dias=_semana_base(),
    )

    assert [dia.dia_semana for dia in payload.dias] == list(range(1, 8))


def test_plantilla_rechaza_dias_duplicados():
    dias = _semana_base()
    dias[-1] = PlantillaHorarioDiaIn(dia_semana=6)

    with pytest.raises(ValueError, match="días 1 a 7"):
        validar_dias_plantilla(dias)


def test_plantilla_valida_turno_nocturno():
    dia = PlantillaHorarioDiaIn(
        dia_semana=1,
        hora_entrada=time(22, 0),
        hora_salida=time(6, 0),
        minutos_almuerzo=30,
        cruza_medianoche=True,
    )

    assert dia.cruza_medianoche is True


def test_plantilla_rechaza_cruce_sin_flag():
    with pytest.raises(ValidationError, match="cruza_medianoche"):
        PlantillaHorarioDiaIn(
            dia_semana=1,
            hora_entrada=time(22, 0),
            hora_salida=time(6, 0),
            minutos_almuerzo=0,
        )


def test_plantilla_rechaza_flag_en_turno_del_mismo_dia():
    with pytest.raises(ValidationError, match="cruza_medianoche"):
        PlantillaHorarioDiaIn(
            dia_semana=1,
            hora_entrada=time(8, 0),
            hora_salida=time(17, 0),
            cruza_medianoche=True,
        )


def test_plantilla_rechaza_franco_con_almuerzo():
    with pytest.raises(ValidationError, match="franco"):
        PlantillaHorarioDiaIn(dia_semana=7, minutos_almuerzo=30)


@pytest.mark.asyncio
async def test_migracion_es_idempotente_y_preserva_usuarios(db_session):
    usuarios_antes = int(
        await db_session.scalar(select(func.count()).select_from(Usuario)) or 0
    )
    conexion = await db_session.connection()

    await migrar_horarios_relaciones(conexion)
    await migrar_horarios_relaciones(conexion)

    usuarios_despues = int(
        await db_session.scalar(select(func.count()).select_from(Usuario)) or 0
    )
    assert usuarios_despues == usuarios_antes
