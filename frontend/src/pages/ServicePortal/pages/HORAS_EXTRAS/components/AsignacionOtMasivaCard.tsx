import React, { useState } from 'react';
import { Badge, Button, Input, MaterialCard, Text } from '../../../../../components/atoms';
import { BriefcaseBusiness, Search, Split, X } from 'lucide-react';
import { buscarOtManoObra } from '../../../../../services/horasExtrasService';
import type { OtManoObraRead, PlanAsignacionOtIn } from '../../../../../types/horasExtrasPlanificador';

interface AsignacionOtMasivaCardProps {
  seleccionadosCount: number;
  diasDestinoCount: number;
  horasTurnoPlantilla: number;
  onAplicar: (asignaciones: PlanAsignacionOtIn[]) => void;
}

const claveOt = (ot: Pick<PlanAsignacionOtIn, 'orden' | 'cc' | 'scc' | 'sub_indice'>): string =>
  [ot.orden, ot.cc ?? '', ot.scc ?? '', ot.sub_indice ?? ''].join('|');

const limitarHorasOt = (horas: number, maximo: number): number => (
  Math.max(0, Math.min(Math.min(24, maximo), Number(horas) || 0))
);

const opcionOtClass = 'group w-full flex-col items-stretch justify-start gap-1 rounded-xl border border-transparent !px-2.5 !py-2 text-left hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-primary)]/5 focus:ring-1 focus:ring-[var(--color-primary)]/30 focus:ring-offset-0 dark:hover:border-sky-500/30 dark:hover:bg-sky-950/35 [&>span]:w-full';
const etiquetaOtClass = 'rounded-lg bg-[var(--color-primary)]/10 px-1.5 py-0.5 !text-[10px] font-bold text-[var(--color-primary)] dark:bg-sky-400/10 dark:text-sky-200';
const datoOtClass = 'rounded-md bg-neutral-100 px-1.5 py-0.5 !text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';

const AsignacionOtMasivaCard: React.FC<AsignacionOtMasivaCardProps> = ({
  seleccionadosCount,
  diasDestinoCount,
  horasTurnoPlantilla,
  onAplicar,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [opciones, setOpciones] = useState<OtManoObraRead[]>([]);
  const [asignaciones, setAsignaciones] = useState<PlanAsignacionOtIn[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const token = localStorage.getItem('token') || '';

  const buscar = async () => {
    const q = busqueda.trim();
    if (q.length < 2 || asignaciones.length >= 3) return;
    setCargando(true);
    setErrorBusqueda('');
    try {
      const respuesta = await buscarOtManoObra(q, 8, 0, token);
      setOpciones(respuesta.items);
    } catch {
      setOpciones([]);
      setErrorBusqueda('No fue posible consultar las OT. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const agregar = (ot: OtManoObraRead) => {
    if (asignaciones.length >= 3) return;
    if (asignaciones.some((item) => claveOt(item) === claveOt(ot))) return;
    setAsignaciones((prev) => [
      ...prev,
      {
        orden: ot.orden,
        cc: ot.cc,
        scc: ot.scc,
        sub_indice: ot.sub_indice,
        categoria_sub_indice: ot.categoria_sub_indice,
        descripcion: ot.descripcion,
        cliente: ot.cliente,
        vr_contratado: ot.vr_contratado,
        horas: 0,
      },
    ]);
    setBusqueda('');
    setOpciones([]);
  };

  const actualizarHoras = (idx: number, horas: number) => {
    setAsignaciones((prev) => prev.map((item, i) => (
      i === idx ? { ...item, horas: limitarHorasOt(horas, horasTurnoPlantilla) } : item
    )));
  };

  const dividirTurno = () => {
    if (asignaciones.length === 0 || horasTurnoPlantilla <= 0) return;
    const horas = Number((horasTurnoPlantilla / asignaciones.length).toFixed(2));
    setAsignaciones((prev) => prev.map((item) => ({ ...item, horas })));
  };

  const quitar = (idx: number) => setAsignaciones((prev) => prev.filter((_, i) => i !== idx));
  const totalHoras = asignaciones.reduce((total, item) => total + (Number(item.horas) || 0), 0);
  const puedeAplicar = seleccionadosCount > 0 && diasDestinoCount > 0 && asignaciones.length > 0 && totalHoras > 0 && totalHoras - horasTurnoPlantilla <= 0.01;
  const asignacionesNormalizadas = asignaciones.map((item) => ({
    ...item,
    horas: limitarHorasOt(Number(item.horas) || 0, horasTurnoPlantilla),
    porcentaje: null,
  }));

  return (
    <div className="bg-[var(--color-surface)] p-2.5">
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/25 px-2.5 py-2">
            <Text as="span" className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <BriefcaseBusiness className="h-4 w-4" />
            </Text>
            <Text className="text-xs font-bold text-[var(--color-text-primary)]">OT masiva</Text>
            <Badge size="xs" variant="default">{asignaciones.length}/3 OT</Badge>
            <Text className="text-[11px] text-[var(--color-text-secondary)]">
              Aplica a {seleccionadosCount} empleados y {diasDestinoCount} días activos.
            </Text>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
            <div className="relative min-w-[260px] flex-1">
              <div className="flex gap-1.5">
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') buscar();
                  }}
                  placeholder="Buscar OT masiva, descripción, CC o cliente"
                  className="h-9 rounded-xl text-xs"
                  disabled={asignaciones.length >= 3}
                />
                <Button variant="secondary" size="sm" onClick={buscar} loading={cargando} disabled={busqueda.trim().length < 2 || asignaciones.length >= 3} aria-label="Buscar OT masiva" className="h-9 rounded-xl !px-3">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {errorBusqueda && <Text role="alert" className="mt-1 text-[11px] text-[var(--color-error)]">{errorBusqueda}</Text>}
              {opciones.length > 0 && (
                <MaterialCard className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-72 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-2xl">
                  {opciones.map((ot) => (
                    <Button
                      key={claveOt(ot)}
                      type="button"
                      variant="custom"
                      onClick={() => agregar(ot)}
                      className={opcionOtClass}
                    >
                      <Text as="span" className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <Text as="span" className={etiquetaOtClass}>OT {ot.orden}</Text>
                        <Text as="span" className={datoOtClass}>CC {ot.cc ?? '-'}</Text>
                        <Text as="span" className={datoOtClass}>SCC {ot.scc ?? '-'}</Text>
                        <Text as="span" className={datoOtClass}>Sub {ot.sub_indice ?? '-'}</Text>
                      </Text>
                      <Text as="span" className="block truncate !text-[11px] font-medium leading-tight text-[var(--color-text-primary)] dark:text-neutral-200">
                        {ot.descripcion ?? ot.cliente ?? ot.categoria_sub_indice}
                      </Text>
                    </Button>
                  ))}
                </MaterialCard>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {asignaciones.map((item, idx) => (
                <div key={`${claveOt(item)}-${idx}`} className="flex min-w-[250px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/40 px-2 py-1 shadow-sm">
                  <Text className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--color-primary)]">
                    OT {item.orden} · CC {item.cc ?? '-'}
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    max={Math.min(24, horasTurnoPlantilla)}
                    step={0.25}
                    value={item.horas ?? 0}
                    onChange={(e) => actualizarHoras(idx, Number(e.target.value) || 0)}
                    className="h-7 w-20 text-xs"
                    aria-label={`Horas OT masiva ${item.orden}`}
                  />
                  <Button variant="ghost" size="xs" onClick={() => quitar(idx)} aria-label={`Quitar OT masiva ${item.orden}`}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap xl:justify-end">
          <Button variant="outline" size="sm" onClick={dividirTurno} disabled={asignaciones.length === 0 || horasTurnoPlantilla <= 0} className="h-8 rounded-full !px-3 text-xs">
            <Split className="mr-1 h-4 w-4" />
            Dividir turno
          </Button>
          <Button variant="primary" size="sm" onClick={() => onAplicar(asignacionesNormalizadas)} disabled={!puedeAplicar} className="h-8 rounded-full !px-3 text-xs">
            Aplicar OT
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AsignacionOtMasivaCard;
