import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color }) => {
  const { state } = useAppContext();
  const { darkMode } = state;

  const colorClasses = {
    blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/20',
    green: 'text-green-500 bg-green-100 dark:bg-green-900/20',
    yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20',
    red: 'text-red-500 bg-red-100 dark:bg-red-900/20',
  };

  return (
    <div className={`${
      darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
    } border rounded-xl p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${
            darkMode ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${
            darkMode ? 'text-white' : 'text-neutral-900'
          }`}>
            {value}
          </p>
          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
                change.type === 'increase' ? 'text-green-500' : 'text-red-500'
              }`}>
                {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
              </span>
              <span className={`text-sm ml-2 ${
                darkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                vs. mes anterior
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;