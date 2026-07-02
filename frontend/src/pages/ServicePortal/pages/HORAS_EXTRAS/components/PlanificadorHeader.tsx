import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ClipboardList, Clock, Copy, Eraser, History, Settings, Wallet } from 'lucide-react';
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
  novedadMasivaActiva: boolean;
  onAplicarHorario: () => void;
  onAgregarNovedad: () => void;
  onLimpiarDias: () => void;
  controlesHorario?: React.ReactNode;
  children?: React.ReactNode;
}

const PlanificadorHeader: React.FC<PlanificadorHeaderProps> = ({
  anio,
  semanaIso,
  fechaInicio,
  fechaFin,
  seleccionadosCount,
  preCalculo,
  resultado,
  onFechaReferenciaChange,
  horarioSinEmpleados,
  novedadMasivaActiva,
  onAplicarHorario,
  onAgregarNovedad,
  onLimpiarDias,
  controlesHorario,
  children,
}) => {
  const navigate = useNavigate();
  const haySeleccion = seleccionadosCount > 0;
  const campoSemanaClass = 'flex w-[156px] items-center gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 shadow-sm';
  const labelSemanaClass = 'shrink-0 !text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]';
  const inputSemanaClass = 'w-[100px] [&_input]:!px-1.5 [&_input]:!text-[10px]';
  const accionClass = 'h-9 w-full !justify-start rounded-2xl !px-2 !text-[11px] text-left shadow-sm [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:justify-start [&>span]:text-left';
  const accionHorarioClass = 'h-7 rounded-full !px-2 !text-[11px] shadow-sm';

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
            <div className="flex min-w-0 flex-col gap-2 p-2.5">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/service-portal/inicio')}
                  className="h-9 w-9 shrink-0 !rounded-full !p-0 shadow-sm"
                  aria-label="Volver al inicio"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <Title level={2} className="!m-0 !text-lg leading-tight md:!text-2xl">Formulario de Horarios</Title>
                  <Text className="text-[11px] font-medium text-[var(--color-text-secondary)] md:text-xs">
                    Programa turnos, novedades y OT para la semana seleccionada.
                  </Text>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge size="sm" variant={haySeleccion ? 'primary' : 'default'}>{seleccionadosCount} empleados</Badge>
                {preCalculo && <Badge size="sm" variant="info">HE: {preCalculo.resumen.total_horas_extras.toFixed(1)}h</Badge>}
                {preCalculo && <Badge size="sm" variant="success">${Math.round(preCalculo.resumen.total_costo_estimado).toLocaleString('es-CO')}</Badge>}
                {resultado && <Badge variant={resultado.error ? 'warning' : 'success'}>{resultado.ok} OK / {resultado.error} errores</Badge>}
              </div>
            </div>
          </MaterialCard>

          <MaterialCard elevation={0} className="rounded-2xl border-[var(--color-primary)]/15 bg-[var(--color-surface)]/80 p-0 shadow-none">
            <div className="p-2.5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
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
                  <Badge size="xs" variant="default">{anio}</Badge>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge size="xs" variant="info">Semana {semanaIso}</Badge>
                  <Button variant="secondary" size="sm" onClick={onAplicarHorario} disabled={horarioSinEmpleados} className={accionHorarioClass}><Copy className="w-3.5 h-3.5 mr-1" />Aplicar</Button>
                  <Button variant="outline" size="sm" onClick={onAgregarNovedad} disabled={horarioSinEmpleados || !novedadMasivaActiva} className={accionHorarioClass}><ClipboardList className="w-3.5 h-3.5 mr-1" />Novedad</Button>
                  <Button variant="ghost" size="sm" onClick={onLimpiarDias} disabled={horarioSinEmpleados} className={accionHorarioClass}><Eraser className="w-3.5 h-3.5 mr-1" />Limpiar</Button>
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
