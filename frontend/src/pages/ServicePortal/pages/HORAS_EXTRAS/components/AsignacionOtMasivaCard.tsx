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
  const token = localStorage.getItem('token') || '';

  const buscar = async () => {
    const q = busqueda.trim();
    if (q.length < 2 || asignaciones.length >= 3) return;
    setCargando(true);
    try {
      const respuesta = await buscarOtManoObra(q, 8, 0, token);
      setOpciones(respuesta.items);
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
        vr_contratado: ot.vr_contratado,
        horas: 0,
      },
    ]);
    setBusqueda('');
    setOpciones([]);
  };

  const actualizarHoras = (idx: number, horas: number) => {
    setAsignaciones((prev) => prev.map((item, i) => (i === idx ? { ...item, horas } : item)));
  };

  const dividirTurno = () => {
    if (asignaciones.length === 0 || horasTurnoPlantilla <= 0) return;
    const horas = Number((horasTurnoPlantilla / asignaciones.length).toFixed(2));
    setAsignaciones((prev) => prev.map((item) => ({ ...item, horas })));
  };

  const quitar = (idx: number) => setAsignaciones((prev) => prev.filter((_, i) => i !== idx));
  const totalHoras = asignaciones.reduce((total, item) => total + (Number(item.horas) || 0), 0);
  const puedeAplicar = seleccionadosCount > 0 && diasDestinoCount > 0 && asignaciones.length > 0 && totalHoras > 0;

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
              {opciones.length > 0 && (
                <MaterialCard className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-56 overflow-y-auto p-1 shadow-xl">
                  {opciones.map((ot) => (
                    <Button
                      key={claveOt(ot)}
                      type="button"
                      variant="custom"
                      onClick={() => agregar(ot)}
                      className="w-full justify-start rounded-lg px-2 py-2 text-left hover:bg-[var(--color-primary)]/10"
                    >
                      <Text as="span" className="block truncate text-xs font-semibold text-[var(--color-primary)]">
                        OT {ot.orden} · CC {ot.cc ?? '-'} · SCC {ot.scc ?? '-'} · Sub {ot.sub_indice ?? '-'}
                      </Text>
                      <Text as="span" className="block truncate text-[11px] text-[var(--color-text-secondary)]">
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
                    max={24}
                    step={0.25}
                    value={item.horas ?? 0}
                    onChange={(e) => actualizarHoras(idx, Math.max(0, Number(e.target.value) || 0))}
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
          <Button variant="primary" size="sm" onClick={() => onAplicar(asignaciones)} disabled={!puedeAplicar} className="h-8 rounded-full !px-3 text-xs">
            Aplicar OT
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AsignacionOtMasivaCard;
