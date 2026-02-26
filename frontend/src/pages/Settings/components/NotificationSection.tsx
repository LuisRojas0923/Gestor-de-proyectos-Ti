import React from 'react';
import { Bell, Mail, Smartphone, Globe, Save } from 'lucide-react';
import { Title, Text, MaterialCard, Switch, Button } from '../../../components/atoms';

interface NotificationSectionProps {
    notifications: any;
    setNotifications: any;
    handleNotificationUpdate: () => void;
}

const NotificationSection: React.FC<NotificationSectionProps> = ({
    notifications, setNotifications, handleNotificationUpdate
}) => (
    <MaterialCard className="p-6">
        <div className="flex items-center space-x-3 mb-6">
            <Bell className="text-[var(--color-text-secondary)]" size={24} />
            <Title variant="h5" weight="semibold" color="text-primary">Notificaciones</Title>
        </div>
        <div className="space-y-4">
            {[
                { key: 'email', label: 'Notificaciones por Email', icon: Mail },
                { key: 'teams', label: 'Notificaciones de Teams', icon: Smartphone },
                { key: 'slack', label: 'Notificaciones de Slack', icon: Smartphone },
                { key: 'browser', label: 'Notificaciones del Navegador', icon: Globe },
                { key: 'sla_alerts', label: 'Alertas de SLA', icon: Bell },
                { key: 'daily_summary', label: 'Resumen Diario', icon: Mail },
            ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-surface-variant)] border border-[var(--color-border)]">
                    <div className="flex items-center space-x-3">
                        <Icon className="text-[var(--color-text-secondary)]" size={20} />
                        <Text color="text-primary">{label}</Text>
                    </div>
                    <Switch checked={notifications[key as keyof typeof notifications]} onChange={(checked) => setNotifications((prev: any) => ({ ...prev, [key]: checked }))} />
                </div>
            ))}
        </div>
        <div className="flex justify-end mt-6">
            <Button onClick={handleNotificationUpdate} variant="primary" icon={Save}>Guardar Preferencias</Button>
        </div>
    </MaterialCard>
);

export default NotificationSection;
