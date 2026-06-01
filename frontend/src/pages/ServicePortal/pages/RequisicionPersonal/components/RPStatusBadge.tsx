// Badge de estado para Requisición de Personal
import React from 'react';
import { EstadoRP, ESTADO_LABELS, ESTADO_COLORES } from '../types/requisicion.types';
import { Text } from '../../../../../components/atoms';


interface RPStatusBadgeProps {
  estado: EstadoRP;
  size?: 'sm' | 'md';
}

const RPStatusBadge: React.FC<RPStatusBadgeProps> = ({ estado, size = 'md' }) => {
  const colores = ESTADO_COLORES[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  const label = ESTADO_LABELS[estado] ?? estado;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <Text as="span" className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClass} ${colores.bg} ${colores.text}`}>
      <Text as="span" className={`w-1.5 h-1.5 rounded-full ${colores.dot}`} />
      {label}
    </Text>
  );
};

export default RPStatusBadge;
