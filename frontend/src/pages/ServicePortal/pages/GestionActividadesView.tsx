import React from 'react';
import { ArrowLeft, Layers, Network, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Title, Text, MaterialCard } from '../../../components/atoms';

interface Props {
    user: any;
    onNavigate: (view: 'desarrollos' | 'jerarquia') => void;
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
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]">
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

const GestionActividadesView: React.FC<Props> = ({ user, onNavigate, onBack }) => {
    const permissions: string[] = user?.permissions || [];

    const canSeeDesarrollos = permissions.includes('developments');

    const canSeeJerarquia = permissions.includes('jerarquia_organizacional');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
            {/* Header con navegación integrada */}
            <div className="flex flex-col items-center relative">
                <div className="w-full flex justify-start md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="group flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-4 py-2 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <Text as="span" variant="body1" weight="semibold" className="hidden sm:inline">Volver</Text>
                    </Button>
                </div>

                <div className="text-center space-y-2 mt-6 md:mt-0">
                    <Title variant="h2" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                        Gestión de Actividades
                    </Title>
                    <Text variant="h6" color="text-secondary" weight="medium">
                        Centro de control para el seguimiento de desarrollos
                    </Text>
                </div>
            </div>

            {/* Grid de módulos con animaciones */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {canSeeDesarrollos && (
                    <motion.div variants={itemVariants} className="w-full">
                        <ServicePortalCard
                            title="Gestión de Actividades"
                            description="Consulta y gestiona los desarrollos de software y su avance por actividades."
                            icon={<Layers className="w-8 h-8 text-[var(--color-primary)]" />}
                            onClick={() => onNavigate('desarrollos')}
                        />
                    </motion.div>
                )}

                {canSeeJerarquia && (
                    <motion.div variants={itemVariants} className="w-full">
                        <ServicePortalCard
                            title="Jerarquía Organizacional"
                            description="Visualiza y administra la estructura jerárquica de la organización."
                            icon={<Network className="w-8 h-8 text-[var(--color-primary)]" />}
                            onClick={() => onNavigate('jerarquia')}
                        />
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default GestionActividadesView;
