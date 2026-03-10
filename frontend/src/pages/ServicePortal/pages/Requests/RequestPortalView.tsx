import React from 'react';
import { ArrowLeft, ClipboardList, Box, DollarSign, Wrench } from 'lucide-react';
import { Button, Title, Text } from '../../../../components/atoms';
import { ActionCard } from '../../../../components/molecules';
import { motion } from 'framer-motion';

// import imgAlmacen from '../../../../assets/images/categories/Solicitar Servicio.png';

interface RequestPortalViewProps {
    user: any;
    onSelectArea: (area: string) => void;
    onConsultStatus: () => void;
    onBack: () => void;
}

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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <ActionCard
                            title="Almacén"
                            description="Materiales, Gases, Panelería, Importaciones y EPP."
                            icon={<Box className="w-14 h-14 text-emerald-500 mx-auto" />}
                            onClick={() => onSelectArea('almacen')}
                        />

                        {/* Placeholders */}
                        <ActionCard
                            title="Suministros"
                            description="Herramientas y Equipos Alquilables (Próximamente)."
                            icon={<Wrench className="w-14 h-14 text-gray-400 mx-auto" />}
                            onClick={() => onSelectArea('suministros')}
                        />
                        <ActionCard
                            title="Control Presupuestal"
                            description="Contratos y Órdenes Especiales (Próximamente)."
                            icon={<DollarSign className="w-14 h-14 text-gray-400 mx-auto" />}
                            onClick={() => onSelectArea('presupuesto')}
                        />
                        <ActionCard
                            title="Mis Solicitudes"
                            description="Consultar el estado de las requisiciones enviadas al ERP."
                            icon={<ClipboardList className="w-16 h-16 text-[var(--warm-orange)] mx-auto" />}
                            onClick={onConsultStatus}
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RequestPortalView;
