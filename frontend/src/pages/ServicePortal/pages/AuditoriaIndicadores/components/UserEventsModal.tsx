import React, { useEffect, useState } from 'react';
import { Modal } from '../../../../../components/molecules';
import { Text } from '../../../../../components/atoms';
import { useApi } from '../../../../../hooks/useApi';
import type { AuditoriaEvento, TopUsuario } from '../../../../../types/auditoria';
import UltimosEventosTable from './UltimosEventosTable';

interface UserEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: TopUsuario | null;
  fechaDesde?: string;
  fechaHasta?: string;
}

const UserEventsModal: React.FC<UserEventsModalProps> = ({ isOpen, onClose, usuario, fechaDesde, fechaHasta }) => {
  const { get } = useApi<any>();
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEventos = async () => {
      if (!isOpen || !usuario) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);

        // Asumimos que si usuario_id existe, buscamos por id, sino por nombre
        if (usuario.usuario_id) {
            params.append('usuario_id', usuario.usuario_id);
        } else if (usuario.usuario_nombre) {
            params.append('usuario_nombre', usuario.usuario_nombre);
        }

        params.append('page', '1');
        params.append('page_size', '50'); // últimos 50 eventos

        const url = `/auditoria/eventos?${params.toString()}`;
        const data = await get(url);

        if (data && data.items) {
          setEventos(data.items);
        }
      } catch (err) {
        console.error('Error fetching user events', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventos();
  }, [isOpen, usuario, fechaDesde, fechaHasta, get]);

  const nombreMostrar = usuario?.usuario_nombre || usuario?.usuario_id || 'Desconocido';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Últimos Eventos: ${nombreMostrar}`} size="5xl">
      <div className="space-y-4">
        <Text variant="body2" color="text-secondary" className="mb-4">
          Esta vista muestra los últimos registros de actividad del usuario seleccionado.
        </Text>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            <UltimosEventosTable datos={eventos} isLoading={isLoading} hideSearch={true} hideGroupButton={true} />
        </div>
      </div>
    </Modal>
  );
};

export default UserEventsModal;
