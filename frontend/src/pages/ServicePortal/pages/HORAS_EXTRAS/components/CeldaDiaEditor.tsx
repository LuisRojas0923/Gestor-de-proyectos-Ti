/**
 * CeldaDiaEditor — Modal para editar Entrada/Salida/Almuerzo + Novedad
 * de un día específico de un empleado.
 */
import React, { useEffect, useState } from 'react';
import { Badge, Input, Button, Text, Select, Textarea, MaterialCard, Switch } from '../../../../../components/atoms';
import { X, Save } from 'lucide-react';
import { labelDia } from '../utils/horarioUtils';
import { buscarOtManoObra } from '../../../../../services/horasExtrasService';
import type { OtManoObraRead, PlanAsignacionOtIn, PlanDiaIn, PlanNovedadIn } from '../../../../../types/horasExtrasPlanificador';
import TimeClockPicker from './TimeClockPicker';
import Callout from '../../../../../components/molecules/Callout';
import { errorTurno } from '../utils/validarTurno';

const CODIGOS_NOVEDAD = ['INC', 'VAC', 'AUS', 'LIC'];

const horasTurno = (entrada: string | null, salida: string | null, almuerzo: number, cruzaMedianoche: boolean): number => {
  if (!entrada || !salida) return 0;
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = salida.split(':').map(Number);
  const inicio = eh * 60 + em;
  let fin = sh * 60 + sm;
  if (cruzaMedianoche) fin += 24 * 60;
  return Math.max(0, (fin - inicio - almuerzo) / 60);
};

const claveOt = (ot: Pick<PlanAsignacionOtIn, 'orden' | 'cc' | 'scc' | 'sub_indice'>): string =>
  [ot.orden, ot.cc ?? '', ot.scc ?? '', ot.sub_indice ?? ''].join('|');

const limitarHorasOt = (horas: number, maximo: number): number => (
  Math.max(0, Math.min(Math.min(24, maximo), Number(horas) || 0))
);

const opcionOtClass = 'group w-full flex-col items-stretch justify-start gap-1 rounded-xl border border-transparent !px-2.5 !py-2 text-left hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-primary)]/5 focus:ring-1 focus:ring-[var(--color-primary)]/30 focus:ring-offset-0 dark:hover:border-sky-500/30 dark:hover:bg-sky-950/35 [&>span]:w-full';
const etiquetaOtClass = 'rounded-lg bg-[var(--color-primary)]/10 px-1.5 py-0.5 !text-[10px] font-bold text-[var(--color-primary)] dark:bg-sky-400/10 dark:text-sky-200';
const datoOtClass = 'rounded-md bg-neutral-100 px-1.5 py-0.5 !text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';

interface CeldaDiaEditorProps {
  abierto: boolean;
  cedula: string;
  diaSemana: number;
  fecha: string;
  dia: PlanDiaIn;
  onCerrar: () => void;
  onGuardar: (dia: PlanDiaIn) => void;
}

const CeldaDiaEditor: React.FC<CeldaDiaEditorProps> = ({
  abierto,
  cedula,
  diaSemana,
  fecha,
  dia,
  onCerrar,
  onGuardar,
}) => {
  const [entrada, setEntrada] = useState<string | null>(dia.hora_entrada);
  const [salida, setSalida] = useState<string | null>(dia.hora_salida);
  const [almuerzo, setAlmuerzo] = useState<number>(dia.minutos_almuerzo);
  const [cruzaMedianoche, setCruzaMedianoche] = useState(dia.cruza_medianoche);
  const [errorHorario, setErrorHorario] = useState('');
  const [novedadCodigo, setNovedadCodigo] = useState<string>('');
  const [novedadObs, setNovedadObs] = useState<string>('');
  const [asignacionesOt, setAsignacionesOt] = useState<PlanAsignacionOtIn[]>(dia.asignaciones_ot ?? []);
  const [busquedaOt, setBusquedaOt] = useState('');
  const [opcionesOt, setOpcionesOt] = useState<OtManoObraRead[]>([]);
  const [cargandoOt, setCargandoOt] = useState(false);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    let cancelado = false;
    const q = busquedaOt.trim();
    if (q.length < 2 || asignacionesOt.length >= 3) {
      setOpcionesOt([]);
      return undefined;
    }
    setCargandoOt(true);
    const timer = window.setTimeout(async () => {
      try {
        const respuesta = await buscarOtManoObra(q, 8, 0, token);
        if (!cancelado) setOpcionesOt(respuesta.items);
      } catch {
        if (!cancelado) setOpcionesOt([]);
      } finally {
        if (!cancelado) setCargandoOt(false);
      }
    }, 250);
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [asignacionesOt.length, busquedaOt, token]);

  const horasDisponibles = horasTurno(entrada, salida, almuerzo, cruzaMedianoche);
  const horasAsignadas = asignacionesOt.reduce((total, item) => total + (Number(item.horas) || 0), 0);
  const excedeHoras = horasAsignadas - horasDisponibles > 0.01;

  const agregarOt = (ot: OtManoObraRead) => {
    if (asignacionesOt.length >= 3) return;
    if (asignacionesOt.some((item) => claveOt(item) === claveOt(ot))) return;
    const restante = Math.max(0, horasDisponibles - horasAsignadas);
    setAsignacionesOt((prev) => [
      ...prev,
      {
        orden: ot.orden,
        cc: ot.cc,
        scc: ot.scc,
        sub_indice: ot.sub_indice,
        categoria_sub_indice: ot.categoria_sub_indice,
        descripcion: ot.descripcion,
        vr_contratado: ot.vr_contratado,
        horas: Number(restante.toFixed(2)),
      },
    ]);
    setBusquedaOt('');
    setOpcionesOt([]);
  };

  const actualizarHorasOt = (idx: number, horas: number) => {
    setAsignacionesOt((prev) => prev.map((item, i) => (
      i === idx ? { ...item, horas: limitarHorasOt(horas, horasDisponibles) } : item
    )));
  };

  const quitarOt = (idx: number) => {
    setAsignacionesOt((prev) => prev.filter((_, i) => i !== idx));
  };

  const dividirHoras = () => {
    if (asignacionesOt.length === 0 || horasDisponibles <= 0) return;
    const horas = Number((horasDisponibles / asignacionesOt.length).toFixed(2));
    setAsignacionesOt((prev) => prev.map((item) => ({ ...item, horas })));
  };

  if (!abierto) return null;

  const handleGuardar = () => {
    const error = errorTurno({ hora_entrada: entrada, hora_salida: salida, minutos_almuerzo: almuerzo, cruza_medianoche: cruzaMedianoche });
    if (error) { setErrorHorario(error); return; }
    setErrorHorario('');
    const nuevasNovedades: PlanNovedadIn[] = [...dia.novedades];
    if (novedadCodigo) {
      nuevasNovedades.push({
        codigo_novedad: novedadCodigo,
        fecha_inicio: fecha,
        fecha_fin: fecha,
        observaciones: novedadObs || null,
      });
    }
    onGuardar({
      dia_semana: diaSemana,
      hora_entrada: entrada,
      hora_salida: salida,
      minutos_almuerzo: almuerzo,
      cruza_medianoche: cruzaMedianoche,
      novedades: nuevasNovedades,
      asignaciones_ot: asignacionesOt.map((item) => ({
        ...item,
        horas: limitarHorasOt(Number(item.horas) || 0, horasDisponibles),
        porcentaje: null,
      })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <MaterialCard className="w-full max-w-md p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Text className="font-semibold">
              {cedula} — {labelDia(diaSemana)}
            </Text>
            <Text className="text-xs text-[var(--color-text-secondary)]">{fecha}</Text>
          </div>
          <Button variant="ghost" size="sm" onClick={onCerrar} aria-label="Cerrar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Entrada</Text>
            <TimeClockPicker label="Entrada" value={entrada} onChange={setEntrada} presentation="inline" />
          </div>
          <div className="col-span-2">
            <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Salida</Text>
            <TimeClockPicker label="Salida" value={salida} onChange={setSalida} presentation="inline" />
          </div>
          <div className="col-span-2">
            <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Almuerzo (minutos)</Text>
            <Input
              type="number"
              min={0}
              max={240}
              value={almuerzo}
              onChange={(e) =>
                setAlmuerzo(Math.max(0, Math.min(240, Number(e.target.value) || 0)))
              }
            />
          </div>
          <div className="col-span-2">
            <Switch checked={cruzaMedianoche} onChange={setCruzaMedianoche} label="La salida corresponde al día siguiente" />
          </div>
        </div>
        {errorHorario && <Callout variant="error" role="alert">{errorHorario}</Callout>}

        <div className="border-t border-[var(--color-border)] pt-3 mb-3">
          <Text className="text-xs text-[var(--color-text-secondary)] mb-1">Novedad (opcional)</Text>
          <Select
            value={novedadCodigo}
            onChange={(e) => setNovedadCodigo(e.target.value)}
            className="w-full mb-2"
            options={[
              { value: '', label: '— Sin novedad —' },
              ...CODIGOS_NOVEDAD.map((c) => ({ value: c, label: c })),
            ]}
          />
          {novedadCodigo && (
            <Textarea
              value={novedadObs}
              onChange={(e) => setNovedadObs(e.target.value)}
              placeholder="Observaciones (opcional)"
              rows={2}
            />
          )}
        </div>

        <div className="border-t border-[var(--color-border)] pt-3 mb-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <Text className="text-xs font-semibold text-[var(--color-text-primary)]">OT / centros de costo</Text>
              <Text className="text-[11px] text-[var(--color-text-secondary)]">
                Máximo 3 por empleado/día. Reparte {horasDisponibles.toFixed(2)}h del turno.
              </Text>
            </div>
            <Button variant="ghost" size="xs" onClick={dividirHoras} disabled={asignacionesOt.length === 0 || horasDisponibles <= 0}>
              Dividir
            </Button>
          </div>

          <div className="space-y-2">
            {asignacionesOt.map((item, idx) => (
              <MaterialCard key={`${claveOt(item)}-${idx}`} className="p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Text className="truncate text-xs font-semibold text-[var(--color-primary)]">
                      OT {item.orden} · CC {item.cc ?? '—'} · SCC {item.scc ?? '—'} · Sub {item.sub_indice ?? '—'}
                    </Text>
                    <Text className="line-clamp-2 text-[11px] text-[var(--color-text-secondary)]">
                      {item.descripcion ?? item.categoria_sub_indice}
                    </Text>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => quitarOt(idx)} aria-label={`Quitar OT ${item.orden}`}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Text className="text-[11px] text-[var(--color-text-secondary)]">Horas</Text>
                  <Input
                    type="number"
                    min={0}
                    max={Math.min(24, horasDisponibles)}
                    step={0.25}
                    value={item.horas ?? 0}
                    onChange={(e) => actualizarHorasOt(idx, Number(e.target.value) || 0)}
                    className="h-8 max-w-[110px] text-xs"
                  />
                  <Badge size="xs" variant="default">{item.categoria_sub_indice}</Badge>
                </div>
              </MaterialCard>
            ))}
          </div>

          {asignacionesOt.length < 3 && (
            <div className="relative mt-2">
              <Input
                value={busquedaOt}
                onChange={(e) => setBusquedaOt(e.target.value)}
                placeholder="Buscar OT, descripción, CC o cliente"
                className="text-xs"
              />
              {(opcionesOt.length > 0 || cargandoOt) && (
                <MaterialCard className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-72 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-2xl">
                  {cargandoOt && <Text className="px-2 py-2 text-xs text-[var(--color-text-secondary)]">Buscando...</Text>}
                  {opcionesOt.map((ot) => (
                    <Button
                      key={claveOt(ot)}
                      type="button"
                      variant="custom"
                      onClick={() => agregarOt(ot)}
                      className={opcionOtClass}
                    >
                      <Text as="span" className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <Text as="span" className={etiquetaOtClass}>OT {ot.orden}</Text>
                        <Text as="span" className={datoOtClass}>CC {ot.cc ?? '—'}</Text>
                        <Text as="span" className={datoOtClass}>SCC {ot.scc ?? '—'}</Text>
                        <Text as="span" className={datoOtClass}>Sub {ot.sub_indice ?? '—'}</Text>
                      </Text>
                      <Text as="span" className="block truncate !text-[11px] font-medium leading-tight text-[var(--color-text-primary)] dark:text-neutral-200">
                        {ot.descripcion ?? ot.cliente ?? ot.categoria_sub_indice}
                      </Text>
                    </Button>
                  ))}
                </MaterialCard>
              )}
            </div>
          )}

          {excedeHoras && (
            <Text className="mt-2 text-[11px] font-semibold text-[var(--color-error)]">
              Las OT suman {horasAsignadas.toFixed(2)}h y superan las {horasDisponibles.toFixed(2)}h del turno.
            </Text>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGuardar} disabled={excedeHoras}>
            <Save className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
      </MaterialCard>
    </div>
  );
};

export default CeldaDiaEditor;
