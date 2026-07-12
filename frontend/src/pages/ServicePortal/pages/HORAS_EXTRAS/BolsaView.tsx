import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Textarea } from '../../../../components/atoms';
import { ArrowLeft, Wallet, Search, Clock, AlertCircle } from 'lucide-react';
import { obtenerBolsa, compensarBolsa, obtenerEstadoGlobalBolsa } from '../../../../services/horasExtrasService';
import type { BolsaHoras, BolsaEstadoGlobalOut } from '../../../../types/horasExtras';

const BolsaView: React.FC = () => {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState('');
  const [bolsa, setBolsa] = useState<BolsaHoras | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estadoGlobal, setEstadoGlobal] = useState<BolsaEstadoGlobalOut | null>(null);

  // S6: estado global de la bolsa (carga una sola vez al montar)
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await obtenerEstadoGlobalBolsa(
          null,
          localStorage.getItem('token') || '',
        );
        if (!cancelado) setEstadoGlobal(r);
      } catch {
        if (!cancelado) setEstadoGlobal(null);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Form de compensación
  const [horasCompensar, setHorasCompensar] = useState('');
  const [fechaCompensar, setFechaCompensar] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);

  const handleBuscar = async () => {
    if (!cedula.trim()) return;
    setCargando(true);
    setError(null);
    setBolsa(null);
    setExito(null);
    try {
      const r = await obtenerBolsa(cedula.trim(), localStorage.getItem('token') || '');
      setBolsa(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al consultar bolsa');
    } finally {
      setCargando(false);
    }
  };

  const handleCompensar = async () => {
    if (!bolsa) return;
    const horas = Number(horasCompensar);
    if (!horas || horas <= 0) {
      setError('Las horas a compensar deben ser mayores a 0.');
      return;
    }
    if (horas > bolsa.horas_disponibles) {
      setError(`Solo hay ${bolsa.horas_disponibles}h disponibles.`);
      return;
    }
    setProcesando(true);
    setError(null);
    setExito(null);
    try {
      const r = await compensarBolsa(
        {
          cedula: bolsa.cedula,
          horas,
          fecha: fechaCompensar,
          calculo_id: null,
          observaciones: observaciones || null,
        },
        localStorage.getItem('token') || '',
      );
      setExito(`${r.mensaje} (disponibles después: ${r.horas_disponibles_despues}h)`);
      setHorasCompensar('');
      setObservaciones('');
      // Refrescar bolsa
      const actualizada = await obtenerBolsa(bolsa.cedula, localStorage.getItem('token') || '');
      setBolsa(actualizada);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al compensar');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/tiempo-asistencia')}
          className="!p-2 !rounded-full"
          aria-label="Volver a Tiempo y Asistencia"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Bolsa de Horas</Title>
      </div>

      {estadoGlobal && !estadoGlobal.bolsa_habilitada && (
        <div
          className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <Text className="font-semibold text-amber-900 block">
              La bolsa de horas está deshabilitada
            </Text>
            <Text className="text-amber-800 text-sm">
              Fuente: {estadoGlobal.fuente}. Los extras se pagan directamente en
              nómina, no se acumulan para tiempo compensatorio. La vista se
              mantiene habilitada para consulta y auditoría del histórico.
            </Text>
          </div>
        </div>
      )}

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
        <MaterialCard className="p-4 bg-red-50 border border-red-200 mb-4">
          <Text className="text-red-700">{error}</Text>
        </MaterialCard>
      )}

      {exito && (
        <MaterialCard className="p-4 bg-emerald-50 border border-emerald-200 mb-4">
          <Text className="text-emerald-700">{exito}</Text>
        </MaterialCard>
      )}

      {bolsa && (
        <>
          <MaterialCard className="p-6 mb-6">
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

          <MaterialCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-violet-600" />
              <Text className="font-medium text-lg !m-0">Compensar horas (tiempo libre)</Text>
            </div>

            {bolsa.horas_disponibles <= 0 ? (
              <Text className="text-slate-500 text-sm">No hay horas disponibles para compensar.</Text>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Horas a compensar"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={bolsa.horas_disponibles}
                    value={horasCompensar}
                    onChange={(e) => setHorasCompensar(e.target.value)}
                    placeholder={`Máx: ${bolsa.horas_disponibles}h`}
                  />
                  <Input
                    label="Fecha"
                    type="date"
                    value={fechaCompensar}
                    onChange={(e) => setFechaCompensar(e.target.value)}
                  />
                </div>
                <Textarea
                  label="Observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Motivo de la compensación (opcional)"
                  rows={2}
                />
                <Button
                  variant="primary"
                  onClick={handleCompensar}
                  disabled={procesando || !horasCompensar}
                >
                  {procesando ? 'Procesando...' : 'Compensar'}
                </Button>
              </div>
            )}
          </MaterialCard>
        </>
      )}
    </div>
  );
};

export default BolsaView;
