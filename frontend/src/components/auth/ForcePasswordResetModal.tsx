import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Title, Text, Button, Input, MaterialCard } from '../atoms';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';
import { useNotifications } from '../notifications/NotificationsContext';

export const ForcePasswordResetModal: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { user } = state;
    const { patch } = useApi();
    const { addNotification } = useNotifications();

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // No mostrar si el usuario ya configuró su clave
    if (!user || user.passwordSet !== false) return null;

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const validateForm = () => {
        if (formData.newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return false;
        }
        if (formData.newPassword === formData.currentPassword) {
            setError('La nueva contraseña no puede ser igual a la anterior.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setError(null);

        try {
            await patch('/auth/password', {
                contrasena_actual: formData.currentPassword,
                nueva_contrasena: formData.newPassword
            });

            addNotification('success', 'Contraseña actualizada correctamente. Acceso administrativo habilitado.');
            
            // Actualizar estado global
            if (user) {
                dispatch({ 
                    type: 'LOGIN', 
                    payload: { ...user, passwordSet: true } 
                });
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Error al actualizar la contraseña. Verifique sus credenciales actuales.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <MaterialCard 
                elevation={5} 
                className="w-full max-w-lg p-8 !rounded-[2.5rem] border-2 border-amber-500/20 shadow-2xl shadow-amber-500/10 animate-in fade-in zoom-in duration-300"
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
                        <ShieldAlert size={40} className="animate-pulse" />
                    </div>
                    
                    <Title variant="h4" weight="bold" color="text-primary">
                        Acción de Seguridad Requerida
                    </Title>
                    
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <Text variant="body2" className="text-amber-800 dark:text-amber-200">
                            Tu cuenta ha sido promovida a un perfil administrativo. Por seguridad, debes establecer una contraseña personal antes de continuar.
                        </Text>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <Input
                            label="Contraseña Actual (Cédula)"
                            type={showPasswords.current ? 'text' : 'password'}
                            placeholder="Ingrese su cédula"
                            value={formData.currentPassword}
                            onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                            icon={Lock}
                            required
                            size="lg"
                            autoComplete="current-password"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => togglePasswordVisibility('current')}
                            className="absolute right-4 top-11 !p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Input
                                label="Nueva Contraseña"
                                type={showPasswords.new ? 'text' : 'password'}
                                placeholder="Mín. 8 caracteres"
                                value={formData.newPassword}
                                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                icon={CheckCircle}
                                required
                                size="lg"
                                autoComplete="new-password"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-4 top-11 !p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                            </Button>
                        </div>

                        <div className="relative">
                            <Input
                                label="Confirmar"
                                type={showPasswords.confirm ? 'text' : 'password'}
                                placeholder="Repita contraseña"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                icon={AlertCircle}
                                required
                                size="lg"
                                autoComplete="new-password"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-4 top-11 !p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3">
                            <AlertCircle className="text-red-500 shrink-0" size={20} />
                            <Text variant="caption" weight="medium" className="text-red-700 dark:text-red-400">
                                {error}
                            </Text>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full !rounded-2xl h-14 shadow-xl shadow-blue-500/20"
                        loading={isLoading}
                    >
                        Actualizar y Continuar
                    </Button>
                    
                    <div className="text-center pt-2">
                        <Text variant="caption" color="text-secondary" className="flex items-center justify-center gap-1">
                            <Lock size={12} /> Conexión segura y cifrada de extremo a extremo
                        </Text>
                    </div>
                </form>
            </MaterialCard>
        </div>
    );
};
