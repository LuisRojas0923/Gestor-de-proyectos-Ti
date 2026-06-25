"""
Sprint S7 — Persistencia del plan semanal (borrador + confirmacion).

Operaciones:
  - guardar_borrador_plan: bulk upsert horario_pactado_dia + bulk insert
    novedades en BORRADOR. Idempotente por (cedula, dia_semana).
  - confirmar_plan: genera nomina_calculo_semanal por empleado llamando
    al motor actual de confirmacion (respeta S6 BOLSA_DESACTIVADA).

Manejo de errores por empleado: try/except interno para que un fallo no
bloquee el resto del lote. Reporta `errores[]` con cedula + motivo.

db.execute / db.commit envueltos en try/except para satisfacer el Backend
AST Security Auditor (RELIABILITY: API/DB Sin Control).
"""
import logging
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.horas_extras import NominaHorarioPactado
from ...models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from ...models.novedades_nomina.planificador_dia_ot import NominaPlanificadorDiaOt
from ...models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem,
    NovedadEventoCreate,
    PreLiquidacionConfirmar,
)
from ...models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanBulkEmpleadoError,
    PlanBulkRequest,
    PlanBulkResponse,
    PlanConfirmarCalculoItem,
    PlanConfirmarEmpleadoIn,
    PlanConfirmarParametros,
    PlanConfirmarRequest,
    PlanConfirmarResponse,
    PlanConfirmarResumen,
    PlanDiaIn,
    PlanEmpleadoInBase,
    PlanSemanaIn,
)
from ._planificador_common import (
    _calcular_dia,
    _horas_trabajadas_dia,
    _resolver_catalogo_y_factor,
)
from .horas_extras_confirmacion import confirmar_pre_liquidacion
from .planificador_costos_ot import distribuir_costos_ot_plan
from .planificador_ot import validar_asignaciones_ot_dia

logger = logging.getLogger(__name__)

SALARIO_BASE_ESTIMADO = 3_000_000.0
VALOR_HORA_ESTIMADO = 12_500.0
NIVEL_RIESGO_DEFAULT = "III"


# ===========================================================================
# 1) Guardar borrador (bulk upsert horario + bulk insert novedades)
# ===========================================================================

async def guardar_borrador_plan(
    session: AsyncSession,
    payload: PlanBulkRequest,
    usuario_id: Optional[str] = None,
) -> PlanBulkResponse:
    """Persiste el plan semanal en estado BORRADOR.

    Por cada empleado:
      - Asegura fila en nomina_horario_pactado (cabecera).
      - Upsert en nomina_horario_pactado_dia por cada dia (PK cedula+dia_semana).
      - Insert en nomina_novedad_evento por cada novedad (estado BORRADOR).

    Si un empleado falla, se registra en errores[] y se continua con el resto.
    """
    regs_creados = 0
    regs_actualizados = 0
    nov_creadas = 0
    errores: List[PlanBulkEmpleadoError] = []

    for emp_in in payload.empleados:
        try:
            await _guardar_un_empleado(
                session, emp_in, payload.semana, usuario_id
            )
        except Exception as e:
            logger.exception("Error guardando borrador de %s: %s", emp_in.cedula, e)
            errores.append(PlanBulkEmpleadoError(cedula=emp_in.cedula, motivo=str(e)))
            await session.rollback()
            continue

        # Contar filas afectadas — fuera del try/except para que cuente OK
        # incluso si el commit de este empleado fue exitoso.
        for d in emp_in.dias:
            if d.hora_entrada is not None or d.hora_salida is not None:
                regs_creados += 1
        nov_creadas += sum(len(d.novedades) for d in emp_in.dias)

    try:
        await session.commit()
    except Exception as e:
        logger.exception("Error en commit final de borrador: %s", e)
        await session.rollback()
        raise

    return PlanBulkResponse(
        registros_horario_creados=regs_creados,
        registros_horario_actualizados=regs_actualizados,
        novedades_creadas=nov_creadas,
        errores=errores,
    )


async def _guardar_un_empleado(
    session: AsyncSession,
    emp_in: PlanEmpleadoInBase,
    semana: PlanSemanaIn,
    usuario_id: Optional[str],
) -> None:
    """Upsert idempotente de un empleado. Si falla, raise para rollback."""
    cedula = emp_in.cedula.strip()

    # 1. Cabecera nomina_horario_pactado (crear si no existe)
    stmt_h = select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    horario_hdr = (await session.execute(stmt_h)).scalar_one_or_none()
    if horario_hdr is None:
        horario_hdr = NominaHorarioPactado(
            cedula=cedula,
            minutos_jornada_ordinaria=480,
            horas_semana_ordinaria=48.0,
            autoriza_he_default=True,
        )
        session.add(horario_hdr)
        await session.flush()

    # 2. Upsert de cada dia (PK cedula+dia_semana)
    for d in emp_in.dias:
        validar_asignaciones_ot_dia(d)
        stmt_d = select(NominaHorarioPactadoDia).where(
            NominaHorarioPactadoDia.cedula == cedula,
            NominaHorarioPactadoDia.dia_semana == d.dia_semana,
        )
        existing = (await session.execute(stmt_d)).scalar_one_or_none()
        if existing is not None:
            existing.hora_entrada = d.hora_entrada
            existing.hora_salida = d.hora_salida
            existing.minutos_almuerzo = d.minutos_almuerzo
            session.add(existing)
        else:
            session.add(NominaHorarioPactadoDia(
                cedula=cedula,
                dia_semana=d.dia_semana,
                hora_entrada=d.hora_entrada,
                hora_salida=d.hora_salida,
                minutos_almuerzo=d.minutos_almuerzo,
            ))
        await _guardar_asignaciones_ot_dia(session, cedula, semana, d)
    await session.flush()

    # 3. Insert de novedades (estado BORRADOR). No upsert: cada novedad
    # es un evento independiente con su propio rango de fechas.
    from .horas_extras_novedades import crear_novedad_evento

    for d in emp_in.dias:
        for nov in d.novedades:
            payload_nov = NovedadEventoCreate(
                cedula=cedula,
                codigo_novedad=nov.codigo_novedad,
                fecha_inicio=nov.fecha_inicio,
                fecha_fin=nov.fecha_fin,
                observaciones=nov.observaciones,
            )
            await crear_novedad_evento(session, payload_nov, usuario_id)

    await session.flush()


async def _guardar_asignaciones_ot_dia(
    session: AsyncSession,
    cedula: str,
    semana: PlanSemanaIn,
    dia: PlanDiaIn,
) -> None:
    """Reemplaza asignaciones OT/CC del empleado para una semana y dia."""
    await session.execute(
        delete(NominaPlanificadorDiaOt).where(
            NominaPlanificadorDiaOt.anio == semana.anio,
            NominaPlanificadorDiaOt.semana_iso == semana.semana_iso,
            NominaPlanificadorDiaOt.cedula == cedula,
            NominaPlanificadorDiaOt.dia_semana == dia.dia_semana,
        )
    )
    for asignacion in dia.asignaciones_ot:
        session.add(NominaPlanificadorDiaOt(
            anio=semana.anio,
            semana_iso=semana.semana_iso,
            cedula=cedula,
            dia_semana=dia.dia_semana,
            orden=asignacion.orden.strip(),
            cc=asignacion.cc,
            scc=asignacion.scc,
            sub_indice=asignacion.sub_indice,
            categoria_sub_indice=asignacion.categoria_sub_indice,
            descripcion=asignacion.descripcion,
            vr_contratado=asignacion.vr_contratado,
            horas=asignacion.horas,
            porcentaje=asignacion.porcentaje,
        ))


# ===========================================================================
# 2) Confirmar plan (genera nomina_calculo_semanal por empleado)
# ===========================================================================

async def confirmar_plan(
    session: AsyncSession,
    payload: PlanConfirmarRequest,
) -> PlanConfirmarResponse:
    """Genera nomina_calculo_semanal por empleado llamando al motor actual.

    Reutiliza `confirmar_pre_liquidacion` para cada empleado, con su
    parametros y `registro_diario` derivado del plan.

    Errores por empleado (incluido BOLSA_DESACTIVADA de S6) se reportan
    en errores[] sin abortar el lote.
    """
    calculos: List[PlanConfirmarCalculoItem] = []
    errores: List[PlanBulkEmpleadoError] = []
    total_he = 0.0
    total_costo = 0.0

    for emp_in in payload.empleados:
        try:
            parametros = await _resolver_parametros_confirmacion(
                session, emp_in, payload.semana
            )
            for dia in emp_in.dias:
                validar_asignaciones_ot_dia(dia)
                await _guardar_asignaciones_ot_dia(session, emp_in.cedula.strip(), payload.semana, dia)
            await session.flush()
            # 1. Construir PreLiquidacionConfirmar con registro_diario
            detalles = await _construir_detalles_confirmacion(
                session, emp_in, payload.semana, parametros
            )
            tiene_asignaciones_ot = any(d.asignaciones_ot for d in emp_in.dias)
            confirm_payload = PreLiquidacionConfirmar(
                cedula=emp_in.cedula,
                anio=payload.semana.anio,
                semana_iso=payload.semana.semana_iso,
                fecha_inicio=payload.semana.fecha_inicio,
                fecha_fin=payload.semana.fecha_fin,
                nivel_riesgo_arl=parametros.nivel_riesgo_arl,
                factor_prestacional=parametros.factor_prestacional,
                salario_base_mensual=parametros.salario_base_mensual,
                valor_hora_ordinaria=parametros.valor_hora_ordinaria,
                detalles=detalles,
                ot_id=None if tiene_asignaciones_ot else parametros.ot_id,
                ot_codigo=None if tiene_asignaciones_ot else parametros.ot_codigo,
                usuario_confirma=payload.usuario_confirma,
            )
            # 2. Llamar al motor actual
            resultado = await confirmar_pre_liquidacion(session, confirm_payload)
            costo_ot_ids = await distribuir_costos_ot_plan(
                session, emp_in, payload.semana, parametros, resultado.get("calculo_id")
            )
            calculos.append(PlanConfirmarCalculoItem(
                cedula=emp_in.cedula,
                calculo_id=resultado.get("calculo_id"),
                bolsa_id=resultado.get("bolsa_id"),
                horas_acreditadas_bolsa=resultado.get("horas_acreditadas_bolsa", 0.0),
                costo_ot_id=(costo_ot_ids[0] if costo_ot_ids else resultado.get("costo_ot_id")),
                bolsa_habilitada_en_confirmacion=resultado.get(
                    "bolsa_habilitada_en_confirmacion", True
                ),
                bolsa_fuente=resultado.get("bolsa_fuente", "DEFAULT"),
                ok=True,
                mensaje="OK",
            ))
            total_he += sum(d.horas for d in detalles)
            total_costo += sum(d.costo_total for d in detalles)
        except ValueError as e:
            logger.warning("Error confirmando %s: %s", emp_in.cedula, e)
            errores.append(PlanBulkEmpleadoError(cedula=emp_in.cedula, motivo=str(e)))
            await session.rollback()
        except Exception as e:
            logger.exception("Error inesperado confirmando %s: %s", emp_in.cedula, e)
            errores.append(PlanBulkEmpleadoError(cedula=emp_in.cedula, motivo=str(e)))
            await session.rollback()

    return PlanConfirmarResponse(
        calculos=calculos,
        errores=errores,
        resumen=PlanConfirmarResumen(
            ok_count=len(calculos),
            error_count=len(errores),
            total_horas_extras=round(total_he, 2),
            total_costo=round(total_costo, 0),
        ),
    )


async def _resolver_parametros_confirmacion(
    session: AsyncSession,
    emp_in: PlanConfirmarEmpleadoIn,
    semana: PlanSemanaIn,
) -> PlanConfirmarParametros:
    """Resuelve parametros de calculo sin exponerlos en el frontend.

    Cuando el payload trae parametros se respetan para compatibilidad. Si no,
    se usan datos/cache del empleado y factores legales vigentes del backend.
    """
    if emp_in.parametros is not None:
        return emp_in.parametros

    horario = (await session.execute(
        select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == emp_in.cedula)
    )).scalars().first()
    if horario is not None:
        autoriza = (
            horario.autoriza_he_override
            if horario.autoriza_he_override is not None
            else horario.autoriza_he_default
        )
        if not autoriza:
            raise ValueError("Empleado no autorizado para horas extras")
        jornada_nocturna = bool(horario.es_jornada_nocturna)
    else:
        jornada_nocturna = False

    _, factores = await _resolver_catalogo_y_factor(
        session, semana.fecha_inicio, [NIVEL_RIESGO_DEFAULT]
    )
    return PlanConfirmarParametros(
        nivel_riesgo_arl=NIVEL_RIESGO_DEFAULT,
        factor_prestacional=factores[NIVEL_RIESGO_DEFAULT],
        salario_base_mensual=SALARIO_BASE_ESTIMADO,
        valor_hora_ordinaria=VALOR_HORA_ESTIMADO,
        jornada_nocturna=jornada_nocturna,
        ot_id=None,
        ot_codigo=None,
    )


async def _construir_detalles_confirmacion(
    session: AsyncSession,
    emp_in: PlanConfirmarEmpleadoIn,
    semana: PlanSemanaIn,
    parametros: PlanConfirmarParametros,
) -> List[ConfirmarDetalleItem]:
    """Convierte los dias del plan en ConfirmarDetalleItem para el motor.

    Usa el calculo en vivo (cache de catalogo + factor prestacional) para
    emitir los items HED/HEN/HEFD/HEFN correctos.
    """
    fecha_ref = semana.fecha_inicio
    catalogo, factores = await _resolver_catalogo_y_factor(
        session, fecha_ref, [parametros.nivel_riesgo_arl]
    )
    cat_idx = {c["codigo"]: c for c in catalogo}
    factor_prestacional = factores[parametros.nivel_riesgo_arl]
    valor_hora = parametros.valor_hora_ordinaria

    detalles: List[ConfirmarDetalleItem] = []
    dias_idx = {d.dia_semana: d for d in emp_in.dias}

    for dia_semana in range(1, 8):
        d = dias_idx.get(dia_semana)
        if d is None:
            continue
        validar_asignaciones_ot_dia(d)
        codigos_nov = [n.codigo_novedad for n in d.novedades]
        horas_trab = _horas_trabajadas_dia(
            d.hora_entrada, d.hora_salida, d.minutos_almuerzo
        )
        _ht, _ho, horas_ext, codigo_he, _costo = _calcular_dia(
            horas_trab, codigos_nov,
            parametros.jornada_nocturna,
            cat_idx, factor_prestacional, valor_hora,
        )
        if horas_ext <= 0 or codigo_he is None:
            continue
        cat = cat_idx[codigo_he]
        factor = cat["factor_hora_ordinaria"]
        valor_bruto = horas_ext * valor_hora * factor
        carga = valor_bruto * factor_prestacional
        detalles.append(ConfirmarDetalleItem(
            codigo_novedad=codigo_he,
            horas=round(horas_ext, 2),
            factor_hora_ordinaria=factor,
            valor_bruto=round(valor_bruto, 0),
            carga_prestacional=round(carga, 0),
            costo_total=round(valor_bruto + carga, 0),
        ))

    return detalles
