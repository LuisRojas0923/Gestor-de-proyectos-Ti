import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { Input, Button, Title, Text, MaterialCard } from '../components/atoms';
import imgUserLogin from '../assets/images/categories/Usuario Inicio Sesion.png';
import imgAdminLogin from '../assets/images/categories/icons8-usuario-administrador-96.png';
import imgFondo from '../assets/images/fondo - copia.png';

const Login: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { darkMode } = state;
    const navigate = useNavigate();

    // 'portal' = Login de usuario final (solo cédula)
    // 'admin' = Login de analista (usuario + contraseña)
    const [loginMode, setLoginMode] = useState<'portal' | 'admin'>('portal');

    const [formData, setFormData] = useState({
        username: '', // Cédula o usuario
        password: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handlePortalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.username.length < 5) {
            setError("Identificación inválida");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Autenticación en el backend para obtener token JWT y datos de usuario
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_PORTAL_LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: formData.username }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error de autenticación');
            }

            const data = await response.json();

            // Guardar token para futuras peticiones (creación/edición de reuniones)
            localStorage.setItem('token', data.access_token);

            // Guardar en contexto global
            dispatch({ type: 'LOGIN', payload: data.user });
            navigate('/service-portal');

        } catch (err: any) {
            console.error('Portal login error:', err);
            setError(err.message || "Error al conectar con el servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append('username', formData.username);
            params.append('password', formData.password);

            const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_LOGIN}`, { // [CONTROLADO]
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params,
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }

            const data = await response.json();

            localStorage.setItem('token', data.access_token);

            // Asegurar que el objeto de usuario tenga todos los campos necesarios
            const userData = {
                ...data.user,
                // Si el backend devuelve 'cedula' pero no 'id', o viceversa, lo unificamos
                id: data.user.id || data.user.cedula,
                cedula: data.user.cedula || data.user.id
            };

            dispatch({ type: 'LOGIN', payload: userData });

            const userRole = userData.role?.toLowerCase();
            if (userRole === 'analyst' || userRole === 'admin' || userRole === 'director') {
                navigate('/');
            } else {
                navigate('/service-portal');
            }
        } catch (err) {
            setError('Usuario o contraseña incorrectos');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setLoginMode(prev => prev === 'portal' ? 'admin' : 'portal');
        setFormData({ username: '', password: '' });
        setError(null);
    };

    // Estilos basados en LoginView.tsx para modo portal, pero adaptados para soportar ambos
    // Usaremos un diseño unificado visualmente atractivo

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Imagen de Fondo con Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                style={{ backgroundImage: `url(${imgFondo})` }}
            />
            <div className={`absolute inset-0 transition-colors duration-500 
                ${loginMode === 'portal'
                    ? 'bg-black/40 backdrop-blur-[2px]'
                    : (darkMode ? 'bg-black/60 backdrop-blur-[3px]' : 'bg-white/30 backdrop-blur-[2px]')
                }`}
            />

            <MaterialCard
                elevation={5}
                className="w-full max-w-md p-8 transform transition-all !rounded-[2.5rem]"
            >

                {/* Header */}
                <div className="text-center mb-10">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 
                        ${loginMode === 'portal'
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'bg-blue-600/10 text-blue-600 shadow-xl shadow-blue-500/10' // Cambié bg admin para que se vea la img si es transparente, o dejar blanco. 
                        // Si las imagenes tienen fondo transparente, un bg suave queda bien.
                        }`}>
                        <img
                            src={loginMode === 'portal' ? imgUserLogin : imgAdminLogin}
                            alt={loginMode === 'portal' ? "Login Usuario" : "Login Admin"}
                            className="w-12 h-12 object-contain"
                        />
                    </div>

                    <Title variant="h4" weight="bold" color={loginMode === 'portal' || !darkMode ? 'text-primary' : 'text-primary'}>
                        {loginMode === 'portal' ? 'Portal de Servicios' : 'Gestión Administrativa'}
                    </Title>

                    <Text variant="body1" className={`mt-2 ${loginMode === 'portal' ? 'text-[var(--color-text-secondary)]' : 'text-gray-500'}`} weight="medium">
                        {loginMode === 'portal'
                            ? 'Ingrese su identificación para continuar'
                            : 'Ingrese sus credenciales de administrador'}
                    </Text>
                </div>

                {/* Form */}
                <form onSubmit={loginMode === 'portal' ? handlePortalLogin : handleAdminLogin} className="space-y-6">

                    <Input
                        type="text" // Cambiado a text para soportar IDs arbitrarios
                        name="username"
                        label={loginMode === 'portal' ? 'Número de Identificación' : 'Usuario'}
                        placeholder={loginMode === 'portal' ? 'Ej: 123456789' : 'usuario.admin'}
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        icon={UserIcon}
                        required
                        size="lg"
                    />

                    {loginMode === 'admin' && (
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
                    )}

                    {error && (
                        <div className={`p-4 rounded-xl text-sm font-bold flex items-center space-x-2
                            ${loginMode === 'portal'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}>
                            <Text color="inherit" weight="bold">{error}</Text>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={isLoading}
                        icon={loginMode === 'portal' ? ArrowRight : LogIn}
                    >
                        {loginMode === 'portal' ? 'Acceder al Portal' : 'Iniciar Sesión'}
                    </Button>
                </form>

                {/* Switch Mode Link */}
                <div className="mt-8 text-center border-t border-gray-100 dark:border-neutral-800 pt-6">
                    <Button
                        variant="ghost"
                        onClick={toggleMode}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                        {loginMode === 'portal'
                            ? '¿Eres administrador? Ingresa aquí'
                            : '¿Eres usuario? Ir al Portal de Servicios'}
                    </Button>
                </div>

            </MaterialCard>
        </div>
    );
};

export default Login;
