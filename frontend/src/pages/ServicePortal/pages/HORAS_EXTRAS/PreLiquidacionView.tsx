import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select, Badge, Checkbox } from '../../../../components/atoms';
import { ArrowLeft, Play, Save, AlertTriangle, CheckCircle2, Clock, Settings2, Calendar, Briefcase } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  ejecutarPreLiquidacion,
  confirmarPreLiquidacion,
  obtenerHorarioSemana,
  listarFestivos,
  listarNovedades,
} from '../../../../services/horasExtrasService';
import type {
  PreLiquidacionInput,
  PreLiquidacionResultado,
  PreLiquidacionConfirmar,
  ConfirmarDetalleItem,
  NivelRiesgoARL,
  RegistroDiario,
  Festivo,
  NovedadEventoListItem,
} from '../../../../types/horasExtras';
import {
  calcularHorasDia,
  horarioPactadoARegistro,
  labelDia,
  totalHorasSemana,
  fechasDeSemanaIso,
  fechaIsoCorta,
  fechaEnRango,
} from './utils/horarioUtils';

const CODIGOS_NOVEDAD_SUPRESION = ['VAC', 'LIC', 'INC', 'AUS'] as const;

const HORAS_ORDINARIAS_DIARIAS = 8;

const NIVELES: { value: NivelRiesgoARL; label: string }[] = [
  { value: 'I', label: 'Nivel I — Dirección' },
  { value: 'II', label: 'Nivel II — Administrativo' },
  { value: 'III', label: 'Nivel III — Operativo' },
  { value: 'IV', label: 'Nivel IV — Operativo alto' },
  { value: 'V', label: 'Nivel V — Riesgo máximo' },
];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const getCurrentWeek = (): { anio: number; semana: number } => {
  const now = new Date();
  const target = new Date(now.valueOf());
  const dayNr = (now.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { anio: now.getFullYear(), semana: week };
};

const registroVacio = (): RegistroDiario[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dia_semana: i + 1,
    hora_entrada: null,
    hora_salida: null,
    minutos_almuerzo: 0,
  }));

const PreLiquidacionView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const initialWeek = useMemo(getCurrentWeek, []);

  const [cedula, setCedula] = useState('');
  const [anio, setAnio] = useState(initialWeek.anio);
  const [semana, setSemana] = useState(initialWeek.semana);
  const [registro, setRegistro] = useState<RegistroDiario[]>(registroVacio);
  const [esJornadaNocturna, setEsJornadaNocturna] = useState(false);
  const [salario, setSalario] = useState<number>(3_000_000);
  const [nivel, setNivel] = useState<NivelRiesgoARL>('III');
  const [otCodigo, setOtCodigo] = useState('');
  const [otId, setOtId] = useState<number | ''>('');

  const [cargandoHorario, setCargandoHorario] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<PreLiquidacionResultado | null>(null);

  // S5''' — Festivos y novedades de la semana (auto-fetch cuando cambian anio/semana/cedula)
  const [festivosSemana, setFestivosSemana] = useState<Festivo[]>([]);
  const [novedadesSemana, setNovedadesSemana] = useState<NovedadEventoListItem[]>([]);

  // Fechas de la semana (L-D) como strings YYYY-MM-DD
  const fechasSemana = useMemo(
    () => fechasDeSemanaIso(anio, semana).map(fechaIsoCorta),
    [anio, semana],
  );

  // Mapas para lookup O(1) en el render
  const festivoPorFecha = useMemo(() => {
    const m = new Map<string, Festivo>();
    for (const f of festivosSemana) {
      const key = typeof f.fecha === 'string' ? f.fecha.slice(0, 10) : fechaIsoCorta(new Date(f.fecha));
      m.set(key, f);
    }
    return m;
  }, [festivosSemana]);

  const novedadesPorFecha = useMemo(() => {
    const m = new Map<string, NovedadEventoListItem[]>();
    for (const n of novedadesSemana) {
      if (!(CODIGOS_NOVEDAD_SUPRESION as readonly string[]).includes(n.codigo_novedad)) continue;
      const inicio = n.fecha_inicio.slice(0, 10);
      const fin = n.fecha_fin.slice(0, 10);
      for (const fecha of fechasSemana) {
        if (fechaEnRango(fecha, inicio, fin)) {
          const list = m.get(fecha) ?? [];
          list.push(n);
          m.set(fecha, list);
        }
      }
    }
    return m;
  }, [novedadesSemana, fechasSemana]);

  // Cargar festivos del año cuando cambia anio
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const fs = await listarFestivos(anio, 'auto', token);
        if (!cancel) setFestivosSemana(fs);
      } catch {
        if (!cancel) setFestivosSemana([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [anio]);

  // Cargar novedades CONFIRMADAS del empleado que intersectan la semana
  useEffect(() => {
    if (!cedula.trim()) {
      setNovedadesSemana([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const inicio = fechasSemana[0];
        const fin = fechasSemana[6];
        const r = await listarNovedades(
          { cedula: cedula.trim(), fecha_desde: inicio, fecha_hasta: fin, estado: 'CONFIRMADO', limit: 200 },
          token,
        );
        if (!cancel) setNovedadesSemana(r.items);
      } catch {
        if (!cancel) setNovedadesSemana([]);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedula, anio, semana]);

  // Cálculos en vivo (no se envían al backend; son referencia para el usuario)
  const horasPorDia = useMemo(
    () => registro.map((r) => calcularHorasDia(r.hora_entrada, r.hora_salida, r.minutos_almuerzo)),
    [registro],
  );
  const totalHorasTrabajadas = useMemo(() => horasPorDia.reduce((a, b) => a + b, 0), [horasPorDia]);
  const horasExtrasEsperadas = useMemo(
    () => horasPorDia.reduce((acc, h) => acc + Math.max(0, h - HORAS_ORDINARIAS_DIARIAS), 0),
    [horasPorDia],
  );

  const updateDia = (idx: number, patch: Partial<RegistroDiario>) => {
    setRegistro((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const cargarHorario = async () => {
    if (!cedula.trim()) {
      addNotification('error', 'Ingresa la cédula primero');
      return;
    }
    setCargandoHorario(true);
    try {
      const resp = await obtenerHorarioSemana(
        cedula.trim(),
        localStorage.getItem('token') || '',
      );
      // Pre-rellenar el registro con el horario pactado (es la jornada ordinaria
      // — el usuario ajustará si se quedó más tiempo).
      setRegistro(resp.dias.map(horarioPactadoARegistro));
      addNotification('success', 'Horario del empleado cargado');
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al cargar horario');
    } finally {
      setCargandoHorario(false);
    }
  };

  const handleCalcular = async () => {
    if (!cedula.trim()) {
      addNotification('error', 'Debes ingresar la cédula del empleado');
      return;
    }
    if (totalHorasTrabajadas === 0) {
      addNotification(
        'warning',
        'No hay horas trabajadas esta semana (todos los días en blanco)',
      );
    }
    setCalculando(true);
    setResultado(null);
    try {
      const input: PreLiquidacionInput = {
        cedula: cedula.trim(),
        anio,
        semana_iso: semana,
        // horas_por_dia se sobreescribe en backend cuando registro_diario viene
        horas_por_dia: horasPorDia,
        registro_diario: registro,
        es_jornada_nocturna: esJornadaNocturna,
        salario_base_mensual: salario,
        nivel_riesgo_arl: nivel,
        ot_codigo: otCodigo.trim() || null,
        ot_id: otId === '' ? null : Number(otId),
      };
      const r = await ejecutarPreLiquidacion(input, localStorage.getItem('token') || '');
      setResultado(r);
      addNotification(
        'success',
        r.total_horas_extras > 0
          ? `Cálculo: ${r.total_horas_extras}h extras, costo ${fmtCurrency(r.total_costo_empresa)}`
          : 'Sin horas extras esta semana',
      );
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al calcular');
    } finally {
      setCalculando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!resultado) return;
    setConfirmando(true);
    try {
      const simple = new Date(Date.UTC(anio, 0, 1 + (semana - 1) * 7));
      const dayOffset = (simple.getUTCDay() + 6) % 7;
      const fechaInicio = new Date(simple);
      fechaInicio.setUTCDate(simple.getUTCDate() - dayOffset);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setUTCDate(fechaInicio.getUTCDate() + 6);

      const detalles: ConfirmarDetalleItem[] = resultado.detalles.map((d) => ({
        codigo_novedad: d.codigo_novedad,
        horas: d.horas,
        factor_hora_ordinaria: d.factor_hora_ordinaria,
        valor_bruto: d.valor_bruto,
        carga_prestacional: d.carga_prestacional,
        costo_total: d.costo_total,
        fuente: 'PORTAL',
      }));

      const payload: PreLiquidacionConfirmar = {
        cedula: resultado.cedula,
        anio: resultado.anio,
        semana_iso: resultado.semana_iso,
        fecha_inicio: fechaInicio.toISOString().slice(0, 10),
        fecha_fin: fechaFin.toISOString().slice(0, 10),
        nivel_riesgo_arl: resultado.nivel_riesgo_arl,
        factor_prestacional: resultado.factor_prestacional,
        salario_base_mensual: resultado.salario_base_mensual,
        valor_hora_ordinaria: resultado.valor_hora_ordinaria,
        detalles,
        ot_id: otId === '' ? null : Number(otId),
        ot_codigo: otCodigo.trim() || null,
        usuario_confirma: cedula.trim(),
        observaciones: null,
      };

      const r = await confirmarPreLiquidacion(payload, localStorage.getItem('token') || '');
      addNotification(
        'success',
        `Cálculo confirmado (id=${r.calculo_id}). Bolsa: +${r.horas_acreditadas_bolsa}h`,
      );
      setResultado(null);
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Pre-liquidación de Horas Extras</Title>
      </div>

      <MaterialCard className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input
            label="Cédula del empleado"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="1234567890"
          />
          <Input
            label="Año"
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
          />
          <Input
            label="Semana ISO"
            type="number"
            min={1}
            max={53}
            value={semana}
            onChange={(e) => setSemana(Math.max(1, Math.min(53, Number(e.target.value))))}
          />
          <Input
            label="Salario base mensual"
            type="number"
            value={salario}
            onChange={(e) => setSalario(Number(e.target.value))}
          />
          <Select
            label="Nivel de riesgo ARL"
            value={nivel}
            onChange={(v) => setNivel(v as NivelRiesgoARL)}
            options={NIVELES.map((n) => ({ value: n.value, label: n.label }))}
          />
          <div className="flex items-end">
            <Checkbox
              label="Jornada nocturna"
              checked={esJornadaNocturna}
              onChange={(e) => setEsJornadaNocturna(e.target.checked)}
            />
          </div>
          <Input
            label="Código OT (opcional)"
            value={otCodigo}
            onChange={(e) => setOtCodigo(e.target.value)}
            placeholder="OT-2026-001"
          />
          <Input
            label="ID OT (opcional)"
            type="number"
            value={otId}
            onChange={(e) => setOtId(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <Text className="font-medium block">Jornada real de la semana (formato reloj)</Text>
            <Text className="text-xs text-slate-500">
              Teclea la hora de entrada y salida. El sistema descuenta el almuerzo y calcula
              las horas extras sobre las 8h ordinarias diarias.
            </Text>
          </div>
          <Button
            variant="secondary"
            onClick={cargarHorario}
            disabled={cargandoHorario || !cedula.trim()}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {cargandoHorario ? 'Cargando...' : 'Cargar horario del empleado'}
          </Button>
        </div>

        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="py-2 pr-3 w-16">Día</th>
                <th className="py-2 pr-3">Entrada</th>
                <th className="py-2 pr-3">Salida</th>
                <th className="py-2 pr-3 w-32">Almuerzo (min)</th>
                <th className="py-2 pr-3 w-28 text-right">Horas trab.</th>
                <th className="py-2 pr-3 w-28 text-right">HE esperadas</th>
              </tr>
            </thead>
            <tbody>
              {registro.map((r, idx) => {
                const trabajadas = horasPorDia[idx];
                const he = Math.max(0, trabajadas - HORAS_ORDINARIAS_DIARIAS);
                const fecha = fechasSemana[idx];
                const festivo = festivoPorFecha.get(fecha);
                const novedades = novedadesPorFecha.get(fecha) ?? [];
                const novedadPrincipal = novedades[0];
                const conflicto = !!novedadPrincipal && trabajadas > 0;
                return (
                  <tr
                    key={r.dia_semana}
                    className={`border-b last:border-b-0 ${conflicto ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                  >
                    <td className="py-2 pr-3 align-middle">
                      <div className="flex flex-col gap-1">
                        <Badge variant={idx < 5 ? 'default' : 'info'} size="sm">
                          {labelDia(r.dia_semana)}
                        </Badge>
                        {festivo && (
                          <Badge variant="warning" size="sm" title={festivo.nombre}>
                            <Calendar className="w-3 h-3 mr-1 inline" />
                            {festivo.nombre}
                          </Badge>
                        )}
                        {novedadPrincipal && (
                          <Badge
                            variant={conflicto ? 'error' : 'info'}
                            size="sm"
                            title={conflicto ? 'Hay horas trabajadas en un día con novedad — el backend las anulará' : ''}
                          >
                            <Briefcase className="w-3 h-3 mr-1 inline" />
                            {novedadPrincipal.codigo_novedad}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="time"
                        value={r.hora_entrada ?? ''}
                        onChange={(e) =>
                          updateDia(idx, {
                            hora_entrada: e.target.value === '' ? null : e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="time"
                        value={r.hora_salida ?? ''}
                        onChange={(e) =>
                          updateDia(idx, {
                            hora_salida: e.target.value === '' ? null : e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        min={0}
                        max={240}
                        step={5}
                        value={r.minutos_almuerzo}
                        onChange={(e) =>
                          updateDia(idx, {
                            minutos_almuerzo: Math.max(0, Math.min(240, Number(e.target.value) || 0)),
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3 text-right align-middle">
                      <Text className={trabajadas === 0 ? 'text-slate-400' : 'font-medium'}>
                        {trabajadas.toFixed(2)}h
                      </Text>
                    </td>
                    <td className="py-2 pr-3 text-right align-middle">
                      <Text className={he > 0 ? 'font-bold text-[var(--color-primary)]' : 'text-slate-400'}>
                        {he.toFixed(2)}h
                      </Text>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td colSpan={4} className="py-2 pr-3 text-right font-medium">
                  Total semana
                </td>
                <td className="py-2 pr-3 text-right font-bold">{totalHorasTrabajadas.toFixed(2)}h</td>
                <td className="py-2 pr-3 text-right font-bold text-[var(--color-primary)]">
                  {horasExtrasEsperadas.toFixed(2)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCalcular} disabled={calculando}>
            <Play className="w-4 h-4 mr-2" />
            {calculando ? 'Calculando...' : 'Calcular'}
          </Button>
        </div>
      </MaterialCard>

      {resultado && (
        <MaterialCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <Title level={3} className="!m-0">Resultado</Title>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Text className="text-xs text-slate-500">Horas extras</Text>
              <Text className="text-2xl font-bold">{resultado.total_horas_extras}h</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Valor hora ordinaria</Text>
              <Text className="text-2xl font-bold">{fmtCurrency(resultado.valor_hora_ordinaria)}</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Valor bruto</Text>
              <Text className="text-2xl font-bold">{fmtCurrency(resultado.total_valor_bruto)}</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Costo empresa</Text>
              <Text className="text-2xl font-bold text-[var(--color-primary)]">
                {fmtCurrency(resultado.total_costo_empresa)}
              </Text>
            </div>
          </div>

          {resultado.advertencias.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <Text className="font-medium !m-0 text-amber-800 dark:text-amber-200">Advertencias</Text>
              </div>
              <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc pl-5">
                {resultado.advertencias.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.detalles.length > 0 && (
            <div className="mb-4">
              <Text className="font-medium mb-2 block">Desglose por código</Text>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-neutral-800">
                    <tr>
                      <th className="text-left p-2">Código</th>
                      <th className="text-right p-2">Horas</th>
                      <th className="text-right p-2">Factor</th>
                      <th className="text-right p-2">Bruto</th>
                      <th className="text-right p-2">Carga</th>
                      <th className="text-right p-2">Costo total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.detalles.map((d) => (
                      <tr key={d.codigo_novedad} className="border-t">
                        <td className="p-2"><Badge>{d.codigo_novedad}</Badge></td>
                        <td className="text-right p-2">{d.horas}h</td>
                        <td className="text-right p-2">{d.factor_hora_ordinaria}</td>
                        <td className="text-right p-2">{fmtCurrency(d.valor_bruto)}</td>
                        <td className="text-right p-2">{fmtCurrency(d.carga_prestacional)}</td>
                        <td className="text-right p-2 font-medium">{fmtCurrency(d.costo_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultado.detalles.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResultado(null)}>
                Descartar
              </Button>
              <Button onClick={handleConfirmar} disabled={confirmando}>
                <Save className="w-4 h-4 mr-2" />
                {confirmando ? 'Confirmando...' : 'Confirmar y persistir'}
              </Button>
            </div>
          )}
        </MaterialCard>
      )}
    </div>
  );
};

export default PreLiquidacionView;
