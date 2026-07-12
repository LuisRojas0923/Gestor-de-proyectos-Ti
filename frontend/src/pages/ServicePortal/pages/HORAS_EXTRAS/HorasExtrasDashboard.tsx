import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard } from '../../../../components/atoms';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  History,
  ListChecks,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type DashboardAction = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
};

const ACCION_PRINCIPAL: DashboardAction = {
  id: 'planificador',
  title: 'Planificador Semanal',
  description:
    'Flujo recomendado para asignar horarios, registrar novedades, pre-calcular y confirmar la semana en bloque.',
  icon: ListChecks,
  to: '/service-portal/horas-extras/planificador',
};

const ACCIONES_FLUJO: DashboardAction[] = [
  {
    id: 'horario',
    title: 'Horario Semanal',
    description: 'Configura la jornada de cada empleado por día.',
    icon: CalendarDays,
    to: '/service-portal/horas-extras/horario',
  },
  {
    id: 'novedades',
    title: 'Novedades',
    description: 'Registra licencias, vacaciones, incapacidades y ausencias.',
    icon: ClipboardList,
    to: '/service-portal/horas-extras/novedades',
  },
  {
    id: 'pre-liquidacion',
    title: 'Calculadora individual de horas extras',
    description: 'Simula las horas y el costo de un empleado antes de confirmar su liquidación.',
    icon: Calculator,
    to: '/service-portal/horas-extras/pre-liquidacion',
  },
];

const ACCIONES_SEGUIMIENTO: DashboardAction[] = [
  {
    id: 'historial',
    title: 'Historial de Cálculos',
    description: 'Consulta los cálculos confirmados: estado, valor, OT asociada.',
    icon: History,
    to: '/service-portal/horas-extras/calculos',
  },
  {
    id: 'bolsa',
    title: 'Bolsa de Horas',
    description: 'Saldo de horas extras del empleado (acreditadas, consumidas, pagadas).',
    icon: Wallet,
    to: '/service-portal/horas-extras/bolsa',
  },
  {
    id: 'costos-ot',
    title: 'Costos por OT',
    description: 'Costos consolidados de mano de obra extra por Orden de Trabajo.',
    icon: Clock,
    to: '/service-portal/horas-extras/costos-ot',
  },
];

const ACCIONES_CONFIGURACION: DashboardAction[] = [
  {
    id: 'festivos',
    title: 'Festivos Nacionales',
    description: 'Calendario de festivos (Ley Emiliani) con sincronización opcional vía Calendarific.',
    icon: Calendar,
    to: '/service-portal/horas-extras/festivos',
  },
];

type HorasExtrasActionCardProps = DashboardAction & {
  onNavigate: (to: string) => void;
  featured?: boolean;
};

const HorasExtrasActionCard: React.FC<HorasExtrasActionCardProps> = ({
  title,
  description,
  icon: Icon,
  to,
  onNavigate,
  featured = false,
}) => (
  <MaterialCard
    onClick={() => onNavigate(to)}
    hoverable
    className={featured ? 'p-7 cursor-pointer' : 'p-5 cursor-pointer'}
  >
    <div className={featured ? 'flex flex-col sm:flex-row gap-5' : 'flex items-start gap-4'}>
      <div
        className={
          featured
            ? 'w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0'
            : 'w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0'
        }
      >
        <Icon className={featured ? 'w-7 h-7 text-[var(--color-primary)]' : 'w-5 h-5 text-[var(--color-primary)]'} />
      </div>
      <div className="min-w-0">
        <Text className={featured ? 'font-semibold text-xl block mb-2' : 'font-semibold text-base block mb-1'}>
          {title}
        </Text>
        <Text className={featured ? 'text-sm text-slate-500 max-w-3xl' : 'text-sm text-slate-500'}>
          {description}
        </Text>
      </div>
    </div>
  </MaterialCard>
);

type ActionSectionProps = {
  title: string;
  description: string;
  actions: DashboardAction[];
  onNavigate: (to: string) => void;
};

const ActionSection: React.FC<ActionSectionProps> = ({ title, description, actions, onNavigate }) => (
  <section className="space-y-3">
    <div>
      <Text className="font-semibold text-lg block">{title}</Text>
      <Text className="text-sm text-slate-500">{description}</Text>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((action) => (
        <HorasExtrasActionCard key={action.id} {...action} onNavigate={onNavigate} />
      ))}
    </div>
  </section>
);

const HorasExtrasDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/tiempo-asistencia')}
          className="!p-2 !rounded-full"
          aria-label="Volver a Tiempo y Asistencia"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Nómina — Horas Extras</Title>
      </div>
      <Text className="mb-8 text-slate-500">
        Cálculo automático de horas extras según normatividad colombiana, gestión de bolsa
        de horas, factores prestacionales ARL y distribución de costos por OT.
      </Text>

      <div className="space-y-8">
        <section className="space-y-3">
          <Text className="font-semibold text-lg block">Operación semanal</Text>
          <HorasExtrasActionCard {...ACCION_PRINCIPAL} onNavigate={navigate} featured />
        </section>

        <ActionSection
          title="Acciones del flujo"
          description="Herramientas para preparar la semana antes de confirmar cálculos."
          actions={ACCIONES_FLUJO}
          onNavigate={navigate}
        />

        <ActionSection
          title="Seguimiento y resultados"
          description="Consulta estados, saldos y costos generados por la operación semanal."
          actions={ACCIONES_SEGUIMIENTO}
          onNavigate={navigate}
        />

        <ActionSection
          title="Configuración"
          description="Parámetros de calendario que alimentan el motor de cálculo."
          actions={ACCIONES_CONFIGURACION}
          onNavigate={navigate}
        />
      </div>
    </div>
  );
};

export default HorasExtrasDashboard;
