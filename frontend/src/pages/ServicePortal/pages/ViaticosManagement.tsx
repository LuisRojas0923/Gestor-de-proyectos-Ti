import { ClipboardList, ChevronRight, ArrowLeft } from 'lucide-react';
import { Text, Title, MaterialCard, Button } from '../../../components/atoms';
import Callout from '../../../components/molecules/Callout';
import { useAppContext } from '../../../context/AppContext';

import imgIngresar from '../../../assets/images/categories/Ingresar Reporte.png';
import imgEstadoCuenta from '../../../assets/images/categories/estado de cuenta.png';

interface ViaticosManagementProps {
    onNavigate: (view: 'legalizar_gastos' | 'viaticos_reportes' | 'viaticos_estado' | 'director_legalizaciones') => void;
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

const ViaticosManagement: React.FC<ViaticosManagementProps> = ({ onNavigate, moduleStatus = {}, onBack }) => {
    const { state } = useAppContext();
    const { user } = state;
    const userRole = ((user as any)?.rol || user?.role || '').toLowerCase();
    const permissions = (user as any)?.permissions || [];
    const isAdmin = ['admin', 'director', 'manager'].includes(userRole);

    // Lógicas de visibilidad granular (RBAC + Master Switch Global + Viaticante)
    const isViaticante = user?.viaticante === true;
    const hasGestionPermission = (permissions.includes('viaticos_gestion') || isAdmin || isViaticante) && moduleStatus['viaticos_gestion'] !== false;
    const canSeeReportes = (permissions.includes('viaticos_reportes') || isAdmin || isViaticante) && moduleStatus['viaticos_reportes'] !== false;
    const canSeeEstado = (permissions.includes('viaticos_estado') || isAdmin || isViaticante) && moduleStatus['viaticos_estado'] !== false;
    const canSeeDirectorPanel = (permissions.includes('viaticos_director_panel') || isAdmin) && moduleStatus['viaticos_director_panel'] !== false;



    return (
        <div className="space-y-6">
            {/* Header Estandarizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div>
                        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Gestión de Viáticos
                        </Title>
                    </div>
                </div>
            </div>

            {/* Mensaje Informativo si es viaticante pero no tiene permiso administrativo */}
            {!hasGestionPermission && user?.viaticante && (
                <div className="max-w-[var(--portal-max-width)] mx-auto mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Callout
                        variant="warning"
                        title="Acceso Restringido por Administración"
                    >
                        Hemos validado tu identidad correctamente. Sin embargo, tu acceso a los módulos funcionales de viáticos
                        (Legalización y Estado de Cuenta) está actualmente <strong>restringido</strong> por la administración del sistema.
                        <br />
                        Por favor contacta al área administrativa si crees que esto es un error.
                    </Callout>
                </div>
            )}

            <div className={`grid grid-cols-1 ${['director', 'admin'].includes(userRole) ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mt-8 max-w-[var(--portal-max-width)] mx-auto`}>
                {hasGestionPermission && (
                    <>
                        {canSeeReportes && (
                            <ServicePortalCard
                                title="Legalizacion de Gastos"
                                description="Registra y legaliza tus viáticos, adjuntando facturas y detalles por OT."
                                icon={<img src={imgIngresar} alt="Legalizacion de Gastos" className="w-full h-full object-contain p-1" />}
                                onClick={() => onNavigate('viaticos_reportes')}
                            />
                        )}

                        {canSeeEstado && (
                            <ServicePortalCard
                                title="Estado de Cuenta"
                                description="Consulta tus movimientos, saldos y el histórico oficial desde el ERP."
                                icon={<img src={imgEstadoCuenta} alt="Estado de Cuenta" className="w-full h-full object-contain p-1" />}
                                onClick={() => onNavigate('viaticos_estado')}
                            />
                        )}
                    </>
                )}

                {canSeeDirectorPanel && (
                    <ServicePortalCard
                        title="Panel de Legalizaciones"
                        description="Consulta todas las legalizaciones reportadas y el flujo de información."
                        icon={<ClipboardList className="w-10 h-10 text-purple-500" />}
                        onClick={() => onNavigate('director_legalizaciones')}
                    />
                )}
            </div>
        </div>
    );
};

export default ViaticosManagement;
