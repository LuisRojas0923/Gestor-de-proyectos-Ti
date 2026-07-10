import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Title, Text, Button, Badge, MaterialCard } from '../../../components/atoms';

import imgSistemas from '../../../assets/images/categories/Soporte Hardware.png';
import imgDesarrollo from '../../../assets/images/categories/Nuevos desarrollos.png';
import imgMejora from '../../../assets/images/categories/Soporte Mejoramiento.png';
import imgMisSolicitudes from '../../../assets/images/categories/Mis Solicitudes.png';

interface AreaSelectionViewProps {
    user: any;
    onSelectArea: (area: 'sistemas' | 'desarrollo' | 'mejoramiento') => void;
    onConsultStatus: () => void;
    onBack: () => void;
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

const AreaSelectionView: React.FC<AreaSelectionViewProps> = ({ user, onSelectArea, onConsultStatus, onBack }) => {
    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const permissions = user?.permissions || [];

    const canSeeSistemas = permissions.includes('sistemas') || ['admin', 'director'].includes(userRole);
    const canSeeDesarrollo = permissions.includes('desarrollo') || ['admin', 'director'].includes(userRole);
    const canSeeMejoramiento = permissions.includes('mejoramiento') || ['admin', 'director'].includes(userRole);
    const canSeeMisSolicitudes = permissions.includes('mis_solicitudes') || ['admin', 'director'].includes(userRole);

    return (
        <div className="space-y-12 py-6">
            {/* Header Estandarizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            ¿Qué deseas gestionar hoy?
                        </Title>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {canSeeSistemas && (
                    <ServicePortalCard
                        title="Soporte Sistemas"
                        description="Hardware, Software, Impresoras e Infraestructura tecnológica."
                        icon={<img src={imgSistemas} alt="Sistemas" className="w-full h-full object-contain p-1" />}
                        onClick={() => onSelectArea('sistemas')}
                    />
                )}

                {canSeeDesarrollo && (
                    <ServicePortalCard
                        title="Desarrollo Software"
                        description="Solicitud de nuevos módulos o funcionalidades en SOLID."
                        icon={<img src={imgDesarrollo} alt="Desarrollo" className="w-full h-full object-contain p-1" />}
                        onClick={() => onSelectArea('desarrollo')}
                    />
                )}

                {canSeeMejoramiento && (
                    <ServicePortalCard
                        title="Mejoramiento"
                        description="Ajustes a herramientas de Excel y procesos existentes."
                        icon={<img src={imgMejora} alt="Mejoramiento" className="w-full h-full object-contain p-1" />}
                        onClick={() => onSelectArea('mejoramiento')}
                    />
                )}

                {canSeeMisSolicitudes && (
                    <ServicePortalCard
                        title="Mis Solicitudes"
                        description="Consulta el estado y progreso de tus tickets activos."
                        icon={<img src={imgMisSolicitudes} alt="Mis Solicitudes" className="w-full h-full object-contain p-1" />}
                        onClick={onConsultStatus}
                    />
                )}
            </div>
        </div>
    );
};

export default AreaSelectionView;
