import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Save, RefreshCw, Search, Eye, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { MaterialCard, Title, Text, Button, Badge, Input, Select } from '../atoms';
import { useNotifications } from '../notifications/NotificationsContext';
import { useUserAdmin, Role } from '../../pages/UserAdmin/hooks/useUserAdmin';

interface Permiso {
    rol: string;
    modulo: string;
    permitido: boolean;
}

interface Modulo {
    id: string;
    label: string;
    category: string;
}

const CATEGORIES = {
    portal: 'Módulos del Portal',
    analistas: 'Operaciones Técnicas (Analistas)',
    panel: 'Panel de Control Avanzado'
};

const PermissionsMatrix: React.FC = () => {
    const { get, post } = useApi<any>();
    const { addNotification } = useNotifications();
    const { roles: dynamicRoles } = useUserAdmin();
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [dynamicModulos, setDynamicModulos] = useState<Modulo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(CATEGORIES));

    const roles = dynamicRoles.length > 0
        ? dynamicRoles.map((r: Role) => r.id)
        : ['admin', 'admin_sistemas', 'manager', 'analyst', 'director', 'viaticante', 'usuario'];

    // Asegurar que selectedRoleId sea válido cuando carguen los roles
    useEffect(() => {
        if (dynamicRoles.length > 0 && !roles.includes(selectedRoleId)) {
            setSelectedRoleId(roles[0]);
        }
    }, [dynamicRoles, roles, selectedRoleId]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // Cargar permisos y módulos en paralelo
            const [permisosData, modulosData] = await Promise.all([
                get('/auth/permisos'),
                get('/config/modulos')
            ]);

            if (permisosData) setPermisos(permisosData);
            if (modulosData) {
                // Adaptar el formato del backend (id, nombre, categoria) al frontend (id, label, category)
                const normalizedModulos = modulosData.map((m: any) => ({
                    id: m.id,
                    label: m.nombre,
                    category: m.categoria
                }));
                setDynamicModulos(normalizedModulos);
            }
        } catch (error) {
            addNotification('error', 'Error al cargar matriz de permisos o catálogo de módulos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const togglePermiso = (rol: string, modulo: string) => {
        if (!isEditMode) return;
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

    const toggleAllForRole = (rol: string, val: boolean) => {
        if (!isEditMode) return;
        const updatedPermisos = [...permisos];
        dynamicModulos.forEach((mod: Modulo) => {
            const idx = updatedPermisos.findIndex(p => p.rol === rol && p.modulo === mod.id);
            if (idx >= 0) {
                updatedPermisos[idx].permitido = val;
            } else if (val) {
                updatedPermisos.push({ rol, modulo: mod.id, permitido: true });
            }
        });
        setPermisos(updatedPermisos);
    };

    const toggleAllForModule = (modulo: string, val: boolean) => {
        if (!isEditMode) return;
        const updatedPermisos = [...permisos];
        roles.forEach(rol => {
            const idx = updatedPermisos.findIndex(p => p.rol === rol && p.modulo === modulo);
            if (idx >= 0) {
                updatedPermisos[idx].permitido = val;
            } else if (val) {
                updatedPermisos.push({ rol, modulo, permitido: true });
            }
        });
        setPermisos(updatedPermisos);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await post('/auth/permisos', permisos);
            addNotification('success', 'Matriz de seguridad actualizada globalmente');
            setIsEditMode(false);
            fetchInitialData();
        } catch (error) {
            addNotification('error', 'Error al guardar permisos');
        } finally {
            setIsSaving(false);
        }
    };

    const isPermitted = (rol: string, modulo: string) => {
        return permisos.find(p => p.rol === rol && p.modulo === modulo)?.permitido || false;
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const filteredModulos = dynamicModulos.filter((m: Modulo) =>
        m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return (
        <MaterialCard className="p-20 text-center animate-pulse">
            <RefreshCw className="animate-spin mx-auto mb-4 text-[var(--color-primary)]" size={32} />
            <Text weight="bold">Sincronizando Matriz de Seguridad...</Text>
        </MaterialCard>
    );

    return (
        <MaterialCard className="p-0 overflow-hidden border-2 border-[var(--color-border)] shadow-xl animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/30">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-[var(--color-primary)] text-white">
                                <Shield size={20} />
                            </div>
                            <Title variant="h4" weight="bold">Matriz de Control de Accesos</Title>
                        </div>
                        <Text variant="body2" color="text-secondary">
                            Define la visibilidad de módulos por rol. Usa el <Text as="span" weight="bold">Modo Edición</Text> para realizar cambios.
                        </Text>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <Input
                                placeholder="Buscar módulo..."
                                value={searchTerm}
                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                icon={Search}
                                className="!rounded-xl border-none shadow-sm ring-1 ring-[var(--color-border)]"
                            />
                        </div>

                        <div className="w-full lg:w-48">
                            <Select
                                options={dynamicRoles.map(r => ({ value: r.id, label: r.nombre.toUpperCase() }))}
                                value={selectedRoleId}
                                onChange={(e) => setSelectedRoleId(e.target.value)}
                                size="sm"
                                disabled={isSaving}
                                className="!rounded-xl shadow-sm"
                            />
                        </div>

                        <Button
                            variant={isEditMode ? 'primary' : 'ghost'}
                            onClick={() => setIsEditMode(!isEditMode)}
                            icon={isEditMode ? Edit3 : Eye}
                            className={`!rounded-xl px-4 transition-all ${isEditMode ? 'shadow-md shadow-primary-500/20' : 'bg-white dark:bg-neutral-800'}`}
                        >
                            {isEditMode ? 'Editando' : 'Modo Lectura'}
                        </Button>

                        {isEditMode && (
                            <Button
                                variant="primary"
                                icon={Save}
                                loading={isSaving}
                                onClick={handleSave}
                                className="!rounded-xl px-6 bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20"
                            >
                                Guardar
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto custom-scrollbar max-h-[70vh]">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 z-20 bg-[var(--color-surface)] shadow-sm">
                        <tr>
                            <th className="p-5 border-b border-[var(--color-border)] min-w-[250px]">
                                <Text weight="bold" variant="caption" className="uppercase opacity-50 tracking-widest text-[10px]">Estructura de Módulos</Text>
                            </th>
                            <th className="p-5 border-b border-[var(--color-border)] text-center group bg-[var(--color-primary)]/5">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-[var(--color-primary)]" />
                                        <Badge variant="primary" size="sm" className="uppercase tracking-widest px-4 py-1.5 font-black shadow-sm">
                                            {dynamicRoles.find(r => r.id === selectedRoleId)?.nombre || selectedRoleId}
                                        </Badge>
                                    </div>
                                    {isEditMode && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => toggleAllForRole(selectedRoleId, true)}
                                                className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                                                icon={Check}
                                            >
                                                ACTIVAR TODO
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => toggleAllForRole(selectedRoleId, false)}
                                                className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                                                icon={X}
                                            >
                                                DESACTIVAR TODO
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(CATEGORIES).map(([catId, catLabel]) => {
                            const catModulos = filteredModulos.filter((m: Modulo) => m.category === catId);
                            if (catModulos.length === 0) return null;
                            const isExpanded = expandedCategories.includes(catId);

                            return (
                                <React.Fragment key={catId}>
                                    <tr className="bg-gray-50/50 dark:bg-neutral-900/50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleCategory(catId)}>
                                        <td colSpan={2} className="px-5 py-3 border-b border-[var(--color-border)]">
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                <Text weight="bold" variant="body2" className="text-[var(--color-primary)] uppercase tracking-wide text-[11px] font-black flex items-center">
                                                    {catLabel}
                                                    <Text as="span" variant="caption" className="ml-2 font-normal lowercase opacity-50 italic">
                                                        ({catModulos.length} módulos)
                                                    </Text>
                                                </Text>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && catModulos.map((mod: Modulo) => (
                                        <tr key={mod.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                            <td className="p-5 border-b border-[var(--color-border)]/50 pl-10 border-r border-[var(--color-border)]/10">
                                                <div className="flex justify-between items-center pr-2">
                                                    <div>
                                                        <Text weight="bold" variant="body2" className="group-hover:text-[var(--color-primary)] transition-colors">{mod.label}</Text>
                                                        <Text variant="caption" color="text-secondary" className="block text-[10px] font-mono opacity-60">{mod.id}</Text>
                                                    </div>
                                                    {isEditMode && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-12 group-hover:translate-x-0">
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                onClick={() => toggleAllForModule(mod.id, true)}
                                                                className="px-2 py-1 bg-green-50 text-green-600 text-[9px] font-bold rounded-lg border border-green-100"
                                                            >
                                                                TODO
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                onClick={() => toggleAllForModule(mod.id, false)}
                                                                className="px-2 py-1 bg-red-50 text-red-600 text-[9px] font-bold rounded-lg border border-red-100"
                                                            >
                                                                NADA
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-[var(--color-border)]/50 text-center bg-[var(--color-primary)]/5 transition-colors">
                                                <Button
                                                    variant="ghost"
                                                    disabled={!isEditMode}
                                                    onClick={() => togglePermiso(selectedRoleId, mod.id)}
                                                    className={`w-10 h-10 !rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 transform
                                                        ${!isEditMode ? 'cursor-default opacity-80' : 'hover:scale-110 active:scale-95 shadow-sm'}
                                                        ${isPermitted(selectedRoleId, mod.id)
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                                                            : 'bg-red-50 dark:bg-red-900/10 text-red-300 dark:text-red-800 hover:text-red-500 border border-transparent blur-[0.2px]'}`}
                                                    icon={isPermitted(selectedRoleId, mod.id) ? Check : X}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Legend */}
            <div className="p-4 bg-[var(--color-surface-variant)]/50 border-t border-[var(--color-border)] flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                        <Text variant="caption" weight="bold">Acceso Permitido</Text>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-300"></div>
                        <Text variant="caption" weight="bold" color="text-secondary">Acceso Restringido</Text>
                    </div>
                </div>
                <Text variant="caption" color="text-secondary" className="italic">
                    Cambios sincronizados con el middleware de seguridad RBAC
                </Text>
            </div>
        </MaterialCard>
    );
};

export default PermissionsMatrix;
