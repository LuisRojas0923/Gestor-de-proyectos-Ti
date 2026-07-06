import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UserPlus } from 'lucide-react';
import { MaterialCard, Text } from '../../../components/atoms';
import { getInitials, formatShortName } from '../utils';

export const CustomNodeComponent = (props: any) => {
  const { data, isConnectable } = props;
  const { nodeData, level, selected, onSelect } = data;
  const user = nodeData.usuario;
  const isSelected = selected;
  const isVacancy = user.id.startsWith('VAC-');
  
  const getLevelStyles = (lvl: number, isSelected: boolean) => {
    if (isSelected) return '!border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md scale-105';
    if (isVacancy) return 'border-dashed border-2 border-neutral-400 dark:border-neutral-600 bg-neutral-50/30 dark:bg-neutral-800/10 opacity-80 hover:opacity-100 transition-opacity';
    switch (lvl) {
      case 0: return 'border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-primary-600/10 dark:from-primary-900/20 dark:to-primary-800/10';
      case 1: return 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 dark:from-indigo-900/20 dark:to-indigo-800/10';
      case 2: return 'border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-sky-600/10 dark:from-sky-900/20 dark:to-sky-800/10';
      default: return 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-900/20 dark:to-emerald-800/10';
    }
  };

  const getAvatarColors = (lvl: number) => {
    if (isVacancy) return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700';
    switch (lvl) {
      case 0: return 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 border-primary-200 dark:border-primary-800';
      case 1: return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 2: return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
      <MaterialCard
        onClick={() => onSelect(user.id)}
        className={`p-2 w-full cursor-pointer transition-all border ${getLevelStyles(level, isSelected)}`}
        elevation={isSelected ? 2 : 1}
      >
        <div className="flex items-center text-left gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm shrink-0 ${getAvatarColors(level)}`}>
            {isVacancy ? (
              <UserPlus size={14} className="opacity-80" />
            ) : (
              <Text className="!text-[10px] font-bold !m-0 leading-none tracking-tight">{getInitials(user.nombre)}</Text>
            )}
          </div>
          
          <div className="w-full min-w-0">
            <Text className={`!text-[9.5px] font-bold leading-tight uppercase truncate block ${isVacancy ? 'text-neutral-500 dark:text-neutral-400 italic font-semibold' : ''}`} title={user.nombre}>
              {formatShortName(user.nombre)}
            </Text>
            <Text className="!text-[8.5px] text-[var(--color-text-secondary)] leading-tight opacity-90 truncate block mt-0.5" title={user.cargo || user.rol}>
              {user.cargo || user.rol}
            </Text>
          </div>
        </div>
      </MaterialCard>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
    </>
  );
};
