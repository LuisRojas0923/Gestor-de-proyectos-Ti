import React from 'react';
import { Smartphone, AlertTriangle, Users, CreditCard } from 'lucide-react';
import { Title, Text, Skeleton } from '../../../components/atoms';

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

/**
 * Gradientes usando SOLO la paleta del sistema de diseño:
 * - primary (navy): 500, 600, 700, 800, 900
 * - secondary (verde): 600, 700, 800, 900
 * - neutral: 600, 700, 800, 900
 */
const cardThemes = [
  // Navy — primary
  {
    gradient: 'from-primary-800 via-primary-700 to-primary-600',
    glow: 'shadow-lg shadow-primary-900/30',
  },
  // Navy oscuro — primary dark
  {
    gradient: 'from-primary-900 via-primary-800 to-primary-700',
    glow: 'shadow-lg shadow-primary-900/30',
  },
  // Verde — secondary
  {
    gradient: 'from-secondary-900 via-secondary-800 to-secondary-600',
    glow: 'shadow-lg shadow-secondary-900/30',
  },
  // Neutro cálido — neutral
  {
    gradient: 'from-neutral-900 via-neutral-800 to-neutral-600',
    glow: 'shadow-lg shadow-neutral-900/30',
  },
];

export const StatsCards: React.FC<StatsProps> = ({ stats, isLoading }) => {
  const cards: Array<{
    label: string,
    mainValue: string | number,
    mainLabel: string,
    icon: any,
    subStats: SubStat[]
  }> = [
    {
      label: 'Estado de Líneas',
      mainValue: stats.total,
      mainLabel: 'Total',
      icon: Smartphone,
      subStats: [
        { label: 'Activas', value: stats.active, color: 'text-secondary-300' },
        { label: 'Inactivas', value: stats.inactive, color: 'text-primary-200' }
      ]
    },
    {
      label: 'Asignación & Equipos',
      mainValue: stats.assigned,
      mainLabel: 'Asignadas',
      icon: Users,
      subStats: [
        { label: 'Sin Asignar', value: stats.unassigned, color: 'text-white/50' },
        { label: 'Con Equipo', value: stats.phonesAssigned, color: 'text-primary-200' }
      ]
    },
    {
      label: 'Convenios Pago',
      mainValue: stats.convenio0,
      mainLabel: 'Gratis (0%)',
      icon: CreditCard,
      subStats: [
        { label: 'Mixto', value: stats.convenioMixed, color: 'text-secondary-200' },
        { label: 'Total (100%)', value: stats.convenio100, color: 'text-white/50' }
      ]
    },
    {
      label: 'Finanzas & Alertas',
      mainValue: new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
      }).format(stats.totalMonthlyCost),
      mainLabel: 'Costo Total',
      icon: AlertTriangle,
      subStats: [
        {
          label: 'Alertas', value: stats.withAlerts,
          color: 'text-primary-100', isCritical: stats.withAlerts > 0
        }
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 font-sans">
      {cards.map((card, idx) => {
        const theme = cardThemes[idx];
        const IconComp = card.icon;

        return (
          <div
            key={card.label}
            className={`
              relative overflow-hidden rounded-2xl px-4 py-3
              bg-gradient-to-br ${theme.gradient}
              ${theme.glow}
              hover:scale-[1.02] hover:shadow-xl
              transition-all duration-300 ease-out
              group cursor-default
            `}
          >
            {/* Watermark icon */}
            <div className="absolute -bottom-2 -right-2 opacity-[0.08] pointer-events-none group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500 text-white">
              <IconComp size={72} strokeWidth={1.2} />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between mb-2">
              <Text
                variant="caption" weight="bold"
                className="uppercase tracking-[0.12em] text-white/50 !text-[10px]"
              >
                {card.label}
              </Text>
            </div>

            {/* Main value */}
            <div className="relative flex items-baseline justify-between mb-2">
              {isLoading ? (
                <Skeleton className="h-7 w-24 bg-white/20 rounded-lg" />
              ) : (
                <Title variant="h4" weight="bold" className="text-white tracking-tight">
                  {card.mainValue}
                </Title>
              )}
              <Text variant="caption" className="text-white/50 !text-[11px] font-medium">
                {card.mainLabel}
              </Text>
            </div>

            {/* Sub-stats */}
            <div className="relative flex items-center gap-3 pt-2 border-t border-white/10">
              {card.subStats.map((sub, sIdx) => (
                <div key={sIdx} className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      sub.isCritical
                        ? 'bg-primary-200 animate-pulse'
                        : 'bg-white/25'
                    }`}
                  />
                  {isLoading ? (
                    <Skeleton className="h-3 w-12 bg-white/20 rounded" />
                  ) : (
                    <Text variant="caption" weight="bold" className={`${sub.color} !text-[11px]`}>
                      {sub.value} {sub.label}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
