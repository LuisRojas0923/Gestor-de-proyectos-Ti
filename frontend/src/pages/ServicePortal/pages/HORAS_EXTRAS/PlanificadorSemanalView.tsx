import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { confirmarPlan, guardarBorradorPlan, preCalcularPlan } from '../../../../services/horasExtrasService';
import type { EmpleadoERPRead, PlanAsignacionOtIn, PlanBulkRequest, PlanConfirmarRequest,
  PlanDiaIn, PlanEmpleadoInBase, PlanPreCalculoResponse, PlanSemanaIn } from '../../../../types/horasExtrasPlanificador';
import CeldaDiaEditor from './components/CeldaDiaEditor';
import ResumenPlan from './components/ResumenPlan';
import PlanificadorHeader from './components/PlanificadorHeader';
import HorarioMasivoCard from './components/HorarioMasivoCard';
import AsignacionOtMasivaCard from './components/AsignacionOtMasivaCard';
import EmpleadosActivosPanel from './components/EmpleadosActivosPanel';
import ConfirmarSemanaModal from './components/ConfirmarSemanaModal';
import SelectorVistaHorario, { type VistaHorario } from './components/SelectorVistaHorario';
import VistaTabularHorarios from './components/VistaTabularHorarios';
import PlanificadorAccionesSemana from './components/PlanificadorAccionesSemana';
import SelectorPlantillaPlanificador from './components/SelectorPlantillaPlanificador';
import { fechasDeSemanaIso, fechaIsoCorta, labelDia, semanaIsoDesdeFecha } from './utils/horarioUtils';
import {
  CODIGOS_NOVEDAD,
  DIAS_SEMANA,
  DIAS_SEMANA_INICIAL,
  MAX_SELECCION,
  OPCIONES_ALMUERZO,
  calcularHorasTurno,
  normalizarDiasPlan,
} from './utils/planificadorSemanalUtils';
import { errorTurno } from './utils/validarTurno';
import { crearOverridesDesdePlantilla, diasActivosDePlantilla } from './utils/planificadorPlantillas';
import type { PlantillaHorario } from '../../../../types/horariosRelaciones';
import {
  PLANIFICADOR_DRAFT_KEY,
  leerBorradorPlanificador,
  type PlanificadorDraft,
  type ResultadoConfirmacion,
} from './utils/planificadorDraft';
import { usePersistirBorradorPlanificador } from './hooks/usePersistirBorradorPlanificador';
interface PlanEmpleadoTabla extends PlanEmpleadoInBase { empleado?: EmpleadoERPRead }
const PlanificadorSemanalView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tablaEmpleadosRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();
  const token = localStorage.getItem('token') || '';
  const borradorInicial = useMemo(() => leerBorradorPlanificador(), []);
  const mostrarEmpleadosInicial = useMemo(
    () => new URLSearchParams(location.search).get('panel') === 'empleados',
    [location.search],
  );
  const hoy = new Date();
  const [anio, setAnio] = useState<number>(borradorInicial?.anio ?? hoy.getUTCFullYear());
  const [semanaIso, setSemanaIso] = useState<number>(
    borradorInicial?.semanaIso ??
      Math.ceil(
        ((hoy.getTime() - new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)).getTime()) / 86400000 +
          new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)).getUTCDay() +
          1) /
          7,
      ),
  );
  const semana = useMemo<PlanSemanaIn>(() => {
    const fechas = fechasDeSemanaIso(anio, semanaIso);
    return {
      anio,
      semana_iso: semanaIso,
      fecha_inicio: fechaIsoCorta(fechas[0]),
      fecha_fin: fechaIsoCorta(fechas[6]),
    };
  }, [anio, semanaIso]);
  const fechasSemana = useMemo(() => fechasDeSemanaIso(anio, semanaIso), [anio, semanaIso]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set(borradorInicial?.seleccionados ?? []));
  const [empleadosInfo, setEmpleadosInfo] = useState<Map<string, EmpleadoERPRead>>(
    new Map(borradorInicial?.empleadosInfo ?? []),
  );
  const [defaultDias] = useState<PlanDiaIn[]>(DIAS_SEMANA_INICIAL);
  const [overrides, setOverrides] = useState<Map<string, PlanDiaIn[]>>(new Map(borradorInicial?.overrides ?? []));
  const [diasDestino, setDiasDestino] = useState<Set<number>>(new Set(borradorInicial?.diasDestino ?? [1, 2, 3, 4, 5]));
  const [plantillaEntrada, setPlantillaEntrada] = useState(borradorInicial?.plantillaEntrada ?? '07:30');
  const [plantillaSalida, setPlantillaSalida] = useState(borradorInicial?.plantillaSalida ?? '17:00');
  const [plantillaAlmuerzo, setPlantillaAlmuerzo] = useState(borradorInicial?.plantillaAlmuerzo ?? 30);
  const [novedadMasiva, setNovedadMasiva] = useState(borradorInicial?.novedadMasiva ?? '');
  const [observacionMasiva, setObservacionMasiva] = useState(borradorInicial?.observacionMasiva ?? '');

  const [celdaEdit, setCeldaEdit] = useState<{ cedula: string; diaSemana: number } | null>(null);
  const [preCalculo, setPreCalculo] = useState<PlanPreCalculoResponse | null>(borradorInicial?.preCalculo ?? null);
  const [preCalculando, setPreCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [erroresConfirmacion, setErroresConfirmacion] = useState<Map<string, string>>(
    new Map(borradorInicial?.erroresConfirmacion ?? []),
  );
  const [resultado, setResultado] = useState<ResultadoConfirmacion | null>(borradorInicial?.resultado ?? null);
  const [vistaHorario, setVistaHorario] = useState<VistaHorario>('matriz');
  const versionSemanaRef = useRef(0);
  const desplazarATablaEmpleados = useCallback(() => {
    const target = tablaEmpleadosRef.current;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (!mostrarEmpleadosInicial) return;
    window.setTimeout(desplazarATablaEmpleados, 0);
  }, [desplazarATablaEmpleados, mostrarEmpleadosInicial]);
  const limpiarResultadosSemana = () => {
    setPreCalculo(null);
    setResultado(null);
    setErroresConfirmacion(new Map());
  };

  const cambiarFechaReferencia = (fechaIso: string) => {
    const next = semanaIsoDesdeFecha(fechaIso);
    if (!next) return;
    versionSemanaRef.current += 1;
    setAnio(next.anio);
    setSemanaIso(next.semanaIso);
    setSeleccionados(new Set()); setEmpleadosInfo(new Map()); setOverrides(new Map());
    window.sessionStorage.removeItem(PLANIFICADOR_DRAFT_KEY);
    setPreCalculando(false); setGuardando(false); setConfirmando(false); setConfirmacionAbierta(false);
    limpiarResultadosSemana();
  };

  const empleadosPlan: PlanEmpleadoTabla[] = useMemo(() => {
    return Array.from(seleccionados).map((cedula) => ({
      cedula,
      empleado: empleadosInfo.get(cedula),
      dias: normalizarDiasPlan(overrides.get(cedula) ?? defaultDias),
    }));
  }, [seleccionados, empleadosInfo, defaultDias, overrides]);

  const empleadoBasePlan: PlanEmpleadoInBase[] = useMemo(
    () => empleadosPlan.map(({ cedula, dias }) => ({ cedula, dias })),
    [empleadosPlan],
  );

  const crearDraftActual = (
    nextSeleccionados = seleccionados,
    nextEmpleadosInfo = empleadosInfo,
    nextOverrides = overrides,
  ): PlanificadorDraft => ({
    usuario: localStorage.getItem('user_cedula'),
    anio,
    semanaIso,
    seleccionados: Array.from(nextSeleccionados),
    empleadosInfo: Array.from(nextEmpleadosInfo.entries()).filter(([cedula]) => nextSeleccionados.has(cedula)),
    overrides: Array.from(nextOverrides.entries()),
    diasDestino: Array.from(diasDestino),
    plantillaEntrada,
    plantillaSalida,
    plantillaAlmuerzo,
    novedadMasiva,
    observacionMasiva,
    preCalculo,
    resultado,
    erroresConfirmacion: Array.from(erroresConfirmacion.entries()),
  });
  usePersistirBorradorPlanificador(crearDraftActual(), !(resultado && resultado.error === 0));

  const actualizarSeleccionEmpleados = (
    nextSeleccionados: Set<string>,
    nextEmpleadosInfo: Map<string, EmpleadoERPRead>,
  ) => {
    setSeleccionados(new Set(nextSeleccionados));
    setEmpleadosInfo(new Map(nextEmpleadosInfo));
    limpiarResultadosSemana();
  };

  const toggleDiaDestino = (dia: number) => {
    setDiasDestino((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  };

  const actualizarDiasSeleccionados = (patch: (dia: PlanDiaIn, cedula: string) => PlanDiaIn) => {
    if (seleccionados.size === 0) {
      addNotification('error', 'Selecciona al menos un empleado.');
      return;
    }
    if (diasDestino.size === 0) {
      addNotification('error', 'Selecciona al menos un día destino.');
      return;
    }
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const cedula of seleccionados) {
        const base = next.get(cedula) ?? defaultDias;
        next.set(
          cedula,
          base.map((dia) => (diasDestino.has(dia.dia_semana) ? patch(dia, cedula) : dia)),
        );
      }
      return next;
    });
    limpiarResultadosSemana();
  };

  const aplicarCambiosMasivos = () => {
    const candidato = { hora_entrada: plantillaEntrada || null, hora_salida: plantillaSalida || null, minutos_almuerzo: Math.max(0, Math.min(240, plantillaAlmuerzo || 0)), cruza_medianoche: !!plantillaEntrada && !!plantillaSalida && plantillaSalida < plantillaEntrada };
    const error = errorTurno(candidato);
    if (error) { addNotification('error', error); return; }
    actualizarDiasSeleccionados((dia) => ({
      ...dia,
      ...candidato,
      novedades: novedadMasiva
        ? [
            {
              codigo_novedad: novedadMasiva,
              fecha_inicio: fechaIsoCorta(fechasSemana[dia.dia_semana - 1]),
              fecha_fin: fechaIsoCorta(fechasSemana[dia.dia_semana - 1]),
              observaciones: observacionMasiva || null,
            },
          ]
        : [],
      asignaciones_ot: dia.asignaciones_ot ?? [],
    }));
    addNotification(
      'success',
      novedadMasiva
        ? `Horario y novedad ${novedadMasiva} aplicados a los empleados seleccionados.`
        : 'Horario aplicado a los empleados seleccionados.',
    );
  };

  const aplicarPlantillaHorario = (plantilla: PlantillaHorario) => {
    if (seleccionados.size === 0) return addNotification('error', 'Selecciona al menos un empleado.');
    setOverrides((actuales) => crearOverridesDesdePlantilla(plantilla, seleccionados, actuales, defaultDias));
    setDiasDestino(diasActivosDePlantilla(plantilla));
    limpiarResultadosSemana();
    addNotification('success', `Plantilla ${plantilla.nombre} aplicada a ${seleccionados.size} empleados.`);
  };

  const aplicarOtMasiva = (asignaciones: PlanAsignacionOtIn[]) => {
    if (asignaciones.length === 0) {
      addNotification('error', 'Agrega al menos una OT para aplicar.');
      return;
    }
    actualizarDiasSeleccionados((dia) => ({
      ...dia,
      asignaciones_ot: asignaciones.map((asignacion) => {
        const horasDisponibles = calcularHorasTurno(dia.hora_entrada, dia.hora_salida, dia.minutos_almuerzo, dia.cruza_medianoche);
        return {
          ...asignacion,
          horas: Math.max(0, Math.min(24, horasDisponibles, Number(asignacion.horas) || 0)),
          porcentaje: null,
        };
      }),
    }));
    addNotification('success', `OT aplicada a ${seleccionados.size} empleados en ${diasDestino.size} días.`);
  };

  const aplicarActividadMasiva = (actividad: string) => {
    actualizarDiasSeleccionados((dia) => ({ ...dia, actividad }));
    addNotification('success', `Actividad aplicada a ${seleccionados.size} empleados en ${diasDestino.size} días.`);
  };

  const limpiarDiasMasivo = () => {
    actualizarDiasSeleccionados((dia) => ({
      ...dia,
      hora_entrada: null,
      hora_salida: null,
      minutos_almuerzo: 0,
      cruza_medianoche: false,
      actividad: null,
      novedades: [],
      asignaciones_ot: [],
    }));
    addNotification('info', 'Días limpiados para los empleados seleccionados.');
  };

  const guardarCelda = (nuevoDia: PlanDiaIn) => {
    if (!celdaEdit) return;
    setOverrides((prev) => {
      const next = new Map(prev);
      const diasPrev = next.get(celdaEdit.cedula) ?? defaultDias;
      next.set(
        celdaEdit.cedula,
        diasPrev.map((d) => (d.dia_semana === celdaEdit.diaSemana ? nuevoDia : d)),
      );
      return next;
    });
    limpiarResultadosSemana();
    setCeldaEdit(null);
  };
  const editarDia = useCallback((cedula: string, diaSemana: number) => setCeldaEdit({ cedula, diaSemana }), []);

  const buildBulkRequest = (): PlanBulkRequest => ({ semana, empleados: empleadoBasePlan });

  const validarSeleccion = () => {
    if (seleccionados.size === 0) {
      addNotification('error', 'Selecciona al menos un empleado.');
      return false;
    }
    for (const empleado of empleadosPlan) {
      const diaInvalido = empleado.dias.find((dia) => errorTurno(dia));
      if (diaInvalido) {
        addNotification('error', `${empleado.cedula}, ${labelDia(diaInvalido.dia_semana)}: ${errorTurno(diaInvalido)}`);
        return false;
      }
    }
    return true;
  };

  const handlePreCalcular = async () => {
    if (!validarSeleccion()) return;
    const versionSemana = versionSemanaRef.current;
    setPreCalculando(true);
    setErroresConfirmacion(new Map());
    try {
      const r = await preCalcularPlan(buildBulkRequest(), token);
      if (versionSemana !== versionSemanaRef.current) return;
      setPreCalculo(r);
      addNotification(
        'success',
        `Pre-cálculo: ${r.resumen.total_horas_extras.toFixed(1)}h HE, ${r.resumen.total_horas_festivas.toFixed(1)}h festivas`,
      );
    } catch (e: unknown) {
      if (versionSemana !== versionSemanaRef.current) return;
      addNotification('error', e instanceof Error ? e.message : 'Error al pre-calcular');
    } finally {
      if (versionSemana === versionSemanaRef.current) setPreCalculando(false);
    }
  };

  const handleGuardarBorrador = async () => {
    if (!validarSeleccion()) return;
    const versionSemana = versionSemanaRef.current;
    setGuardando(true);
    try {
      const r = await guardarBorradorPlan(buildBulkRequest(), token);
      if (versionSemana !== versionSemanaRef.current) return;
      if (r.errores.length > 0) {
        addNotification('warning', `Borrador guardado con ${r.errores.length} errores.`);
      } else {
        addNotification('success', `Borrador guardado: ${r.registros_horario_creados} nuevos, ${r.registros_horario_actualizados} actualizados`);
      }
    } catch (e: unknown) {
      if (versionSemana !== versionSemanaRef.current) return;
      addNotification('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      if (versionSemana === versionSemanaRef.current) setGuardando(false);
    }
  };

  const solicitarConfirmacion = () => {
    if (!validarSeleccion()) return;
    setConfirmacionAbierta(true);
  };

  const handleConfirmar = async () => {
    const versionSemana = versionSemanaRef.current;
    setConfirmacionAbierta(false);
    setConfirmando(true);
    setResultado(null);
    setErroresConfirmacion(new Map());
    try {
      const payload: PlanConfirmarRequest = {
        semana,
        usuario_confirma: localStorage.getItem('user_cedula') || 'portal',
        empleados: empleadoBasePlan,
      };
      const r = await confirmarPlan(payload, token);
      if (versionSemana !== versionSemanaRef.current) return;
      setErroresConfirmacion(new Map(r.errores.map((e) => [e.cedula, e.motivo])));
      setResultado({
        ok: r.resumen.ok_count,
        error: r.resumen.error_count,
        he: r.resumen.total_horas_extras,
        hf: r.resumen.total_horas_festivas,
        costo: r.resumen.total_costo,
      });
      if (r.resumen.error_count === 0) {
        window.sessionStorage.removeItem(PLANIFICADOR_DRAFT_KEY);
        const pendientes = r.calculos.filter((calculo) => calculo.estado === 'PENDIENTE_AUTORIZACION').length;
        addNotification(
          pendientes > 0 ? 'warning' : 'success',
          pendientes > 0
            ? `Plan finalizado: ${r.resumen.ok_count} cálculos, ${pendientes} pendientes de autorización`
            : `Plan confirmado: ${r.resumen.ok_count} cálculos generados`,
        );
        setTimeout(() => {
          if (versionSemana === versionSemanaRef.current) navigate('/service-portal/horas-extras/calculos');
        }, 1200);
      } else {
        addNotification('warning', `Confirmación parcial: ${r.resumen.ok_count} OK, ${r.resumen.error_count} errores`);
      }
    } catch (e: unknown) {
      if (versionSemana !== versionSemanaRef.current) return;
      addNotification('error', e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      if (versionSemana === versionSemanaRef.current) setConfirmando(false);
    }
  };

  const celdaActual = celdaEdit
    ? empleadosPlan.find((e) => e.cedula === celdaEdit.cedula)?.dias.find((d) => d.dia_semana === celdaEdit.diaSemana)
    : null;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
      <PlanificadorHeader
        anio={anio}
        semanaIso={semanaIso}
        fechaInicio={semana.fecha_inicio}
        fechaFin={semana.fecha_fin}
        seleccionadosCount={seleccionados.size}
        preCalculo={preCalculo}
        resultado={resultado}
        onFechaReferenciaChange={cambiarFechaReferencia}
        horarioSinEmpleados={seleccionados.size === 0}
        novedadMasiva={novedadMasiva}
        onAplicarHorario={aplicarCambiosMasivos}
        onLimpiarDias={limpiarDiasMasivo}
        accionesSemana={(
          <PlanificadorAccionesSemana
            seleccionadosCount={seleccionados.size}
            preCalculando={preCalculando}
            guardando={guardando}
            confirmando={confirmando}
            onPreCalcular={handlePreCalcular}
            onGuardarBorrador={handleGuardarBorrador}
            onConfirmarSemana={solicitarConfirmacion}
          />
        )}
        controlesHorario={(
          <HorarioMasivoCard
            compacto
            ocultarAcciones
            diasSemana={DIAS_SEMANA}
            diasDestino={diasDestino}
            seleccionadosCount={seleccionados.size}
            plantillaEntrada={plantillaEntrada}
            plantillaSalida={plantillaSalida}
            plantillaAlmuerzo={plantillaAlmuerzo}
            novedadMasiva={novedadMasiva}
            observacionMasiva={observacionMasiva}
            codigosNovedad={CODIGOS_NOVEDAD}
            opcionesAlmuerzo={OPCIONES_ALMUERZO}
            selectorPlantilla={<SelectorPlantillaPlanificador disabled={seleccionados.size === 0} onAplicar={aplicarPlantillaHorario} />}
            onPlantillaEntradaChange={setPlantillaEntrada}
            onPlantillaSalidaChange={setPlantillaSalida}
            onPlantillaAlmuerzoChange={setPlantillaAlmuerzo}
            onNovedadMasivaChange={setNovedadMasiva}
            onObservacionMasivaChange={setObservacionMasiva}
            onToggleDiaDestino={toggleDiaDestino}
            onAplicarHorario={aplicarCambiosMasivos}
            onLimpiarDias={limpiarDiasMasivo}
          />
        )}
      >
        <AsignacionOtMasivaCard
          seleccionadosCount={seleccionados.size}
          diasDestinoCount={diasDestino.size}
          horasTurnoPlantilla={calcularHorasTurno(plantillaEntrada, plantillaSalida, plantillaAlmuerzo)}
          onAplicar={aplicarOtMasiva}
        />
      </PlanificadorHeader>

      <SelectorVistaHorario vista={vistaHorario} onChange={setVistaHorario} />

      <div ref={tablaEmpleadosRef} id="tabla-horarios-empleados">
        {vistaHorario === 'matriz' ? (
          <EmpleadosActivosPanel
            anio={anio}
            semanaIso={semanaIso}
            seleccionados={seleccionados}
            empleadosInfo={empleadosInfo}
            maxSeleccion={MAX_SELECCION}
            diasSemana={DIAS_SEMANA}
            defaultDias={defaultDias}
            overrides={overrides}
            preCalculo={preCalculo}
            errores={erroresConfirmacion}
            onSelectionChange={actualizarSeleccionEmpleados}
            onCeldaClick={(cedula, diaSemana) => setCeldaEdit({ cedula, diaSemana })}
          />
        ) : (
          <VistaTabularHorarios
            empleados={empleadosPlan}
            fechasSemana={fechasSemana}
            diasDestino={diasDestino}
            onEditarDia={editarDia}
            onAplicarActividad={aplicarActividadMasiva}
          />
        )}
      </div>

      <ResumenPlan preCalculo={preCalculo} confirmado={resultado} />

      {celdaEdit && celdaActual && (
        <CeldaDiaEditor
          abierto={true}
          cedula={celdaEdit.cedula}
          diaSemana={celdaEdit.diaSemana}
          fecha={fechaIsoCorta(fechasSemana[celdaEdit.diaSemana - 1])}
          dia={celdaActual}
          onCerrar={() => setCeldaEdit(null)}
          onGuardar={guardarCelda}
        />
      )}
      <ConfirmarSemanaModal
        abierto={confirmacionAbierta}
        confirmando={confirmando}
        empleadosCount={seleccionados.size}
        semana={semana}
        onCerrar={() => setConfirmacionAbierta(false)}
        onConfirmar={handleConfirmar}
      />
    </div>
  );
};
export default PlanificadorSemanalView;
