import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, MaterialCard, Input, Button } from '../../../../components/atoms';
import { ArrowLeft, Search, RefreshCw } from 'lucide-react';
import { listarCostosOt } from '../../../../services/horasExtrasService';
import type { CostoOt } from '../../../../types/horasExtras';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const CostosOtView: React.FC = () => {
  const navigate = useNavigate();

  const [otCodigo, setOtCodigo] = useState('');
  const [anio, setAnio] = useState<number | ''>('');
  const [costos, setCostos] = useState<CostoOt[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await listarCostosOt(
        {
          ot_codigo: otCodigo.trim() || undefined,
          anio: anio === '' ? undefined : Number(anio),
          limit: 100,
        },
        localStorage.getItem('token') || '',
      );
      setCostos(r);
    } catch {
      setCostos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/tiempo-asistencia')}
          className="!p-2 !rounded-full"
          aria-label="Volver a Tiempo y Asistencia"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Costos por OT</Title>
      </div>

      <MaterialCard className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Código OT"
            value={otCodigo}
            onChange={(e) => setOtCodigo(e.target.value)}
            placeholder="OT-2026-001"
          />
          <Input
            label="Año"
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Todos"
          />
          <div className="flex items-end">
            <Button onClick={cargar} disabled={cargando} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              {cargando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>
      </MaterialCard>

      {costos.length === 0 ? (
        <MaterialCard className="p-8 text-center">
          <Text className="text-slate-500">
            {cargando ? 'Cargando...' : 'No hay costos para los filtros seleccionados.'}
          </Text>
        </MaterialCard>
      ) : (
        <div className="space-y-3">
          {costos.map((c) => (
            <MaterialCard key={c.id} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <Text className="text-xs text-slate-500">OT</Text>
                  <Text className="font-medium">{c.ot_codigo}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Periodo</Text>
                  <Text>{c.anio}-W{String(c.semana_iso).padStart(2, '0')}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Empleados</Text>
                  <Text>{c.total_empleados}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Costo empresa</Text>
                  <Text className="font-medium text-[var(--color-primary)]">
                    {fmtCurrency(c.total_costo_empresa)}
                  </Text>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                <div>
                  <Text className="text-xs text-slate-500">Total horas</Text>
                  <Text>{c.total_horas}h</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">HED</Text>
                  <Text>{c.total_horas_hed}h</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">HEN</Text>
                  <Text>{c.total_horas_hen}h</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">HEFD</Text>
                  <Text>{c.total_horas_hefd}h</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">HEFN</Text>
                  <Text>{c.total_horas_hefn}h</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">HF</Text>
                  <Text>{c.total_horas_hf}h</Text>
                </div>
              </div>
            </MaterialCard>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={cargar} disabled={cargando}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refrescar
        </Button>
      </div>
    </div>
  );
};

export default CostosOtView;
