import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Title, Text, MaterialCard, Badge, Button, Input, Textarea, Select } from '../../../../components/atoms';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  obtenerCalculo,
  obtenerHistorial,
  transicionarCalculo,
  obtenerEstadoGlobalBolsa,
} from '../../../../services/horasExtrasService';
import type {
  CalculoSemanal,
  WorkflowEvento,
  EstadoWorkflowDestino,
} from '../../../../types/horasExtras';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: 'bg-slate-200 text-slate-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  PAGADO: 'bg-emerald-100 text-emerald-700',
  COMPENSADO: 'bg-violet-100 text-violet-700',
  ANULADO: 'bg-red-100 text-red-700',
};

const CalculoDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { calculoId } = useParams<{ calculoId: string }>();
  const [calculo, setCalculo] = useState<CalculoSemanal | null>(null);
  const [historial, setHistorial] = useState<WorkflowEvento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bolsaHabilitada, setBolsaHabilitada] = useState<boolean | null>(null);

  // Form de transición
  const [destino, setDestino] = useState<EstadoWorkflowDestino>('PAGADO');
  const [justificacion, setJustificacion] = useState('');
  const [horasCompensar, setHorasCompensar] = useState('');
  const [fechaCompensar, setFechaCompensar] = useState(new Date().toISOString().slice(0, 10));
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = async () => {
    if (!calculoId) return;
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const [calc, hist] = await Promise.all([
        obtenerCalculo(Number(calculoId), token),
        obtenerHistorial(Number(calculoId), token).catch(() => [] as WorkflowEvento[]),
      ]);
      setCalculo(calc);
      setHistorial(hist);
      // S6: estado de bolsa por OT del calculo (puede ser null si la OT no tiene)
      const otId = calc.ot_id ?? null;
      const estado = await obtenerEstadoGlobalBolsa(otId, token).catch(() => null);
      setBolsaHabilitada(estado ? estado.bolsa_habilitada : true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el cálculo');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculoId]);

  const transicionesPermitidas = (): EstadoWorkflowDestino[] => {
    if (!calculo) return [];
    if (calculo.estado !== 'CONFIRMADO') return [];
    const base: EstadoWorkflowDestino[] = ['PAGADO', 'ANULADO'];
    if (bolsaHabilitada !== false) base.push('COMPENSADO');
    return base;
  };

  const handleTransicionar = async () => {
    if (!calculo) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const token = localStorage.getItem('token') || '';
      const payload: {
        estado_destino: EstadoWorkflowDestino;
        justificacion: string | null;
        horas: number | null;
        fecha: string | null;
      } = {
        estado_destino: destino,
        justificacion: justificacion || null,
        horas: null,
        fecha: null,
      };
      if (destino === 'COMPENSADO') {
        payload.horas = horasCompensar ? Number(horasCompensar) : null;
        payload.fecha = fechaCompensar;
      }
      const r = await transicionarCalculo(calculo.id, payload, token);
      setMensaje(r.mensaje);
      setJustificacion('');
      setHorasCompensar('');
      await cargar();
    } catch (e: unknown) {
      setMensaje(null);
      setError(e instanceof Error ? e.message : 'Error al transicionar');
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-8 text-center">
        <Text className="text-slate-500">Cargando cálculo...</Text>
      </div>
    );
  }

  if (error || !calculo) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras/calculos')}
          className="!p-2 !rounded-full mb-4"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <MaterialCard className="p-6 bg-red-50 border border-red-200">
          <Text className="text-red-700">{error || 'Cálculo no encontrado'}</Text>
        </MaterialCard>
      </div>
    );
  }

  const permitidas = transicionesPermitidas();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras/calculos')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Cálculo #{calculo.id}</Title>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MaterialCard className="p-4">
          <Text className="text-xs text-slate-500 mb-1">Empleado</Text>
          <Text className="text-lg font-semibold">{calculo.cedula}</Text>
          <div className="mt-3">
            <Text className="text-xs text-slate-500">Periodo</Text>
            <Text>{calculo.fecha_inicio} → {calculo.fecha_fin}</Text>
            <Text className="text-xs text-slate-500 mt-1">{calculo.anio}-W{String(calculo.semana_iso).padStart(2, '0')}</Text>
          </div>
        </MaterialCard>

        <MaterialCard className="p-4">
          <Text className="text-xs text-slate-500">Estado</Text>
          <div className="mt-1">
            <Text className={`inline-block px-2 py-1 rounded text-xs font-medium !m-0 ${ESTADO_COLOR[calculo.estado] || 'bg-slate-100'}`}>
              {calculo.estado}
            </Text>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <Text className="text-xs text-slate-500">Nivel ARL</Text>
              <Text>{calculo.nivel_riesgo_arl}</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Salario base</Text>
              <Text>{fmtCurrency(calculo.salario_base_mensual)}</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Valor hora</Text>
              <Text>{fmtCurrency(calculo.valor_hora_ordinaria)}</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Factor prestacional</Text>
              <Text>{(calculo.factor_prestacional * 100).toFixed(2)}%</Text>
            </div>
          </div>
        </MaterialCard>
      </div>

      <MaterialCard className="p-4 mb-6">
        <Text className="font-medium mb-3 block">Totales</Text>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Text className="text-xs text-slate-500">Horas extras</Text>
            <Text className="text-2xl font-bold">{calculo.total_horas_extras}h</Text>
          </div>
          <div>
            <Text className="text-xs text-slate-500">Valor bruto</Text>
            <Text className="text-2xl font-bold">{fmtCurrency(calculo.total_valor_bruto)}</Text>
          </div>
          <div>
            <Text className="text-xs text-slate-500">Carga prestacional</Text>
            <Text className="text-2xl font-bold">{fmtCurrency(calculo.total_carga_prestacional)}</Text>
          </div>
          <div>
            <Text className="text-xs text-slate-500">Costo empresa</Text>
            <Text className="text-2xl font-bold text-[var(--color-primary)]">
              {fmtCurrency(calculo.total_costo_empresa)}
            </Text>
          </div>
        </div>
      </MaterialCard>

      <MaterialCard className="p-4 mb-6">
        <Text className="font-medium mb-3 block">Detalle por código</Text>
        {calculo.detalles.length === 0 ? (
          <Text className="text-slate-500">Sin detalles.</Text>
        ) : (
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
                  <th className="text-left p-2">OT</th>
                  <th className="text-left p-2">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {calculo.detalles.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-2"><Badge>{d.codigo_novedad}</Badge></td>
                    <td className="text-right p-2">{d.horas}h</td>
                    <td className="text-right p-2">{d.factor_hora_ordinaria}</td>
                    <td className="text-right p-2">{fmtCurrency(d.valor_bruto)}</td>
                    <td className="text-right p-2">{fmtCurrency(d.carga_prestacional)}</td>
                    <td className="text-right p-2 font-medium">{fmtCurrency(d.costo_total)}</td>
                    <td className="p-2">{d.ot_codigo || '—'}</td>
                    <td className="p-2 text-xs text-slate-500">{d.fuente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MaterialCard>

      <MaterialCard className="p-4 mb-6">
        <Text className="font-medium mb-3 block">Workflow</Text>
        {permitidas.length === 0 ? (
          <Text className="text-slate-500 text-sm">
            El cálculo está en estado <strong>{calculo.estado}</strong>. No hay transiciones disponibles.
          </Text>
        ) : (
          <div className="space-y-3">
            <Text className="text-sm text-slate-600">
              Estado actual: <strong>{calculo.estado}</strong>. Transiciones disponibles:
            </Text>
            {bolsaHabilitada === false && (
              <div
                className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded flex items-start gap-2"
                role="status"
              >
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <Text className="text-amber-900 text-sm">
                  Bolsa deshabilitada para esta OT. Transición a COMPENSADO no
                  disponible — pague directamente en nómina usando PAGADO.
                </Text>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Acción"
                value={destino}
                onChange={(e) => setDestino(e.target.value as EstadoWorkflowDestino)}
                options={permitidas.map((p) => ({ value: p, label: p }))}
              />
              {destino === 'COMPENSADO' && (
                <>
                  <Input
                    label="Horas a compensar"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={calculo.total_horas_extras}
                    value={horasCompensar}
                    onChange={(e) => setHorasCompensar(e.target.value)}
                    placeholder={`Total: ${calculo.total_horas_extras}h`}
                  />
                  <Input
                    label="Fecha efectiva"
                    type="date"
                    value={fechaCompensar}
                    onChange={(e) => setFechaCompensar(e.target.value)}
                  />
                </>
              )}
            </div>
            <Textarea
              label="Justificación"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Motivo de la transición"
              rows={2}
            />
            <Button
              variant="primary"
              onClick={handleTransicionar}
              disabled={procesando}
            >
              {procesando ? 'Procesando...' : `Aplicar ${destino}`}
            </Button>
            {mensaje && <Text className="text-emerald-700 text-sm">{mensaje}</Text>}
          </div>
        )}

        {historial.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-neutral-700">
            <Text className="text-sm font-medium mb-2 block">Historial de transiciones</Text>
            <ul className="space-y-1 text-xs">
              {historial.map((ev) => (
                <li key={ev.id} className="flex justify-between text-slate-600">
                  <Text className="!m-0">
                    <strong>{ev.estado_origen} → {ev.estado_destino}</strong>
                    {ev.justificacion && (
                      <Text as="span" className="ml-2 text-slate-500 !m-0">
                        — {ev.justificacion}
                      </Text>
                    )}
                  </Text>
                  <Text className="text-slate-400 !m-0">{ev.created_at?.slice(0, 16).replace('T', ' ')} · {ev.usuario_id || '—'}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </MaterialCard>

      {(calculo.confirmado_por || calculo.calculado_por) && (
        <div className="mt-4 text-sm text-slate-500">
          {calculo.calculado_por && <Text className="!m-0">Calculado por: {calculo.calculado_por}. </Text>}
          {calculo.confirmado_por && <Text className="!m-0">Confirmado por: {calculo.confirmado_por}.</Text>}
        </div>
      )}
    </div>
  );
};

export default CalculoDetailView;
