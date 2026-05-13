import React from 'react';
import ConsolidatedTableById from '../components/ConsolidatedTableById';
import { Title } from '../components/atoms';

const ProyectoDetalleConID: React.FC = () => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const m = path.match(/developments\/(\d+)/);
  const num = m?.[1] ? parseInt(m[1], 10) : null;
  const showById = !!path.match(/tab=bitacora/);
  const hoCode = num ? `HO-${num}` : null;

  return (
    <div className="p-4">
      <Title level={2}>Proyecto Detalle</Title>
      {hoCode && showById ? (
        <ConsolidatedTableById desarrolloId={hoCode} />
      ) : (
        <ConsolidatedTableById desarrolloId="HO-1" />
      )}
    </div>
  );
};

export default ProyectoDetalleConID;
