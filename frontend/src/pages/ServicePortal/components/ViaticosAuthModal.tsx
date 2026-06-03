/**
 * ViaticosAuthModal - Modal de autenticación para acceder al módulo de viáticos.
 *
 * NOTA: Los endpoints /auth/viaticos/{status,configurar,verificar} referenciados
 * en API_ENDPOINTS NO existen en el backend actualmente (a 2026-06-03). Este modal
 * endurezca el cliente (useApi, a11y, sanitización de cédula, type-safe errors)
 * pero seguirá fallando hasta que esos endpoints sean implementados.
 * Tracked como issue separado.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, ShieldCheck, ArrowRight, UserCheck, ArrowLeft } from 'lucide-react';
import { Button, Input, Title, Text, MaterialCard } from '../../../components/atoms';
import Callout from '../../../components/molecules/Callout';
import { useApi } from '../../../hooks/useApi';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { API_ENDPOINTS } from '../../../config/api';
import { getAxiosDetail, getErrorMessage } from '../../../utils/errors';

interface ViaticosAuthModalProps {
    cedula: string;
    onVerified: (nombre: string) => void;
    onBack: () => void;
}

const MODAL_TITLE_ID = 'viaticos-auth-modal-title';
const MODAL_DESCRIPTION_ID = 'viaticos-auth-modal-description';

const CEDULA_REGEX = /^\d{6,15}$/;

interface StatusResponse {
    registrado: boolean;
}

interface ConfigurarResponse {
    usuario: string;
}

interface VerificarResponse {
    nombre: string;
}

const sanitizeCedula = (raw: string): string => (raw || '').replace(/\D/g, '').slice(0, 15);

const ViaticosAuthModal: React.FC<ViaticosAuthModalProps> = ({ cedula, onVerified, onBack }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'checking' | 'setup' | 'verify'>('checking');

    const modalRef = useRef<HTMLDivElement | null>(null);
    const firstInputRef = useRef<HTMLInputElement | null>(null);
    const { get, post } = useApi();

    const cedulaSanitizada = sanitizeCedula(cedula);
    const cedulaValida = CEDULA_REGEX.test(cedulaSanitizada);

    useModalA11y({
        isOpen: true,
        onClose: onBack,
        modalRef,
        initialFocusRef: firstInputRef,
    });

    useEffect(() => {
        if (!cedulaValida) {
            setError('Cédula inválida. Debe contener entre 6 y 15 dígitos.');
            setStep('verify');
            return;
        }
        const checkStatus = async () => {
            const response = await get<StatusResponse>(API_ENDPOINTS.AUTH_VIATICOS_STATUS(cedulaSanitizada));
            if (response?.data?.registrado) {
                setStep('verify');
            } else if (response?.error) {
                setError(response.error);
                setStep('verify');
            } else {
                setStep('setup');
            }
        };
        checkStatus();
    }, [cedulaSanitizada, cedulaValida, get]);

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (step === 'setup') {
                if (password.length < 8) {
                    setError('La contraseña debe tener al menos 8 caracteres por seguridad.');
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Las contraseñas no coinciden.');
                    return;
                }
                const response = await post<ConfigurarResponse>(
                    API_ENDPOINTS.AUTH_VIATICOS_CONFIGURAR,
                    { cedula: cedulaSanitizada, contrasena: password }
                );
                if (response?.data?.usuario) {
                    onVerified(response.data.usuario);
                } else if (response?.error) {
                    setError(response.error);
                }
            } else {
                const response = await post<VerificarResponse>(
                    API_ENDPOINTS.AUTH_VIATICOS_VERIFICAR,
                    { cedula: cedulaSanitizada, contrasena: password }
                );
                if (response?.data?.nombre) {
                    onVerified(response.data.nombre);
                } else if (response?.error) {
                    setError(response.error);
                }
            }
        } catch (err: unknown) {
            setError(getAxiosDetail(err) ?? getErrorMessage(err, 'Acceso denegado. Verifica tu contraseña.'));
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'checking') {
        return createPortal(
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--deep-navy)]/80 backdrop-blur-sm p-4"
                role="status"
                aria-live="polite"
            >
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
            </div>,
            document.body
        );
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--deep-navy)]/90 backdrop-blur-md p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onBack(); }}
        >
            <MaterialCard
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={MODAL_TITLE_ID}
                aria-describedby={MODAL_DESCRIPTION_ID}
                elevation={5}
                className="w-full max-w-md p-8 !rounded-[2rem] border border-white/10 bg-[var(--color-surface)] shadow-2xl relative overflow-hidden"
            >
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute top-6 left-6 !p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                    icon={ArrowLeft}
                    aria-label="Volver"
                />

                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />

                <div className="text-center mb-8 relative pt-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${step === 'setup' ? 'bg-amber-500/20 text-amber-600' : 'bg-blue-600/20 text-blue-600'}`}>
                        {step === 'setup' ? <ShieldCheck size={32} /> : <Lock size={32} />}
                    </div>
                    <Title id={MODAL_TITLE_ID} variant="h4" weight="bold" className="mb-2">
                        {step === 'setup' ? 'Configurar Contraseña' : 'Verificación de Identidad'}
                    </Title>
                    <Text id={MODAL_DESCRIPTION_ID} className="opacity-70">
                        {step === 'setup'
                            ? 'Como es tu primera vez accediendo a viáticos, debes configurar una contraseña de seguridad (mínimo 8 caracteres).'
                            : 'Ingresa tu contraseña personal para acceder a la gestión de tus viáticos.'}
                    </Text>
                </div>

                <form onSubmit={handleAction} className="space-y-5 relative">
                    <div className="relative group">
                        <Input
                            ref={firstInputRef}
                            type="password"
                            label="Contraseña"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            icon={Lock}
                            required
                            size="lg"
                            className="bg-transparent"
                            autoComplete={step === 'setup' ? 'new-password' : 'current-password'}
                        />
                    </div>

                    {step === 'setup' && (
                        <div className="relative group">
                            <Input
                                type="password"
                                label="Confirmar Contraseña"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                icon={UserCheck}
                                required
                                size="lg"
                                className="bg-transparent"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {error && (
                        <Callout variant="error" role="alert">
                            {error}
                        </Callout>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full h-14 rounded-2xl font-black text-lg shadow-xl"
                        loading={isLoading}
                        disabled={!cedulaValida}
                        icon={step === 'setup' ? ShieldCheck : ArrowRight}
                    >
                        {step === 'setup' ? 'CONFIGURAR Y ENTRAR' : 'VERIFICAR IDENTIDAD'}
                    </Button>

                    <div className="text-center pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                        <Text variant="caption" className="opacity-50">
                            Cédula activa: <Text as="span" weight="bold">{cedulaSanitizada}</Text>
                        </Text>
                    </div>
                </form>
            </MaterialCard>
        </div>,
        document.body
    );
};

export default ViaticosAuthModal;
