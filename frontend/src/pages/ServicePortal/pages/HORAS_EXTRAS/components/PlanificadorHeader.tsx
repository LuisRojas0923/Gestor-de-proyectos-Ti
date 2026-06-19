import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, History, Sparkles, Users, Wallet } from 'lucide-react';
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
  onAnioChange: (anio: number) => void;
  onSemanaIsoChange: (semanaIso: number) => void;
  onAbrirEmpleados: () => void;
}

const PlanificadorHeader: React.FC<PlanificadorHeaderProps> = ({
  anio,
  semanaIso,
  fechaInicio,
  fechaFin,
  seleccionadosCount,
  preCalculo,
  resultado,
  onAnioChange,
  onSemanaIsoChange,
  onAbrirEmpleados,
}) => {
  const navigate = useNavigate();
  const haySeleccion = seleccionadosCount > 0;

  return (
    <div className="space-y-4">
      <MaterialCard className="overflow-hidden border-[var(--color-primary)]/20">
        <div className="bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-surface)] to-[var(--color-primary-light)]/40 p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate('/service-portal/inicio')}
                className="!p-2 !rounded-full shrink-0"
                aria-label="Volver al inicio"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="max-w-3xl space-y-3">
                <Badge variant="primary" size="sm" className="gap-1">
                  <Sparkles className="w-3 h-3" /> Flujo semanal masivo
                </Badge>
                <div>
                  <Title level={2} className="!m-0">Horas extras — planificación masiva</Title>
                  <Text className="mt-2 text-[var(--color-text-secondary)]">
                    Selecciona empleados, aplica una plantilla de horario y valida horas/costos antes de confirmar la semana.
                  </Text>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
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
      </MaterialCard>

      <MaterialCard className="p-4 sticky top-2 z-30 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/95">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[120px_140px_minmax(220px,1fr)] xl:min-w-[620px]">
            <Input
              type="number"
              label="Año"
              value={String(anio)}
              min={2020}
              max={2100}
              onChange={(e) => onAnioChange(Number(e.target.value) || anio)}
            />
            <Input
              type="number"
              label="Semana ISO"
              value={String(semanaIso)}
              min={1}
              max={53}
              onChange={(e) => onSemanaIsoChange(Math.max(1, Math.min(53, Number(e.target.value) || semanaIso)))}
            />
            <div className="col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary)]/5 px-4 py-2 md:col-span-1">
              <Text className="text-xs text-[var(--color-text-secondary)]">Rango activo</Text>
              <Text className="font-semibold text-[var(--color-primary)]">{fechaInicio} → {fechaFin}</Text>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Badge variant={haySeleccion ? 'primary' : 'default'}>{seleccionadosCount} empleados</Badge>
            {preCalculo ? <Badge variant="info">HE est: {preCalculo.resumen.total_horas_extras.toFixed(1)}h</Badge> : <Badge variant="default">Sin pre-cálculo</Badge>}
            {preCalculo && <Badge variant="success">Costo: ${Math.round(preCalculo.resumen.total_costo_estimado).toLocaleString('es-CO')}</Badge>}
            {resultado && <Badge variant={resultado.error ? 'warning' : 'success'}>{resultado.ok} OK / {resultado.error} errores</Badge>}
          </div>
        </div>
      </MaterialCard>
    </div>
  );
};

export default PlanificadorHeader;
