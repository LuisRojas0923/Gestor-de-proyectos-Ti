import React from 'react';
import { Text } from '../../../components/atoms';
import type { AuditoriaEvento } from '../../../types/auditoria';
import { humanizarAccionDetallada } from '../../ServicePortal/pages/AuditoriaIndicadores/utils/humanizer';

interface ActionCellProps {
  row: AuditoriaEvento;
}

export const ActionCell: React.FC<ActionCellProps> = ({ row }) => {
  const text = humanizarAccionDetallada(row);
  
  return (
    <div 
      className="cursor-pointer group mt-0.5 w-full overflow-hidden" 
      title="Clic para ver detalle en la radiografía"
    >
      <Text 
        as="div"
        variant="caption" 
        color="text-secondary" 
        className="uppercase text-[10px] tracking-wider transition-colors duration-200 group-hover:text-[var(--color-primary)] w-full block truncate"
      >
        {text}
      </Text>
    </div>
  );
};

