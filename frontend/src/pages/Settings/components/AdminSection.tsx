import React from 'react';
import { Users, User } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button } from '../../../components/atoms';

interface AdminSectionProps {
    analystCedula: string;
    setAnalystCedula: (val: string) => void;
    isCreatingAnalyst: boolean;
    handleCreateAnalyst: () => void;
}

const AdminSection: React.FC<AdminSectionProps> = ({
    analystCedula, setAnalystCedula, isCreatingAnalyst, handleCreateAnalyst
}) => (
    <MaterialCard className="p-6 border-2 border-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/5">
        <div className="flex items-center space-x-3 mb-6">
            <Users className="text-[var(--color-primary)]" size={24} />
            <Title variant="h5" weight="bold" color="text-primary">Administración de Analistas</Title>
        </div>
        <div className="bg-[var(--color-primary)]/5 p-6 rounded-3xl border border-[var(--color-primary)]/10">
            <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1">
                    <Input label="Cédula del nuevo analista (Semilla)" placeholder="Ej: 123456789" value={analystCedula} onChange={(e) => setAnalystCedula(e.target.value)} icon={User} />
                    <Text variant="caption" className="mt-2 text-[var(--color-primary)]/60 font-medium italic">* El sistema validará los datos en Solid ERP automáticamente.</Text>
                </div>
                <Button onClick={handleCreateAnalyst} variant="primary" loading={isCreatingAnalyst} icon={Users} className="mb-1">Crear Analista</Button>
            </div>
        </div>
    </MaterialCard>
);

export default AdminSection;
