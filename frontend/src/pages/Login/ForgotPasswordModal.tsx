import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/molecules';
import { Button, Input, Title, Text } from '../../components/atoms';
import { API_CONFIG } from '../../config/api';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [cedula, setCedula] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cedula) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Error al procesar la solicitud');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setCedula('');
        setIsSuccess(false);
        setError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isSuccess ? "Correo Enviado" : "Recuperar Contraseña"}
            size="md"
        >
            <div className="p-2">
                {isSuccess ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <Title variant="h5" className="mb-2">¡Solicitud Procesada!</Title>
                        <Text variant="body1" className="text-gray-500 mb-6">
                            Si tu número de identificación está registrado y tiene un correo corporativo validado, 
                            recibirás instrucciones para restablecer tu contraseña en los próximos minutos.
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
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start space-x-3 mb-4 border border-blue-100 dark:border-blue-800">
                            <Mail className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                            <Text variant="body2" className="text-blue-800 dark:text-blue-300">
                                Ingrese su número de identificación. Le enviaremos un enlace a su correo corporativo registrado para que pueda establecer una nueva contraseña.
                            </Text>
                        </div>

                        <Input
                            label="Número de Identificación"
                            placeholder="Ej: 123456789"
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value)}
                            required
                            autoFocus
                        />

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col space-y-3">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={isLoading}
                                icon={Send}
                                className="w-full"
                            >
                                Enviar Instrucciones
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClose}
                                icon={ArrowLeft}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default ForgotPasswordModal;
