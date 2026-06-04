import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Check, X, Save, RefreshCw, Search, Eye, Edit3 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { MaterialCard, Title, Text, Button, Badge, Input, Select } from '../atoms';
import { useNotifications } from '../notifications/NotificationsContext';
import { useUserAdmin, Role } from '../../pages/UserAdmin/hooks/useUserAdmin';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { DataTable, DataTableColumn } from '../molecules/DataTable';

interface Permiso {
    rol: string;
    modulo: string;
    permitido: boolean;
}

interface Modulo {
    id: string;
    label: string;
    category: string;
    descripcion?: string;
}

const CATEGORIES = {
    portal: 'Módulos del Portal',
    analistas: 'Operaciones Técnicas (Analistas)',
    panel: 'Panel de Control Avanzado'
};

const PermissionsMatrix: React.FC = () => {
    const { get, post } = useApi<unknown>();
    const { addNotification } = useNotifications();
    const { roles: dynamicRoles } = useUserAdmin();
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [dynamicModulos, setDynamicModulos] = useState<Modulo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');

    const roles = useMemo(() => {
        return dynamicRoles.length > 0
            ? dynamicRoles.map((r: Role) => r.id)
            : ['admin', 'admin_sistemas', 'manager', 'analyst', 'director', 'viaticante', 'usuario'];
    }, [dynamicRoles]);

    // Asegurar que selectedRoleId sea válido cuando carguen los roles
    useEffect(() => {
        if (dynamicRoles.length > 0 && !roles.includes(selectedRoleId)) {
            setSelectedRoleId(roles[0]);
        }
    }, [dynamicRoles, roles, selectedRoleId]);

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [permisosData, modulosData] = await Promise.all([
                get('/auth/permisos'),
                get('/config/modulos')
            ]);

            if (permisosData) setPermisos(permisosData as Permiso[]);
            if (modulosData) {
                const normalizedModulos = (modulosData as { id: string; nombre: string; categoria: string; descripcion?: string }[]).map((m) => ({
                    id: m.id,
                    label: m.nombre,
                    category: m.categoria,
                    descripcion: m.descripcion
                }));
                setDynamicModulos(normalizedModulos);
            }
        } catch {
            addNotification('error', 'Error al cargar matriz de permisos o catálogo de módulos');
        } finally {
            setIsLoading(false);
        }
    }, [get, addNotification]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

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
        } catch {
            addNotification('error', 'Error al guardar permisos');
        } finally {
            setIsSaving(false);
        }
    };

    const isPermitted = useCallback((rol: string, modulo: string) => {
        return permisos.find(p => p.rol === rol && p.modulo === modulo)?.permitido || false;
    }, [permisos]);

    // Búsqueda rápida por texto
    const textFilteredModulos = useMemo(() => {
        return dynamicModulos.filter((m: Modulo) =>
            m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [dynamicModulos, searchTerm]);

    // Accessors de filtrado por columna
    const columnAccessors = useMemo(() => ({
        category: (m: Modulo) => CATEGORIES[m.category as keyof typeof CATEGORIES] || m.category,
        id: (m: Modulo) => m.id,
        label: (m: Modulo) => m.label,
        permitido: (m: Modulo) => isPermitted(selectedRoleId, m.id) ? 'Permitido' : 'Restringido'
    }), [selectedRoleId, isPermitted]);

    // Aplicar useColumnFilters
    const {
        filters: columnFilters,
        filteredData: finalFilteredModulos,
        cascadingOptions,
        setColumnFilter,
        sortState,
        setSort,
        activeFilterCount,
        clearAllFilters
    } = useColumnFilters(textFilteredModulos, columnAccessors, 'permissions_matrix_table');

    const columns: DataTableColumn<Modulo>[] = [
        {
            key: 'category',
            label: 'Categoría',
            minWidth: '180px',
            filterable: true,
            render: (row) => (
                <Text variant="caption" weight="bold" color="secondary" className="uppercase tracking-wider text-[10px]">
                    {CATEGORIES[row.category as keyof typeof CATEGORIES] || row.category}
                </Text>
            )
        },
        {
            key: 'id',
            label: 'Identificador',
            minWidth: '150px',
            filterable: true,
            render: (row) => (
                <Text as="span" variant="caption" className="font-mono text-neutral-500 dark:text-neutral-400 text-[10px]">
                    {row.id}
                </Text>
            )
        },
        {
            key: 'label',
            label: 'Nombre de Módulo',
            minWidth: '110px',
            maxWidth: '140px',
            filterable: true,
            render: (row) => (
                <Text weight="bold" variant="body2" className="text-gray-900 dark:text-gray-100 truncate">
                    {row.label}
                </Text>
            )
        },
        {
            key: 'descripcion',
            label: 'Descripción',
            minWidth: '90px',
            maxWidth: '120px',
            filterable: false,
            render: (row) => (
                <Text variant="caption" color="text-secondary" className="line-clamp-2 max-w-[120px]">
                    {row.descripcion || 'Sin descripción disponible.'}
                </Text>
            )
        },
        {
            key: 'permitido',
            label: `Acceso para ${(dynamicRoles.find(r => r.id === selectedRoleId)?.nombre || selectedRoleId).toUpperCase()}`,
            minWidth: '160px',
            centered: true,
            filterable: true,
            render: (row) => {
                const permitted = isPermitted(selectedRoleId, row.id);
                return (
                    <Button
                        variant="ghost"
                        disabled={!isEditMode}
                        onClick={() => togglePermiso(selectedRoleId, row.id)}
                        className={`w-9 h-9 !rounded-xl flex items-center justify-center mx-auto transition-all duration-300 transform
                            ${!isEditMode ? 'cursor-default opacity-85' : 'hover:scale-105 active:scale-95 shadow-sm'}
                            ${permitted
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/10 text-red-300 dark:text-red-800 border border-transparent'}`}
                        icon={permitted ? Check : X}
                    />
                );
            }
        }
    ];

    if (isLoading) return (
        <MaterialCard className="p-20 text-center animate-pulse border-2 border-[var(--color-border)] rounded-3xl bg-[var(--color-surface)]">
            <RefreshCw className="animate-spin mx-auto mb-4 text-[var(--color-primary)]" size={32} />
            <Text weight="bold">Sincronizando Matriz de Seguridad...</Text>
        </MaterialCard>
    );

    return (
        <MaterialCard className="p-0 overflow-hidden border-2 border-[var(--color-border)] shadow-xl animate-in fade-in duration-500 rounded-3xl bg-[var(--color-surface)]">
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

                    <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap lg:flex-nowrap">
                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="!rounded-xl h-[38px] px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold border border-red-200 dark:border-red-900/30 transition-all flex items-center gap-1.5"
                                icon={X}
                            >
                                Limpiar Filtros ({activeFilterCount})
                            </Button>
                        )}

                        <div className="relative flex-1 lg:w-64">
                            <Input
                                placeholder="Buscar módulo..."
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
                            className={`!rounded-xl px-4 transition-all h-[38px] ${isEditMode ? 'shadow-md shadow-primary-500/20' : 'bg-white dark:bg-neutral-800'}`}
                        >
                            {isEditMode ? 'Editando' : 'Modo Lectura'}
                        </Button>

                        {isEditMode && (
                            <Button
                                variant="primary"
                                icon={Save}
                                loading={isSaving}
                                onClick={handleSave}
                                className="!rounded-xl px-6 bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20 h-[38px]"
                            >
                                Guardar
                            </Button>
                        )}
                    </div>
                </div>

                {isEditMode && (
                    <div className="mt-4 p-3 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10 flex items-center justify-between flex-wrap gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2">
                            <Text variant="caption" weight="bold" color="primary">Acciones Rápidas para el Rol:</Text>
                            <Badge variant="primary" size="sm" className="uppercase font-mono">
                                {dynamicRoles.find(r => r.id === selectedRoleId)?.nombre || selectedRoleId}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => toggleAllForRole(selectedRoleId, true)}
                                className="!rounded-xl px-3 bg-green-50 text-green-600 border border-green-200"
                                icon={Check}
                            >
                                Activar Todo para este Rol
                            </Button>
                            <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => toggleAllForRole(selectedRoleId, false)}
                                className="!rounded-xl px-3 bg-red-50 text-red-600 border border-red-200"
                                icon={X}
                            >
                                Desactivar Todo
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Matrix Table with DataTable */}
            <DataTable<Modulo>
                columns={columns}
                data={finalFilteredModulos}
                keyExtractor={(row) => row.id}
                columnFilters={columnFilters}
                columnOptions={cascadingOptions}
                onFilterChange={setColumnFilter}
                activeSortKey={sortState?.key ?? null}
                activeSortDir={sortState?.dir ?? null}
                onSort={setSort}
                isLoading={false}
                maxHeight="max-h-[60vh]"
                className="border-none shadow-none"
                rowIndicatorColor="bg-[var(--color-primary)]"
                showRowIndicator={true}
                renderRowActions={isEditMode ? (row) => (
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleAllForModule(row.id, true)}
                            className="px-2 py-1 bg-green-50 text-green-600 text-[9px] font-bold rounded-lg border border-green-100"
                        >
                            Todo
                        </Button>
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleAllForModule(row.id, false)}
                            className="px-2 py-1 bg-red-50 text-red-600 text-[9px] font-bold rounded-lg border border-red-100"
                        >
                            Nada
                        </Button>
                    </div>
                ) : undefined}
                actionsMinWidth="120px"
                emptyMessage="No se encontraron módulos con el criterio especificado"
                emptyIcon={
                    <div className="p-4 rounded-full bg-[var(--color-surface-variant)] text-neutral-400">
                        <Shield size={32} />
                    </div>
                }
            />

            {/* Footer Legend */}
            <div className="p-4 bg-[var(--color-surface-variant)]/50 border-t border-[var(--color-border)] flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                        <Text variant="caption" weight="bold">Acceso Permitido</Text>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
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
