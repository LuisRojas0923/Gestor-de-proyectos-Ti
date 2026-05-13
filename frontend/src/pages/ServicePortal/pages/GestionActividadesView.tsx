import React from 'react';
import { ArrowLeft, Layers, UserCheck, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActionCard } from '../../../components/molecules';
import { Button, Title, Text } from '../../../components/atoms';

interface Props {
    user: any;
    onNavigate: (view: 'desarrollos' | 'validaciones' | 'jerarquia') => void;
    onBack: () => void;
}

const GestionActividadesView: React.FC<Props> = ({ user, onNavigate, onBack }) => {
    const permissions: string[] = user?.permissions || [];

    const canSeeDesarrollos = permissions.includes('developments');
    const canSeeValidaciones = permissions.includes('validaciones_asignacion');
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
                        <span className="font-semibold text-base hidden sm:inline">Volver</span>
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {canSeeDesarrollos && (
                    <motion.div variants={itemVariants} className="w-full">
                        <ActionCard
                            title="Gestión de Actividades"
                            description="Consulta y gestiona los desarrollos de software y su avance por actividades."
                            icon={<Layers className="w-10 h-10" />}
                            color="info"
                            onClick={() => onNavigate('desarrollos')}
                        />
                    </motion.div>
                )}
                {canSeeValidaciones && (
                    <motion.div variants={itemVariants} className="w-full">
                        <ActionCard
                            title="Aprobaciones"
                            description="Revisa y valida las asignaciones y delegaciones de actividades pendientes."
                            icon={<UserCheck className="w-10 h-10" />}
                            color="success"
                            onClick={() => onNavigate('validaciones')}
                        />
                    </motion.div>
                )}
                {canSeeJerarquia && (
                    <motion.div variants={itemVariants} className="w-full">
                        <ActionCard
                            title="Jerarquía Organizacional"
                            description="Visualiza y administra la estructura jerárquica de la organización."
                            icon={<Network className="w-10 h-10" />}
                            color="purple"
                            onClick={() => onNavigate('jerarquia')}
                        />
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default GestionActividadesView;
