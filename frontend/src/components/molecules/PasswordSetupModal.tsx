import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button, Input, Title, Text, MaterialCard } from '../atoms';
import { API_CONFIG } from '../../config/api';

interface PasswordSetupModalProps {
    cedula: string;
    onComplete: (contrasena: string) => void;
    onCancel: () => void;
}

const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({ cedula, onComplete, onCancel }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/setup-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula, contrasena: password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error al configurar la contraseña');
            }

            onComplete(password);
        } catch (err: any) {
            setError(err.message || 'Error de conexión con el servidor');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <MaterialCard elevation={5} className="w-full max-w-md p-8 !rounded-[2.5rem] border-2 border-[var(--color-primary)]/20 shadow-2xl shadow-[var(--color-primary)]/10 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <ShieldCheck size={40} />
                    </div>
                    <Title variant="h4" weight="bold" color="text-primary">
                        Configura tu Contraseña
                    </Title>
                    <div className="mt-4 p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10">
                        <Text variant="body2" className="text-[var(--color-text-primary)]/80">
                            Es la primera vez que accedes o tu contraseña aún no ha sido configurada.
                            Establece una contraseña personal para continuar.
                        </Text>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        type="password"
                        label="Nueva Contraseña"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        icon={Lock}
                        required
                        size="lg"
                        autoComplete="new-password"
                    />
                    <Input
                        type="password"
                        label="Confirmar Contraseña"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        icon={Lock}
                        required
                        size="lg"
                        autoComplete="new-password"
                    />

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3">
                            <Text variant="caption" weight="medium" className="text-red-700 dark:text-red-400">
                                {error}
                            </Text>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full !rounded-2xl h-14 shadow-xl"
                        loading={isLoading}
                        icon={ShieldCheck}
                    >
                        Configurar y Acceder
                    </Button>

                    <div className="text-center pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            className="text-sm text-[var(--color-text-secondary)]"
                        >
                            Volver al inicio de sesión
                        </Button>
                    </div>
                </form>
            </MaterialCard>
        </div>
    );
};

export default PasswordSetupModal;
