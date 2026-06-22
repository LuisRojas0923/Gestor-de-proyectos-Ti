/**
 * PlanificadorSemanalView — workspace masivo de horas extras.
 *
 * Flujo principal: buscar empleados, seleccionarlos, aplicar horarios en bloque,
 * ajustar celdas excepcionales y confirmar la semana desde una sola pantalla.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  MaterialCard,
  Badge,
  Select,
  Textarea,
} from '../../../../components/atoms';
import {
  Save,
  Calculator,
  CheckCircle2,
  FileText,
  Copy,
  Eraser,
  ClipboardList,
} from 'lucide-react';
import Modal from '../../../../components/molecules/Modal';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  guardarBorradorPlan,
  preCalcularPlan,
  confirmarPlan,
} from '../../../../services/horasExtrasService';
import type {
  EmpleadoERPRead,
  PlanBulkRequest,
  PlanConfirmarRequest,
  PlanDiaIn,
  PlanEmpleadoInBase,
  PlanPreCalculoResponse,
  PlanSemanaIn,
} from '../../../../types/horasExtras';
import TablaPlanificacion, { type PlanEmpleadoTabla } from './components/TablaPlanificacion';
import CeldaDiaEditor from './components/CeldaDiaEditor';
import ResumenPlan from './components/ResumenPlan';
import PlanificadorHeader from './components/PlanificadorHeader';
import TimeClockPicker from './components/TimeClockPicker';
import { fechasDeSemanaIso, fechaIsoCorta, labelDia, semanaIsoDesdeFecha } from './utils/horarioUtils';
import {
  PLANIFICADOR_DRAFT_KEY,
  leerBorradorPlanificador,
  type PlanificadorDraft,
  type ResultadoConfirmacion,
} from './utils/planificadorDraft';

const MAX_SELECCION = 200;
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7];
const CODIGOS_NOVEDAD = ['', 'INC', 'VAC', 'AUS', 'LIC'];
const OPCIONES_ALMUERZO = [
  { value: '30', label: '00:30' },
  { value: '60', label: '1:00' },
  { value: '90', label: '1:30' },
];

const DIAS_SEMANA_INICIAL: PlanDiaIn[] = DIAS_SEMANA.map((d) => ({
  dia_semana: d,
  hora_entrada: d <= 5 ? '07:30' : null,
  hora_salida: d <= 5 ? '17:00' : null,
  minutos_almuerzo: d <= 5 ? 60 : 0,
  novedades: [],
}));

const PlanificadorSemanalView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const token = localStorage.getItem('token') || '';
  const borradorInicial = useMemo(() => leerBorradorPlanificador(), []);

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
  const [empleadosInfo] = useState<Map<string, EmpleadoERPRead>>(
    new Map(borradorInicial?.empleadosInfo ?? []),
  );
  const [defaultDias] = useState<PlanDiaIn[]>(DIAS_SEMANA_INICIAL);
  const [overrides, setOverrides] = useState<Map<string, PlanDiaIn[]>>(new Map(borradorInicial?.overrides ?? []));
  const [diasDestino, setDiasDestino] = useState<Set<number>>(new Set(borradorInicial?.diasDestino ?? [1, 2, 3, 4, 5]));
  const [plantillaEntrada, setPlantillaEntrada] = useState(borradorInicial?.plantillaEntrada ?? '07:30');
  const [plantillaSalida, setPlantillaSalida] = useState(borradorInicial?.plantillaSalida ?? '17:00');
  const [plantillaAlmuerzo, setPlantillaAlmuerzo] = useState(borradorInicial?.plantillaAlmuerzo ?? 60);
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

  const limpiarResultadosSemana = () => {
    setPreCalculo(null);
    setResultado(null);
    setErroresConfirmacion(new Map());
  };

  const cambiarSemanaIso = (nextSemanaIso: number) => {
    setSemanaIso(nextSemanaIso);
    limpiarResultadosSemana();
  };

  const cambiarFechaReferencia = (fechaIso: string) => {
    const next = semanaIsoDesdeFecha(fechaIso);
    if (!next) return;
    setAnio(next.anio);
    setSemanaIso(next.semanaIso);
    limpiarResultadosSemana();
  };

  const empleadosPlan: PlanEmpleadoTabla[] = useMemo(() => {
    return Array.from(seleccionados).map((cedula) => ({
      cedula,
      empleado: empleadosInfo.get(cedula),
      dias: overrides.get(cedula) ?? defaultDias,
    }));
  }, [seleccionados, empleadosInfo, defaultDias, overrides]);

  const empleadoBasePlan: PlanEmpleadoInBase[] = useMemo(
    () => empleadosPlan.map(({ cedula, dias }) => ({ cedula, dias })),
    [empleadosPlan],
  );

  const toggleEmpleado = (cedula: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(cedula)) next.delete(cedula);
      else if (next.size < MAX_SELECCION) next.add(cedula);
      return next;
    });
    setPreCalculo(null);
  };

  const navegarAEmpleados = () => {
    const draft: PlanificadorDraft = {
      anio,
      semanaIso,
      seleccionados: Array.from(seleccionados),
      empleadosInfo: Array.from(empleadosInfo.entries()),
      overrides: Array.from(overrides.entries()),
      diasDestino: Array.from(diasDestino),
      plantillaEntrada,
      plantillaSalida,
      plantillaAlmuerzo,
      novedadMasiva,
      observacionMasiva,
      preCalculo,
      resultado,
      erroresConfirmacion: Array.from(erroresConfirmacion.entries()),
    };
    window.sessionStorage.setItem(PLANIFICADOR_DRAFT_KEY, JSON.stringify(draft));
    navigate('/service-portal/horas-extras/empleados');
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
    setPreCalculo(null);
  };

  const aplicarHorarioMasivo = () => {
    actualizarDiasSeleccionados((dia) => ({
      ...dia,
      hora_entrada: plantillaEntrada || null,
      hora_salida: plantillaSalida || null,
      minutos_almuerzo: Math.max(0, Math.min(240, plantillaAlmuerzo || 0)),
    }));
    addNotification('success', 'Horario aplicado a los empleados seleccionados.');
  };

  const limpiarDiasMasivo = () => {
    actualizarDiasSeleccionados((dia) => ({
      ...dia,
      hora_entrada: null,
      hora_salida: null,
      minutos_almuerzo: 0,
      novedades: [],
    }));
    addNotification('info', 'Días limpiados para los empleados seleccionados.');
  };

  const agregarNovedadMasiva = () => {
    if (!novedadMasiva) {
      addNotification('error', 'Selecciona una novedad para aplicar.');
      return;
    }
    actualizarDiasSeleccionados((dia) => ({
      ...dia,
      novedades: [
        ...dia.novedades,
        {
          codigo_novedad: novedadMasiva,
          fecha_inicio: fechaIsoCorta(fechasSemana[dia.dia_semana - 1]),
          fecha_fin: fechaIsoCorta(fechasSemana[dia.dia_semana - 1]),
          observaciones: observacionMasiva || null,
        },
      ],
    }));
    addNotification('success', 'Novedad aplicada a los días seleccionados.');
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
    setPreCalculo(null);
    setCeldaEdit(null);
  };

  const buildBulkRequest = (): PlanBulkRequest => ({ semana, empleados: empleadoBasePlan });

  const validarSeleccion = () => {
    if (seleccionados.size === 0) {
      addNotification('error', 'Selecciona al menos un empleado.');
      return false;
    }
    const noAutorizados = empleadosPlan.filter(
      (empleado) => empleado.empleado && empleado.empleado.autoriza_he !== true,
    );
    if (noAutorizados.length > 0) {
      setErroresConfirmacion(
        new Map(noAutorizados.map((empleado) => [empleado.cedula, 'Empleado no autorizado para horas extras'])),
      );
      addNotification('error', 'Hay empleados sin autorización HE. Retíralos antes de confirmar o guardar.');
      return false;
    }
    return true;
  };

  const handlePreCalcular = async () => {
    if (!validarSeleccion()) return;
    setPreCalculando(true);
    setErroresConfirmacion(new Map());
    try {
      const r = await preCalcularPlan(buildBulkRequest(), token);
      setPreCalculo(r);
      addNotification('success', `Pre-cálculo: ${r.resumen.total_horas_extras.toFixed(1)}h HE estimadas`);
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al pre-calcular');
    } finally {
      setPreCalculando(false);
    }
  };

  const handleGuardarBorrador = async () => {
    if (!validarSeleccion()) return;
    setGuardando(true);
    try {
      const r = await guardarBorradorPlan(buildBulkRequest(), token);
      if (r.errores.length > 0) {
        addNotification('warning', `Borrador guardado con ${r.errores.length} errores.`);
      } else {
        addNotification('success', `Borrador guardado: ${r.registros_horario_creados} nuevos, ${r.registros_horario_actualizados} actualizados`);
      }
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const solicitarConfirmacion = () => {
    if (!validarSeleccion()) return;
    setConfirmacionAbierta(true);
  };

  const handleConfirmar = async () => {
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
      setErroresConfirmacion(new Map(r.errores.map((e) => [e.cedula, e.motivo])));
      setResultado({
        ok: r.resumen.ok_count,
        error: r.resumen.error_count,
        he: r.resumen.total_horas_extras,
        costo: r.resumen.total_costo,
      });
      if (r.resumen.error_count === 0) {
        window.sessionStorage.removeItem(PLANIFICADOR_DRAFT_KEY);
        addNotification('success', `Plan confirmado: ${r.resumen.ok_count} cálculos generados`);
        setTimeout(() => navigate('/service-portal/horas-extras/calculos'), 1200);
      } else {
        addNotification('warning', `Confirmación parcial: ${r.resumen.ok_count} OK, ${r.resumen.error_count} errores`);
      }
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setConfirmando(false);
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
        onSemanaIsoChange={cambiarSemanaIso}
        onFechaReferenciaChange={cambiarFechaReferencia}
        onAbrirEmpleados={navegarAEmpleados}
      />

      <MaterialCard className="overflow-hidden border-[var(--color-primary)]/15 p-0">
        <div className="border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-surface)] to-[var(--color-surface-variant)] px-4 py-3 md:px-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <Text className="font-semibold block">Horario masivo</Text>
              <Text className="text-xs text-[var(--color-text-secondary)]">Plantilla semanal para aplicar entrada, salida, almuerzo y novedades en bloque.</Text>
            </div>
            <Badge variant={diasDestino.size > 0 ? 'primary' : 'default'} size="sm">{diasDestino.size} días destino</Badge>
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 p-3">
              <Text className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Entrada</Text>
              <TimeClockPicker label="Entrada" value={plantillaEntrada} onChange={(next) => setPlantillaEntrada(next ?? '')} />
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 p-3">
              <Text className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Salida</Text>
              <TimeClockPicker label="Salida" value={plantillaSalida} onChange={(next) => setPlantillaSalida(next ?? '')} />
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 p-3">
              <Text className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Almuerzo</Text>
              <Select
                value={String(plantillaAlmuerzo)}
                onChange={(e) => setPlantillaAlmuerzo(Number(e.target.value))}
                options={OPCIONES_ALMUERZO}
              />
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 p-3">
              <Text className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Novedad masiva</Text>
              <Select
                value={novedadMasiva}
                onChange={(e) => setNovedadMasiva(e.target.value)}
                options={CODIGOS_NOVEDAD.map((codigo) => ({
                  value: codigo,
                  label: codigo || 'Sin novedad',
                }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Text className="text-xs font-medium text-[var(--color-text-secondary)]">Días a modificar</Text>
              <Text className="text-[11px] text-[var(--color-text-secondary)]">Activa solo los días que recibirán la plantilla.</Text>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {DIAS_SEMANA.map((dia) => {
                const activo = diasDestino.has(dia);
                return (
                  <Button
                    key={dia}
                    type="button"
                    variant="custom"
                    size="sm"
                    rounded="full"
                    onClick={() => toggleDiaDestino(dia)}
                    className={`h-9 border ${activo
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-surface)] shadow-sm'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {labelDia(dia)}
                  </Button>
                );
              })}
            </div>
          </div>

          {novedadMasiva && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <Text className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Observación para la novedad</Text>
              <Textarea value={observacionMasiva} onChange={(e) => setObservacionMasiva(e.target.value)} rows={2} placeholder="Observación para la novedad masiva" />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={aplicarHorarioMasivo} disabled={seleccionados.size === 0}><Copy className="w-4 h-4 mr-1" />Aplicar horario</Button>
            <Button variant="outline" onClick={agregarNovedadMasiva} disabled={seleccionados.size === 0 || !novedadMasiva}><ClipboardList className="w-4 h-4 mr-1" />Aplicar novedad</Button>
            <Button variant="ghost" onClick={limpiarDiasMasivo} disabled={seleccionados.size === 0}><Eraser className="w-4 h-4 mr-1" />Limpiar días</Button>
          </div>
        </div>
      </MaterialCard>

      <TablaPlanificacion
        empleados={empleadosPlan}
        seleccionados={seleccionados}
        onToggleEmpleado={toggleEmpleado}
        onCeldaClick={(cedula, diaSemana) => setCeldaEdit({ cedula, diaSemana })}
        preCalculo={preCalculo}
        errores={erroresConfirmacion}
      />

      <ResumenPlan preCalculo={preCalculo} confirmado={resultado} />

      <MaterialCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Text className="text-sm text-[var(--color-text-secondary)]">
            Pre-calcula para revisar horas y costos antes de confirmar. La carga prestacional y datos propios del empleado se resuelven desde ERP/backend.
          </Text>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" onClick={handlePreCalcular} disabled={seleccionados.size === 0} loading={preCalculando} icon={Calculator}>
              Pre-calcular
            </Button>
            <Button variant="outline" onClick={handleGuardarBorrador} disabled={seleccionados.size === 0} loading={guardando} icon={Save}>
              Guardar borrador
            </Button>
            <Button variant="primary" onClick={solicitarConfirmacion} disabled={seleccionados.size === 0} loading={confirmando} icon={CheckCircle2}>
              Confirmar semana
            </Button>
          </div>
        </div>
      </MaterialCard>

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

      <Modal
        isOpen={confirmacionAbierta}
        onClose={() => setConfirmacionAbierta(false)}
        title="Confirmar semana"
        size="md"
      >
        <div className="space-y-4">
          <Text className="text-sm text-[var(--color-text-secondary)]">
            Se generarán los cálculos de horas extras para {seleccionados.size} empleados en la semana {semana.semana_iso} de {semana.anio}.
          </Text>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary)]/5 p-4">
            <Text className="text-xs text-[var(--color-text-secondary)]">Rango a confirmar</Text>
            <Text className="font-semibold text-[var(--color-primary)]">{semana.fecha_inicio} → {semana.fecha_fin}</Text>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmacionAbierta(false)} disabled={confirmando}>
              Revisar de nuevo
            </Button>
            <Button variant="primary" onClick={handleConfirmar} loading={confirmando} icon={CheckCircle2}>
              Confirmar y guardar
            </Button>
          </div>
        </div>
      </Modal>

      <Text className="mt-6 text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Las reglas de cálculo se mantienen en el backend; esta pantalla solo prepara y confirma la semana.
      </Text>
    </div>
  );
};

export default PlanificadorSemanalView;
