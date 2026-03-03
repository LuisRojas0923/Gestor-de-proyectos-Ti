import React, { useState, useEffect } from 'react';
import { Power, Box, Users, Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import { Title, Text, MaterialCard, Button, Switch, Badge } from '../../../components/atoms';
import { useApi } from '../../../hooks/useApi';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

interface Module {
    id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    esta_activo: boolean;
    es_critico: boolean;
}

interface ModuleMasterPanelProps {
    adminPassword: string;
    onClose: () => void;
}

const ModuleMasterPanel: React.FC<ModuleMasterPanelProps> = ({ adminPassword, onClose }) => {
    const { get, patch, post } = useApi();
    const { addNotification } = useNotifications();
    const [modules, setModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null);

    const fetchModules = async () => {
        setIsLoading(true);
        try {
            const data = await get('/config/modulos') as Module[];
            if (data && data.length === 0) {
                // Si no hay módulos, sugerir inicialización
                await post('/config/init-modulos', {});
                const newData = await get('/config/modulos') as Module[];
                setModules(newData || []);
            } else {
                setModules(data || []);
            }
        } catch (error) {
            addNotification('error', 'No se pudieron cargar los módulos del sistema');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchModules();
    }, []);

    const handleToggle = async (module: Module) => {
        setIsActionInProgress(module.id);
        const newState = !module.esta_activo;

        try {
            await patch(`/config/modulos/${module.id}`, {
                esta_activo: newState,
                password_verificacion: adminPassword
            });

            setModules(modules.map(m =>
                m.id === module.id ? { ...m, esta_activo: newState } : m
            ));

            addNotification('success', `Módulo "${module.nombre}" ${newState ? 'activado' : 'desactivado'} globalmente`);
        } catch (error: any) {
            addNotification('error', error.response?.data?.detail || 'Error al actualizar módulo');
        } finally {
            setIsActionInProgress(null);
        }
    };

    const categories = {
        portal: { label: 'Portal de Usuarios', icon: Box, color: 'blue' },
        analistas: { label: 'Módulos para Analistas', icon: Users, color: 'indigo' },
        panel: { label: 'Panel de Control / Administrativo', icon: Shield, color: 'purple' }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-pulse">
                <RefreshCw className="animate-spin mb-4 text-[var(--color-primary)]" size={40} />
                <Text weight="bold">Cargando estado global del sistema...</Text>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Power className="text-red-500" size={20} />
                        <Title variant="h4" weight="black">Interruptor Maestro</Title>
                    </div>
                    <Text color="text-secondary">Control de disponibilidad de módulos en tiempo real.</Text>
                </div>
                <Button variant="ghost" onClick={onClose} className="!rounded-xl">Cerrar Panel</Button>
            </div>

            <div className="space-y-8">
                {Object.entries(categories).map(([catId, catInfo]) => {
                    const catModules = modules.filter(m => m.categoria === catId);
                    if (catModules.length === 0) return null;

                    return (
                        <div key={catId} className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <catInfo.icon className={`text-${catInfo.color}-500`} size={18} />
                                <Text weight="bold" variant="subtitle2" className="uppercase tracking-widest text-[11px] opacity-60">
                                    {catInfo.label}
                                </Text>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {catModules.map(module => (
                                    <MaterialCard key={module.id} className={`p-5 transition-all duration-300 border-2 ${module.esta_activo ? 'border-transparent' : 'border-red-500/20 bg-red-50/10 grayscale-[0.5]'}`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Text weight="bold" variant="body1">{module.nombre}</Text>
                                                    {module.es_critico && (
                                                        <Badge variant="error" size="sm" className="text-[8px] uppercase ring-1 ring-red-500/10">Crítico</Badge>
                                                    )}
                                                </div>
                                                <Text variant="caption" color="text-secondary" className="line-clamp-2">
                                                    {module.descripcion || 'Sin descripción disponible para este módulo empresarial.'}
                                                </Text>
                                            </div>
                                            <Switch
                                                checked={module.esta_activo}
                                                onChange={() => handleToggle(module)}
                                                disabled={isActionInProgress === module.id}
                                            />
                                        </div>
                                    </MaterialCard>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-12 p-6 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 flex flex-col md:flex-row items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                    <Text weight="bold" variant="body2" className="mb-1">Advertencia de Impacto Global</Text>
                    <Text variant="caption" color="text-secondary">
                        Desactivar un módulo impedirá que cualquier usuario acceda a él, incluso si tiene permisos asignados en la Matriz RBAC. Los cambios se sincronizan en tiempo real con el middleware de seguridad.
                    </Text>
                </div>
                <Button variant="outline" size="sm" onClick={fetchModules} icon={RefreshCw} className="!rounded-xl shrink-0">
                    Sincronizar
                </Button>
            </div>
        </div>
    );
};

export default ModuleMasterPanel;
