import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button, Input, Title, Text, MaterialCard } from '../atoms';
import Callout from './Callout';
import { useApi } from '../../hooks/useApi';
import { useModalA11y } from '../../hooks/useModalA11y';
import { API_ENDPOINTS } from '../../config/api';
import { getErrorMessage } from '../../utils/errors';

interface PasswordSetupModalProps {
    cedula: string;
    onComplete: (contrasena: string) => void;
    onCancel: () => void;
}

const MODAL_TITLE_ID = 'password-setup-modal-title';
const MODAL_DESCRIPTION_ID = 'password-setup-modal-description';

const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({ cedula, onComplete, onCancel }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement | null>(null);
    const firstInputRef = useRef<HTMLInputElement | null>(null);
    const { post } = useApi();

    useModalA11y({
        isOpen: true,
        onClose: onCancel,
        modalRef,
        initialFocusRef: firstInputRef,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password === cedula) {
            setError('La contraseña no puede ser igual a tu cédula. Por favor, elige una contraseña diferente.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await post<{ message: string; cedula: string }>(
                API_ENDPOINTS.AUTH_SETUP_PASSWORD,
                { cedula, contrasena: password }
            );

            if (response?.error) {
                setError(response.error);
                return;
            }

            onComplete(password);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Error de conexión con el servidor'));
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <MaterialCard
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={MODAL_TITLE_ID}
                aria-describedby={MODAL_DESCRIPTION_ID}
                elevation={5}
                className="w-full max-w-md p-8 !rounded-[2.5rem] border-2 border-[var(--color-primary)]/20 shadow-2xl shadow-[var(--color-primary)]/10 animate-in fade-in zoom-in duration-300"
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <ShieldCheck size={40} />
                    </div>
                    <Title id={MODAL_TITLE_ID} variant="h4" weight="bold" color="text-primary">
                        Configura tu Contraseña
                    </Title>
                    <div id={MODAL_DESCRIPTION_ID} className="mt-4 p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10">
                        <Text variant="body2" className="text-[var(--color-text-primary)]/80">
                            Es la primera vez que accedes o tu contraseña aún no ha sido configurada.
                            Establece una contraseña personal para continuar.
                        </Text>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        ref={firstInputRef}
                        type="password"
                        label="Nueva Contraseña"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        icon={Lock}
                        required
                        size="lg"
                        autoComplete="new-password"
                    />
                    {password.length > 0 && password === cedula && (
                        <Callout variant="warning">
                            La contraseña no puede ser igual a tu cédula ({cedula}). Elige una contraseña diferente.
                        </Callout>
                    )}
                    <Input
                        type="password"
                        label="Confirmar Contraseña"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        icon={Lock}
                        required
                        size="lg"
                        autoComplete="new-password"
                    />

                    {error && (
                        <Callout variant="error" role="alert">
                            {error}
                        </Callout>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full !rounded-2xl h-14 shadow-xl"
                        loading={isLoading}
                        disabled={password === cedula}
                        icon={ShieldCheck}
                    >
                        Configurar y Acceder
                    </Button>

                    <div className="text-center pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            className="text-sm text-[var(--color-text-secondary)]"
                        >
                            Volver al inicio de sesión
                        </Button>
                    </div>
                </form>
            </MaterialCard>
        </div>,
        document.body
    );
};

export default PasswordSetupModal;
