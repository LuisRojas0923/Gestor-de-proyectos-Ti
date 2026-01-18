import React from 'react';
import { LucideIcon } from 'lucide-react';
import { MaterialCard, Text } from '../atoms';
import { materialDesignTokens } from '../tokens';

interface MaterialMetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}

const MaterialMetricCard: React.FC<MaterialMetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend,
  subtitle
}) => {
  const tokens = materialDesignTokens;

  const colorClasses = {
    primary: {
      icon: 'text-blue-600 bg-blue-100',
      change: 'text-blue-600',
      trend: 'text-blue-600',
      iconColor: tokens.colors.primary[600]
    },
    secondary: {
      icon: 'text-orange-500 bg-orange-100',
      change: 'text-orange-500',
      trend: 'text-orange-500',
      iconColor: tokens.colors.secondary[600]
    },
    success: {
      icon: 'text-green-600 bg-green-100',
      change: 'text-green-600',
      trend: 'text-green-600',
      iconColor: tokens.colors.semantic.success
    },
    warning: {
      icon: 'text-yellow-600 bg-yellow-100',
      change: 'text-yellow-600',
      trend: 'text-yellow-600',
      iconColor: tokens.colors.semantic.warning
    },
    error: {
      icon: 'text-red-600 bg-red-100',
      change: 'text-red-600',
      trend: 'text-red-600',
      iconColor: tokens.colors.semantic.error
    },
    info: {
      icon: 'text-blue-500 bg-blue-100',
      change: 'text-blue-500',
      trend: 'text-blue-500',
      iconColor: tokens.colors.semantic.info
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return null;
    }
  };

  return (
    <MaterialCard
      elevation={2}
      hoverable
      className="p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Text
            variant="body2"
            weight="medium"
            color="text-secondary"
            className="mb-1"
          >
            {title}
          </Text>

          <Text
            variant="h4"
            weight="bold"
            className="mb-2"
          >
            {value}
          </Text>

          {subtitle && (
            <Text
              variant="caption"
              color="text-secondary"
              className="mb-2"
            >
              {subtitle}
            </Text>
          )}

          {change && (
            <div className="flex items-center">
              <Text
                variant="body2"
                weight="medium"
                className={colorClasses[color].change}
              >
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
              </Text>
              <Text
                variant="body2"
                color="text-secondary"
                className="ml-2"
              >
                vs. mes anterior
              </Text>
            </div>
          )}

          {trend && (
            <div className="flex items-center mt-2">
              <Text
                variant="h6"
                className={colorClasses[color].trend}
              >
                {getTrendIcon()}
              </Text>
              <Text
                variant="caption"
                color="text-secondary"
                className="ml-1"
              >
                {trend === 'up' ? 'Tendencia alcista' : trend === 'down' ? 'Tendencia bajista' : 'Estable'}
              </Text>
            </div>
          )}
        </div>

        <div className={`p-4 rounded-full ${colorClasses[color].icon}`}>
          <Icon
            size={32}
            color={colorClasses[color].iconColor}
          />
        </div>
      </div>
    </MaterialCard>
  );
};

export default MaterialMetricCard;
