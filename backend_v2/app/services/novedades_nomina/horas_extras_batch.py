"""
Job batch diario para refrescar el cache de horario_pactado desde el ERP.

Decisión E1: se ejecuta una vez al día a las 02:00 hora local.
Refresca:
  - nomina_horario_pactado.autoriza_he_default  ← beneficio.autorizacionhorasextras (ERP)
  - nomina_horario_pactado.sincronizado_en      ← timestamp
  - nomina_horario_pactado.fuente_sincronizacion ← 'ERP'

Los overrides del portal (autoriza_he_override) NO se tocan: tienen
vigencia y trazabilidad propia en nomina_override_autoriza_he.
"""
import asyncio
import logging
from datetime import datetime
from sqlalchemy import text
from sqlmodel import select

from ...database import AsyncSessionLocal, SessionErp
from ...models.novedades_nomina.horas_extras import NominaHorarioPactado
from ..erp.empleados_service import _normalizar_nivel_riesgo

logger = logging.getLogger(__name__)


async def refrescar_horario_pactado_empleado(cedula: str) -> bool:
    """
    Refresca una sola fila de nomina_horario_pactado desde el ERP.
    Retorna True si la fila existe en el ERP, False en caso contrario.
    """
    with SessionErp() as db_erp:
        row = db_erp.execute(
            text("""
                SELECT DISTINCT ON (E.nrocedula)
                    E.nrocedula,
                    B.autorizacionhorasextras AS autoriza_he,
                    C.riesgoarl
                FROM establecimiento E
                LEFT JOIN contrato C
                    ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
                    AND C.estado = 'Activo'
                LEFT JOIN beneficio B
                    ON TRIM(CAST(B.contrato AS TEXT)) = TRIM(CAST(C.numerocontrato AS TEXT))
                    AND B.estado = 'Activo'
                WHERE TRIM(CAST(E.nrocedula AS TEXT)) = :cedula
                ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
            """),
            {"cedula": cedula.strip()},
        ).first()

    if not row:
        return False

    autoriza_he = bool(row.autoriza_he) if row.autoriza_he is not None else False
    nivel_riesgo = _normalizar_nivel_riesgo(row.riesgoarl)

    async with AsyncSessionLocal() as session:
        stmt = select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
        existing = (await session.execute(stmt)).scalar_one_or_none()

        if existing is None:
            session.add(
                NominaHorarioPactado(
                    cedula=cedula,
                    autoriza_he_default=autoriza_he,
                    sincronizado_en=datetime.now(),
                    fuente_sincronizacion="ERP",
                )
            )
        else:
            # Solo refrescamos el default; el override lo mantiene el portal.
            existing.autoriza_he_default = autoriza_he
            existing.sincronizado_en = datetime.now()
            existing.fuente_sincronizacion = "ERP"
            session.add(existing)
        await session.commit()
    return True


async def refrescar_todos_los_horarios(batch_size: int = 200) -> dict:
    """
    Refresca el cache de horario_pactado para todos los empleados activos del ERP.
    Retorna métricas: {procesados, encontrados, errores}.
    """
    with SessionErp() as db_erp:
        cedulas_rows = db_erp.execute(
            text("""
                SELECT DISTINCT TRIM(CAST(E.nrocedula AS TEXT)) AS cedula
                FROM establecimiento E
                WHERE E.nrocedula IS NOT NULL
            """)
        ).fetchall()
    cedulas = [str(r.cedula) for r in cedulas_rows if r.cedula]

    encontrados = 0
    errores = 0
    for i in range(0, len(cedulas), batch_size):
        bloque = cedulas[i:i + batch_size]
        for cedula in bloque:
            try:
                ok = await refrescar_horario_pactado_empleado(cedula)
                if ok:
                    encontrados += 1
            except Exception as e:
                logger.warning(f"Error refrescando horario_pactado para {cedula}: {e}")
                errores += 1
    return {
        "procesados": len(cedulas),
        "encontrados": encontrados,
        "errores": errores,
        "timestamp": datetime.now().isoformat(),
    }


async def iniciar_loop_refrescamiento_diario(hora_objetivo: int = 2):
    """
    Loop en background que ejecuta el refrescamiento una vez al día
    a la hora indicada (por defecto 02:00 local).

    Calcula los segundos hasta la próxima hora objetivo y duerme.
    Si la app reinicia justo después de la hora, ejecuta en el siguiente ciclo.
    """
    logger.info(
        f"Iniciando loop de refrescamiento diario de horario_pactado "
        f"(hora objetivo: {hora_objetivo:02d}:00)"
    )
    while True:
        ahora = datetime.now()
        objetivo = ahora.replace(hour=hora_objetivo, minute=0, second=0, microsecond=0)
        if objetivo <= ahora:
            # Ya pasó hoy; apuntamos a mañana
            objetivo = objetivo.replace(day=objetivo.day + 1)
        espera_seg = (objetivo - ahora).total_seconds()
        logger.info(
            f"Próximo refrescamiento de horario_pactado en {espera_seg / 3600:.1f}h"
        )
        await asyncio.sleep(espera_seg)
        try:
            resultado = await refrescar_todos_los_horarios()
            logger.info(f"Refrescamiento diario completado: {resultado}")
        except Exception as e:
            logger.error(f"Error en refrescamiento diario: {e}")
