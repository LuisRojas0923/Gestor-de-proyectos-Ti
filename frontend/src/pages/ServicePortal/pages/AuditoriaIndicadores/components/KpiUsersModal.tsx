import React, { useEffect, useState } from 'react';
import { MaterialCard as Card, Title, Text, Badge } from '../../../../../components/atoms';
import { Modal, DataTable } from '../../../../../components/molecules';
import { useApi } from '../../../../../hooks/useApi';
import type { AuditoriaEvento } from '../../../../../types/auditoria';

interface KpiUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'denegados' | 'fallos_auth' | null;
  fechaDesde?: string;
  fechaHasta?: string;
}

const KpiUsersModalContent: React.FC<Omit<KpiUsersModalProps, 'isOpen' | 'onClose'> & { isOpen: boolean }> = ({ tipo, fechaDesde, fechaHasta, isOpen }) => {

  const { get } = useApi<any>();
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchEventos = async () => {
      if (!isOpen || !tipo) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);
        params.append('page', '1');
        params.append('page_size', '100'); // limit to 100 to show top recent
        
        if (tipo === 'denegados') {
          params.append('resultado', 'denegado');
        } else if (tipo === 'fallos_auth') {
          params.append('modulo', 'auth');
        }

        const url = `/auditoria/eventos?${params.toString()}`;
        const data = await get(url);
        
        if (data && data.items) {
          let filtrados = data.items;
          if (tipo === 'fallos_auth') {
             // Excluir los exitosos para quedarnos solo con los fallos de auth
             filtrados = filtrados.filter((e: any) => e.resultado !== 'exito');
          }
          setEventos(filtrados);
        }
      } catch (err) {
        console.error('Error fetching KPI details', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventos();
  }, [isOpen, tipo, fechaDesde, fechaHasta, get]);

  // Agrupar por usuario
  const agrupados = eventos.reduce((acc, evento) => {
    const key = evento.usuario_nombre || evento.usuario_id || 'Desconocido';
    if (!acc[key]) {
      acc[key] = {
        nombre: evento.usuario_nombre || 'Desconocido',
        id: evento.usuario_id || 'N/A',
        rol: evento.rol || 'N/A',
        count: 0,
        ultimosIps: new Set<string>()
      };
    }
    acc[key].count += 1;
    if (evento.direccion_ip) acc[key].ultimosIps.add(evento.direccion_ip);
    return acc;
  }, {} as Record<string, any>);

  const dataArray = Object.values(agrupados).sort((a, b) => b.count - a.count);

  const titulo = tipo === 'denegados' 
    ? 'Usuarios con Accesos Denegados' 
    : 'Usuarios con Fallos de Autenticación';

  return (
    <>
      <div className="space-y-4">
        <Text variant="body2" color="text-secondary">
          Esta vista muestra los usuarios (o intentos de usuarios) que generaron estos eventos recientemente en el período seleccionado.
        </Text>

        {isLoading ? (
          <div className="py-10 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mb-3" />
            <Text variant="body2" color="text-secondary" className="block">Cargando registros...</Text>
          </div>
        ) : dataArray.length === 0 ? (
          <div className="py-10 text-center bg-[var(--color-surface-variant)] rounded-xl">
            <Text variant="body2" color="text-secondary">No se encontraron registros recientes para este indicador.</Text>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {dataArray.map((u, i) => (
              <Card key={i} className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Text variant="body2" weight="bold" color="text-primary">{u.nombre}</Text>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default" size="sm">{u.id}</Badge>
                    <Text variant="caption" color="text-secondary">{u.rol}</Text>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end">
                  <Text variant="caption" color="text-secondary" className="mb-1">
                    IPs detectadas: {Array.from(u.ultimosIps).join(', ') || 'N/A'}
                  </Text>
                  <Badge variant={tipo === 'denegados' ? 'error' : 'warning'} size="sm" className="font-bold">
                    {u.count} {u.count === 1 ? 'evento' : 'eventos'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const KpiUsersModal: React.FC<KpiUsersModalProps> = ({ isOpen, onClose, tipo, fechaDesde, fechaHasta }) => {
  let titulo = 'Usuarios Críticos';
  if (tipo === 'denegados') titulo = 'Top Usuarios: Accesos Denegados (403)';
  if (tipo === 'fallos_auth') titulo = 'Top Usuarios: Fallos de Autenticación (401)';
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} size="5xl">
      {isOpen && <KpiUsersModalContent tipo={tipo} fechaDesde={fechaDesde} fechaHasta={fechaHasta} isOpen={isOpen} />}
    </Modal>
  );
};

export default KpiUsersModal;
