import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Zap, Grid, Globe, Shield, ChevronRight } from 'lucide-react';
import { Button, Title, Text, MaterialCard } from '../../../../components/atoms';
import { motion } from 'framer-motion';

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

const AlmacenSubAreaView: React.FC = () => {
    const navigate = useNavigate();

    const handleSelectSpecialty = (specialty: string) => {
        // Redirigir al formulario principal del almacén pre-cargando la especialidad
        navigate(`/service-portal/requisiciones/almacen/crear/${specialty}`);
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="flex items-center space-x-4 mb-4">
                <Button variant="ghost" onClick={() => navigate('/service-portal/requisiciones')} icon={ArrowLeft} className="font-bold">
                    Volver a Áreas
                </Button>
                <div>
                    <Title variant="h4" weight="bold">Requisiciones de Almacén</Title>
                    <Text variant="body2" color="text-secondary">Selecciona el tipo de material o servicio a solicitar</Text>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <ServicePortalCard
                    title="Materiales"
                    description="Solicitud general de insumos y materiales de almacén."
                    icon={<Package className="w-8 h-8 text-blue-500" />}
                    onClick={() => handleSelectSpecialty('materiales')}
                />
                <ServicePortalCard
                    title="Gases"
                    description="Solicitud de cilindros y recargas de gases industriales."
                    icon={<Zap className="w-8 h-8 text-yellow-500" />}
                    onClick={() => handleSelectSpecialty('gases')}
                />
                <ServicePortalCard
                    title="Panelería"
                    description="Suministro de paneles para obra."
                    icon={<Grid className="w-8 h-8 text-slate-500" />}
                    onClick={() => handleSelectSpecialty('paneleria')}
                />
                <ServicePortalCard
                    title="Importación"
                    description="Requisición de materiales importados (Comex)."
                    icon={<Globe className="w-8 h-8 text-indigo-500" />}
                    onClick={() => handleSelectSpecialty('importacion')}
                />
                <ServicePortalCard
                    title="Dotación y EPP"
                    description="Elementos de Protección Personal e indumentaria."
                    icon={<Shield className="w-8 h-8 text-emerald-500" />}
                    onClick={() => handleSelectSpecialty('epp')}
                />
            </motion.div>
        </div>
    );
};

export default AlmacenSubAreaView;
