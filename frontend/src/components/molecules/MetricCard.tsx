import { LucideIcon } from 'lucide-react';
import { Text, MaterialCard } from '../atoms';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red';
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color, onClick }) => {

  // Debug temporal removido - funcionando correctamente

  const colorClasses = {
    blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    green: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    yellow: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
    red: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  };

  return (
    <MaterialCard
      className={`!rounded-[2rem] p-6 transition-all hover:shadow-xl hover:border-[var(--color-primary)]/30 group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''
        } shadow-sm`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Text variant="caption" weight="bold" className="uppercase tracking-widest !text-[var(--color-text-secondary)]/60">
            {title}
          </Text>
          <Text variant="h3" weight="bold" className="!text-[var(--color-text-primary)] tracking-tight">
            {value}
          </Text>
          {change && (
            <div className="flex items-center pt-2">
              <Text as="span" variant="caption" weight="bold" className={`px-2 py-0.5 rounded-full ${change.type === 'increase' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                }`}>
                {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
              </Text>
              <Text as="span" className="!text-[10px] ml-2 font-bold !text-[var(--color-text-secondary)]/40 uppercase tracking-tighter">
                vs. mes anterior
              </Text>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl transition-all group-hover:scale-110 duration-300 ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </MaterialCard>
  );
};

export default MetricCard;
