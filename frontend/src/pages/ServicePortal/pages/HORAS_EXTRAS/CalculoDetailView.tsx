import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Title, Text, MaterialCard, Badge } from '../../../../components/atoms';
import { ArrowLeft } from 'lucide-react';
import { obtenerCalculo } from '../../../../services/horasExtrasService';
import type { CalculoSemanal } from '../../../../types/horasExtras';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const CalculoDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { calculoId } = useParams<{ calculoId: string }>();
  const [calculo, setCalculo] = useState<CalculoSemanal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!calculoId) return;
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const r = await obtenerCalculo(Number(calculoId), localStorage.getItem('token') || '');
        setCalculo(r);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el cálculo');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [calculoId]);

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
          <div className="mt-1"><Badge>{calculo.estado}</Badge></div>
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

      <MaterialCard className="p-4">
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

      {(calculo.confirmado_por || calculado_por) && (
        <div className="mt-4 text-sm text-slate-500">
          {calculo.calculado_por && <Text className="!m-0">Calculado por: {calculo.calculado_por}. </Text>}
          {calculo.confirmado_por && <Text className="!m-0">Confirmado por: {calculo.confirmado_por}.</Text>}
        </div>
      )}
    </div>
  );
};

export default CalculoDetailView;
