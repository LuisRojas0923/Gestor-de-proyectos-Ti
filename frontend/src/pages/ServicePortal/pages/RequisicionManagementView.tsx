import React from 'react';
import { ArrowLeft, UserPlus, ClipboardList, Building2 } from 'lucide-react';
import { Button, Text, Title } from '../../../components/atoms';
import { ActionCard } from '../../../components/molecules';

interface RequisicionManagementViewProps {
    onNavigate: (view: 'nueva_requisicion' | 'lista_requisiciones' | 'control_requisiciones') => void;
    onBack: () => void;
}

const RequisicionManagementView: React.FC<RequisicionManagementViewProps> = ({ onNavigate, onBack }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-neutral-700 hover:bg-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800 px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="text-base font-medium text-left text-gray-900 dark:text-gray-100 hidden sm:inline">
                        Volver
                    </Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary" className="uppercase tracking-tight">
                    Requisición de Personal
                </Title>
                <div className="w-20"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 max-w-6xl mx-auto">
                <ActionCard
                    title="Nueva Requisición"
                    description="Inicia un nuevo proceso de solicitud de personal para tu equipo."
                    icon={<div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-2xl text-[var(--color-primary)]"><UserPlus size={40} /></div>}
                    onClick={() => onNavigate('nueva_requisicion')}
                    className="md:h-64"
                />

                <ActionCard
                    title="Mis Solicitudes"
                    description="Consulta el estado y el historial de las requisiciones que has realizado."
                    icon={<div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl text-indigo-600 dark:text-indigo-400"><ClipboardList size={40} /></div>}
                    onClick={() => onNavigate('lista_requisiciones')}
                    className="h-64"
                />

                <ActionCard
                    title="Control Requisiciones"
                    description="Módulo de gestión y seguimiento administrativo de vacantes."
                    icon={<div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400"><Building2 size={40} /></div>}
                    onClick={() => onNavigate('control_requisiciones')}
                    className="h-64"
                />
            </div>
        </div>
    );
};

export default RequisicionManagementView;
