import React from 'react';
import { ChevronRight, ArrowLeft, Users, UserCheck, PenTool } from 'lucide-react';
import { Text, Title, MaterialCard, Button } from '../../../components/atoms';
import { useAppContext } from '../../../context/AppContext';

interface RequisicionesManagementProps {
    onNavigate: (view: 'requisicion_personal' | 'seguimiento_rp_gh' | 'aprobacion_rp_gerencia') => void;
    moduleStatus?: Record<string, boolean>;
    onBack?: () => void;
}

const ServicePortalCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
}> = ({ title, description, icon, onClick }) => {
    return (
        <MaterialCard
            onClick={onClick}
            hoverable={true}
            className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-lg hover:border-[var(--color-primary)] transition-all duration-300 transform hover:-translate-y-0.5 text-left w-full min-h-24 h-auto cursor-pointer"
        >
            <div className="flex items-center gap-4 w-full h-full">
                {/* Contenedor del Icono/Logo */}
                <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center p-2 border border-slate-100 dark:border-neutral-700 shadow-sm shrink-0">
                    <div className="w-full h-full flex items-center justify-center">
                        {icon}
                    </div>
                </div>
                {/* Textos */}
                <div className="flex-grow min-w-0">
                    <Title variant="h6" weight="bold" className="truncate leading-tight text-slate-800 dark:text-white group-hover:text-[var(--color-primary)] transition-colors">
                        {title}
                    </Title>
                    <Text variant="caption" color="text-secondary" className="block mt-1 font-medium line-clamp-2">
                        {description}
                    </Text>
                </div>
                {/* Indicador de Acción */}
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
            </div>
        </MaterialCard>
    );
};

const RequisicionesManagement: React.FC<RequisicionesManagementProps> = ({ onNavigate, moduleStatus = {}, onBack }) => {
    const { state } = useAppContext();
    const { user } = state;
    const userRole = ((user as any)?.rol || user?.role || '').toLowerCase();
    const permissions = (user as any)?.permissions || [];

    // Lógicas de visibilidad
    const canSeeRequisicionPersonal = moduleStatus['requisicion_personal'] !== false;

    const canSeeSeguimientoRPGH = moduleStatus['requisicion_personal'] !== false && (
        permissions.includes('gestion_humana') ||
        ['admin', 'director'].includes(userRole)
    );

    const canSeeAprobacionGerenciaRP = moduleStatus['requisicion_personal'] !== false && (
        (user?.cedula || user?.id) === "66903320" ||
        userRole === "admin"
    );

    return (
        <div className="space-y-6">
            {/* Header Estandarizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div>
                        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Gestión de Requisiciones (RP)
                        </Title>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[var(--portal-max-width)] mx-auto">
                {canSeeRequisicionPersonal && (
                    <ServicePortalCard
                        title="Requisición de Personal"
                        description="Creación y seguimiento de solicitudes de contratación de personal."
                        icon={<Users className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('requisicion_personal')}
                    />
                )}

                {canSeeSeguimientoRPGH && (
                    <ServicePortalCard
                        title="Seguimiento RP Gestión Humana"
                        description="Gestión y seguimiento del proceso de selección y contratación."
                        icon={<UserCheck className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('seguimiento_rp_gh')}
                    />
                )}

                {canSeeAprobacionGerenciaRP && (
                    <ServicePortalCard
                        title="Aprobación Gerencial RP"
                        description="Firma y autorización definitiva de requisiciones aprobadas."
                        icon={<PenTool className="w-8 h-8 text-[var(--color-primary)]" />}
                        onClick={() => onNavigate('aprobacion_rp_gerencia')}
                    />
                )}
            </div>
        </div>
    );
};

export default RequisicionesManagement;
