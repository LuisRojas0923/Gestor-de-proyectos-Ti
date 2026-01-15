import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_CONFIG } from '../config/api';

const Login: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { darkMode } = state;
    const navigate = useNavigate();
    // The 'post' variable from useApi is not used in this component.
    // The handleLogin function uses a direct fetch call instead.
    const { } = useApi();

    const [cedula, setCedula] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Usar OAuth2PasswordRequestForm style (x-www-form-urlencoded)
            const formData = new URLSearchParams();
            formData.append('username', cedula);
            formData.append('password', password || 'skip_password_check');

            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }

            const data = await response.json();

            // Guardar token
            localStorage.setItem('token', data.access_token);

            // Actualizar estado global
            dispatch({ type: 'LOGIN', payload: data.user });

            // Redirigir según rol
            if (data.user.role === 'analyst') {
                navigate('/');
            } else {
                navigate('/service-portal');
            }
        } catch (err) {
            setError('Cédula o contraseña incorrectos');
        } finally {
            setIsLoading(false);
        }
    };

    const quickLogin = (role: 'analyst' | 'user') => {
        setCedula(role === 'analyst' ? '12345678' : '87654321');
        setPassword('');
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-neutral-950' : 'bg-gray-50'}`}>
            <div className="max-w-md w-full">
                {/* Logo / Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-xl shadow-blue-500/20">
                        <Shield size={32} />
                    </div>
                    <h1 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                        Gestor TI
                    </h1>
                    <p className="text-gray-500 font-medium tracking-tight">Accede a tu panel administrativo o portal</p>
                </div>

                {/* Login Card */}
                <div className={`${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100'} p-8 rounded-[2.5rem] border shadow-2xl shadow-black/5`}>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Cédula</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition-all ${darkMode
                                        ? 'bg-neutral-800 border-neutral-700 text-white focus:border-blue-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:bg-white'
                                        }`}
                                    placeholder="Número de identificación"
                                    required
                                />
                                <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition-all ${darkMode
                                        ? 'bg-neutral-800 border-neutral-700 text-white focus:border-blue-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:bg-white'
                                        }`}
                                    placeholder="•••••••• (Opcional)"
                                // Eliminamos el required para permitir "cédula no más"
                                />
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center space-x-2">
                                <Shield size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
                            <span>{isLoading ? 'Autenticando...' : 'Iniciar Sesión'}</span>
                        </button>
                    </form>

                    {/* Quick Login for Testing */}
                    <div className="mt-10 pt-8 border-t border-gray-50 dark:border-neutral-800">
                        <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Acceso Rápido (Pruebas)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => quickLogin('analyst')}
                                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${darkMode ? 'border-neutral-800 hover:bg-neutral-800' : 'border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                <Shield size={16} className="text-blue-500" />
                                <span className="text-xs font-bold">Analista</span>
                            </button>
                            <button
                                onClick={() => quickLogin('user')}
                                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${darkMode ? 'border-neutral-800 hover:bg-neutral-800' : 'border-gray-100 hover:bg-gray-50'
                                    }`}
                            >
                                <UserIcon size={16} className="text-purple-500" />
                                <span className="text-xs font-bold">Cliente</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
