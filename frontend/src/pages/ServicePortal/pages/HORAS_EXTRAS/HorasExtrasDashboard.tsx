import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard } from '../../../../components/atoms';
import { ArrowLeft, Calculator, Calendar, CalendarDays, ClipboardList, Clock, History, Wallet, ListChecks } from 'lucide-react';

const ACCIONES = [
  {
    id: 'planificador',
    title: 'Planificador Semanal',
    description: 'Asigna horario y novedades en bloque a un grupo de empleados. Pre-cálculo en vivo, borrador y confirmación al cierre de la semana.',
    icon: ListChecks,
    to: '/service-portal/horas-extras/planificador',
  },
  {
    id: 'pre-liquidacion',
    title: 'Calcular Pre-liquidación',
    description: 'Calcula las horas extras semanales y el costo asociado a una OT.',
    icon: Calculator,
    to: '/service-portal/horas-extras/pre-liquidacion',
  },
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
  {
    id: 'festivos',
    title: 'Festivos Nacionales',
    description: 'Calendario de festivos (Ley Emiliani) con sincronización opcional vía Calendarific.',
    icon: Calendar,
    to: '/service-portal/horas-extras/festivos',
  },
  {
    id: 'horario',
    title: 'Horario Semanal',
    description: 'Configura la jornada de cada empleado (entrada, salida, almuerzo por día).',
    icon: CalendarDays,
    to: '/service-portal/horas-extras/horario',
  },
  {
    id: 'novedades',
    title: 'Novedades (LIC, VAC, INC, AUS)',
    description: 'Captura de licencias, vacaciones, incapacidades y ausencias para alimentar el motor de pre-liquidación.',
    icon: ClipboardList,
    to: '/service-portal/horas-extras/novedades',
  },
];

const HorasExtrasDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/inicio')}
          className="!p-2 !rounded-full"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Nómina — Horas Extras y Pre-liquidación</Title>
      </div>
      <Text className="mb-8 text-slate-500">
        Cálculo automático de horas extras según normatividad colombiana, gestión de bolsa
        de horas, factores prestacionales ARL y pre-liquidación por OT.
      </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ACCIONES.map(({ id, title, description, icon: Icon, to }) => (
          <MaterialCard
            key={id}
            onClick={() => navigate(to)}
            hoverable
            className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <Text className="font-semibold text-lg block mb-1">{title}</Text>
                <Text className="text-sm text-slate-500">{description}</Text>
              </div>
            </div>
          </MaterialCard>
        ))}
      </div>
    </div>
  );
};

export default HorasExtrasDashboard;
