import React from 'react';
import { Mail } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Button, Text } from '../atoms';

interface UpdateEmailBannerProps {
    onUpdate?: () => void;
}

export const UpdateEmailBanner: React.FC<UpdateEmailBannerProps> = ({ onUpdate }) => {
    const { state } = useAppContext();

    if (!state.user || !state.user.emailNeedsUpdate) {
        return null;
    }

    return (
        <div
            className="border-b flex items-center justify-between px-6 py-2.5
                bg-amber-50 border-amber-300 text-amber-900
                dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200
                animate-pulse-subtle"
        >
            <div className="flex items-center gap-3">
                <Mail
                    size={16}
                    className="shrink-0 text-amber-600 dark:text-amber-400"
                />
                <Text
                    variant="body2"
                    className="font-medium italic text-amber-900 dark:text-amber-200"
                >
                    ¡Atención! Tu correo corporativo no ha sido sincronizado con el ERP (Solid).
                    Por favor, actualízalo para recibir notificaciones importantes.
                </Text>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onUpdate}
                    className="shadow-md hover:scale-105 transition-transform bg-amber-500 hover:bg-amber-600 border-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400"
                >
                    Actualizar ahora
                </Button>
            </div>
        </div>
    );
};

export default UpdateEmailBanner;
