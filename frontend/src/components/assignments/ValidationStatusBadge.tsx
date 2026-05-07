import React from 'react';
import { Badge } from '../atoms';

interface ValidationStatusBadgeProps {
  status?: string | null;
}

export const ValidationStatusBadge: React.FC<ValidationStatusBadgeProps> = ({ status }) => {
  const normalized = (status || 'aprobada').toLowerCase();

  if (normalized === 'pendiente') {
    return <Badge variant="warning" size="sm">Pendiente</Badge>;
  }

  if (normalized === 'rechazada') {
    return <Badge variant="error" size="sm">Rechazada</Badge>;
  }

  return <Badge variant="success" size="sm">Aprobada</Badge>;
};
