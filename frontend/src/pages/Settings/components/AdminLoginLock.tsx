import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button } from '../../../components/atoms';
import { useApi } from '../../../hooks/useApi';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

interface AdminLoginLockProps {
    onUnlock: (password: string) => void;
    onClose: () => void;
    isOpen: boolean;
}

const AdminLoginLock: React.FC<AdminLoginLockProps> = ({ onUnlock, onClose, isOpen }) => {
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const { post } = useApi();
    const { addNotification } = useNotifications();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        try {
            const response = await post('/config/verify-admin', { password });
            if (response.success) {
                addNotification('success', 'Identidad verificada correctamente');
                onUnlock(password);
                setPassword('');
            }
        } catch (error: any) {
            addNotification('error', error.response?.data?.detail || 'Error de verificación');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
                <MaterialCard className="p-8 shadow-2xl border-2 border-[var(--color-primary)]/20">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-4 ring-8 ring-[var(--color-primary)]/5">
                            <Lock size={32} />
                        </div>
                        <Title variant="h4" weight="black" className="mb-2">Zona Restringida</Title>
                        <Text color="text-secondary">Se requiere re-autenticación de administrador para acceder al Panel Maestro de Módulos.</Text>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            type="password"
                            label="Contraseña de Administrador"
                            placeholder="Ingrese su contraseña"
                            value={password}
                            onChange={(e: any) => setPassword(e.target.value)}
                            icon={ShieldAlert}
                            required
                            autoFocus
                        />

                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex gap-3">
                            <AlertCircle className="text-amber-600 shrink-0" size={18} />
                            <Text variant="caption" className="text-amber-700 dark:text-amber-400">
                                Esta acción desbloqueará controles globales que afectan a todos los usuarios del sistema.
                            </Text>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={isVerifying}
                            icon={CheckCircle2}
                            className="!rounded-xl py-3 shadow-lg shadow-primary-500/30"
                        >
                            Verificar Identidad
                        </Button>
                    </form>
                </MaterialCard>
            </div>
        </div>
    );
};

export default AdminLoginLock;
