import React from 'react';
import { ArrowLeft, Briefcase, ShieldCheck, GitBranch } from 'lucide-react';
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

    return (
        <div className="space-y-12 py-6">
            <div>
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <Text weight="medium" className="text-base font-medium text-[var(--color-text)] hidden sm:inline">
                        Volver
                    </Text>
                </Button>
            </div>
            <div className="text-center space-y-2">
                <Title variant="h3" weight="bold" className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent">
                    Gestión de Actividades
                </Title>
                <Text variant="h6" color="text-secondary" weight="medium">Selecciona un módulo para continuar</Text>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {canSeeDesarrollos && (
                    <ActionCard
                        title="Gestión de Actividades"
                        description="Consulta y gestiona los desarrollos de software y su avance por actividades."
                        icon={<Briefcase className="w-10 h-10 text-primary-600" />}
                        onClick={() => onNavigate('desarrollos')}
                    />
                )}
                {canSeeValidaciones && (
                    <ActionCard
                        title="Aprobaciones"
                        description="Revisa y valida las asignaciones y delegaciones de actividades pendientes."
                        icon={<ShieldCheck className="w-10 h-10 text-primary-600" />}
                        onClick={() => onNavigate('validaciones')}
                    />
                )}
                {canSeeJerarquia && (
                    <ActionCard
                        title="Jerarquía Organizacional"
                        description="Visualiza y administra la estructura jerárquica de la organización."
                        icon={<GitBranch className="w-10 h-10 text-primary-600" />}
                        onClick={() => onNavigate('jerarquia')}
                    />
                )}
            </div>
        </div>
    );
};

export default GestionActividadesView;
