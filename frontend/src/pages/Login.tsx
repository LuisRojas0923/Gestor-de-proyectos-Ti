import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { Input, Button, Title, Text, MaterialCard } from '../components/atoms';
import axios from 'axios';
import imgUserLogin from '../assets/images/categories/Usuario Inicio Sesion.png';
import imgAdminLogin from '../assets/images/categories/icons8-usuario-administrador-96.png';

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
            // Consulta al endpoint ERP para validar empleado
            const response = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ERP_EMPLEADO(formData.username)}`);
            const employeeData = response.data;

            // Mapeo de datos del ERP al formato de usuario interno
            const userData = {
                id: employeeData.nrocedula,
                name: employeeData.nombre,
                email: 'usuario@dominio.com',
                role: 'user', // Asignar rol de usuario explícitamente
                area: employeeData.area || 'Sin Área',
                cargo: employeeData.cargo || 'Sin Cargo',
                sede: employeeData.ciudadcontratacion || 'Principal'
            };

            // Guardar en contexto global
            dispatch({ type: 'LOGIN', payload: userData });
            navigate('/service-portal');

        } catch (err: any) {
            console.error('Login error:', err);
            if (err.response && err.response.status === 404) {
                setError("Usuario no encontrado o inactivo en Solid ERP. Verifica tu cédula.");
            } else {
                setError("Error de conexión con el servidor.");
            }
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

            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
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
            dispatch({ type: 'LOGIN', payload: data.user });

            if (data.user.role === 'analyst') {
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
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 
            ${loginMode === 'portal'
                ? 'bg-gradient-to-br from-[var(--deep-navy)] to-[var(--color-primary)]'
                : (darkMode ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-gray-100 to-gray-300')
            }`}>

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
                            <span>{error}</span>
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
                    <button
                        onClick={toggleMode}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors focus:outline-none"
                    >
                        {loginMode === 'portal'
                            ? '¿Eres administrador? Ingresa aquí'
                            : '¿Eres usuario? Ir al Portal de Servicios'}
                    </button>
                </div>

            </MaterialCard>
        </div>
    );
};

export default Login;
