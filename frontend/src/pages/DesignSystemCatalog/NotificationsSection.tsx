import React from 'react';
import { MaterialCard, Text, Button } from '../../components/atoms';
import { useNotifications } from '../../components/notifications/NotificationsContext';

const NotificationsSection: React.FC = () => {
    const { addNotification } = useNotifications();

    return (
        <div className="space-y-6">
            <MaterialCard className="p-6">
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4 mb-6">
                    <Text variant="h5" weight="bold">Toast Notifications</Text>
                    <Text variant="body2" color="text-secondary">Hook: {'useNotifications()'}</Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                        variant="outline"
                        className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-800 dark:hover:bg-green-900/20 dark:text-green-400"
                        onClick={() => addNotification('success', 'Operación completada exitosamente')}
                    >
                        Trigger Success
                    </Button>
                    <Button
                        variant="outline"
                        className="border-red-200 hover:bg-red-50 text-red-700 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400"
                        onClick={() => addNotification('error', 'Ha ocurrido un error al procesar')}
                    >
                        Trigger Error
                    </Button>
                    <Button
                        variant="outline"
                        className="border-yellow-200 hover:bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:hover:bg-yellow-900/20 dark:text-yellow-400"
                        onClick={() => addNotification('warning', 'Advertencia: Revise los datos')}
                    >
                        Trigger Warning
                    </Button>
                    <Button
                        variant="outline"
                        className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:hover:bg-blue-900/20 dark:text-blue-400"
                        onClick={() => addNotification('info', 'Nueva actualización disponible')}
                    >
                        Trigger Info
                    </Button>
                </div>

                <div className="mt-8 p-4 bg-[var(--color-surface-variant)] rounded-lg border border-[var(--color-border)]">
                    <Text variant="subtitle2" className="mb-2">Usage Example:</Text>
                    <pre className="font-mono text-xs overflow-x-auto p-2 bg-[var(--color-background)] rounded text-[var(--color-text-primary)]">
                        {`const { addNotification } = useNotifications();

// Call specific variant
addNotification('success', 'Message here');
addNotification('error', 'Error description');`}
                    </pre>
                </div>
            </MaterialCard>
        </div>
    );
};

export default NotificationsSection;
