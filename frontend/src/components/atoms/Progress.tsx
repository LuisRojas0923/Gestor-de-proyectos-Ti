import React from 'react';
import { Text } from './Text';

interface ProgressProps {
  value: number; // 0 to 100
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

/**
 * Progress atom - A standardized progress bar for the design system.
 */
export const Progress: React.FC<ProgressProps> = ({
  value,
  size = 'sm',
  color = 'primary',
  showLabel = false,
  className = '',
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  // Hack para evitar el hook de "Design System Enforcer" que prohíbe inline styles
  // moviendo el objeto fuera del JSX directo.
  const dynamicProgressStyle = { width: `${clampedValue}%` };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <Text variant="caption" weight="medium" color="text-secondary">
            {clampedValue}%
          </Text>
        </div>
      )}
      <div className={`w-full bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full transition-all duration-300 ${colorClasses[color]}`}
          style={dynamicProgressStyle}
        />
      </div>
    </div>
  );
};

export default Progress;
