import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select, Badge } from '../../../../components/atoms';
import { ArrowLeft, Plus, RefreshCw, Search } from 'lucide-react';
import { listarNovedades } from '../../../../services/horasExtrasService';
import type { NovedadEstado, NovedadEventoListItem } from '../../../../types/horasExtras';

const ESTADO_VARIANT: Record<NovedadEstado, 'default' | 'info' | 'warning' | 'error'> = {
  BORRADOR: 'default',
  CONFIRMADO: 'info',
  ANULADO: 'error',
};

const NovedadesView: React.FC = () => {
  const navigate = useNavigate();

  const [cedula, setCedula] = useState('');
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState('');
  const [items, setItems] = useState<NovedadEventoListItem[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await listarNovedades(
        {
          cedula: cedula.trim() || undefined,
          codigo: codigo || undefined,
          estado: estado || undefined,
          limit: 100,
        },
        localStorage.getItem('token') || '',
      );
      setItems(r.items);
    } catch {
      setItems([]);
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
        <Title level={2} className="!m-0">Novedades (LIC, VAC, INC, AUS)</Title>
        <div className="ml-auto">
          <Button onClick={() => navigate('/service-portal/horas-extras/novedades/nueva')}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva novedad
          </Button>
        </div>
      </div>

      <MaterialCard className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Opcional"
          />
          <Select
            label="Código"
            value={codigo}
            onChange={setCodigo}
            options={[
              { value: '', label: 'Todos' },
              { value: 'LIC', label: 'LIC — Licencia remunerada' },
              { value: 'PNR', label: 'PNR — Licencia no remunerada' },
              { value: 'VAC', label: 'VAC — Vacaciones' },
              { value: 'INC', label: 'INC — Incapacidad' },
              { value: 'DXT', label: 'DXT — Descanso por tratamiento' },
              { value: 'AUS', label: 'AUS — Ausencia injustificada' },
              { value: 'SAN', label: 'SAN — Sanción disciplinaria' },
              { value: 'RET', label: 'RET — Retardo' },
            ]}
          />
          <Select
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={[
              { value: '', label: 'Todos' },
              { value: 'BORRADOR', label: 'Borrador' },
              { value: 'CONFIRMADO', label: 'Confirmado' },
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

      {items.length === 0 ? (
        <MaterialCard className="p-8 text-center">
          <Text className="text-slate-500">
            {cargando ? 'Cargando...' : 'No hay novedades para los filtros seleccionados.'}
          </Text>
        </MaterialCard>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <MaterialCard
              key={n.id}
              onClick={() => navigate(`/service-portal/horas-extras/novedades/${n.id}`)}
              hoverable
              className="p-4 cursor-pointer"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                <div>
                  <Text className="text-xs text-slate-500">Novedad</Text>
                  <Text className="font-medium">#{n.id}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Empleado</Text>
                  <Text>{n.cedula}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Código</Text>
                  <Text>
                    <Badge variant="info" size="sm">{n.codigo_novedad}</Badge>
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Rango</Text>
                  <Text>{n.fecha_inicio} → {n.fecha_fin}</Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Estado</Text>
                  <Badge variant={ESTADO_VARIANT[n.estado]} size="sm">{n.estado}</Badge>
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

      <MaterialCard className="p-4 mt-6 bg-slate-50">
        <Text className="text-xs text-slate-600 !m-0">
          Esta pantalla es captura de eventos. La integración con el motor de
          pre-liquidación (cómo cada categoría afecta el cálculo semanal) se
          entrega en S5b. Categorías S5: AUSENCIA, LICENCIA, VACACION,
          INCAPACIDAD. REM/RETIRO es S5c.
        </Text>
      </MaterialCard>
    </div>
  );
};

export default NovedadesView;
