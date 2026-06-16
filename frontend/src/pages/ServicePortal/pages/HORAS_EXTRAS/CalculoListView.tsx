import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select } from '../../../../components/atoms';
import { ArrowLeft, Search, RefreshCw } from 'lucide-react';
import { listarCalculos } from '../../../../services/horasExtrasService';
import type { CalculoSemanal } from '../../../../types/horasExtras';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: 'bg-slate-200 text-slate-800',
  CONFIRMADO: 'bg-blue-100 text-blue-800',
  PAGADO: 'bg-green-100 text-green-800',
  COMPENSADO: 'bg-amber-100 text-amber-800',
  ANULADO: 'bg-red-100 text-red-800',
};

const CalculoListView: React.FC = () => {
  const navigate = useNavigate();

  const [cedula, setCedula] = useState('');
  const [anio, setAnio] = useState<number | ''>('');
  const [estado, setEstado] = useState('');
  const [calculos, setCalculos] = useState<CalculoSemanal[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await listarCalculos(
        {
          cedula: cedula.trim() || undefined,
          anio: anio === '' ? undefined : Number(anio),
          estado: estado || undefined,
          limit: 100,
        },
        localStorage.getItem('token') || '',
      );
      setCalculos(r);
    } catch {
      setCalculos([]);
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
          onClick={() => navigate('/service-portal/horas-extras')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Historial de Cálculos</Title>
      </div>

      <MaterialCard className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Opcional"
          />
          <Input
            label="Año"
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Todos"
          />
          <Select
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={[
              { value: '', label: 'Todos' },
              { value: 'BORRADOR', label: 'Borrador' },
              { value: 'CONFIRMADO', label: 'Confirmado' },
              { value: 'PAGADO', label: 'Pagado' },
              { value: 'COMPENSADO', label: 'Compensado' },
              { value: 'ANULADO', label: 'Anulado' },
            ]}
          />
          <div className="flex items-end">
            <Button onClick={cargar} disabled={cargando} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              {cargando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>
      </MaterialCard>

      {calculos.length === 0 ? (
        <MaterialCard className="p-8 text-center">
          <Text className="text-slate-500">
            {cargando ? 'Cargando...' : 'No hay cálculos para los filtros seleccionados.'}
          </Text>
        </MaterialCard>
      ) : (
        <div className="space-y-2">
          {calculos.map((c) => (
            <MaterialCard
              key={c.id}
              onClick={() => navigate(`/service-portal/horas-extras/calculos/${c.id}`)}
              hoverable
              className="p-4 cursor-pointer"
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <div>
                  <Text className="text-xs text-slate-500">Cálculo</Text>
                  <Text className="font-medium">#{c.id}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Cédula</Text>
                  <Text>{c.cedula}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Periodo</Text>
                  <Text>{c.anio}-W{String(c.semana_iso).padStart(2, '0')}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Horas extras</Text>
                  <Text>{c.total_horas_extras}h</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Costo empresa</Text>
                  <Text className="font-medium">{fmtCurrency(c.total_costo_empresa)}</Text>
                </div>
                <div>
                  <Text className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[c.estado] || 'bg-slate-100'} !m-0`}>
                    {c.estado}
                  </Text>
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

export default CalculoListView;
