import React, { useState, useEffect } from 'react';
import { Shield, Search, Users, ClipboardCheck, Building2, UserCheck } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { Button, Title, Text, MaterialCard, Input, Icon, Badge } from '../components/atoms';
import { useNotifications } from '../components/notifications/NotificationsContext';

interface User {
    id: string;
    cedula: string;
    nombre: string;
    rol: string;
    esta_activo: boolean;
    correo?: string;
    especialidades: string; // JSON string
    areas_asignadas: string; // JSON string
}

const RequisicionAdminView: React.FC = () => {
    const { get, patch } = useApi<any>();
    const { addNotification } = useNotifications();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const areasList = [
        'ADMINISTRACION',
        'ADN',
        'COMERCIAL',
        'LOGISTICA',
        'OPERACIONES',
        'PRODUCCION',
        'PROYECTOS',
        'YAK'
    ];

    const fetchUsers = async () => {
        try {
            const data = await get('/auth/analistas');
            if (data) setUsers(data);
        } catch (error) {
            addNotification('error', 'Error al cargar usuarios');
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
                especialidades: JSON.parse(selectedUser.especialidades || '[]'),
                areas_asignadas: JSON.parse(selectedUser.areas_asignadas || '[]')
            };
            await patch(`/auth/analistas/${selectedUser.id}`, payload);
            addNotification('success', 'Permisos de requisición actualizados correctamente');
            fetchUsers();
            setSelectedUser(null);
        } catch (error) {
            addNotification('error', 'Error al actualizar usuario');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleArea = (area: string) => {
        if (!selectedUser) return;
        const currentAreas = JSON.parse(selectedUser.areas_asignadas || '[]') as string[];
        const updated = currentAreas.includes(area)
            ? currentAreas.filter(a => a !== area)
            : [...currentAreas, area];

        setSelectedUser({
            ...selectedUser,
            areas_asignadas: JSON.stringify(updated)
        });
    };

    const toggleGH = () => {
        if (!selectedUser) return;
        const currentEspecialidades = JSON.parse(selectedUser.especialidades || '[]') as string[];
        const isGH = currentEspecialidades.includes('gestion_humana');

        const updated = isGH
            ? currentEspecialidades.filter(e => e !== 'gestion_humana')
            : [...currentEspecialidades, 'gestion_humana'];

        setSelectedUser({
            ...selectedUser,
            especialidades: JSON.stringify(updated)
        });
    };

    const filteredUsers = users.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cedula.includes(searchTerm)
    );

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Title variant="h3" weight="bold" color="text-primary" className="flex items-center gap-3">
                        <ClipboardCheck className="text-[var(--color-primary)]" size={32} />
                        Gestión de Requisiciones
                    </Title>
                    <Text variant="body1" color="text-secondary">Configura quién aprueba las requisiciones (Jefes de Área y Gestión Humana).</Text>
                </div>
                <div className="w-full md:w-72">
                    <Input
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User List */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="p-10 text-center animate-pulse">Cargando usuarios...</div>
                    ) : filteredUsers.length > 0 ? (
                        <div className="grid gap-4 custom-scrollbar max-h-[70vh] overflow-y-auto pr-2">
                            {filteredUsers.map(user => {
                                const areas = JSON.parse(user.areas_asignadas || '[]');
                                const isGH = JSON.parse(user.especialidades || '[]').includes('gestion_humana');

                                return (
                                    <MaterialCard
                                        key={user.id}
                                        className={`p-5 cursor-pointer border-2 transition-all ${selectedUser?.id === user.id ? 'border-[var(--color-primary)] shadow-lg scale-[1.01]' : 'border-transparent hover:border-gray-200'} bg-white dark:bg-[#1a1c23]`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isGH ? 'bg-purple-100 text-purple-600' : areas.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {isGH ? <UserCheck size={24} /> : areas.length > 0 ? <Building2 size={24} /> : <Users size={24} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Text weight="bold" variant="h6" className="truncate">{user.nombre}</Text>
                                                <Text variant="caption" color="text-secondary" className="truncate text-xs">{user.correo || user.cedula}</Text>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {isGH && (
                                                        <Badge variant="info" size="sm" className="bg-purple-50 text-purple-700 border border-purple-200">
                                                            Gestión Humana
                                                        </Badge>
                                                    )}
                                                    {areas.map((area: string) => (
                                                        <Badge key={area} variant="warning" size="sm">
                                                            Aprobador: {area}
                                                        </Badge>
                                                    ))}
                                                    {!isGH && areas.length === 0 && (
                                                        <Text variant="caption" className="text-gray-400">Sin roles de aprobación asignados</Text>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </MaterialCard>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center bg-gray-50 dark:bg-neutral-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-neutral-700">
                            <Text color="text-secondary">No se encontraron usuarios</Text>
                        </div>
                    )}
                </div>

                {/* Editor Sidebar */}
                <div className="space-y-6">
                    {selectedUser ? (
                        <MaterialCard className="p-6 md:p-8 sticky top-6 border border-gray-100 dark:border-neutral-800 shadow-xl">
                            <Title variant="h5" weight="bold" className="mb-2 flex items-center">
                                <Shield className="mr-2 text-[var(--color-primary)]" />
                                Permisos
                            </Title>
                            <Text variant="body2" className="text-gray-500 mb-6 truncate max-w-full overflow-hidden">{selectedUser.nombre}</Text>

                            <div className="space-y-8">
                                {/* Level 1 */}
                                <div>
                                    <Text variant="caption" weight="bold" className="uppercase mb-4 flex items-center text-amber-600">
                                        <Building2 size={16} className="mr-2" /> Nivel 1: Jefe de Área
                                    </Text>
                                    <Text variant="caption" className="text-gray-500 mb-3 block leading-relaxed">
                                        Selecciona las áreas donde este usuario dará el visto bueno inicial (Nivel 1).
                                    </Text>
                                    <div className="flex flex-col gap-2">
                                        {areasList.map(area => {
                                            const isSelected = JSON.parse(selectedUser.areas_asignadas || '[]').includes(area);
                                            return (
                                                <button
                                                    key={area}
                                                    onClick={() => toggleArea(area)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all flex justify-between items-center ${isSelected ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-gray-100 text-gray-600 hover:border-amber-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300'}`}
                                                >
                                                    {area}
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <hr className="border-gray-100 dark:border-neutral-800" />

                                {/* Level 2 */}
                                <div>
                                    <Text variant="caption" weight="bold" className="uppercase mb-4 flex items-center text-purple-600">
                                        <UserCheck size={16} className="mr-2" /> Nivel 2: Gestión Humana
                                    </Text>
                                    <Text variant="caption" className="text-gray-500 mb-3 block leading-relaxed">
                                        Si se activa, este usuario podrá aprobar de forma definitiva todas las requisiciones que ya pasaron por el Nivel 1.
                                    </Text>

                                    <button
                                        onClick={toggleGH}
                                        className={`w-full text-left px-4 py-4 rounded-xl text-sm font-semibold border-2 transition-all flex justify-between items-center ${JSON.parse(selectedUser.especialidades || '[]').includes('gestion_humana') ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-inner' : 'bg-white border-gray-100 text-gray-600 hover:border-purple-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300'}`}
                                    >
                                        Pertenece a Gestión Humana (GH)
                                        {JSON.parse(selectedUser.especialidades || '[]').includes('gestion_humana') && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                                    </button>
                                </div>

                                <div className="pt-6 space-y-3">
                                    <Button
                                        variant="primary"
                                        className="w-full h-12"
                                        onClick={handleUpdateUser}
                                        loading={isSaving}
                                    >
                                        Guardar Asignaciones
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full h-12 text-gray-500"
                                        onClick={() => setSelectedUser(null)}
                                        disabled={isSaving}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </MaterialCard>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-10 text-center opacity-40 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-[2.5rem]">
                            <Icon name={Shield} size="lg" className="mb-6 opacity-50" />
                            <Text weight="bold" variant="h6" className="mb-2">Selecciona un usuario</Text>
                            <Text variant="caption" className="max-w-[200px] inline-block mt-2">Haz clic en cualquier perfil para configurar sus niveles de aprobación.</Text>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequisicionAdminView;
