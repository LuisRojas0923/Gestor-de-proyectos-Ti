import React from 'react';
import { User } from '../hooks/useUserAdmin';
import UserCard from './UserCard';
import { especialidadesList } from '../constants';
import { Text } from '../../../components/atoms';

interface UserListProps {
    users: User[];
    selectedUserId?: string;
    onUserSelect: (user: User) => void;
    isLoading: boolean;
}

const UserList: React.FC<UserListProps> = ({ users, selectedUserId, onUserSelect, isLoading }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] animate-pulse" />
                ))}
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="p-16 text-center bg-[var(--color-surface)] rounded-[2.5rem] border-2 border-dashed border-[var(--color-border)]">
                <Text color="text-secondary">No se encontraron usuarios para los criterios de búsqueda</Text>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(user => (
                <UserCard
                    key={user.id}
                    user={user}
                    isSelected={selectedUserId === user.id}
                    onClick={() => onUserSelect(user)}
                    especialidadesList={especialidadesList}
                />
            ))}
        </div>
    );
};

export default UserList;
