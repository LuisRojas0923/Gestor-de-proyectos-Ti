/**
 * PlanificadorSemanalView — Sprint S7.
 *
 * Flujo en 3 pasos:
 *   1. Seleccionar empleados del ERP
 *   2. Definir horario por defecto
 *   3. Ajustar por empleado × día (entrada/salida/almuerzo/novedad)
 *
 * Acciones:
 *   - Pre-calcular (sin persistir, muestra HE en vivo)
 *   - Guardar borrador (bulk upsert horario + bulk insert novedades)
 *   - Confirmar semana (genera nomina_calculo_semanal por empleado)
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
} from '../../../../components/atoms';
import { ArrowLeft, Save, Calculator, CheckCircle2, FileText } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  guardarBorradorPlan,
  preCalcularPlan,
  confirmarPlan,
} from '../../../../services/horasExtrasService';
import type {
  PlanBulkRequest,
  PlanConfirmarEmpleadoIn,
  PlanConfirmarRequest,
  PlanDiaIn,
  PlanEmpleadoInBase,
  PlanNovedadIn,
  PlanPreCalculoResponse,
  PlanSemanaIn,
} from '../../../../types/horasExtras';
import SelectorEmpleados from './components/SelectorEmpleados';
import DefaultHorarioSemana from './components/DefaultHorarioSemana';
import TablaPlanificacion from './components/TablaPlanificacion';
import CeldaDiaEditor from './components/CeldaDiaEditor';
import ResumenPlan from './components/ResumenPlan';
import { fechasDeSemanaIso, fechaIsoCorta } from './utils/horarioUtils';

const DIAS_SEMANA_INICIAL: PlanDiaIn[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
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

  // Estado de semana
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

  // Estado de selección
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const toggleEmpleado = (cedula: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(cedula)) next.delete(cedula);
      else next.add(cedula);
      return next;
    });
  };
  const limpiarSeleccion = () => setSeleccionados(new Set());

  // Estado del plan
  const [defaultDias, setDefaultDias] = useState<PlanDiaIn[]>(DIAS_SEMANA_INICIAL);
  const [overrides, setOverrides] = useState<Map<string, PlanDiaIn[]>>(new Map());

  const empleadosPlan: PlanEmpleadoInBase[] = useMemo(() => {
    return Array.from(seleccionados).map((cedula) => {
      const ov = overrides.get(cedula);
      return {
        cedula,
        dias: ov ?? defaultDias,
      };
    });
  }, [seleccionados, defaultDias, overrides]);

  const aplicarDefaultATodos = () => {
    setOverrides(new Map()); // Reset overrides — todos usan default
    addNotification('info', 'Horario por defecto aplicado a todos los empleados seleccionados.');
  };

  // Estado de celda en edición
  const [celdaEdit, setCeldaEdit] = useState<{
    cedula: string;
    diaSemana: number;
  } | null>(null);

  const guardarCelda = (nuevoDia: PlanDiaIn) => {
    if (!celdaEdit) return;
    setOverrides((prev) => {
      const next = new Map(prev);
      const diasPrev = next.get(celdaEdit.cedula) ?? defaultDias;
      const nuevosDias = diasPrev.map((d) =>
        d.dia_semana === celdaEdit.diaSemana ? nuevoDia : d,
      );
      next.set(celdaEdit.cedula, nuevosDias);
      return next;
    });
    setCeldaEdit(null);
  };

  // Estado de pre-cálculo
  const [preCalculo, setPreCalculo] = useState<PlanPreCalculoResponse | null>(null);
  const [preCalculando, setPreCalculando] = useState(false);

  // Estado de guardado/confirmación
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<{
    ok: number;
    error: number;
    he: number;
    costo: number;
  } | null>(null);

  const buildBulkRequest = (): PlanBulkRequest => ({
    semana,
    empleados: empleadosPlan,
  });

  const handlePreCalcular = async () => {
    if (seleccionados.size === 0) {
      addNotification('error', 'Selecciona al menos un empleado en el Paso 1');
      return;
    }
    setPreCalculando(true);
    try {
      const r = await preCalcularPlan(buildBulkRequest(), token);
      setPreCalculo(r);
      addNotification(
        'success',
        `Pre-cálculo: ${r.resumen.total_horas_extras.toFixed(1)}h HE estimadas`,
      );
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al pre-calcular');
    } finally {
      setPreCalculando(false);
    }
  };

  const handleGuardarBorrador = async () => {
    if (seleccionados.size === 0) {
      addNotification('error', 'Selecciona al menos un empleado en el Paso 1');
      return;
    }
    setGuardando(true);
    try {
      const r = await guardarBorradorPlan(buildBulkRequest(), token);
      const totalErr = r.errores.length;
      if (totalErr > 0) {
        addNotification(
          'warning',
          `Borrador guardado con ${totalErr} errores. Revisa la lista.`,
        );
      } else {
        addNotification(
          'success',
          `Borrador guardado: ${r.registros_horario_creados} registros, ${r.novedades_creadas} novedades`,
        );
      }
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmar = async () => {
    if (seleccionados.size === 0) {
      addNotification('error', 'Selecciona al menos un empleado en el Paso 1');
      return;
    }
    if (
      !window.confirm(
        `¿Confirmar el plan para ${seleccionados.size} empleados? Esta acción persiste los cálculos semanales y acredita bolsa.`,
      )
    ) {
      return;
    }
    setConfirmando(true);
    setResultado(null);
    try {
      // Construir request de confirmacion con parametros por defecto
      // (factor prestacional 0.52436, salario 3M, valor hora 12500, jornada normal)
      const paramsDefault = {
        nivel_riesgo_arl: 'III',
        factor_prestacional: 0.52436,
        salario_base_mensual: 3_000_000,
        valor_hora_ordinaria: 12_500,
        jornada_nocturna: false,
        ot_id: null as number | null,
        ot_codigo: null as string | null,
      };
      const empleados: PlanConfirmarEmpleadoIn[] = empleadosPlan.map((e) => ({
        ...e,
        parametros: paramsDefault,
      }));
      const payload: PlanConfirmarRequest = {
        semana,
        usuario_confirma: localStorage.getItem('user_cedula') || 'portal',
        empleados,
      };
      const r = await confirmarPlan(payload, token);
      setResultado({
        ok: r.resumen.ok_count,
        error: r.resumen.error_count,
        he: r.resumen.total_horas_extras,
        costo: r.resumen.total_costo,
      });
      if (r.resumen.error_count === 0) {
        addNotification(
          'success',
          `Plan confirmado: ${r.resumen.ok_count} cálculos generados`,
        );
        setTimeout(() => navigate('/service-portal/horas-extras/calculos'), 1500);
      } else {
        addNotification(
          'warning',
          `Confirmación parcial: ${r.resumen.ok_count} OK, ${r.resumen.error_count} con errores`,
        );
      }
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setConfirmando(false);
    }
  };

  // Celda actualmente en edicion
  const celdaActual = celdaEdit
    ? empleadosPlan.find((e) => e.cedula === celdaEdit.cedula)?.dias.find(
        (d) => d.dia_semana === celdaEdit.diaSemana,
      )
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">
          Planificador Semanal
        </Title>
      </div>
      <Text className="mb-6 text-slate-500">
        Asigna horario y novedades a un grupo de empleados para la semana. Pre-calcula en vivo,
        guarda un borrador y confirma al cierre.
      </Text>

      {/* Selector de semana */}
      <MaterialCard className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Text className="text-xs text-slate-500 mb-1">Año</Text>
            <Input
              type="number"
              value={anio}
              min={2020}
              max={2100}
              onChange={(e) => setAnio(Number(e.target.value) || anio)}
              className="w-24"
            />
          </div>
          <div>
            <Text className="text-xs text-slate-500 mb-1">Semana ISO</Text>
            <Input
              type="number"
              value={semanaIso}
              min={1}
              max={53}
              onChange={(e) =>
                setSemanaIso(Math.max(1, Math.min(53, Number(e.target.value) || semanaIso)))
              }
              className="w-24"
            />
          </div>
          <div>
            <Text className="text-xs text-slate-500">Rango</Text>
            <Text className="font-medium">
              {semana.fecha_inicio} → {semana.fecha_fin}
            </Text>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge>{seleccionados.size} empleados</Badge>
            {preCalculo && (
              <Badge variant="info">
                HE est: {preCalculo.resumen.total_horas_extras.toFixed(1)}h
              </Badge>
            )}
          </div>
        </div>
      </MaterialCard>

      <div className="space-y-4">
        <SelectorEmpleados
          token={token}
          seleccionados={seleccionados}
          onToggle={toggleEmpleado}
          onLimpiar={limpiarSeleccion}
        />

        <DefaultHorarioSemana
          dias={defaultDias}
          onChange={setDefaultDias}
          onAplicarATodos={aplicarDefaultATodos}
        />

        <div>
          <Text className="font-semibold mb-2">Paso 3 — Ajustes por empleado × día</Text>
          <TablaPlanificacion
            empleados={empleadosPlan}
            onCeldaClick={(cedula, diaSemana) => setCeldaEdit({ cedula, diaSemana })}
            preCalculo={preCalculo}
          />
        </div>

        <ResumenPlan preCalculo={preCalculo} confirmado={resultado} />

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="secondary"
            onClick={handlePreCalcular}
            disabled={preCalculando || seleccionados.size === 0}
          >
            {preCalculando ? (
              <Spinner size="sm" className="mr-1" />
            ) : (
              <Calculator className="w-4 h-4 mr-1" />
            )}
            Pre-calcular
          </Button>
          <Button
            variant="secondary"
            onClick={handleGuardarBorrador}
            disabled={guardando || seleccionados.size === 0}
          >
            {guardando ? <Spinner size="sm" className="mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Guardar borrador
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmar}
            disabled={confirmando || seleccionados.size === 0}
          >
            {confirmando ? (
              <Spinner size="sm" className="mr-1" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1" />
            )}
            Confirmar semana
          </Button>
        </div>

        {resultado && resultado.error > 0 && (
          <MaterialCard className="p-4 border border-amber-200 bg-amber-50">
            <Text className="font-semibold text-amber-800 mb-1">Errores por empleado</Text>
            <Text className="text-sm text-amber-700">
              Revisa la respuesta del backend. Algunos empleados no pudieron confirmarse (ej. bolsa
              desactivada, sin horario, etc).
            </Text>
          </MaterialCard>
        )}
      </div>

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

      <div className="mt-8 text-xs text-slate-500 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Las reglas de cálculo (festivos, jornada nocturna, límites HED/HEN/HEFD/HEFN) son las
        mismas del motor de confirmación individual.
      </div>
    </div>
  );
};

export default PlanificadorSemanalView;
