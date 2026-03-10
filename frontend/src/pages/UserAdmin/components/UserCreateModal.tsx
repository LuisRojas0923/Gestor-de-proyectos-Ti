import React, { useState } from 'react';
import { X, UserPlus, Shield, Fingerprint, RefreshCw } from 'lucide-react';
import { MaterialCard, Title, Text, Button, Input } from '../../../components/atoms';

interface UserCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: any) => Promise<boolean>;
    isSaving: boolean;
}

const UserCreateModal: React.FC<UserCreateModalProps> = ({ isOpen, onClose, onSave, isSaving }) => {
    const [cedula, setCedula] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave({ cedula });
        if (success) {
            setCedula('');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <MaterialCard className="p-8 shadow-2xl relative border border-[var(--color-border)]">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="absolute top-6 right-6 !p-2 rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] transition-colors"
                        icon={X}
                    />

                    <div className="mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center mb-4">
                            <RefreshCw size={24} />
                        </div>
                        <Title variant="h4" weight="bold">Sincronizar desde Solid ERP</Title>
                        <Text color="text-secondary">Ingresa la cédula del analista para importar sus datos directamente desde el sistema de nómina.</Text>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                label="Número de Cédula"
                                placeholder="Ej: 1122334455"
                                value={cedula}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCedula(e.target.value)}
                                icon={Fingerprint}
                                required
                            />

                            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                <Text variant="caption" className="text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                    <Shield size={14} className="mt-0.5 shrink-0" />
                                    <Text as="span" color="inherit">Al registrar la cédula, el sistema validará que el empleado esté activo en el ERP y creará su cuenta automáticamente con el rol de analista.</Text>
                                </Text>
                            </div>
                        </div>

                        <div className="pt-6 flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1 !rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={isSaving}
                                className="flex-1 !rounded-xl shadow-lg"
                                icon={UserPlus}
                            >
                                Sincronizar y Crear
                            </Button>
                        </div>
                    </form>
                </MaterialCard>
            </div>
        </div>
    );
};

export default UserCreateModal;
