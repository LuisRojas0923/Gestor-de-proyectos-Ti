import React, { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    Briefcase,
    MapPin,
    Save,
    Search,
    Lock
} from 'lucide-react';
import PermissionsMatrix from '../components/admin/PermissionsMatrix';
import { useApi } from '../hooks/useApi';
import {
    Button,
    Title,
    Text,
    MaterialCard,
    Input,
    Icon,
    Badge
} from '../components/atoms';
import { useNotifications } from '../components/notifications/NotificationsContext';

interface User {
    id: string;
    cedula: string;
    nombre: string;
    rol: string;
    esta_activo: boolean;
    especialidades: string; // JSON string
    areas_asignadas: string; // JSON string
}

const UserAdmin: React.FC = () => {
    const { get, patch } = useApi<any>();
    const { addNotification } = useNotifications();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');

    // Opciones predefinidas
    const especialidadesList = [
        { id: 'soporte_hardware', label: 'Hardware' },
        { id: 'soporte_software', label: 'Software' },
        { id: 'soporte_impresoras', label: 'Impresoras' },
        { id: 'perifericos', label: 'Periféricos' },
        { id: 'nuevos_desarrollos_mejora', label: 'Desarrollo' },
        { id: 'soporte_mejora', label: 'Mejoramiento' },
        { id: 'control_cambios', label: 'Control Cambios' },
        { id: 'compra_licencias', label: 'Licencias' }
    ];

    const areasList = [
        'Administración', 'Contabilidad', 'Tesorería', 'Recursos Humanos',
        'Logística', 'Operaciones', 'Ventas', 'Jurídico', 'Gerencia'
    ];

    const fetchUsers = async () => {
        try {
            const data = await get('/auth/analistas');
            if (data) setUsers(data);
        } catch (error) {
            addNotification('error', 'Error al cargar analistas');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            const payload = {
                rol: selectedUser.rol,
                esta_activo: selectedUser.esta_activo,
                especialidades: JSON.parse(selectedUser.especialidades || '[]'),
                areas_asignadas: JSON.parse(selectedUser.areas_asignadas || '[]')
            };
            await patch(`/auth/analistas/${selectedUser.id}`, payload);
            addNotification('success', 'Usuario actualizado correctamente');
            fetchUsers();
            setSelectedUser(null);
        } catch (error) {
            addNotification('error', 'Error al actualizar usuario');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSelection = (id: string, field: 'especialidades' | 'areas_asignadas') => {
        if (!selectedUser) return;
        const current = JSON.parse(selectedUser[field] || '[]') as string[];
        const updated = current.includes(id)
            ? current.filter(item => item !== id)
            : [...current, id];

        setSelectedUser({
            ...selectedUser,
            [field]: JSON.stringify(updated)
        });
    };

    const filteredUsers = users.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cedula.includes(searchTerm)
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <Title variant="h3" weight="bold" color="text-primary">Administración de Usuarios</Title>
                    <Text variant="body1" color="text-secondary">Gestiona roles, áreas y especialidades del equipo técnico</Text>
                </div>
                <div className="flex space-x-4">
                    <div className="relative w-64">
                        <Input
                            placeholder="Buscar analista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={Search}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-100 dark:border-neutral-800 pb-2">
                <Button
                    variant={activeTab === 'users' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('users')}
                    icon={Users}
                >
                    Gestión de Analistas
                </Button>
                <Button
                    variant={activeTab === 'permissions' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('permissions')}
                    icon={Lock}
                >
                    Matriz de Permisos (RBAC)
                </Button>
            </div>

            {activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lista de Usuarios */}
                    <div className="lg:col-span-2 space-y-4">
                        {isLoading ? (
                            <div className="p-10 text-center">Cargando...</div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <MaterialCard
                                    key={user.id}
                                    className={`p-6 cursor-pointer border-2 transition-all ${selectedUser?.id === user.id ? 'border-[var(--color-primary)] shadow-lg' : 'border-transparent'}`}
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex space-x-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                                                <Users size={24} />
                                            </div>
                                            <div>
                                                <Text weight="bold" variant="h6">{user.nombre}</Text>
                                                <Text variant="caption" color="text-secondary" className="uppercase font-bold tracking-widest">{user.rol}</Text>
                                            </div>
                                        </div>
                                        <Badge variant={user.esta_activo ? 'success' : 'error'} size="sm">
                                            {user.esta_activo ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {JSON.parse(user.especialidades || '[]').map((esp: string) => (
                                            <Badge key={esp} variant="info" size="sm">
                                                {especialidadesList.find(e => e.id === esp)?.label || esp}
                                            </Badge>
                                        ))}
                                        {JSON.parse(user.areas_asignadas || '[]').length > 0 && (
                                            <Badge variant="warning" size="sm">
                                                {JSON.parse(user.areas_asignadas || '[]').length} Áreas
                                            </Badge>
                                        )}
                                    </div>
                                </MaterialCard>
                            ))
                        ) : (
                            <div className="p-10 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Text color="text-secondary">No se encontraron analistas</Text>
                            </div>
                        )}
                    </div>

                    {/* Editor */}
                    <div className="space-y-6">
                        {selectedUser ? (
                            <MaterialCard className="p-8 sticky top-4">
                                <Title variant="h5" weight="bold" className="mb-6 flex items-center">
                                    <Shield className="mr-2 text-[var(--color-primary)]" />
                                    Editar Perfil
                                </Title>

                                <div className="space-y-6">
                                    <div>
                                        <Text variant="caption" weight="bold" className="uppercase mb-2 block">Rol del Sistema</Text>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'analyst', label: 'Analista' },
                                                { id: 'admin_sistemas', label: 'Sistemas' },
                                                { id: 'admin', label: 'Admin' },
                                                { id: 'director', label: 'Director' },
                                                { id: 'manager', label: 'Manager' }
                                            ].map(role => (
                                                <Button
                                                    key={role.id}
                                                    variant={selectedUser.rol === role.id ? 'primary' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setSelectedUser({ ...selectedUser, rol: role.id })}
                                                    className={`py-2 px-3 rounded-xl text-[10px] font-bold border-2 transition-all ${selectedUser.rol === role.id ? '' : 'border-gray-100 dark:border-neutral-800'}`}
                                                >
                                                    {role.label.toUpperCase()}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <Text variant="caption" weight="bold" className="uppercase mb-3 flex items-center">
                                            <Briefcase size={14} className="mr-1" /> Especialidades TI
                                        </Text>
                                        <div className="grid grid-cols-2 gap-2">
                                            {especialidadesList.map(esp => (
                                                <Button
                                                    key={esp.id}
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSelection(esp.id, 'especialidades')}
                                                    className={`p-2 rounded-xl text-[10px] font-bold text-left border transition-all ${JSON.parse(selectedUser.especialidades || '[]').includes(esp.id) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent border-gray-100'}`}
                                                >
                                                    {esp.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <Text variant="caption" weight="bold" className="uppercase mb-3 flex items-center">
                                            <MapPin size={14} className="mr-1" /> Áreas Asignadas (Mejoramiento)
                                        </Text>
                                        <div className="flex flex-wrap gap-2">
                                            {areasList.map(area => (
                                                <Button
                                                    key={area}
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleSelection(area, 'areas_asignadas')}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${JSON.parse(selectedUser.areas_asignadas || '[]').includes(area) ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-transparent border-gray-100'}`}
                                                >
                                                    {area}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                        <Button
                                            variant="primary"
                                            className="w-full"
                                            icon={Save}
                                            onClick={handleUpdateUser}
                                            loading={isSaving}
                                        >
                                            Guardar Cambios
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full text-gray-500"
                                            onClick={() => setSelectedUser(null)}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            </MaterialCard>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-30 border-2 border-dashed border-gray-200 rounded-[2.5rem]">
                                <Icon name={Shield} size="sm" className="mb-4" />
                                <Text weight="bold">Selecciona un analista para editar sus permisos</Text>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <PermissionsMatrix />
            )}
        </div>
    );
};

export default UserAdmin;
