import React, { useEffect, useState } from 'react';
import { Modal } from '../../../../../components/molecules';
import { Text } from '../../../../../components/atoms';
import { useApi } from '../../../../../hooks/useApi';
import type { AuditoriaEvento, TopRuta } from '../../../../../types/auditoria';
import UltimosEventosTable from './UltimosEventosTable';
import { humanizarAccion, humanizarRuta } from '../utils/humanizer';

interface RouteEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rutaSeleccionada: TopRuta | null;
  fechaDesde?: string;
  fechaHasta?: string;
}

const RouteEventsModal: React.FC<RouteEventsModalProps> = ({ isOpen, onClose, rutaSeleccionada, fechaDesde, fechaHasta }) => {
  const { get } = useApi<any>();
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEventos = async () => {
      if (!isOpen || !rutaSeleccionada) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);
        
        if (rutaSeleccionada.ruta) {
            params.append('ruta', rutaSeleccionada.ruta);
        }

        params.append('page', '1');
        params.append('page_size', '100'); // últimos 100 eventos de esta ruta

        const url = `/auditoria/eventos?${params.toString()}`;
        const data = await get(url);
        
        if (data && data.items) {
          setEventos(data.items);
        }
      } catch (err) {
        console.error('Error fetching route events', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventos();
  }, [isOpen, rutaSeleccionada, fechaDesde, fechaHasta, get]);

  const titulo = rutaSeleccionada ? `${humanizarAccion(rutaSeleccionada.accion)}: ${humanizarRuta(rutaSeleccionada.ruta)}` : 'Acción';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Eventos: ${titulo}`} size="xl">
      <div className="space-y-4">
        <div className="space-y-1 mb-4">
          <Text variant="body2" color="text-secondary">
            Visualizando los registros de actividad para la ruta <Text as="span" color="inherit" className="font-mono text-[11px] bg-[var(--color-surface-variant)] px-1 py-0.5 rounded">{rutaSeleccionada?.ruta}</Text>.
          </Text>
          <Text variant="body2" color="text-secondary">
            Puedes usar el botón "Agrupar por Persona" para ver qué usuarios han utilizado más esta función.
          </Text>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <UltimosEventosTable datos={eventos} isLoading={isLoading} hideModuleFilter={true} />
        </div>
      </div>
    </Modal>
  );
};

export default RouteEventsModal;
