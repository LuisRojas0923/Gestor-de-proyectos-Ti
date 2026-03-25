import React, { useState } from 'react';
import { Shield, Plus, Trash2, Info } from 'lucide-react';
import {
    MaterialCard,
    Title,
    Text,
    Button,
    Input,
    Badge,
    Textarea
} from '../../../components/atoms';
import { useUserAdmin, Role } from '../hooks/useUserAdmin';

const RoleManager: React.FC = () => {
    const { roles, handleCreateRole, handleDeleteRole, isSaving } = useUserAdmin();
    const [newRole, setNewRole] = useState({ id: '', nombre: '', descripcion: '' });

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleCreateRole(newRole);
        if (success) {
            setNewRole({ id: '', nombre: '', descripcion: '' });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Formulario de Creación */}
            <div className="lg:col-span-1">
                <MaterialCard className="p-8 border-2 border-[var(--color-primary)]/20 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Shield size={80} />
                    </div>

                    <Title variant="h5" weight="bold" className="mb-6 flex items-center">
                        <Plus className="mr-2 text-[var(--color-primary)]" />
                        Nuevo Rol
                    </Title>

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Text variant="caption" weight="bold" className="uppercase opacity-60">Identificador (ID)</Text>
                            <Input
                                placeholder="ej: auditor_externo"
                                value={newRole.id}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRole({ ...newRole, id: e.target.value })}
                                required
                                className="!rounded-2xl"
                            />
                            <Text variant="caption" color="text-secondary" className="italic">
                                Sin espacios, se usará para lógica interna.
                            </Text>
                        </div>

                        <div className="space-y-2">
                            <Text variant="caption" weight="bold" className="uppercase opacity-60">Nombre Visible</Text>
                            <Input
                                placeholder="ej: Auditor Externo"
                                value={newRole.nombre}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRole({ ...newRole, nombre: e.target.value })}
                                required
                                className="!rounded-2xl"
                            />
                        </div>

                            <Textarea
                                label="Descripción"
                                placeholder="Describa el propósito de este rol..."
                                value={newRole.descripcion}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewRole({ ...newRole, descripcion: e.target.value })}
                                className="!rounded-2xl"
                                rows={3}
                            />

                        <Button
                            variant="primary"
                            type="submit"
                            className="w-full !rounded-2xl shadow-lg ring-offset-2 focus:ring-2 h-12"
                            loading={isSaving}
                            disabled={!newRole.id || !newRole.nombre}
                        >
                            Crear Rol del Sistema
                        </Button>
                    </form>
                </MaterialCard>
            </div>

            {/* Lista de Roles */}
            <div className="lg:col-span-2">
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="primary" className="!rounded-lg px-3 py-1">{roles.length}</Badge>
                            <Text weight="bold" variant="h6">Roles Definidos</Text>
                        </div>
                        <Text variant="caption" color="text-secondary" className="flex items-center">
                            <Info size={14} className="mr-1" /> Los roles de sistema no se pueden eliminar.
                        </Text>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map((role: Role) => (
                            <MaterialCard key={role.id} className="p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Text weight="bold" className="font-mono text-sm uppercase tracking-wider text-[var(--color-primary)]">
                                                {role.id}
                                            </Text>
                                            {role.es_sistema && (
                                                <Badge variant="primary" className="text-[9px] uppercase !rounded-md h-5 opacity-70">Sistema</Badge>
                                            )}
                                        </div>
                                        <Text weight="bold" variant="body1">{role.nombre}</Text>
                                    </div>
                                    {!role.es_sistema && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity !p-2"
                                            onClick={() => {
                                                if (confirm(`¿Está seguro de eliminar el rol "${role.nombre}"? Esto afectará a los usuarios asignados.`)) {
                                                    handleDeleteRole(role.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    )}
                                </div>
                                <Text variant="body2" color="text-secondary" className="line-clamp-2 text-xs opacity-70 italic">
                                    {role.descripcion || 'Sin descripción definida.'}
                                </Text>
                            </MaterialCard>
                        ))}
                    </div>

                    {roles.length === 0 && (
                        <div className="p-20 text-center border-2 border-dashed border-[var(--color-border)] rounded-[3rem] opacity-30">
                            <Shield size={48} className="mx-auto mb-4" />
                            <Text weight="bold">Cargando roles del sistema...</Text>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoleManager;
