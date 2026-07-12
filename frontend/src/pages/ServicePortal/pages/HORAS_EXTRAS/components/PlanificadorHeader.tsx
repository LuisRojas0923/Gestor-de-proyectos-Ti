import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Copy, Eraser, History, Settings, Wallet } from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Text, Title } from '../../../../../components/atoms';
import type { PlanPreCalculoResponse } from '../../../../../types/horasExtrasPlanificador';

interface ResultadoConfirmacion {
  ok: number;
  error: number;
  he: number;
  costo: number;
}

interface PlanificadorHeaderProps {
  anio: number;
  semanaIso: number;
  fechaInicio: string;
  fechaFin: string;
  seleccionadosCount: number;
  preCalculo: PlanPreCalculoResponse | null;
  resultado: ResultadoConfirmacion | null;
  onFechaReferenciaChange: (fechaIso: string) => void;
  horarioSinEmpleados: boolean;
  novedadMasiva: string;
  onAplicarHorario: () => void;
  onLimpiarDias: () => void;
  controlesHorario?: React.ReactNode;
  accionesSemana?: React.ReactNode;
  children?: React.ReactNode;
}

const PlanificadorHeader: React.FC<PlanificadorHeaderProps> = ({
  anio,
  semanaIso,
  fechaInicio,
  fechaFin,
  resultado,
  onFechaReferenciaChange,
  horarioSinEmpleados,
  novedadMasiva,
  onAplicarHorario,
  onLimpiarDias,
  controlesHorario,
  accionesSemana,
  children,
}) => {
  const navigate = useNavigate();
  const campoSemanaClass = 'flex h-8 w-[152px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 shadow-none';
  const labelSemanaClass = 'shrink-0 !text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]';
  const inputSemanaClass = 'w-[96px] [&_input]:!h-6 [&_input]:!rounded-lg [&_input]:!px-1.5 [&_input]:!text-[10px]';
  const accionClass = 'h-9 w-full !justify-start rounded-2xl !px-2 !text-[11px] text-left shadow-sm [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:justify-start [&>span]:text-left';
  const accionHorarioClass = 'h-8 rounded-xl !px-2.5 !text-[11px] shadow-none [&>span]:inline-flex [&>span]:items-center [&>span]:!text-[11px] [&_svg]:mr-1 [&_svg]:h-3 [&_svg]:w-3';
  const chipSemanaClass = 'h-8 rounded-xl !px-2.5 !py-0 !text-[11px] shadow-none';

  const acciones = [
    { label: 'Configuración', icon: Settings, onClick: () => navigate('/service-portal/horas-extras/configuracion') },
    { label: 'Historial', icon: History, onClick: () => navigate('/service-portal/horas-extras/calculos') },
    { label: 'Bolsa', icon: Wallet, onClick: () => navigate('/service-portal/horas-extras/bolsa') },
    { label: 'Festivos', icon: Calendar, onClick: () => navigate('/service-portal/horas-extras/festivos') },
    { label: 'Costos OT', icon: Clock, onClick: () => navigate('/service-portal/horas-extras/costos-ot') },
  ];

  return (
    <MaterialCard className="overflow-visible border-[var(--color-primary)]/20 p-0 shadow-md shadow-[var(--color-primary)]/5">
      <div className="rounded-t-[1.5rem] border-b border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-surface)] to-[var(--color-surface-variant)] p-2.5 md:p-3">
        <div className="grid gap-2.5">
          <MaterialCard elevation={0} className="rounded-2xl border-[var(--color-primary)]/15 bg-[var(--color-surface)]/80 p-0 shadow-none">
            <div className="flex flex-col gap-2 p-2.5 lg:flex-row lg:items-center">
              <Text className="shrink-0 !text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Accesos rápidos</Text>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 md:grid-cols-5">
                {acciones.map(({ label, icon: Icono, onClick }) => (
                  <Button key={label} variant="outline" size="sm" onClick={onClick} className={accionClass}>
                    <Icono className="w-4 h-4 mr-1" />{label}
                  </Button>
                ))}
              </div>
            </div>
          </MaterialCard>

          <div className="grid gap-2.5 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
          <MaterialCard elevation={0} className="rounded-2xl border-[var(--color-primary)]/15 bg-[var(--color-surface)]/80 p-0 shadow-none">
            <div className="flex min-w-0 flex-col gap-1.5 p-2">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/service-portal/tiempo-asistencia')}
                  className="h-8 w-8 shrink-0 !rounded-full !p-0 shadow-none [&_svg]:h-3.5 [&_svg]:w-3.5"
                  aria-label="Volver a Tiempo y Asistencia"
                  title="Volver a Tiempo y Asistencia"
                >
                  <ArrowLeft />
                </Button>
                <div className="min-w-0 flex-1">
                  <Title level={2} className="!m-0 truncate !text-base leading-tight md:!text-lg">Formulario de Horarios</Title>
                  <Text className="truncate !text-[10px] font-medium leading-tight text-[var(--color-text-secondary)] md:!text-[11px]">
                    Programa turnos, novedades y OT para la semana seleccionada.
                  </Text>
                </div>
              </div>

              {resultado && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge size="xs" variant={resultado.error ? 'warning' : 'success'} className="h-6 shadow-none">{resultado.ok} OK / {resultado.error} errores</Badge>
                </div>
              )}
            </div>
          </MaterialCard>

          <MaterialCard elevation={0} className="rounded-2xl border-[var(--color-primary)]/15 bg-[var(--color-surface)]/80 p-0 shadow-none">
              <div className="p-2.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                  <div className={campoSemanaClass}>
                    <Text className={labelSemanaClass}>Inicio</Text>
                    <Input
                      type="date"
                      size="xs"
                      value={fechaInicio}
                      onChange={(e) => onFechaReferenciaChange(e.target.value)}
                      className={inputSemanaClass}
                    />
                  </div>
                  <div className={campoSemanaClass}>
                    <Text className={labelSemanaClass}>Fin</Text>
                    <Input
                      type="date"
                      size="xs"
                      value={fechaFin}
                      onChange={(e) => onFechaReferenciaChange(e.target.value)}
                      className={inputSemanaClass}
                    />
                  </div>
                  <Badge size="xs" variant="default" className={chipSemanaClass}>{anio}</Badge>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge size="xs" variant="info" className={chipSemanaClass}>Semana {semanaIso}</Badge>
                  <Button variant="secondary" size="sm" onClick={onAplicarHorario} disabled={horarioSinEmpleados} className={accionHorarioClass}><Copy />{novedadMasiva ? `Aplicar + ${novedadMasiva}` : 'Aplicar'}</Button>
                  <Button variant="ghost" size="sm" onClick={onLimpiarDias} disabled={horarioSinEmpleados} className={accionHorarioClass}><Eraser />Limpiar</Button>
                  {accionesSemana}
                </div>
              </div>
              {controlesHorario}
            </div>
          </MaterialCard>
          </div>
        </div>
      </div>

      {children && <div>{children}</div>}
    </MaterialCard>
  );
};

export default PlanificadorHeader;
