import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Input, Button, Title, Text, MaterialCard } from '../../components/atoms';
import { API_CONFIG } from '../../config/api';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Token de recuperación ausente. Por favor, solicite un nuevo enlace.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nueva_contrasena: password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error al restablecer la contraseña');
            }

            setIsSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 5000);
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50 dark:bg-neutral-950">
            {/* Background pattern similar to Login */}
            <div className="absolute inset-0 bg-main-wallpaper opacity-10" />
            
            <MaterialCard
                elevation={5}
                className="w-full max-w-md p-8 transform transition-all !rounded-[2.5rem] relative z-10"
            >
                {isSuccess ? (
                    <div className="text-center py-4">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/10">
                            <CheckCircle2 size={40} />
                        </div>
                        <Title variant="h4" weight="bold" className="mb-4">¡Contraseña Cambiada!</Title>
                        <Text variant="body1" className="text-gray-500 mb-8">
                            Tu contraseña ha sido actualizada correctamente. Serás redirigido al inicio de sesión en unos segundos.
                        </Text>
                        <Link to="/login" className="block">
                            <Button variant="primary" size="lg" className="w-full" icon={ArrowRight}>
                                Ir al Login Ahora
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-blue-600/10 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
                                <Lock size={40} />
                            </div>
                            <Title variant="h4" weight="bold">Nueva Contraseña</Title>
                            <Text variant="body1" className="mt-2 text-gray-500">
                                Establece tu nueva credencial de acceso para continuar
                            </Text>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-start space-x-3">
                                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                                <Text variant="body2" className="text-red-700 dark:text-red-400 font-medium">
                                    {error}
                                </Text>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    label="Nueva Contraseña"
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={Lock}
                                    required
                                    size="lg"
                                    disabled={!token || isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-[32px] text-gray-400 hover:text-gray-600 transition-colors p-1 min-w-0"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </Button>
                            </div>

                            <Input
                                type={showPassword ? "text" : "password"}
                                label="Confirmar Contraseña"
                                placeholder="Repita su nueva contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                icon={Lock}
                                required
                                size="lg"
                                disabled={!token || isLoading}
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full"
                                loading={isLoading}
                                disabled={!token}
                            >
                                Cambiar Contraseña
                            </Button>
                        </form>
                    </>
                )}
            </MaterialCard>
        </div>
    );
};

export default ResetPasswordPage;
