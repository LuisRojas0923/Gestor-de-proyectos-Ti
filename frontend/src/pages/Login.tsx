import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, User as UserIcon, UserPlus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { Input, Button, Title, Text, MaterialCard } from '../components/atoms';
import { PasswordSetupModal, Callout } from '../components/molecules';
import imgUserLogin from '../assets/images/categories/Usuario Inicio Sesion.png';
import ForgotPasswordModal from './Login/ForgotPasswordModal';
import RegisterSidebar from './Login/RegisterSidebar';

const Login: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { darkMode } = state;
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [isRegisterSidebarOpen, setIsRegisterSidebarOpen] = useState(false);
    const [setupCedula, setSetupCedula] = useState<string | null>(null);
    const [showNotice, setShowNotice] = useState<boolean>(() => {
        return !localStorage.getItem('portal_login_notice_dismissed');
    });

    const handleDismissNotice = () => {
        localStorage.setItem('portal_login_notice_dismissed', 'true');
        setShowNotice(false);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const performLogin = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 400 && errorData.detail === "Contraseña no configurada") {
                    setSetupCedula(username);
                    return;
                }
                throw new Error(errorData.detail || 'Credenciales inválidas');
            }

            const data = await response.json();

            localStorage.setItem('token', data.access_token);

            const userData = {
                ...data.user,
                id: data.user.id || data.user.cedula,
                cedula: data.user.cedula || data.user.id,
                emailNeedsUpdate: !!data.user.email_needs_update,
                emailVerified: !!data.user.correo_verificado,
                passwordSet: data.user.password_set !== undefined ? !!data.user.password_set : true
            };

            dispatch({ type: 'LOGIN', payload: userData });

            const permissions = userData.permissions || [];
            const isAdminPath = permissions.some((p: string) =>
                ['dashboard', 'control-tower', 'admin_usuarios', 'admin_roles', 'panel_maestro'].includes(p)
            );

            if (isAdminPath) {
                navigate('/');
            } else {
                navigate('/service-portal/inicio');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Usuario o contraseña incorrectos';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.username.length < 5) {
            setError("Identificación inválida");
            return;
        }
        performLogin(formData.username, formData.password);
    };

    const handleSetupComplete = async (contrasena: string) => {
        setSetupCedula(null);
        await performLogin(formData.username, contrasena);
    };

    const handleSetupCancel = () => {
        setSetupCedula(null);
        setError("Configura tu contraseña para poder acceder.");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-main-wallpaper transition-transform duration-1000 scale-105" />
            <div className={`absolute inset-0 transition-colors duration-500 
                ${darkMode ? 'bg-black/60 backdrop-blur-[3px]' : 'bg-white/30 backdrop-blur-[2px]'}
            `} />

            <MaterialCard
                elevation={5}
                className="w-full max-w-md p-8 transform transition-all !rounded-[2.5rem]"
            >

                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <img
                            src={imgUserLogin}
                            alt="Inicio de sesión"
                            className="w-12 h-12 object-contain"
                        />
                    </div>

                    <Title variant="h4" weight="bold" color="text-primary">
                        Portal de Servicios
                    </Title>

                    <Text variant="body1" className="mt-2 text-[var(--color-text-secondary)]" weight="medium">
                        Ingrese sus credenciales para continuar
                    </Text>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {showNotice && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <Callout
                                variant="warning"
                                title="El método de inicio de sesión cambió"
                                onDismiss={handleDismissNotice}
                            >
                                Si no has configurado tu contraseña, ingresa con tu cédula en ambos campos (usuario y contraseña). Luego, el sistema te guiará para configurar una contraseña nueva.
                            </Callout>
                        </div>
                    )}

                    <Input
                        type="text"
                        name="username"
                        label="Número de Identificación"
                        placeholder="Ej: 123456789"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        icon={UserIcon}
                        required
                        size="lg"
                    />

                    <Input
                        type="password"
                        name="password"
                        label="Contraseña"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        icon={Lock}
                        required
                        size="lg"
                    />

                    <div className="flex justify-end !mt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsRecoveryModalOpen(true)}
                            className="text-xs font-semibold text-[var(--color-primary)] hover:opacity-80 p-0 h-auto hover:bg-transparent"
                        >
                            ¿Olvidaste tu contraseña?
                        </Button>
                    </div>

                    {error && (
                        <Callout variant="error" role="alert">
                            {error}
                        </Callout>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={isLoading}
                        icon={LogIn}
                    >
                        Iniciar Sesión
                    </Button>
                </form>

                <div className="mt-8 text-center border-t border-gray-100 dark:border-neutral-800 pt-6">
                    <Button
                        variant="ghost"
                        onClick={() => setIsRegisterSidebarOpen(true)}
                        className="text-sm font-medium text-[var(--color-primary)] hover:opacity-80 mb-3"
                        icon={UserPlus}
                    >
                        ¿No tienes cuenta? Regístrate aquí
                    </Button>
                </div>

            </MaterialCard>

            <ForgotPasswordModal
                isOpen={isRecoveryModalOpen}
                onClose={() => setIsRecoveryModalOpen(false)}
            />

            <RegisterSidebar
                isOpen={isRegisterSidebarOpen}
                onClose={() => setIsRegisterSidebarOpen(false)}
            />

            {setupCedula && (
                <PasswordSetupModal
                    cedula={setupCedula}
                    onComplete={handleSetupComplete}
                    onCancel={handleSetupCancel}
                />
            )}
        </div>
    );
};

export default Login;
