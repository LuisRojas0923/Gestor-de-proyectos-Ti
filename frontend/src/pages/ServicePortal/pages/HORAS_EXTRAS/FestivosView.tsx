import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, List, RefreshCw, AlertTriangle } from 'lucide-react';
import { Title, Text, MaterialCard, Button, Select, Input, Badge } from '../../../../components/atoms';
import { listarFestivos, sincronizarFestivos } from '../../../../services/horasExtrasService';
import type { Festivo, FuenteFestivo, FuenteFestivoQuery } from '../../../../types/horasExtras';

const ANIO_ACTUAL = new Date().getFullYear();
const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

type VistaFestivos = 'lista' | 'calendario';

const FUENTE_BADGE: Record<FuenteFestivo, { variant: 'info' | 'warning'; label: string }> = {
  CALENDARIFIC: { variant: 'info', label: 'Calendarific' },
  LEY_EMILIANI: { variant: 'warning', label: 'Ley Emiliani' },
};

const fechaLocal = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const fechaIsoLocal = (anio: number, mes: number, dia: number): string => {
  const month = String(mes + 1).padStart(2, '0');
  const day = String(dia).padStart(2, '0');
  return `${anio}-${month}-${day}`;
};

const diaDelAnio = (fecha: Date): number => {
  const inicio = new Date(fecha.getFullYear(), 0, 1);
  return Math.floor((fecha.getTime() - inicio.getTime()) / 86_400_000) + 1;
};

const semanaDomingoPrimero = (fecha: Date): number => {
  const primeroEnero = new Date(fecha.getFullYear(), 0, 1);
  return Math.floor((diaDelAnio(fecha) - 1 + primeroEnero.getDay()) / 7) + 1;
};

const festivosPorFecha = (festivos: Festivo[]): Map<string, Festivo[]> => {
  const mapa = new Map<string, Festivo[]>();
  for (const festivo of festivos) {
    const existentes = mapa.get(festivo.fecha) ?? [];
    existentes.push(festivo);
    mapa.set(festivo.fecha, existentes);
  }
  return mapa;
};

const festivosPorMes = (festivos: Festivo[], mes: number): Festivo[] => (
  festivos.filter((festivo) => fechaLocal(festivo.fecha).getMonth() === mes)
);

const FestivosView: React.FC = () => {
  const navigate = useNavigate();
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [fuente, setFuente] = useState<FuenteFestivoQuery>('auto');
  const [vista, setVista] = useState<VistaFestivos>('lista');
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
      await cargar();
      setMensaje(r.mensaje);
      if (r.calendarific_error) {
        setCalendarificError(r.calendarific_error);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar');
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[min(100%,102rem)] mx-auto font-sans antialiased">
      <div className="flex flex-col gap-4 mb-6 rounded-[2rem] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-surface)] to-[var(--color-primary-light)]/20 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/tiempo-asistencia')}
          className="!p-2 !rounded-full shadow-sm"
          aria-label="Volver a Tiempo y Asistencia"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
          <div>
            <Title level={2} className="!m-0 tracking-tight">Festivos Nacionales</Title>
            <Text className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Calendario laboral Colombia con Ley Emiliani y fuentes sincronizadas.
            </Text>
          </div>
        </div>
        <Badge variant="info" size="sm">{anio}</Badge>
      </div>

      <MaterialCard className="p-5 md:p-6 mb-6 border border-[var(--color-border)]/70 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.25fr_1fr_auto] gap-4 items-end">
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
          <Select
            label="Vista"
            value={vista}
            onChange={(e) => setVista(e.target.value as VistaFestivos)}
            options={[
              { value: 'lista', label: 'Lista' },
              { value: 'calendario', label: 'Calendario' },
            ]}
          />
          <Button onClick={handleSincronizar} disabled={sincronizando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
        <Text className="text-xs text-[var(--color-text-secondary)] mt-3">
          Sincronizar intenta primero Calendarific (si CALENDARIFIC_API_KEY está
          configurada). Si falla, persiste el resultado de Ley Emiliani
          (festivos trasladables en el primer lunes igual o posterior).
        </Text>
      </MaterialCard>

      {error && (
        <MaterialCard className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 mb-4">
          <Text className="text-[var(--color-error)]">{error}</Text>
        </MaterialCard>
      )}

      {mensaje && (
        <MaterialCard className="p-4 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 mb-4">
          <Text className="text-[var(--color-success)]">{mensaje}</Text>
        </MaterialCard>
      )}

      {calendarificError && (
        <MaterialCard className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
            <div>
              <Text className="text-[var(--color-warning)] font-medium">Calendarific no disponible</Text>
              <Text className="text-[var(--color-warning)] text-sm">{calendarificError}</Text>
              <Text className="text-[var(--color-warning)] text-xs mt-1">
                Se persistieron los festivos usando Ley Emiliani.
              </Text>
            </div>
          </div>
        </MaterialCard>
      )}

      <MaterialCard className="p-4 sm:p-5 md:p-6 border border-[var(--color-border)]/70 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-2">
            {vista === 'calendario' ? (
              <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
            ) : (
              <List className="w-5 h-5 text-[var(--color-primary)]" />
            )}
            <Text className="font-semibold text-xl tracking-tight !m-0">
              {festivos.length} festivos en {anio}
            </Text>
          </div>
          <Badge variant={vista === 'calendario' ? 'info' : 'default'} size="sm">
            {vista === 'calendario' ? 'Vista calendario' : 'Vista lista'}
          </Badge>
        </div>

        {cargando ? (
          <Text className="text-[var(--color-text-secondary)]">Cargando...</Text>
        ) : festivos.length === 0 ? (
          <Text className="text-[var(--color-text-secondary)] text-sm">
            Sin festivos para mostrar. Use el botón Sincronizar para poblar el calendario.
          </Text>
        ) : vista === 'calendario' ? (
          <FestivosCalendario anio={anio} festivos={festivos} />
        ) : (
          <FestivosLista festivos={festivos} />
        )}
      </MaterialCard>
    </div>
  );
};

interface FestivosListaProps {
  festivos: Festivo[];
}

const FestivosLista: React.FC<FestivosListaProps> = ({ festivos }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-[var(--color-surface-secondary)]">
        <tr>
          <th className="text-left p-2 text-[var(--color-text-secondary)]">Fecha</th>
          <th className="text-left p-2 text-[var(--color-text-secondary)]">Nombre</th>
          <th className="text-left p-2 text-[var(--color-text-secondary)]">Fuente</th>
        </tr>
      </thead>
      <tbody>
        {festivos.map((f, i) => {
          const meta = FUENTE_BADGE[f.fuente];
          return (
            <tr key={`${f.fecha}-${i}`} className="border-t border-[var(--color-border)]">
              <td className="p-2 font-mono text-[var(--color-text-primary)]">{f.fecha}</td>
              <td className="p-2 text-[var(--color-text-primary)]">{f.nombre}</td>
              <td className="p-2">
                <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

interface FestivosCalendarioProps {
  anio: number;
  festivos: Festivo[];
}

const FestivosCalendario: React.FC<FestivosCalendarioProps> = ({ anio, festivos }) => {
  const porFecha = festivosPorFecha(festivos);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 xl:gap-6">
      {MESES.map((mesNombre, mes) => (
        <MesCalendario
          key={mesNombre}
          anio={anio}
          mes={mes}
          nombre={mesNombre}
          festivosMes={festivosPorMes(festivos, mes)}
          porFecha={porFecha}
        />
      ))}
    </div>
  );
};

interface MesCalendarioProps {
  anio: number;
  mes: number;
  nombre: string;
  festivosMes: Festivo[];
  porFecha: Map<string, Festivo[]>;
}

const MesCalendario: React.FC<MesCalendarioProps> = ({ anio, mes, nombre, festivosMes, porFecha }) => {
  const primerDia = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [
    ...Array.from({ length: primerDia.getDay() }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  const celdasCalendario = [
    ...celdas,
    ...Array.from({ length: (7 - (celdas.length % 7)) % 7 }, () => null),
  ];
  const filas = Array.from(
    { length: Math.ceil(celdasCalendario.length / 7) },
    (_, fila) => celdasCalendario.slice(fila * 7, fila * 7 + 7),
  );

  return (
    <MaterialCard className="overflow-hidden p-4 border border-[var(--color-border)]/70 bg-[var(--color-surface)] shadow-sm hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--color-border)]/60 pb-3">
        <div>
          <Text className="text-xl font-bold tracking-tight !m-0 text-[var(--color-text-primary)]">{nombre}</Text>
          <Text className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--color-text-secondary)] !m-0">
            {anio}
          </Text>
        </div>
        <div className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1">
          <Text className="text-[11px] font-semibold text-[var(--color-primary)] !m-0">
            {festivosMes.length} festivo{festivosMes.length === 1 ? '' : 's'}
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] gap-1.5 mb-2">
        <Text className="text-[10px] text-[var(--color-text-secondary)] !m-0" aria-hidden="true"> </Text>
        {DIAS_SEMANA.map((dia, index) => (
          <Text key={`${dia}-${index}`} align="center" className="rounded-full bg-[var(--color-surface-variant)]/70 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)] !m-0">
            {dia}
          </Text>
        ))}
      </div>

      <div className="space-y-1.5">
        {filas.map((fila, filaIndex) => {
          const primerDiaFila = fila.find((dia): dia is number => dia !== null) ?? 1;
          const semana = semanaDomingoPrimero(new Date(anio, mes, primerDiaFila));
          return (
            <div key={`${nombre}-${filaIndex}`} className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] gap-1.5 items-center">
              <Text className="text-[10px] font-semibold tabular-nums tracking-wide text-[var(--color-text-secondary)] !m-0">S{semana}</Text>
              {fila.map((dia, diaSemana) => {
                if (dia === null) {
                  return <div key={`vacio-${filaIndex}-${diaSemana}`} className="h-8 rounded-xl bg-[var(--color-surface-variant)]/20" />;
                }
                const fecha = fechaIsoLocal(anio, mes, dia);
                const eventos = porFecha.get(fecha) ?? [];
                const esFestivo = eventos.length > 0;
                const esDomingo = diaSemana === 0;
                const esHoy = fecha === fechaIsoLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                return (
                  <div
                    key={fecha}
                    className={`grid h-8 place-items-center rounded-xl px-1 transition-all duration-200 ${
                      esHoy
                        ? 'bg-[var(--color-warning)]/20 text-[var(--color-text-primary)] ring-1 ring-[var(--color-warning)]/60 shadow-sm'
                        : esFestivo
                          ? 'bg-[var(--color-primary)] text-[var(--color-surface)] ring-1 ring-[var(--color-primary)]/30 shadow-sm hover:shadow-md'
                          : esDomingo
                            ? 'bg-[var(--dust-grey)] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]/40 dark:bg-[var(--color-border)]/45'
                            : 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-variant)]/45'
                    }`}
                    title={eventos.map((evento) => evento.nombre).join(' / ')}
                  >
                    <Text as="span" align="center" className="block w-full text-sm font-semibold leading-none tabular-nums !m-0 text-inherit">
                      {dia}
                    </Text>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {festivosMes.length > 0 && (
        <div className="mt-4 space-y-2">
          {festivosMes.map((festivo) => {
            const meta = FUENTE_BADGE[festivo.fuente];
            return (
              <div key={`${festivo.fecha}-${festivo.nombre}`} className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-primary)]/15 bg-[var(--color-primary)]/5 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-primary)]" />
                  <Text className="truncate text-xs font-semibold !m-0 text-[var(--color-text-primary)]">
                    {fechaLocal(festivo.fecha).getDate()} · {festivo.nombre}
                  </Text>
                </div>
                <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </MaterialCard>
  );
};

export default FestivosView;
