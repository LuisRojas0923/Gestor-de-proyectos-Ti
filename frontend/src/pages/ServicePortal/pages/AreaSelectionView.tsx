import React from 'react';
import { ArrowLeft, MonitorDot, Code, Lightbulb, ClipboardCheck } from 'lucide-react';
import { Title, Text, Button, Badge } from '../../../components/atoms';
import { ActionCard } from '../../../components/molecules';

interface AreaSelectionViewProps {
    user: any;
    onSelectArea: (area: 'sistemas' | 'desarrollo' | 'mejoramiento') => void;
    onConsultStatus: () => void;
    onBack: () => void;
}

const AreaSelectionView: React.FC<AreaSelectionViewProps> = ({ user, onSelectArea, onConsultStatus, onBack }) => {
    const userRole = (user?.rol || user?.role || '').toLowerCase();
    const permissions = user?.permissions || [];

    const canSeeSistemas = permissions.includes('sistemas') || ['admin', 'director'].includes(userRole);
    const canSeeDesarrollo = permissions.includes('desarrollo') || ['admin', 'director'].includes(userRole);
    const canSeeMejoramiento = permissions.includes('mejoramiento') || ['admin', 'director'].includes(userRole);
    const canSeeMisSolicitudes = permissions.includes('mis_solicitudes') || ['admin', 'director'].includes(userRole);

    return (
        <div className="space-y-12 py-6">
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    icon={ArrowLeft}
                    className="font-bold p-0"
                >
                    Volver
                </Button>
            </div>

            <div className="text-center space-y-4">
                <Badge
                    variant="primary"
                    size="lg"
                    className="mb-4 uppercase tracking-[0.2em] font-extrabold shadow-sm"
                >
                    Gestión de Solicitudes TI
                </Badge>
                <Title variant="h2" weight="bold" className="text-[var(--deep-navy)] dark:text-white">
                    ¿Qué deseas gestionar hoy?
                </Title>
                <Text variant="body1" color="text-secondary" className="max-w-2xl mx-auto font-medium">
                    Puedes crear un nuevo requerimiento o consultar el estado de tus solicitudes activas.
                </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {canSeeSistemas && (
                    <ActionCard
                        title="Soporte Sistemas"
                        description="Hardware, Software, Impresoras e Infraestructura tecnológica."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-blue-500/10"><MonitorDot className="w-12 h-12 text-blue-500" /></div>}
                        onClick={() => onSelectArea('sistemas')}
                    />
                )}

                {canSeeDesarrollo && (
                    <ActionCard
                        title="Desarrollo Software"
                        description="Solicitud de nuevos módulos o funcionalidades en SOLID."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-indigo-500/10"><Code className="w-12 h-12 text-indigo-500" /></div>}
                        onClick={() => onSelectArea('desarrollo')}
                    />
                )}

                {canSeeMejoramiento && (
                    <ActionCard
                        title="Mejoramiento"
                        description="Ajustes a herramientas de Excel y procesos existentes."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-amber-500/10"><Lightbulb className="w-12 h-12 text-amber-500" /></div>}
                        onClick={() => onSelectArea('mejoramiento')}
                    />
                )}

                {canSeeMisSolicitudes && (
                    <ActionCard
                        title="Mis Solicitudes"
                        description="Consulta el estado y progreso de tus tickets activos."
                        icon={<div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110 mb-4 bg-[var(--color-primary)]/10"><ClipboardCheck className="w-12 h-12 text-[var(--color-primary)]" /></div>}
                        onClick={onConsultStatus}
                        variant="primary_light"
                    />
                )}
            </div>
        </div>
    );
};

export default AreaSelectionView;
