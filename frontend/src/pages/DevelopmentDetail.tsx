import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config/api';
import { DevelopmentWithCurrentStatus } from '../types';
import { Button, Title, Text, Badge } from '../components/atoms';
import { DevelopmentEditModal } from '../components/molecules';
import { Download, Plus, Pencil, ExternalLink, ArrowLeft } from 'lucide-react';
import WbsTab, { WbsTabRef } from './DevelopmentDetail/WbsTab';

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
  autoridad?: string;
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
  authority: development.authority || development.autoridad,
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
  autoridad: data.authority,
  responsable: data.responsible,
  area_desarrollo: data.area_desarrollo,
  analista: data.analista,
});

const DevelopmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/service-portal');
  const { darkMode } = useAppContext().state;
  const { get, put } = useApi<DevelopmentWithCurrentStatus>();
  const { developmentId } = useParams();
  const wbsRef = useRef<WbsTabRef>(null);

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div className="flex-1 min-w-0">
          <Button
            variant="ghost"
            onClick={() => navigate(isPortal ? '/service-portal/desarrollos' : '/developments')}
            className="p-0 h-auto font-medium text-neutral-500 hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 mb-2 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver a proyectos
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <Title variant="h3" weight="bold" color={darkMode ? 'white' : 'navy'} className="m-0 leading-tight">
              {development?.name || (loading ? 'Cargando...' : 'Proyecto')}
            </Title>
            {development?.id && (
              <Badge variant="default" size="sm" className="font-mono bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]">
                {development.id}
              </Badge>
            )}
          </div>
          {development?.description && (
            <Text variant="body2" color="text-secondary" className="mt-1 line-clamp-1 max-w-2xl" title={development.description}>
              {development.description}
            </Text>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {development?.portal_link && (
            <Button
              variant="outline"
              icon={ExternalLink}
              onClick={() => window.open(development.portal_link, '_blank', 'noopener,noreferrer')}
              className="h-10 text-xs border-green-500/30 text-green-600 hover:bg-green-500 hover:text-white"
            >
              Portal
            </Button>
          )}

          <div className="h-8 w-px bg-[var(--color-border)] mx-1 hidden sm:block" />

          <Button
            variant="outline"
            icon={Download}
            onClick={() => wbsRef.current?.handleImportTemplate()}
            className="h-10 text-xs"
          >
            Plantilla
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => wbsRef.current?.handleAddRootTask()}
            className="h-10 text-xs"
          >
            Tarea
          </Button>

          <Button
            variant="custom"
            onClick={() => setDevelopmentEditOpen(true)}
            disabled={loading || !development}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all border border-[var(--color-primary)]/20"
            title="Editar Proyecto"
          >
            <Pencil size={18} />
          </Button>
        </div>
      </div>



      {development && (
        <WbsTab ref={wbsRef} developmentId={development.id} darkMode={darkMode} />
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
