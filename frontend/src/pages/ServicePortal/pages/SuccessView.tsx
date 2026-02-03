import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button, Title, Text, Icon } from '../../../components/atoms';

interface SuccessViewProps {
    newTicketId: string | null;
    onHome: () => void;
}

const SuccessView: React.FC<SuccessViewProps> = ({ newTicketId, onHome }) => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const displayId = ticketId || newTicketId;

    return (
        <div className="py-20 text-center space-y-8 max-w-lg mx-auto">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-[2rem] flex items-center justify-center mx-auto animate-bounce border border-green-200 dark:border-green-800">
                <Icon name={CheckCircle2} size="xl" className="w-12 h-12" />
            </div>
            <div className="space-y-2">
                <Title variant="h3" weight="bold" color="text-primary">¡Solicitud Enviada!</Title>
                <Text variant="h6" color="text-secondary" weight="medium">Tu requerimiento ha sido registrado con éxito.</Text>
            </div>
            <div className="bg-[var(--color-surface)] border-2 border-green-200 dark:border-green-800 rounded-3xl p-6 shadow-xl shadow-green-100/50 dark:shadow-none transition-all">
                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest mb-1 opacity-50">ID Seguimiento</Text>
                <Text variant="h4" weight="bold" className="font-mono text-green-700 dark:text-green-400">{displayId}</Text>
            </div>
            <div className="pt-6">
                <Button onClick={onHome} variant="primary" size="lg" className="w-full">
                    Volver al Panel Principal
                </Button>
            </div>
        </div>
    );
};

export default SuccessView;
