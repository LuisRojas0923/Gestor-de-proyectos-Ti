import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, History, Users, Wallet } from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Text, Title } from '../../../../../components/atoms';
import type { PlanPreCalculoResponse } from '../../../../../types/horasExtras';

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
  onSemanaIsoChange: (semanaIso: number) => void;
  onFechaReferenciaChange: (fechaIso: string) => void;
  onAbrirEmpleados: () => void;
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
  onSemanaIsoChange,
  onFechaReferenciaChange,
  onAbrirEmpleados,
  children,
}) => {
  const navigate = useNavigate();
  const haySeleccion = seleccionadosCount > 0;
  const campoSemanaClass = 'flex min-w-[155px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2 py-1';

  return (
    <MaterialCard className="overflow-hidden border-[var(--color-primary)]/20 p-0">
      <div className="bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-surface)] to-[var(--color-primary-light)]/30 p-2.5 md:p-3">
        <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/service-portal/inicio')}
              className="!p-1.5 !rounded-full shrink-0"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Title level={2} className="shrink-0 !m-0 !text-xl md:!text-2xl">Formulario de Horarios</Title>

            <div className={campoSemanaClass}>
              <Text className="shrink-0 text-[10px] font-semibold text-[var(--color-text-secondary)]">Inicio</Text>
              <Input
                type="date"
                size="xs"
                value={fechaInicio}
                onChange={(e) => onFechaReferenciaChange(e.target.value)}
                className="min-w-0 flex-1"
              />
            </div>
            <div className={campoSemanaClass}>
              <Text className="shrink-0 text-[10px] font-semibold text-[var(--color-text-secondary)]">Fin</Text>
              <Input
                type="date"
                size="xs"
                value={fechaFin}
                onChange={(e) => onFechaReferenciaChange(e.target.value)}
                className="min-w-0 flex-1"
              />
            </div>
            <div className="flex min-w-[130px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2 py-1">
              <Text className="shrink-0 text-[10px] font-semibold text-[var(--color-text-secondary)]">Sem.</Text>
              <Input
                type="number"
                size="xs"
                value={String(semanaIso)}
                min={1}
                max={53}
                onChange={(e) => onSemanaIsoChange(Math.max(1, Math.min(53, Number(e.target.value) || semanaIso)))}
                className="w-14"
              />
              <Text className="shrink-0 text-[10px] text-[var(--color-text-secondary)]">{anio}</Text>
            </div>

            <Badge size="sm" variant={haySeleccion ? 'primary' : 'default'}>{seleccionadosCount} empleados</Badge>
            {preCalculo && <Badge size="sm" variant="info">HE: {preCalculo.resumen.total_horas_extras.toFixed(1)}h</Badge>}
            {preCalculo && <Badge size="sm" variant="success">${Math.round(preCalculo.resumen.total_costo_estimado).toLocaleString('es-CO')}</Badge>}
            {resultado && <Badge variant={resultado.error ? 'warning' : 'success'}>{resultado.ok} OK / {resultado.error} errores</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap 2xl:justify-end">
            <Button variant="secondary" size="sm" onClick={onAbrirEmpleados} className="shadow-sm">
              <Users className="w-4 h-4 mr-1" />Empleados
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/calculos')}>
              <History className="w-4 h-4 mr-1" />Historial
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/bolsa')}>
              <Wallet className="w-4 h-4 mr-1" />Bolsa
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/festivos')}>
              <Calendar className="w-4 h-4 mr-1" />Festivos
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/service-portal/horas-extras/costos-ot')} className="col-span-2 sm:col-span-1">
              <Clock className="w-4 h-4 mr-1" />Costos OT
            </Button>
          </div>
        </div>
      </div>

      {children && <div className="border-t border-[var(--color-border)]">{children}</div>}
    </MaterialCard>
  );
};

export default PlanificadorHeader;
