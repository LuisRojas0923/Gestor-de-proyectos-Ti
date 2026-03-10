import React from 'react';
import {
    Users,
    Shield,
    Search,
    Lock
} from 'lucide-react';
import PermissionsMatrix from '../../components/admin/PermissionsMatrix';
import {
    Button,
    Title,
    Text,
    Input,
    Icon
} from '../../components/atoms';
import { useUserAdmin } from './hooks/useUserAdmin';
import UserList from './components/UserList';
import UserEditor from './components/UserEditor';
import UserCreateModal from './components/UserCreateModal';
import RoleManager from './components/RoleManager';

// NOTA: Como UserAdmin.tsx está en src/pages/ y los componentes en src/pages/UserAdmin/components
// Las rutas deben ser relativas a src/pages/

const UserAdmin: React.FC = () => {
    const {
        filteredUsers,
        isLoading,
        searchTerm,
        setSearchTerm,
        selectedUser,
        setSelectedUser,
        isSaving,
        handleUpdateUser,
        handleCreateUser,
        isCreateModalOpen,
        setIsCreateModalOpen,
        activeTab,
        setActiveTab
    } = useUserAdmin();

    return (
        <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Title variant="h3" weight="bold" color="text-primary" className="tracking-tight">
                        Administración de Usuarios
                    </Title>
                    <Text variant="body1" color="text-secondary" className="max-w-md">
                        Gestiona roles, áreas y especialidades del equipo técnico con control granular.
                    </Text>
                </div>

                {activeTab === 'users' && (
                    <div className="flex w-full md:w-auto gap-3 items-center">
                        <div className="relative w-full md:w-72 group">
                            <Input
                                placeholder="Buscar por nombre o cédula..."
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                icon={Search}
                                className="!rounded-2xl border-2 transition-all group-hover:border-[var(--color-primary)]"
                            />
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="!rounded-2xl h-[42px] px-6 shadow-md hover:shadow-lg transition-all"
                            onClick={() => setIsCreateModalOpen(true)}
                            icon={Users}
                        >
                            Nuevo Usuario
                        </Button>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-[var(--color-surface-variant)] rounded-2xl w-fit border border-[var(--color-border)]">
                <Button
                    variant={activeTab === 'users' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('users')}
                    icon={Users}
                    className={`!rounded-xl px-6 transition-all duration-300 ${activeTab === 'users' ? 'shadow-sm' : ''}`}
                >
                    Usuarios
                </Button>
                <Button
                    variant={activeTab === 'permissions' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('permissions')}
                    icon={Lock}
                    className={`!rounded-xl px-6 transition-all duration-300 ${activeTab === 'permissions' ? 'shadow-sm' : ''}`}
                >
                    Matriz RBAC
                </Button>
                <Button
                    variant={activeTab === 'roles' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('roles')}
                    icon={Shield}
                    className={`!rounded-xl px-6 transition-all duration-300 ${activeTab === 'roles' ? 'shadow-sm' : ''}`}
                >
                    Gestión de Roles
                </Button>
            </div>

            {activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content: User List */}
                    <div className="lg:col-span-3">
                        <UserList
                            users={filteredUsers}
                            selectedUserId={selectedUser?.id}
                            onUserSelect={setSelectedUser}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Sidebar: Editor or Empty State */}
                    <div className="lg:col-span-1">
                        {selectedUser ? (
                            <UserEditor
                                user={selectedUser}
                                onSave={handleUpdateUser}
                                onCancel={() => setSelectedUser(null)}
                                isSaving={isSaving}
                            />
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center p-10 text-center opacity-40 border-2 border-dashed border-[var(--color-border)] rounded-[2.5rem] bg-[var(--color-surface)]">
                                <div className="p-6 rounded-3xl bg-[var(--color-surface-variant)] mb-4 text-[var(--color-primary)]">
                                    <Icon name={Shield} size="lg" />
                                </div>
                                <Text weight="bold" variant="h6" className="mb-2">Zona de Edición</Text>
                                <Text variant="body2" color="text-secondary">
                                    Selecciona un usuario de la lista para gestionar sus permisos y especialidades técnica.
                                </Text>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'permissions' ? (
                <div className="animate-in zoom-in-95 duration-300">
                    <PermissionsMatrix />
                </div>
            ) : (
                <RoleManager />
            )}

            {/* Creation Modal (al final para stacking context) */}
            <UserCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateUser}
                isSaving={isSaving}
            />
        </div>
    );
};

export default UserAdmin;
