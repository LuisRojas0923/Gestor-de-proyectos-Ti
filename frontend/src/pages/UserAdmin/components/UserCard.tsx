import React from 'react';
import { Users } from 'lucide-react';
import { MaterialCard, Text, Badge } from '../../../components/atoms';
import { User } from '../hooks/useUserAdmin';

interface UserCardProps {
    user: User;
    isSelected: boolean;
    onClick: () => void;
    especialidadesList: { id: string, label: string }[];
}

const UserCard: React.FC<UserCardProps> = ({ user, isSelected, onClick, especialidadesList }) => {
    const especialidades = JSON.parse(user.especialidades || '[]') as string[];
    const areasCount = JSON.parse(user.areas_asignadas || '[]').length;

    return (
        <MaterialCard
            className={`p-4 cursor-pointer border-2 transition-all duration-300 hover:shadow-md active:scale-[0.99] ${isSelected
                    ? 'border-[var(--color-primary)] shadow-md bg-[var(--color-surface-variant)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
            onClick={onClick}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}>
                        <Users size={20} />
                    </div>
                    <div className="flex flex-col">
                        <Text weight="bold" variant="subtitle1" className="line-clamp-1 leading-tight">{user.nombre}</Text>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <Text variant="caption" color="text-secondary" className="font-mono bg-[var(--color-surface-variant)] px-1.5 py-0.5 rounded text-[10px]">
                                {user.cedula}
                            </Text>
                            <Text variant="caption" className="text-[var(--color-border)] opacity-50">
                                •
                            </Text>
                            <Text variant="caption" weight="bold" color="primary" className="uppercase tracking-widest text-[9px]">
                                {user.rol}
                            </Text>
                        </div>
                    </div>
                </div>
                <Badge variant={user.esta_activo ? 'success' : 'error'} size="sm" className="shadow-none">
                    {user.esta_activo ? 'Activo' : 'Inactivo'}
                </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 opacity-80">
                {especialidades.slice(0, 3).map((esp: string) => (
                    <Badge key={esp} variant="info" size="sm" className="bg-opacity-30 border-transparent text-[10px] py-0 px-2 h-5">
                        {especialidadesList.find(e => e.id === esp)?.label || esp}
                    </Badge>
                ))}
                {especialidades.length > 3 && (
                    <Text variant="caption" color="text-secondary" className="flex items-center text-[10px]">
                        +{especialidades.length - 3}
                    </Text>
                )}
                {areasCount > 0 && (
                    <Badge variant="warning" size="sm" className="bg-opacity-30 border-transparent text-[10px] py-0 px-2 h-5">
                        {areasCount} Áreas
                    </Badge>
                )}
            </div>
        </MaterialCard>

    );
};

export default UserCard;
