import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Save, RefreshCw } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { MaterialCard, Title, Text, Button, Badge } from '../atoms';
import { useNotifications } from '../notifications/NotificationsContext';

interface Permiso {
    rol: string;
    modulo: string;
    permitido: boolean;
}

const PermissionsMatrix: React.FC = () => {
    const { get, post } = useApi<any>();
    const { addNotification } = useNotifications();
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const roles = ['admin', 'admin_sistemas', 'manager', 'analyst', 'director', 'viaticante', 'user'];
    const modulos = [
        { id: 'dashboard', label: 'Tablero' },
        { id: 'viaticos_gestion', label: 'Gestión Viáticos' },
        { id: 'mis_solicitudes', label: 'Mis Solicitudes' },
        { id: 'sistemas', label: 'Soporte Sistemas' },
        { id: 'desarrollo', label: 'Desarrollo Software' },
        { id: 'mejoramiento', label: 'Mejoramiento' },
        { id: 'developments', label: 'Desarrollos (Módulo)' },
        { id: 'indicators', label: 'Indicadores BI' },
        { id: 'ticket-management', label: 'Gestión Tickets' },
        { id: 'reports', label: 'Reportes' },
        { id: 'chat', label: 'Chat IA' },
        { id: 'service-portal', label: 'Portal Soportes (General)' },
        { id: 'user-admin', label: 'Gestión Usuarios' },
        { id: 'settings', label: 'Configuración' },
        { id: 'design-catalog', label: 'Catálogo UI' }
    ];

    const fetchPermisos = async () => {
        setIsLoading(true);
        try {
            const data = await get('/auth/permisos');
            if (data) setPermisos(data);
        } catch (error) {
            addNotification('error', 'Error al cargar matriz de permisos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPermisos();
    }, []);

    const togglePermiso = (rol: string, modulo: string) => {
        const existing = permisos.find(p => p.rol === rol && p.modulo === modulo);
        if (existing) {
            setPermisos(permisos.map(p =>
                (p.rol === rol && p.modulo === modulo)
                    ? { ...p, permitido: !p.permitido }
                    : p
            ));
        } else {
            setPermisos([...permisos, { rol, modulo, permitido: true }]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await post('/auth/permisos', permisos);
            addNotification('success', 'Configuración de seguridad actualizada');
            // Recargar para sincronizar
            fetchPermisos();
        } catch (error) {
            addNotification('error', 'Error al guardar permisos');
        } finally {
            setIsSaving(false);
        }
    };

    const isPermitted = (rol: string, modulo: string) => {
        return permisos.find(p => p.rol === rol && p.modulo === modulo)?.permitido || false;
    };

    if (isLoading) return <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto mb-2" /> <Text>Cargando matriz de seguridad...</Text></div>;

    return (
        <MaterialCard className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Title variant="h4" weight="bold" className="flex items-center">
                        <Shield className="mr-3 text-[var(--color-primary)]" />
                        Matriz de Control de Accesos (RBAC)
                    </Title>
                    <Text variant="body2" color="text-secondary">Configura qué módulos son visibles para cada rol del sistema</Text>
                </div>
                <Button
                    variant="primary"
                    icon={Save}
                    loading={isSaving}
                    onClick={handleSave}
                >
                    Guardar Matriz
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-4 border-b border-gray-100 dark:border-neutral-800">
                                <Text weight="bold" variant="caption" className="uppercase opacity-50">Módulo / Pantalla</Text>
                            </th>
                            {roles.map(rol => (
                                <th key={rol} className="p-4 border-b border-gray-100 dark:border-neutral-800 text-center">
                                    <Badge variant="info" size="sm" className="uppercase tracking-widest">{rol}</Badge>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {modulos.map(mod => (
                            <tr key={mod.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                                <td className="p-4 border-b border-gray-50 dark:border-neutral-900">
                                    <Text weight="bold" variant="body2">{mod.label}</Text>
                                    <Text variant="caption" color="text-secondary" className="block text-[10px] uppercase font-mono">{mod.id}</Text>
                                </td>
                                {roles.map(rol => {
                                    const active = isPermitted(rol, mod.id);
                                    return (
                                        <td key={`${rol}-${mod.id}`} className="p-4 border-b border-gray-50 dark:border-neutral-900 text-center">
                                            <Button
                                                variant="ghost"
                                                onClick={() => togglePermiso(rol, mod.id)}
                                                className={`w-10 h-10 !p-0 rounded-2xl flex items-center justify-center transition-all transform active:scale-90 min-w-0
                                                    ${active
                                                        ? 'bg-green-100 text-green-600 shadow-sm shadow-green-500/10'
                                                        : 'bg-red-50 text-red-300 hover:bg-red-100 hover:text-red-400'}`}
                                            >
                                                {active ? <Check size={20} /> : <X size={20} />}
                                            </Button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </MaterialCard>
    );
};

export default PermissionsMatrix;
