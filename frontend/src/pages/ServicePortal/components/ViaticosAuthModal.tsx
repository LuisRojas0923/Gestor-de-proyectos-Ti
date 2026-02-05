import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowRight, UserCheck, ArrowLeft } from 'lucide-react';
import { Button, Input, Title, Text, MaterialCard } from '../../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';

interface ViaticosAuthModalProps {
    cedula: string;
    onVerified: (nombre: string) => void;
    onBack: () => void;
}

const ViaticosAuthModal: React.FC<ViaticosAuthModalProps> = ({ cedula, onVerified, onBack }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'checking' | 'setup' | 'verify'>('checking');

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get(`${API_CONFIG.BASE_URL}/auth/viaticos/status/${cedula}`);
                if (res.data.registrado) {
                    setStep('verify');
                } else {
                    setStep('setup');
                }
            } catch (err) {
                console.error("Error checking auth status:", err);
                setError("Error de conexión con el servidor de seguridad.");
            }
        };
        checkStatus();
    }, [cedula]);

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (step === 'setup') {
                if (password.length < 4) {
                    setError("La contraseña debe tener al menos 4 caracteres.");
                    setIsLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError("Las contraseñas no coinciden.");
                    setIsLoading(false);
                    return;
                }

                const res = await axios.post(`${API_CONFIG.BASE_URL}/auth/viaticos/configurar`, {
                    cedula,
                    contrasena: password
                });
                onVerified(res.data.usuario);
            } else {
                const res = await axios.post(`${API_CONFIG.BASE_URL}/auth/viaticos/verificar`, {
                    cedula,
                    contrasena: password
                });
                onVerified(res.data.nombre);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Acceso denegado. Verifica tu contraseña.");
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'checking') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--deep-navy)]/80 backdrop-blur-sm p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--deep-navy)]/90 backdrop-blur-md p-4">
            <MaterialCard elevation={5} className="w-full max-w-md p-8 !rounded-[2rem] border border-white/10 bg-[var(--color-surface)] shadow-2xl relative overflow-hidden">
                {/* Botón Volver */}
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute top-6 left-6 !p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                    icon={ArrowLeft}
                />

                {/* Decoración Marina */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>

                <div className="text-center mb-8 relative pt-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${step === 'setup' ? 'bg-green-500/20 text-green-600' : 'bg-blue-600/20 text-blue-600'}`}>
                        {step === 'setup' ? <ShieldCheck size={32} /> : <Lock size={32} />}
                    </div>
                    <Title variant="h4" weight="bold" className="mb-2">
                        {step === 'setup' ? 'Primer Acceso Seguro' : 'Verificación de Identidad'}
                    </Title>
                    <Text className="opacity-70">
                        {step === 'setup'
                            ? 'Hemos detectado que no tienes una contraseña de viáticos. Configúrala ahora para proteger tus reportes.'
                            : 'Ingresa tu contraseña personal para acceder a la gestión de tus viáticos.'}
                    </Text>
                </div>

                <form onSubmit={handleAction} className="space-y-5 relative">
                    <div className="relative group">
                        <Input
                            type="password"
                            label="Contraseña"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            icon={Lock}
                            required
                            size="lg"
                            className="bg-transparent"
                            autoComplete={step === 'setup' ? "new-password" : "current-password"}
                        />
                    </div>

                    {step === 'setup' && (
                        <div className="relative group">
                            <Input
                                type="password"
                                label="Confirmar Contraseña"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                icon={UserCheck}
                                required
                                size="lg"
                                className="bg-transparent"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 text-sm font-bold animate-shake">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full h-14 rounded-2xl font-black text-lg shadow-xl"
                        loading={isLoading}
                        icon={step === 'setup' ? ShieldCheck : ArrowRight}
                    >
                        {step === 'setup' ? 'CONFIGURAR Y ENTRAR' : 'VERIFICAR IDENTIDAD'}
                    </Button>

                    <div className="text-center pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                        <Text variant="caption" className="opacity-50">
                            Cédula activa: <Text as="span" weight="bold">{cedula}</Text>
                        </Text>
                    </div>
                </form>
            </MaterialCard>
        </div>
    );
};

export default ViaticosAuthModal;
