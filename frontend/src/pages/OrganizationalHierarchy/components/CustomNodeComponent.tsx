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
  const isVacancy = String(user.id || '').startsWith('VAC-');
  const getLevelStyles = (lvl: number, isSelected: boolean) => {
    if (isSelected) return '!border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md scale-105';
    if (isVacancy) return 'border-dashed border-2 border-[var(--color-border)] bg-[var(--color-surface-variant)]/40 opacity-80 hover:opacity-100 transition-opacity';
    switch (lvl) {
      case 0: return 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10';
      case 1: return 'border-[var(--color-secondary)]/60 bg-[var(--color-secondary)]/20';
      case 2: return 'border-[var(--color-primary-light)]/60 bg-[var(--color-primary-light)]/20';
      default: return 'border-[var(--color-border)] bg-[var(--color-surface-variant)]/40';
    }
  };

  const getAvatarColors = (lvl: number) => {
    if (isVacancy) return 'bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
    switch (lvl) {
      case 0: return 'bg-[var(--color-primary)] text-[var(--color-surface)] border-[var(--color-primary)]';
      case 1: return 'bg-[var(--color-secondary)] text-[var(--color-primary)] border-[var(--color-secondary)]';
      case 2: return 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary-light)]';
      default: return 'bg-[var(--color-surface-variant)] text-[var(--color-text-primary)] border-[var(--color-border)]';
    }
  };

  const selectNode = () => onSelect(String(user.id || ''));

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
      <MaterialCard
        onClick={selectNode}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectNode();
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        className={`p-2 w-full cursor-pointer transition-all border relative ${getLevelStyles(level, isSelected)}`}
        elevation={isSelected ? 2 : 1}
      >
        <div className="flex items-center text-left gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm shrink-0 ${getAvatarColors(level)}`}>
            {isVacancy ? (
              <UserPlus size={14} className="opacity-80" />
            ) : (
              <Text className="!text-[10px] font-bold !m-0 leading-none tracking-tight">{getInitials(String(user.nombre || ''))}</Text>
            )}
          </div>

          <div className="w-full min-w-0 pr-2">
            <Text className={`!text-[9.5px] font-bold leading-tight uppercase truncate block ${isVacancy ? 'text-neutral-500 dark:text-neutral-400 italic font-semibold' : ''}`} title={String(user.nombre || '')}>
              {formatShortName(String(user.nombre || ''))}
            </Text>
            <Text className="!text-[8.5px] text-[var(--color-text-secondary)] leading-tight opacity-90 truncate block mt-0.5" title={String(user.cargo || user.rol || '')}>
              {String(user.cargo || user.rol || '')}
            </Text>
          </div>
        </div>

        {hasChildren && (
          <Button
            variant="custom"
            size="xs"
            aria-label={isExpanded ? "Contraer rama" : "Expandir rama"}
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="absolute -bottom-5 -right-5 min-w-11 min-h-11 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors z-10"
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
