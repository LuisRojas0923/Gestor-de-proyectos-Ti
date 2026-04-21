import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { Button, Title, Text, MaterialCard } from '../../components/atoms';

const VerifyEmailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando tu correo corporativo...');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Token de verificación no encontrado o inválido.');
                return;
            }

            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH_VERIFY_EMAIL}?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('¡Excelente! Tu correo ha sido verificado correctamente. Ya puedes acceder a todas las funciones del portal.');
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'El enlace de verificación ha expirado o no es válido.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Error de conexión con el servidor. Por favor intenta más tarde.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#f0f4f8] to-[#d9e1f2] dark:from-neutral-950 dark:to-neutral-900 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50" />
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl animate-pulse-subtle" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl animate-pulse-subtle" />

            <MaterialCard 
                elevation={4} 
                className="w-full max-w-lg overflow-hidden relative backdrop-blur-sm bg-white/80 dark:bg-neutral-900/80 !rounded-[2.5rem] border-white/50 dark:border-neutral-800/50"
            >
                <div className="p-10 text-center flex flex-col items-center">
                    {/* Icon Section with sophisticated animations */}
                    <div className="relative mb-8 group">
                        <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${
                            status === 'loading' ? 'bg-blue-400' :
                            status === 'success' ? 'bg-emerald-400' :
                            'bg-red-400'
                        }`} />
                        
                        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-700 transform ${
                            status === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' :
                            status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 scale-110 rotate-[360deg]' :
                            'bg-red-50 dark:bg-red-900/20 text-red-500 scale-100'
                        }`}>
                            {status === 'loading' && <Loader2 className="w-14 h-14 animate-spin stroke-[1.5]" />}
                            {status === 'success' && <CheckCircle className="w-16 h-16 stroke-[1.5]" />}
                            {status === 'error' && <XCircle className="w-16 h-16 stroke-[1.5]" />}
                        </div>
                    </div>

                    <Title variant="h2" weight="black" className="mb-4 tracking-tight !text-4xl">
                        {status === 'loading' ? 'Verificando...' : 
                         status === 'success' ? '¡Todo Listo!' : 
                         'Algo salió mal'}
                    </Title>

                    <Text variant="body1" className="text-gray-500 dark:text-gray-400 mb-10 max-w-xs mx-auto leading-relaxed">
                        {message}
                    </Text>

                    {status !== 'loading' && (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-neutral-800 to-transparent mb-6" />
                            
                            <Button 
                                variant={status === 'success' ? 'primary' : 'outline'}
                                size="lg" 
                                className={`w-full !rounded-2xl !py-7 !text-lg transition-all duration-300 ${
                                    status === 'success' ? 'shadow-lg shadow-[var(--color-primary)]/20' : ''
                                }`}
                                onClick={() => navigate('/login')}
                                icon={ArrowRight}
                                iconPosition="right"
                            >
                                {status === 'success' ? 'Continuar al Portal' : 'Volver al Inicio'}
                            </Button>
                            
                            {status === 'success' && (
                                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm py-2">
                                    <ShieldCheck className="w-5 h-5 animate-bounce" />
                                    <Text variant="caption" weight="bold" className="text-emerald-600 dark:text-emerald-400">Identidad confirmada</Text>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </MaterialCard>
        </div>
    );
};

export default VerifyEmailPage;
