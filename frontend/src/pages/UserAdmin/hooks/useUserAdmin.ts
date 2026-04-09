import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

export interface Role {
    id: string;
    nombre: string;
    descripcion: string;
    es_sistema: boolean;
}

export interface User {
    id: string;
    cedula: string;
    nombre: string;
    rol: string;
    esta_activo: boolean;
    especialidades: string; // JSON string
    areas_asignadas: string; // JSON string
}

export const useUserAdmin = () => {
    const { get, patch, post, delete: del } = useApi<any>();
    const { state } = useAppContext();
    const { refreshKey } = state;
    const { addNotification } = useNotifications();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'roles'>('users');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await get('/auth/analistas');
            if (data) setUsers(data);
        } catch (error) {
            addNotification('error', 'Error al cargar lista de usuarios');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const data = await get('/auth/roles');
            if (data) setRoles(data);
        } catch (error) {
            console.error('Error al cargar roles:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [refreshKey]);

    const handleCreateUser = async (userData: Partial<User>) => {
        setIsSaving(true);
        try {
            await post('/auth/analistas/crear', { cedula: userData.cedula });
            addNotification('success', 'Usuario sincronizado desde ERP exitosamente');
            fetchUsers();
            setIsCreateModalOpen(false);
            return true;
        } catch (error) {
            addNotification('error', 'Error al crear usuario');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateUser = async (userToUpdate: User) => {
        setIsSaving(true);
        try {
            const payload = {
                rol: userToUpdate.rol,
                esta_activo: userToUpdate.esta_activo,
                especialidades: JSON.parse(userToUpdate.especialidades || '[]'),
                areas_asignadas: JSON.parse(userToUpdate.areas_asignadas || '[]')
            };
            await patch(`/auth/analistas/${userToUpdate.id}`, payload);
            addNotification('success', 'Usuario actualizado correctamente');
            fetchUsers();
            if (selectedUser?.id === userToUpdate.id) {
                setSelectedUser(null);
            }
            return true;
        } catch (error) {
            addNotification('error', 'Error al actualizar usuario');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateRole = async (roleData: { id: string; nombre: string; descripcion: string }) => {
        setIsSaving(true);
        try {
            await post('/auth/roles', roleData);
            addNotification('success', 'Rol creado exitosamente');
            fetchRoles();
            return true;
        } catch (error) {
            addNotification('error', 'Error al crear rol');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        setIsSaving(true);
        try {
            await del(`/auth/roles/${roleId}`);
            addNotification('success', 'Rol eliminado exitosamente');
            fetchRoles();
            return true;
        } catch (error) {
            addNotification('error', 'No se pudo eliminar el rol');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users
        .filter(u =>
            u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.cedula.includes(searchTerm)
        )
        .sort((a, b) => a.rol.localeCompare(b.rol));


    return {
        users,
        roles,
        filteredUsers,
        isLoading,
        searchTerm,
        setSearchTerm,
        selectedUser,
        setSelectedUser,
        isSaving,
        handleUpdateUser,
        handleCreateUser,
        handleCreateRole,
        handleDeleteRole,
        isCreateModalOpen,
        setIsCreateModalOpen,
        activeTab,
        setActiveTab,
        refreshUsers: fetchUsers,
        refreshRoles: fetchRoles
    };
};
