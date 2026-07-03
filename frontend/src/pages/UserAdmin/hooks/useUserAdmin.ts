import { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useAppContext } from '../../../context/AppContext';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useColumnFilters } from '../../../hooks/useColumnFilters';

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

    const handleUnlockRateLimit = async (userId: string) => {
        setIsSaving(true);
        try {
            await post(`/auth/analistas/${userId}/desbloquear-rate-limit`, {});
            addNotification('success', 'Intentos de login (rate limit) desbloqueados exitosamente');
            return true;
        } catch {
            addNotification('error', 'Error al desbloquear el rate limit del usuario');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPassword = async (userId: string) => {
        setIsSaving(true);
        try {
            await post(`/auth/analistas/${userId}/reset-password`, {});
            addNotification('success', 'Contraseña restablecida a la cédula del usuario exitosamente');
            return true;
        } catch {
            addNotification('error', 'Error al resetear la contraseña del usuario');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetBiometrics = async (userId: string) => {
        setIsSaving(true);
        try {
            await del(`/biometria/admin/reset-rostro/${userId}`);
            addNotification('success', 'Perfil biométrico eliminado. El usuario deberá enrolarse nuevamente.');
            return true;
        } catch (error: any) {
            const detail = error?.response?.data?.detail || 'Error al eliminar el rostro del usuario';
            addNotification('error', detail);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const searchFilteredUsers = useMemo(() => {
        return users.filter(u =>
            u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.cedula.includes(searchTerm)
        );
    }, [users, searchTerm]);

    const columnAccessors = useMemo(() => ({
        cedula: (u: User) => u.cedula,
        nombre: (u: User) => u.nombre,
        rol: (u: User) => u.rol,
        esta_activo: (u: User) => u.esta_activo ? 'Activo' : 'Inactivo',
    }), []);

    const {
        filters: columnFilters,
        filteredData: finalFilteredUsers,
        cascadingOptions,
        setColumnFilter,
        sortState,
        setSort,
        activeFilterCount,
        clearAllFilters
    } = useColumnFilters(searchFilteredUsers, columnAccessors, 'user_admin_table');


    return {
        users,
        roles,
        filteredUsers: finalFilteredUsers,
        columnFilters,
        cascadingOptions,
        setColumnFilter,
        sortState,
        setSort,
        activeFilterCount,
        clearAllFilters,
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
        handleUnlockRateLimit,
        handleResetPassword,
        handleResetBiometrics,
        isCreateModalOpen,
        setIsCreateModalOpen,
        activeTab,
        setActiveTab,
        refreshUsers: fetchUsers,
        refreshRoles: fetchRoles
    };
};
