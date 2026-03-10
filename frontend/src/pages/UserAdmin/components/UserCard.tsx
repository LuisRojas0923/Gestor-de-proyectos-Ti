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
            className={`p-6 cursor-pointer border-2 transition-all duration-300 hover:shadow-lg active:scale-[0.98] ${isSelected
                    ? 'border-[var(--color-primary)] shadow-md bg-[var(--color-surface-variant)]'
                    : 'border-transparent bg-[var(--color-surface)]'
                }`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <div className="flex space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                        <Users size={24} />
                    </div>
                    <div>
                        <Text weight="bold" variant="h6" className="line-clamp-1">{user.nombre}</Text>
                        <Text variant="caption" color="text-secondary" className="uppercase font-bold tracking-widest text-[10px]">
                            {user.rol}
                        </Text>
                    </div>
                </div>
                <Badge variant={user.esta_activo ? 'success' : 'error'} size="sm">
                    {user.esta_activo ? 'Activo' : 'Inactivo'}
                </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {especialidades.slice(0, 3).map((esp: string) => (
                    <Badge key={esp} variant="info" size="sm" className="bg-opacity-50">
                        {especialidadesList.find(e => e.id === esp)?.label || esp}
                    </Badge>
                ))}
                {especialidades.length > 3 && (
                    <Text variant="caption" color="text-secondary" className="flex items-center">
                        +{especialidades.length - 3}
                    </Text>
                )}
                {areasCount > 0 && (
                    <Badge variant="warning" size="sm" className="bg-opacity-50">
                        {areasCount} Áreas
                    </Badge>
                )}
            </div>
        </MaterialCard>
    );
};

export default UserCard;
