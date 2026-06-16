import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input } from '../../../../components/atoms';
import { ArrowLeft, Wallet, Search } from 'lucide-react';
import { obtenerBolsa } from '../../../../services/horasExtrasService';
import type { BolsaHoras } from '../../../../types/horasExtras';

const BolsaView: React.FC = () => {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState('');
  const [bolsa, setBolsa] = useState<BolsaHoras | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuscar = async () => {
    if (!cedula.trim()) return;
    setCargando(true);
    setError(null);
    setBolsa(null);
    try {
      const r = await obtenerBolsa(cedula.trim(), localStorage.getItem('token') || '');
      setBolsa(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al consultar bolsa');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Bolsa de Horas</Title>
      </div>

      <MaterialCard className="p-6 mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Cédula del empleado"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="1234567890"
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
          </div>
          <Button onClick={handleBuscar} disabled={cargando}>
            <Search className="w-4 h-4 mr-2" />
            {cargando ? 'Buscando...' : 'Consultar'}
          </Button>
        </div>
      </MaterialCard>

      {error && (
        <MaterialCard className="p-4 bg-red-50 border border-red-200">
          <Text className="text-red-700">{error}</Text>
        </MaterialCard>
      )}

      {bolsa && (
        <MaterialCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
            <Text className="font-medium text-lg !m-0">Empleado {bolsa.cedula}</Text>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Text className="text-xs text-slate-500">Acreditadas</Text>
              <Text className="text-2xl font-bold text-blue-600">{bolsa.horas_acreditadas}h</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Consumidas</Text>
              <Text className="text-2xl font-bold text-amber-600">{bolsa.horas_consumidas}h</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Pagadas</Text>
              <Text className="text-2xl font-bold text-slate-600">{bolsa.horas_pagadas}h</Text>
            </div>
            <div>
              <Text className="text-xs text-slate-500">Disponibles</Text>
              <Text className="text-2xl font-bold text-green-600">{bolsa.horas_disponibles}h</Text>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 dark:bg-neutral-800 rounded-lg text-sm text-slate-600">
            <Text className="!m-0">
              disponibles = acreditadas ({bolsa.horas_acreditadas}) − consumidas ({bolsa.horas_consumidas}) − pagadas ({bolsa.horas_pagadas})
            </Text>
          </div>
        </MaterialCard>
      )}
    </div>
  );
};

export default BolsaView;
