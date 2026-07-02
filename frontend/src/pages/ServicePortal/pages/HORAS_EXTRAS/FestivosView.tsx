import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, MaterialCard, Button, Select, Input, Badge } from '../../../../components/atoms';
import { ArrowLeft, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';
import { listarFestivos, sincronizarFestivos } from '../../../../services/horasExtrasService';
import type { Festivo, FuenteFestivo, FuenteFestivoQuery } from '../../../../types/horasExtras';

const ANIO_ACTUAL = new Date().getFullYear();

const FUENTE_BADGE: Record<FuenteFestivo, { variant: 'info' | 'warning'; label: string }> = {
  CALENDARIFIC: { variant: 'info', label: 'Calendarific' },
  LEY_EMILIANI: { variant: 'warning', label: 'Ley Emiliani' },
};

const FestivosView: React.FC = () => {
  const navigate = useNavigate();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [fuente, setFuente] = useState<FuenteFestivoQuery>('auto');
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [calendarificError, setCalendarificError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    setMensaje(null);
    setCalendarificError(null);
    try {
      const r = await listarFestivos(anio, fuente, localStorage.getItem('token') || '');
      setFestivos(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar festivos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, fuente]);

  const handleSincronizar = async () => {
    setSincronizando(true);
    setError(null);
    setMensaje(null);
    setCalendarificError(null);
    try {
      const r = await sincronizarFestivos(anio, localStorage.getItem('token') || '');
      setMensaje(r.mensaje);
      if (r.calendarific_error) {
        setCalendarificError(r.calendarific_error);
      }
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar');
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Festivos Nacionales</Title>
      </div>

      <MaterialCard className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Input
            label="Año"
            type="number"
            min={2000}
            max={2100}
            value={String(anio)}
            onChange={(e) => setAnio(Number(e.target.value) || ANIO_ACTUAL)}
          />
          <Select
            label="Fuente"
            value={fuente}
            onChange={(e) => setFuente(e.target.value as FuenteFestivoQuery)}
            options={[
              { value: 'auto', label: 'Auto (DB o Emiliani)' },
              { value: 'emiliani', label: 'Ley Emiliani' },
              { value: 'calendarific', label: 'Calendarific (DB)' },
            ]}
          />
          <Button
            onClick={handleSincronizar}
            disabled={sincronizando}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
        <Text className="text-xs text-slate-500 mt-3">
          Sincronizar intenta primero Calendarific (si CALENDARIFIC_API_KEY está
          configurada). Si falla, persiste el resultado de Ley Emiliani
          (Ley 51/1983: festivos en domingo se trasladan al lunes).
        </Text>
      </MaterialCard>

      {error && (
        <MaterialCard className="p-4 bg-red-50 border border-red-200 mb-4">
          <Text className="text-red-700">{error}</Text>
        </MaterialCard>
      )}

      {mensaje && (
        <MaterialCard className="p-4 bg-emerald-50 border border-emerald-200 mb-4">
          <Text className="text-emerald-700">{mensaje}</Text>
        </MaterialCard>
      )}

      {calendarificError && (
        <MaterialCard className="p-4 bg-amber-50 border border-amber-200 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <Text className="text-amber-800 font-medium">Calendarific no disponible</Text>
              <Text className="text-amber-700 text-sm">{calendarificError}</Text>
              <Text className="text-amber-700 text-xs mt-1">
                Se persistieron los festivos usando Ley Emiliani.
              </Text>
            </div>
          </div>
        </MaterialCard>
      )}

      <MaterialCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
          <Text className="font-medium text-lg !m-0">
            {festivos.length} festivos en {anio}
          </Text>
        </div>

        {cargando ? (
          <Text className="text-slate-500">Cargando...</Text>
        ) : festivos.length === 0 ? (
          <Text className="text-slate-500 text-sm">
            Sin festivos para mostrar. Use el botón Sincronizar para poblar el calendario.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-neutral-800">
                <tr>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Nombre</th>
                  <th className="text-left p-2">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {festivos.map((f, i) => {
                  const meta = FUENTE_BADGE[f.fuente];
                  return (
                    <tr key={`${f.fecha}-${i}`} className="border-t">
                      <td className="p-2 font-mono">{f.fecha}</td>
                      <td className="p-2">{f.nombre}</td>
                      <td className="p-2">
                        <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </MaterialCard>
    </div>
  );
};

export default FestivosView;
