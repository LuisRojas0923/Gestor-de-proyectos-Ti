import React from 'react';
import { ArrowLeft, ClipboardList, Box, DollarSign, Wrench, ChevronRight } from 'lucide-react';
import { Button, Title, Text, MaterialCard } from '../../../../components/atoms';
import { motion } from 'framer-motion';

// import imgAlmacen from '../../../../assets/images/categories/Solicitar Servicio.png';

interface RequestPortalViewProps {
    user: any;
    onSelectArea: (area: string) => void;
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

const RequestPortalView: React.FC<RequestPortalViewProps> = ({ onSelectArea, onConsultStatus, onBack }) => {

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="font-bold">
                        Volver al Inicio
                    </Button>
                </div>
                <div className="text-right">
                    <Title variant="h3" weight="bold" className="text-[var(--deep-navy)] dark:text-white">
                        Gestión de Solicitudes y Requisiciones
                    </Title>
                    <Text variant="subtitle1" color="text-secondary">
                        Integración ERP
                    </Text>
                </div>
            </div>

            <div className="min-h-[400px]">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 mt-8"
                >
                    <div className="flex items-center space-x-4 mb-8">
                        <div>
                            <Title variant="h4" weight="bold">Selecciona el Área de Gestión</Title>
                            <Text variant="body2" color="text-secondary">¿A qué área va dirigida esta solicitud?</Text>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <ServicePortalCard
                            title="Almacén"
                            description="Materiales, Gases, Panelería, Importaciones y EPP."
                            icon={<Box className="w-8 h-8 text-emerald-500" />}
                            onClick={() => onSelectArea('almacen')}
                        />

                        {/* Placeholders */}
                        <ServicePortalCard
                            title="Suministros"
                            description="Herramientas y Equipos Alquilables (Próximamente)."
                            icon={<Wrench className="w-8 h-8 text-gray-400" />}
                            onClick={() => onSelectArea('suministros')}
                        />
                        <ServicePortalCard
                            title="Control Presupuestal"
                            description="Contratos y Órdenes Especiales (Próximamente)."
                            icon={<DollarSign className="w-8 h-8 text-gray-400" />}
                            onClick={() => onSelectArea('presupuesto')}
                        />
                        <ServicePortalCard
                            title="Mis Solicitudes"
                            description="Consultar el estado de las requisiciones enviadas al ERP."
                            icon={<ClipboardList className="w-8 h-8 text-[var(--warm-orange)]" />}
                            onClick={onConsultStatus}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RequestPortalView;
