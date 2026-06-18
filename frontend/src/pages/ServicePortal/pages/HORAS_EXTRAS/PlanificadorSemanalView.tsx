/**
 * PlanificadorSemanalView — workspace masivo de horas extras.
 *
 * Flujo principal: buscar empleados, seleccionarlos, aplicar horarios en bloque,
 * ajustar celdas excepcionales y confirmar la semana desde una sola pantalla.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Button,
  MaterialCard,
  Input,
  Spinner,
  Badge,
  Select,
  Textarea,
  Checkbox,
} from '../../../../components/atoms';
import {
  ArrowLeft,
  Save,
  Calculator,
  CheckCircle2,
  FileText,
  Copy,
  Eraser,
  ClipboardList,
  History,
  Wallet,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';
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
import SelectorEmpleados from './components/SelectorEmpleados';
import TablaPlanificacion, { type PlanEmpleadoTabla } from './components/TablaPlanificacion';
import CeldaDiaEditor from './components/CeldaDiaEditor';
import EmpleadosActivosModal from './components/EmpleadosActivosModal';
import ResumenPlan from './components/ResumenPlan';
import { fechasDeSemanaIso, fechaIsoCorta, labelDia } from './utils/horarioUtils';

const MAX_SELECCION = 200;
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7];
const CODIGOS_NOVEDAD = ['', 'INC', 'VAC', 'AUS', 'LIC'];

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

  const hoy = new Date();
  const [anio, setAnio] = useState<number>(hoy.getUTCFullYear());
  const [semanaIso, setSemanaIso] = useState<number>(
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

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [empleadosInfo, setEmpleadosInfo] = useState<Map<string, EmpleadoERPRead>>(new Map());
  const [defaultDias] = useState<PlanDiaIn[]>(DIAS_SEMANA_INICIAL);
  const [overrides, setOverrides] = useState<Map<string, PlanDiaIn[]>>(new Map());
  const [diasDestino, setDiasDestino] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [plantillaEntrada, setPlantillaEntrada] = useState('07:30');
  const [plantillaSalida, setPlantillaSalida] = useState('17:00');
  const [plantillaAlmuerzo, setPlantillaAlmuerzo] = useState(60);
  const [novedadMasiva, setNovedadMasiva] = useState('');
  const [observacionMasiva, setObservacionMasiva] = useState('');

  const [celdaEdit, setCeldaEdit] = useState<{ cedula: string; diaSemana: number } | null>(null);
  const [preCalculo, setPreCalculo] = useState<PlanPreCalculoResponse | null>(null);
  const [preCalculando, setPreCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [modalEmpleadosAbierto, setModalEmpleadosAbierto] = useState(false);
  const [erroresConfirmacion, setErroresConfirmacion] = useState<Map<string, string>>(new Map());
  const [resultado, setResultado] = useState<{ ok: number; error: number; he: number; costo: number } | null>(null);

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

  const toggleEmpleadoDetalle = (empleado: EmpleadoERPRead) => {
    setEmpleadosInfo((prev) => new Map(prev).set(empleado.cedula, empleado));
    toggleEmpleado(empleado.cedula);
  };

  const incluirEmpleados = (empleados: EmpleadoERPRead[]) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      for (const empleado of empleados) {
        if (next.size >= MAX_SELECCION) break;
        next.add(empleado.cedula);
      }
      return next;
    });
    setEmpleadosInfo((prev) => {
      const next = new Map(prev);
      empleados.forEach((empleado) => next.set(empleado.cedula, empleado));
      return next;
    });
    setPreCalculo(null);
  };

  const limpiarSeleccion = () => {
    setSeleccionados(new Set());
    setErroresConfirmacion(new Map());
    setResultado(null);
    setPreCalculo(null);
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

  const handleConfirmar = async () => {
    if (!validarSeleccion()) return;
    if (!window.confirm(`¿Confirmar el plan para ${seleccionados.size} empleados?`)) return;
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="secondary" onClick={() => navigate('/service-portal/inicio')} className="!p-2 !rounded-full" aria-label="Volver al inicio">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Title level={2} className="!m-0">Horas extras — planificación masiva</Title>
            <Text className="text-[var(--color-text-secondary)]">
              Selecciona empleados, aplica horarios en bloque y confirma la semana desde una sola tabla.
            </Text>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalEmpleadosAbierto(true)}><Users className="w-4 h-4 mr-1" />Empleados</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/calculos')}><History className="w-4 h-4 mr-1" />Historial</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/bolsa')}><Wallet className="w-4 h-4 mr-1" />Bolsa</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/festivos')}><Calendar className="w-4 h-4 mr-1" />Festivos</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/costos-ot')}><Clock className="w-4 h-4 mr-1" />Costos OT</Button>
        </div>
      </div>

      <MaterialCard className="p-4 sticky top-2 z-30">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Año</Text>
              <Input type="number" value={anio} min={2020} max={2100} onChange={(e) => setAnio(Number(e.target.value) || anio)} />
            </div>
            <div>
              <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Semana ISO</Text>
              <Input type="number" value={semanaIso} min={1} max={53} onChange={(e) => setSemanaIso(Math.max(1, Math.min(53, Number(e.target.value) || semanaIso)))} />
            </div>
            <div className="col-span-2">
              <Text className="text-xs text-[var(--color-text-secondary)]">Rango</Text>
              <Text className="font-semibold">{semana.fecha_inicio} → {semana.fecha_fin}</Text>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Badge variant="primary">{seleccionados.size} empleados</Badge>
            {preCalculo && <Badge variant="info">HE est: {preCalculo.resumen.total_horas_extras.toFixed(1)}h</Badge>}
            {preCalculo && <Badge variant="success">Costo: ${Math.round(preCalculo.resumen.total_costo_estimado).toLocaleString('es-CO')}</Badge>}
            {resultado && <Badge variant={resultado.error ? 'warning' : 'success'}>{resultado.ok} OK / {resultado.error} errores</Badge>}
          </div>
        </div>
      </MaterialCard>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <SelectorEmpleados
          token={token}
          seleccionados={seleccionados}
          onToggle={toggleEmpleado}
          onToggleEmpleado={toggleEmpleadoDetalle}
          onIncluirEmpleados={incluirEmpleados}
          onLimpiar={limpiarSeleccion}
        />

        <MaterialCard className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <Text className="font-semibold block">Horario masivo</Text>
                <Text className="text-xs text-[var(--color-text-secondary)]">Define entrada, salida, almuerzo y días. Luego aplícalo a todos los empleados marcados.</Text>
              </div>
              <Badge variant="default" size="sm">{diasDestino.size} días destino</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Entrada</Text>
                <Input type="time" value={plantillaEntrada} onChange={(e) => setPlantillaEntrada(e.target.value)} />
              </div>
              <div>
                <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Salida</Text>
                <Input type="time" value={plantillaSalida} onChange={(e) => setPlantillaSalida(e.target.value)} />
              </div>
              <div>
                <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Almuerzo</Text>
                <Input type="number" min={0} max={240} value={plantillaAlmuerzo} onChange={(e) => setPlantillaAlmuerzo(Math.max(0, Math.min(240, Number(e.target.value) || 0)))} />
              </div>
              <div>
                <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Novedad masiva</Text>
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
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <Checkbox key={dia} checked={diasDestino.has(dia)} onChange={() => toggleDiaDestino(dia)} label={labelDia(dia)} />
              ))}
            </div>
            {novedadMasiva && (
              <Textarea value={observacionMasiva} onChange={(e) => setObservacionMasiva(e.target.value)} rows={2} placeholder="Observación para la novedad masiva" />
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="primary" onClick={aplicarHorarioMasivo} disabled={seleccionados.size === 0}><Copy className="w-4 h-4 mr-1" />Aplicar horario</Button>
              <Button variant="secondary" onClick={agregarNovedadMasiva} disabled={seleccionados.size === 0 || !novedadMasiva}><ClipboardList className="w-4 h-4 mr-1" />Aplicar novedad</Button>
              <Button variant="ghost" onClick={limpiarDiasMasivo} disabled={seleccionados.size === 0}><Eraser className="w-4 h-4 mr-1" />Limpiar días</Button>
            </div>
          </div>
        </MaterialCard>
      </div>

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
            <Button variant="secondary" onClick={handlePreCalcular} disabled={preCalculando || seleccionados.size === 0}>
              {preCalculando ? <Spinner size="sm" className="mr-1" /> : <Calculator className="w-4 h-4 mr-1" />}
              Pre-calcular
            </Button>
            <Button variant="secondary" onClick={handleGuardarBorrador} disabled={guardando || seleccionados.size === 0}>
              {guardando ? <Spinner size="sm" className="mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar borrador
            </Button>
            <Button variant="primary" onClick={handleConfirmar} disabled={confirmando || seleccionados.size === 0}>
              {confirmando ? <Spinner size="sm" className="mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
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

      <EmpleadosActivosModal
        abierto={modalEmpleadosAbierto}
        token={token}
        seleccionados={seleccionados}
        onCerrar={() => setModalEmpleadosAbierto(false)}
        onAgregar={incluirEmpleados}
      />

      <Text className="mt-6 text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Las reglas de cálculo se mantienen en el backend; esta pantalla solo prepara y confirma la semana.
      </Text>
    </div>
  );
};

export default PlanificadorSemanalView;
