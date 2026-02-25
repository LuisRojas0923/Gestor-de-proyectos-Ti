import React from 'react';
import { UserPlus, Play } from 'lucide-react';
import { Modal } from '../../components/molecules';
import { Button, Title, Text } from '../../components/atoms';

type ActionType = 'assign' | 'process';

interface TicketActionModalProps {
    isOpen: boolean;
    actionType: ActionType;
    ticketId: string;
    userName?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const CONFIG: Record<ActionType, {
    icon: React.FC<any>;
    iconBg: string;
    iconColor: string;
    title: string;
    description: (ticketId: string, userName?: string) => React.ReactNode;
    confirmLabel: string;
    confirmVariant: 'primary' | 'secondary';
}> = {
    assign: {
        icon: UserPlus,
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/20',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        title: '¿Asignarte este ticket?',
        description: (ticketId, userName) => (
            <>
                El ticket <strong>{ticketId}</strong> será asignado a <strong>{userName || 'ti'}</strong> y su estado cambiará a <strong>En Proceso</strong>.
            </>
        ),
        confirmLabel: 'Asignarme',
        confirmVariant: 'primary',
    },
    process: {
        icon: Play,
        iconBg: 'bg-amber-100 dark:bg-amber-900/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        title: '¿Poner en proceso?',
        description: (ticketId) => (
            <>
                El ticket <strong>{ticketId}</strong> cambiará su estado a <strong>En Proceso</strong>.
            </>
        ),
        confirmLabel: 'Poner En Proceso',
        confirmVariant: 'primary',
    },
};

const TicketActionModal: React.FC<TicketActionModalProps> = ({
    isOpen,
    actionType,
    ticketId,
    userName,
    onConfirm,
    onCancel,
}) => {
    const cfg = CONFIG[actionType];
    const IconComponent = cfg.icon;

    return (
        <Modal isOpen={isOpen} onClose={onCancel} size="sm" showCloseButton={false}>
            <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 mb-4 flex items-center justify-center rounded-full ${cfg.iconBg}`}>
                    <IconComponent className={`w-6 h-6 ${cfg.iconColor}`} />
                </div>
                <Title variant="h4" weight="semibold" className="mb-2">
                    {cfg.title}
                </Title>
                <Text variant="body2" color="text-secondary" className="mb-6">
                    {cfg.description(ticketId, userName)}
                </Text>

                <div className="flex gap-3 w-full">
                    <Button variant="secondary" onClick={onCancel} className="flex-1">
                        Cancelar
                    </Button>
                    <Button variant={cfg.confirmVariant} onClick={onConfirm} className="flex-1">
                        {cfg.confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TicketActionModal;
