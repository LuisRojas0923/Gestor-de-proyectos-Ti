import React from 'react';
import { MaterialCard, Text, Badge, Icon } from '../../components/atoms';
import { AlertCircle } from 'lucide-react';

const FeedbackSection: React.FC = () => {
    return (
        <div className="space-y-6">
            <MaterialCard className="p-6">
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                    <Text variant="h5" weight="bold">Badges (Etiquetas)</Text>
                    <Text variant="body2" color="text-secondary">Componente: {'<Badge />'}</Text>
                </div>
                <div className="flex flex-wrap gap-4">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="info">Info</Badge>
                </div>
            </MaterialCard>

            <MaterialCard className="p-6">
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                    <Text variant="h5" weight="bold">Tarjetas</Text>
                    <Text variant="body2" color="text-secondary">Componente: {'<MaterialCard />'}</Text>
                </div>
                <MaterialCard className="bg-primary-50 dark:bg-[var(--color-primary)]/10 border-primary-100 dark:border-[var(--color-primary)]/20">
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            <Icon name={AlertCircle} color="primary" />
                            <Text weight="medium" color="primary">
                                Este contenedor es un MaterialCard. Úsalo para agrupar contenido relacionado.
                            </Text>
                        </div>
                    </div>
                </MaterialCard>
            </MaterialCard>
        </div>
    );
};

export default FeedbackSection;
