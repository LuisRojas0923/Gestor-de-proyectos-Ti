import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { MaterialCard } from '../atoms';
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
  const { state } = useAppContext();
  const { darkMode } = state;
  const tokens = materialDesignTokens;

  const colorClasses = {
    primary: {
      icon: 'text-blue-600 bg-blue-100',
      change: 'text-blue-600',
      trend: 'text-blue-600'
    },
    secondary: {
      icon: 'text-orange-500 bg-orange-100',
      change: 'text-orange-500',
      trend: 'text-orange-500'
    },
    success: {
      icon: 'text-green-600 bg-green-100',
      change: 'text-green-600',
      trend: 'text-green-600'
    },
    warning: {
      icon: 'text-yellow-600 bg-yellow-100',
      change: 'text-yellow-600',
      trend: 'text-yellow-600'
    },
    error: {
      icon: 'text-red-600 bg-red-100',
      change: 'text-red-600',
      trend: 'text-red-600'
    },
    info: {
      icon: 'text-blue-500 bg-blue-100',
      change: 'text-blue-500',
      trend: 'text-blue-500'
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'stable':
        return '→';
      default:
        return null;
    }
  };

  return (
    <MaterialCard 
      elevation={2} 
      hoverable 
      className="p-6"
      style={{
        backgroundColor: darkMode ? tokens.colors.surface.dark : tokens.colors.surface.light
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p 
            className="text-sm font-medium mb-1"
            style={{
              color: darkMode ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light,
              fontSize: tokens.typography.fontSize.body2
            }}
          >
            {title}
          </p>
          
          <p 
            className="text-3xl font-bold mb-2"
            style={{
              color: darkMode ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light,
              fontSize: tokens.typography.fontSize.h4,
              fontWeight: tokens.typography.fontWeight.bold
            }}
          >
            {value}
          </p>
          
          {subtitle && (
            <p 
              className="text-xs mb-2"
              style={{
                color: darkMode ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light,
                fontSize: tokens.typography.fontSize.caption
              }}
            >
              {subtitle}
            </p>
          )}
          
          {change && (
            <div className="flex items-center">
              <span 
                className={`text-sm font-medium ${colorClasses[color].change}`}
                style={{ fontSize: tokens.typography.fontSize.body2 }}
              >
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
              </span>
              <span 
                className="text-sm ml-2"
                style={{
                  color: darkMode ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light,
                  fontSize: tokens.typography.fontSize.body2
                }}
              >
                vs. mes anterior
              </span>
            </div>
          )}
          
          {trend && (
            <div className="flex items-center mt-2">
              <span 
                className={`text-lg ${colorClasses[color].trend}`}
                style={{ fontSize: tokens.typography.fontSize.h6 }}
              >
                {getTrendIcon()}
              </span>
              <span 
                className="text-xs ml-1"
                style={{
                  color: darkMode ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light,
                  fontSize: tokens.typography.fontSize.caption
                }}
              >
                {trend === 'up' ? 'Tendencia alcista' : trend === 'down' ? 'Tendencia bajista' : 'Estable'}
              </span>
            </div>
          )}
        </div>
        
        <div className={`p-4 rounded-full ${colorClasses[color].icon}`}>
          <Icon 
            size={32} 
            style={{
              color: color === 'primary' ? tokens.colors.primary[600] :
                     color === 'secondary' ? tokens.colors.secondary[600] :
                     color === 'success' ? tokens.colors.semantic.success :
                     color === 'warning' ? tokens.colors.semantic.warning :
                     color === 'error' ? tokens.colors.semantic.error :
                     tokens.colors.semantic.info
            }}
          />
        </div>
      </div>
    </MaterialCard>
  );
};

export default MaterialMetricCard;
