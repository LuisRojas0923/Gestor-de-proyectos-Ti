import React, { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../../../context/AppContext';
import { Button, Title, Text, Input, MaterialCard } from '../../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';

interface EmailUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const EmailUpdateModal: React.FC<EmailUpdateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { state, dispatch } = useAppContext();
    const [correo, setCorreo] = useState('');
    const [correoConfirm, setCorreoConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!correo.includes('@') || !correo.includes('.')) {
            setError('Ingresa un correo electrónico válido.');
            return;
        }

        if (correo !== correoConfirm) {
            setError('Los correos electrónicos no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${API_CONFIG.BASE_URL}/auth/update-email`,
                { correo },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Actualizar el estado global para ocultar el banner inmediatamente
            if (state.user) {
                const updatedUser = { 
                    ...state.user, 
                    emailNeedsUpdate: false, 
                    email: correo,
                    emailVerified: false // Al actualizar, pierde estado verificado hasta confirmar
                };
                dispatch({ type: 'LOGIN', payload: updatedUser });
            }

            setSuccess(true);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Error al actualizar el correo. Intenta de nuevo.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        const wasSuccess = success;
        setCorreo('');
        setCorreoConfirm('');
        setError(null);
        setSuccess(false);
        onClose();
        if (wasSuccess && onSuccess) {
            onSuccess();
        }
    };

    const content = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <MaterialCard
                elevation={4}
                className="relative w-full max-w-md !flex flex-col animate-fade-in"
                role="dialog"
                aria-modal="true"
            >
                <MaterialCard.Header className="flex items-center gap-3 !py-5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                        <Mail size={20} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <Title variant="h4" weight="semibold">
                            Actualizar Correo Corporativo
                        </Title>
                        <Text variant="caption" className="text-[var(--color-text-secondary)]">
                            Esta información se sincronizará con Solid ERP
                        </Text>
                    </div>
                </MaterialCard.Header>

                <MaterialCard.Content className="!p-6">
                    {success ? (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                                <CheckCircle size={36} className="text-green-600 dark:text-green-400" />
                            </div>
                            <Title variant="h5" weight="semibold">¡Correo actualizado!</Title>
                            <Text variant="body2" className="text-[var(--color-text-secondary)]">
                                Tu correo ha sido sincronizado. Hemos enviado un **enlace de verificación** a tu bandeja de entrada. Por favor, confírmalo para habilitar todas las funciones del portal.
                            </Text>
                            <Button variant="primary" onClick={handleClose} className="mt-2 w-full">
                                Entendido
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <Text variant="body2" className="text-[var(--color-text-secondary)]">
                                Tu correo corporativo actual no está registrado en el sistema de notificaciones.
                                Por favor, ingrésalo para comenzar a recibir alertas y comunicaciones.
                            </Text>

                            <Input
                                type="email"
                                label="Correo corporativo"
                                placeholder="tu.nombre@refridcol.com"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                icon={Mail}
                                required
                                onPaste={(e) => e.preventDefault()}
                                autoFocus
                            />

                            <Input
                                type="email"
                                label="Confirmar correo"
                                placeholder="tu.nombre@refridcol.com"
                                value={correoConfirm}
                                onChange={(e) => setCorreoConfirm(e.target.value)}
                                icon={Mail}
                                required
                                onPaste={(e) => e.preventDefault()}
                            />

                            {error && (
                                <Text variant="body2" className="text-red-500 dark:text-red-400 font-medium">
                                    {error}
                                </Text>
                            )}

                            <div className="flex gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                >
                                    Recordar luego
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1"
                                    loading={isLoading}
                                >
                                    Guardar correo
                                </Button>
                            </div>
                        </form>
                    )}
                </MaterialCard.Content>
            </MaterialCard>
        </div>
    );

    return createPortal(content, document.body);
};

export default EmailUpdateModal;
