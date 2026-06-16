import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select, Badge, Checkbox } from '../../../../components/atoms';
import { ArrowLeft, Play, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  ejecutarPreLiquidacion,
  confirmarPreLiquidacion,
} from '../../../../services/horasExtrasService';
import type {
  PreLiquidacionInput,
  PreLiquidacionResultado,
  PreLiquidacionConfirmar,
  ConfirmarDetalleItem,
  NivelRiesgoARL,
} from '../../../../types/horasExtras';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

const PreLiquidacionView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const initialWeek = useMemo(getCurrentWeek, []);

  const [cedula, setCedula] = useState('');
  const [anio, setAnio] = useState(initialWeek.anio);
  const [semana, setSemana] = useState(initialWeek.semana);
  const [horas, setHoras] = useState<number[]>([8, 8, 8, 8, 8, 8, 8]);
  const [esJornadaNocturna, setEsJornadaNocturna] = useState(false);
  const [salario, setSalario] = useState<number>(3_000_000);
  const [nivel, setNivel] = useState<NivelRiesgoARL>('III');
  const [otCodigo, setOtCodigo] = useState('');
  const [otId, setOtId] = useState<number | ''>('');

  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<PreLiquidacionResultado | null>(null);

  const handleHorasChange = (idx: number, val: string) => {
    const num = Number(val);
    if (Number.isNaN(num)) return;
    const next = [...horas];
    next[idx] = Math.max(0, Math.min(24, num));
    setHoras(next);
  };

  const handleCalcular = async () => {
    if (!cedula.trim()) {
      addNotification('error', 'Debes ingresar la cédula del empleado');
      return;
    }
    setCalculando(true);
    setResultado(null);
    try {
      const input: PreLiquidacionInput = {
        cedula: cedula.trim(),
        anio,
        semana_iso: semana,
        horas_por_dia: horas,
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
      // fecha_inicio/fin aproximadas: lunes de la semana ISO
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
    <div className="p-6 max-w-5xl mx-auto">
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

        <Text className="font-medium mb-2 block">Horas trabajadas por día</Text>
        <div className="grid grid-cols-7 gap-2 mb-6">
          {DIAS.map((d, i) => (
            <div key={d}>
              <Text className="text-xs text-center block mb-1">{d}</Text>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={horas[i]}
                onChange={(e) => handleHorasChange(i, e.target.value)}
              />
            </div>
          ))}
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
