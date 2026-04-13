import React from 'react';
import { Smartphone, AlertTriangle, Users, CreditCard } from 'lucide-react';
import { Title, Text, MaterialCard as Card, Icon, Skeleton } from '../../../components/atoms';

interface SubStat {
  label: string;
  value: number;
  color: string;
  isCritical?: boolean;
}

interface StatsProps {
  isLoading?: boolean;
  stats: {
    total: number;
    active: number;
    inactive: number;
    assigned: number;
    unassigned: number;
    withAlerts: number;
    totalMonthlyCost: number;
    phonesAssigned: number;
    convenio0: number;
    convenio100: number;
    convenioMixed: number;
  };
}

export const StatsCards: React.FC<StatsProps> = ({ stats, isLoading }) => {
  const cards: Array<{
    label: string,
    mainValue: string | number,
    mainLabel: string,
    icon: any,
    color: string,
    subStats: SubStat[]
  }> = [
    {
      label: 'Estado de Líneas',
      mainValue: stats.total,
      mainLabel: 'Total',
      icon: Smartphone,
      color: 'primary',
      subStats: [
        { label: 'Activas', value: stats.active, color: 'text-success-600' },
        { label: 'Inactivas', value: stats.inactive, color: 'text-error-500' }
      ]
    },
    {
      label: 'Asignación & Equipos',
      mainValue: stats.assigned,
      mainLabel: 'Asignadas',
      icon: Users,
      color: 'info',
      subStats: [
        { label: 'Sin Asignar', value: stats.unassigned, color: 'text-neutral-400' },
        { label: 'Con Equipo', value: stats.phonesAssigned, color: 'text-primary-500' }
      ]
    },
    {
      label: 'Convenios Pago',
      mainValue: stats.convenio0,
      mainLabel: 'Gratis (0%)',
      icon: CreditCard,
      color: 'success',
      subStats: [
        { label: 'Mixto', value: stats.convenioMixed, color: 'text-amber-500' },
        { label: 'Total (100%)', value: stats.convenio100, color: 'text-neutral-500' }
      ]
    },
    {
      label: 'Finanzas & Alertas',
      mainValue: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.totalMonthlyCost),
      mainLabel: 'Costo Total',
      icon: AlertTriangle,
      color: 'warning',
      subStats: [
        { label: 'Alertas', value: stats.withAlerts, color: 'text-error-600', isCritical: stats.withAlerts > 0 }
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-sans">
      {cards.map((card) => (
        <Card key={card.label} className="p-4 border-2 border-transparent hover:border-primary-500/10 transition-all shadow-sm rounded-[1.5rem] bg-white dark:bg-neutral-800">
          <div className="flex items-center justify-between mb-3">
             <div className={`p-2 rounded-xl bg-${card.color}-100 dark:bg-${card.color}-900/20 text-${card.color}-600 dark:text-${card.color}-400`}>
                <Icon name={card.icon} size="xs" />
             </div>
             <Text variant="caption" weight="bold" className="uppercase tracking-widest opacity-40">{card.label}</Text>
          </div>
          
          <div className="flex items-baseline justify-between mb-2">
             {isLoading ? (
               <Skeleton className="h-8 w-24" />
             ) : (
               <Title variant="h4" weight="bold">{card.mainValue}</Title>
             )}
             <Text variant="caption" color="text-secondary" className="opacity-60">{card.mainLabel}</Text>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
             {card.subStats.map((sub, idx) => (
               <div key={idx} className="flex items-center gap-1.5 line-clamp-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${sub.isCritical ? 'bg-error-500 animate-pulse' : 'bg-current opacity-40'}`} />
                  {isLoading ? (
                    <Skeleton className="h-3 w-12" />
                  ) : (
                    <Text variant="caption" weight="bold" className={`${sub.color} text-[10px]`}>
                      {sub.value} {sub.label}
                    </Text>
                  )}
               </div>
             ))}
          </div>
        </Card>
      ))}
    </div>
  );
};
