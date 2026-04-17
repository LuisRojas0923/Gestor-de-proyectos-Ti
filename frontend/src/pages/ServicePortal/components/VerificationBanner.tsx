import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, Send, Edit2 } from 'lucide-react';
import { API_CONFIG, API_ENDPOINTS } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { Button, Text } from '../../../components/atoms';
import axios from 'axios';

interface VerificationBannerProps {
    email: string;
    onEdit?: () => void;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({ email, onEdit }) => {
    const { addNotification } = useNotifications();
    const [isResending, setIsResending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleResend = async () => {
        setIsResending(true);
        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_RESEND_VERIFICATION}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addNotification('success', 'Correo de verificación reenviado.');
            setSent(true);
            setTimeout(() => setSent(false), 5000);
        } catch (err: any) {
            console.error(err);
            addNotification('error', err.response?.data?.detail || 'Error al reenviar el correo.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 px-6 py-3 transition-all">
            <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400 w-full md:w-auto">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2">
                            <Text variant="body2" weight="bold" className="text-amber-900 dark:text-amber-300">
                                Acceso Limitado: Correo No Verificado
                            </Text>
                            {onEdit && (
                                <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={onEdit}
                                    className="!p-1 h-auto text-amber-600 hover:text-amber-800 dark:text-amber-50 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 !rounded-md transition-colors"
                                    title="Corregir correo"
                                    icon={Edit2}
                                />
                            )}
                        </div>
                        <Text variant="caption" className="opacity-80 text-amber-800 dark:text-amber-400">
                            Hemos enviado un enlace a <Text weight="bold" className="inline underline">{email}</Text>. Verifica tu cuenta para continuar.
                        </Text>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleResend}
                        disabled={isResending || sent}
                        icon={sent ? CheckCircle : (isResending ? RefreshCw : Send)}
                        className={`text-amber-700 hover:bg-amber-100 !rounded-xl ${isResending ? 'animate-pulse' : ''}`}
                    >
                        {sent ? 'Enviado' : (isResending ? 'Enviando...' : 'Reenviar Enlace')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VerificationBanner;
