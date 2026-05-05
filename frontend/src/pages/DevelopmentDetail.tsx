import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import { Button, Title, Text } from '../components/atoms';
import { DevelopmentEditModal } from '../components/molecules';
import ConsolidatedTableById from '../components/ConsolidatedTableById';

type ApiDevelopment = DevelopmentWithCurrentStatus & {
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  tipo?: string;
  ambiente?: string;
  enlace_portal?: string;
  estado_general?: DevelopmentWithCurrentStatus['general_status'];
  fecha_inicio?: string;
  fecha_estimada_fin?: string;
  proveedor?: string;
  responsable?: string;
};

const normalizeDevelopment = (development: ApiDevelopment): DevelopmentWithCurrentStatus => ({
  ...development,
  name: development.name || development.nombre || '',
  description: development.description || development.descripcion,
  module: development.module || development.modulo,
  type: development.type || development.tipo,
  environment: development.environment || development.ambiente,
  portal_link: development.portal_link || development.enlace_portal,
  general_status: development.general_status || development.estado_general || 'Pendiente',
  start_date: development.start_date || development.fecha_inicio,
  estimated_end_date: development.estimated_end_date || development.fecha_estimada_fin,
  provider: development.provider || development.proveedor,
  responsible: development.responsible || development.responsable,
});

const toApiDevelopmentPayload = (data: Partial<ApiDevelopment>) => ({
  nombre: data.name,
  descripcion: data.description,
  modulo: data.module,
  tipo: data.type,
  ambiente: data.environment,
  enlace_portal: data.portal_link,
  estado_general: data.general_status,
  fecha_inicio: data.start_date,
  fecha_estimada_fin: data.estimated_end_date,
  proveedor: data.provider,
  responsable: data.responsible,
  area_desarrollo: data.area_desarrollo,
  analista: data.analista,
});

const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext().state;
  const { get, put } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();

  const [development, setDevelopment] = useState<DevelopmentWithCurrentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [developmentEditOpen, setDevelopmentEditOpen] = useState(false);

  // Cargar desarrollo
  useEffect(() => {
    const load = async () => {
      if (!developmentId) return;
      setLoading(true);
      try {
        const dev = await get(API_ENDPOINTS.DEVELOPMENT_BY_ID(developmentId));
        if (dev) {
          setDevelopment(normalizeDevelopment(dev as ApiDevelopment));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [developmentId, get]);

  const updateDevelopment = async (updatedData: Partial<ApiDevelopment>): Promise<boolean> => {
    if (!development) return false;
    try {
      const result = await put(API_ENDPOINTS.DEVELOPMENT_BY_ID(development.id), toApiDevelopmentPayload(updatedData));
      if (result) {
        setDevelopment(normalizeDevelopment(result as ApiDevelopment));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al actualizar el desarrollo:', error);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="custom"
            onClick={() => navigate('/developments')}
            className="p-0 h-auto font-medium text-neutral-600 hover:text-neutral-900 transition-colors dark:text-neutral-300 dark:hover:text-white"
          >
            ← Volver a proyectos
          </Button>
          <Title variant="h3" weight="bold" color={darkMode ? 'white' : 'navy'} className="mt-2">
            {development?.name || (loading ? 'Cargando...' : 'Proyecto')}
          </Title>
          <Text variant="caption" color="text-secondary">{development?.id}</Text>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {development?.portal_link && (
            <Button
              variant="primary"
              onClick={() => window.open(development.portal_link, '_blank', 'noopener,noreferrer')}
              className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 border-none"
            >
              🔗 Ir al Portal
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => setDevelopmentEditOpen(true)}
            disabled={loading || !development}
            className="w-full sm:w-auto min-h-[44px]"
          >
            ✏️ Editar Proyecto
          </Button>
        </div>
      </div>

      {development && (
        <ConsolidatedTableById desarrolloId={development.id} />
      )}

      {development && (
        <DevelopmentEditModal
          isOpen={developmentEditOpen}
          development={development}
          onClose={() => setDevelopmentEditOpen(false)}
          onSave={updateDevelopment}
        />
      )}
    </div>
  );
};

export default DevelopmentDetail;
