import React, { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/atoms';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import {
    downloadActivityEvidence,
    getActivityEvidenceName,
    isInternalActivityEvidence,
    isSafeExternalEvidenceUrl,
} from '../../../services/ActivityEvidenceService';


interface ActivityEvidenceButtonProps {
    actividadId: number;
    archivoUrl: string;
    compact?: boolean;
    label?: string;
}

export const ActivityEvidenceButton: React.FC<ActivityEvidenceButtonProps> = ({
    actividadId,
    archivoUrl,
    compact = false,
    label,
}) => {
    const { addNotification } = useNotifications();
    const [loading, setLoading] = useState(false);
    const isInternal = isInternalActivityEvidence(archivoUrl);

    const handleOpen = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!isInternal) {
            if (!isSafeExternalEvidenceUrl(archivoUrl)) {
                addNotification('error', 'La URL de evidencia guardada no es segura.');
                return;
            }
            window.open(archivoUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        setLoading(true);
        try {
            await downloadActivityEvidence(actividadId);
        } catch (error) {
            addNotification(
                'error',
                error instanceof Error ? error.message : 'No se pudo descargar la evidencia.'
            );
        } finally {
            setLoading(false);
        }
    };

    const buttonLabel = label || getActivityEvidenceName(archivoUrl);
    return (
        <Button
            variant="ghost"
            size="xs"
            icon={isInternal ? Download : ExternalLink}
            onClick={handleOpen}
            loading={loading}
            aria-label={compact ? (isInternal ? 'Descargar evidencia' : 'Abrir evidencia externa') : undefined}
            title={buttonLabel}
            className={compact ? '!p-1.5 min-w-0' : '!px-0 max-w-full text-[var(--color-primary)] break-all'}
        >
            {compact ? undefined : buttonLabel}
        </Button>
    );
};
