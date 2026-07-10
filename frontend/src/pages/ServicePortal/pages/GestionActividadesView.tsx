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
            className="p-4 text-left w-full min-h-24 h-auto"
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
            {/* Header Estandarizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <Title variant="h4" weight="bold" className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Gestión de Actividades
                        </Title>
                    </div>
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
