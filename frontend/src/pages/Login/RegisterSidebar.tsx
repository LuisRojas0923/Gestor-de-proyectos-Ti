import React, { useState } from 'react';
import { X, User, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Title, Text } from '../../components/atoms';
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';

interface RegisterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const RegisterSidebar: React.FC<RegisterSidebarProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        cedula: '',
        nombre: '',
        correo: '',
        contrasena: '',
        contrasena_confirmar: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones básicas
        if (formData.cedula.length < 5) {
            setError("La identificación debe tener al menos 5 caracteres");
            return;
        }
        if (formData.nombre.length < 3) {
            setError("El nombre debe tener al menos 3 caracteres");
            return;
        }
        if (formData.contrasena !== formData.contrasena_confirmar) {
            setError("Las contraseñas no coinciden");
            return;
        }
        if (formData.contrasena.toLowerCase() === formData.cedula.toLowerCase()) {
            setError("La contraseña no puede ser igual a la cédula");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_REGISTRO}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cedula: formData.cedula,
                    nombre: formData.nombre,
                    correo: formData.correo || null,
                    contrasena: formData.contrasena,
                    contrasena_confirmar: formData.contrasena_confirmar,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error al registrar la cuenta');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ cedula: '', nombre: '', correo: '', contrasena: '', contrasena_confirmar: '' });
        setError(null);
        setIsSuccess(false);
        onClose();
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={handleClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed right-0 top-0 h-full w-full max-w-md z-50 transition-transform duration-300 ease-in-out bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-6 border-b border-[var(--color-border)]">
                        <Title variant="h5" weight="bold" color="text-primary">
                            Crear Cuenta
                        </Title>
                        <Button
                            variant="custom"
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-[var(--color-surface-variant)] transition-colors"
                        >
                            <X size={20} className="text-[var(--color-text-secondary)]" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 size={40} />
                                </div>
                                <Title variant="h4" weight="bold" className="mb-3">¡Cuenta Creada!</Title>
                                <Text variant="body1" className="text-[var(--color-text-secondary)] mb-6">
                                    Tu cuenta ha sido creada exitosamente y está pendiente de aprobación por un administrador.
                                </Text>
                                <Text variant="body2" className="text-[var(--color-text-secondary)] mb-8">
                                    Recibirás acceso al portal una vez que tu cuenta sea activada.
                                </Text>
                                <Button
                                    variant="primary"
                                    onClick={handleClose}
                                    className="w-full"
                                >
                                    Volver al Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start space-x-3 mb-6 border border-blue-100 dark:border-blue-800">
                                    <User size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <Text variant="body2" className="text-blue-800 dark:text-blue-300">
                                        Completa el formulario para registrarte en el portal. Tu cuenta quedará pendiente de aprobación.
                                    </Text>
                                </div>

                                <Input
                                    type="text"
                                    label="Número de Identificación"
                                    placeholder="Ej: 123456789"
                                    value={formData.cedula}
                                    onChange={(e) => handleInputChange('cedula', e.target.value)}
                                    icon={User}
                                    required
                                />

                                <Input
                                    type="text"
                                    label="Nombre Completo"
                                    placeholder="Ej: Juan Pérez"
                                    value={formData.nombre}
                                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                                    icon={User}
                                    required
                                />

                                <Input
                                    type="email"
                                    label="Correo Electrónico (opcional)"
                                    placeholder="Ej: juan@ejemplo.com"
                                    value={formData.correo}
                                    onChange={(e) => handleInputChange('correo', e.target.value)}
                                    icon={Mail}
                                />

                                <Input
                                    type="password"
                                    label="Contraseña"
                                    placeholder="Mínimo 8 caracteres"
                                    value={formData.contrasena}
                                    onChange={(e) => handleInputChange('contrasena', e.target.value)}
                                    icon={Lock}
                                    required
                                />

                                <Input
                                    type="password"
                                    label="Confirmar Contraseña"
                                    placeholder="Repita la contraseña"
                                    value={formData.contrasena_confirmar}
                                    onChange={(e) => handleInputChange('contrasena_confirmar', e.target.value)}
                                    icon={Lock}
                                    required
                                />

                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center space-x-2">
                                        <AlertCircle size={18} className="flex-shrink-0" />
                                        <Text as="span" variant="body2" className="!text-red-600">{error}</Text>
                                    </div>
                                )}

                                <div className="pt-4 space-y-3">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={isLoading}
                                        className="w-full"
                                    >
                                        Crear Cuenta
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleClose}
                                        className="w-full"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default RegisterSidebar;
