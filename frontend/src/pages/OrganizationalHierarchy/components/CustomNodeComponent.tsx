import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { UserPlus, Plus, Minus } from 'lucide-react';
import { Button, MaterialCard, Text } from '../../../components/atoms';
import { getInitials, formatShortName } from '../utils';
import type { HierarchyNode } from '../../../types/hierarchy';

export interface CustomNodeData {
  nodeData: HierarchyNode;
  level: number;
  selected: boolean;
  onSelect: (userId: string) => void;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle?: () => void;
}

interface CustomNodeProps {
  data: CustomNodeData;
  isConnectable: boolean;
}

export const CustomNodeComponent = (props: CustomNodeProps) => {
  const { data, isConnectable } = props;
  const { nodeData, level, selected, onSelect, isExpanded, hasChildren, onToggle } = data;
  const user = nodeData.usuario;
  const isSelected = selected;
  const isVacancy = user.id.startsWith('VAC-');
  
  const getLevelStyles = (lvl: number, isSelected: boolean) => {
    if (isSelected) return '!border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md scale-105';
    if (isVacancy) return 'border-dashed border-2 border-neutral-400 dark:border-neutral-500 bg-neutral-50/30 dark:bg-neutral-800/40 opacity-80 hover:opacity-100 transition-opacity';
    switch (lvl) {
      case 0: return 'border-blue-400/50 bg-blue-50/80 dark:bg-blue-900/30 dark:border-blue-500/50';
      case 1: return 'border-indigo-400/50 bg-indigo-50/80 dark:bg-indigo-900/30 dark:border-indigo-500/50';
      case 2: return 'border-sky-400/50 bg-sky-50/80 dark:bg-sky-900/30 dark:border-sky-500/50';
      default: return 'border-emerald-400/50 bg-emerald-50/80 dark:bg-emerald-900/30 dark:border-emerald-500/50';
    }
  };

  const getAvatarColors = (lvl: number) => {
    if (isVacancy) return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700';
    switch (lvl) {
      case 0: return 'bg-blue-100 text-blue-700 dark:bg-blue-600 dark:text-white border-blue-200 dark:border-blue-500';
      case 1: return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:text-white border-indigo-200 dark:border-indigo-500';
      case 2: return 'bg-sky-100 text-sky-700 dark:bg-sky-600 dark:text-white border-sky-200 dark:border-sky-500';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600 dark:text-white border-emerald-200 dark:border-emerald-500';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
      <MaterialCard
        onClick={() => onSelect(user.id)}
        className={`p-2 w-full cursor-pointer transition-all border relative ${getLevelStyles(level, isSelected)}`}
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
          
          <div className="w-full min-w-0 pr-2">
            <Text className={`!text-[9.5px] font-bold leading-tight uppercase truncate block ${isVacancy ? 'text-neutral-500 dark:text-neutral-400 italic font-semibold' : ''}`} title={user.nombre}>
              {formatShortName(user.nombre)}
            </Text>
            <Text className="!text-[8.5px] text-[var(--color-text-secondary)] leading-tight opacity-90 truncate block mt-0.5" title={user.cargo || user.rol}>
              {user.cargo || user.rol}
            </Text>
          </div>
        </div>
        
        {hasChildren && (
          <Button
            variant="custom"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow flex items-center justify-center text-neutral-500 hover:text-primary-600 hover:border-primary-300 transition-colors z-10"
            title={isExpanded ? "Contraer rama" : "Expandir rama"}
          >
            {isExpanded ? <Minus size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
          </Button>
        )}
      </MaterialCard>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
    </>
  );
};
