import React, { useState, useEffect } from 'react';
import { Shield, Briefcase, MapPin, Save, X, Activity } from 'lucide-react';
import { MaterialCard, Title, Text, Button, Switch } from '../../../components/atoms';
import { User, useUserAdmin, Role } from '../hooks/useUserAdmin';
import { especialidadesList, areasList } from '../constants';

interface UserEditorProps {
    user: User;
    onSave: (updatedUser: User) => Promise<boolean>;
    onCancel: () => void;
    isSaving: boolean;
}

const UserEditor: React.FC<UserEditorProps> = ({ user, onSave, onCancel, isSaving }) => {
    const [editedUser, setEditedUser] = useState<User>(user);

    useEffect(() => {
        setEditedUser(user);
    }, [user]);

    const toggleSelection = (id: string, field: 'especialidades' | 'areas_asignadas') => {
        const current = JSON.parse(editedUser[field] || '[]') as string[];
        const updated = current.includes(id)
            ? current.filter(item => item !== id)
            : [...current, id];

        setEditedUser({
            ...editedUser,
            [field]: JSON.stringify(updated)
        });
    };

    const { roles } = useUserAdmin();

    return (
        <MaterialCard className="p-8 sticky top-4 border-2 border-[var(--color-primary)] shadow-xl animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center mb-6">
                <Title variant="h5" weight="bold" className="flex items-center">
                    <Shield className="mr-2 text-[var(--color-primary)]" />
                    Editar Perfil
                </Title>
                <Button variant="ghost" size="sm" onClick={onCancel} className="!p-1">
                    <X size={20} />
                </Button>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${editedUser.esta_activo ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                            <Activity size={18} />
                        </div>
                        <div>
                            <Text variant="body2" weight="bold" color="text-primary">Estado del Usuario</Text>
                            <Text variant="caption" color="text-secondary" className="opacity-60">
                                {editedUser.esta_activo ? 'El usuario puede acceder al sistema' : 'Acceso bloqueado al sistema'}
                            </Text>
                        </div>
                    </div>
                    <Switch
                        checked={editedUser.esta_activo}
                        onChange={(checked) => setEditedUser({ ...editedUser, esta_activo: checked })}
                    />
                </div>

                <div>
                    <Text variant="caption" weight="bold" className="uppercase mb-2 block opacity-70">Rol del Sistema</Text>
                    <div className="grid grid-cols-2 gap-2">
                        {roles.map((role: Role) => (
                            <Button
                                key={role.id}
                                variant={editedUser.rol === role.id ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => setEditedUser({ ...editedUser, rol: role.id })}
                                className={`py-2 px-3 rounded-xl text-[10px] font-bold border-2 transition-all ${editedUser.rol === role.id ? '' : 'border-gray-100 dark:border-neutral-800'
                                    }`}
                            >
                                {role.nombre.toUpperCase()}
                            </Button>
                        ))}
                    </div>
                </div>

                <div>
                    <Text variant="caption" weight="bold" className="uppercase mb-3 flex items-center opacity-70">
                        <Briefcase size={14} className="mr-1" /> Especialidades TI
                    </Text>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {especialidadesList.map(esp => {
                            const isSelected = JSON.parse(editedUser.especialidades || '[]').includes(esp.id);
                            return (
                                <Button
                                    key={esp.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSelection(esp.id, 'especialidades')}
                                    className={`p-2 rounded-xl text-[10px] font-bold text-left border transition-all ${isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                        : 'bg-transparent border-gray-100 dark:border-neutral-800'
                                        }`}
                                >
                                    {esp.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <Text variant="caption" weight="bold" className="uppercase mb-3 flex items-center opacity-70">
                        <MapPin size={14} className="mr-1" /> Áreas Asignadas
                    </Text>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {areasList.map(area => {
                            const isSelected = JSON.parse(editedUser.areas_asignadas || '[]').includes(area);
                            return (
                                <Button
                                    key={area}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSelection(area, 'areas_asignadas')}
                                    className={`px-2 py-1.5 rounded-xl text-[9px] font-bold border transition-all ${isSelected
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                        : 'bg-transparent border-gray-100 dark:border-neutral-800'
                                        }`}
                                >
                                    {area}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <Button
                        variant="primary"
                        className="w-full shadow-lg"
                        icon={Save}
                        onClick={() => onSave(editedUser)}
                        loading={isSaving}
                    >
                        Guardar Cambios
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-gray-500 hover:text-red-500 transition-colors"
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                </div>
            </div>
        </MaterialCard>
    );
};

export default UserEditor;
