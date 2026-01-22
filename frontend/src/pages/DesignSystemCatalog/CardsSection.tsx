import React from 'react';
import { MaterialCard, Title } from '../../components/atoms';
import { ActionCard, ServiceCard } from '../../components/molecules';
import { Plus, Monitor } from 'lucide-react';
import { useNotifications } from '../../components/notifications/NotificationsContext';

const CardsSection: React.FC = () => {
    const { addNotification } = useNotifications();

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <Title variant="h4">Tarjetas de Acción</Title>
                <MaterialCard className="p-6 space-y-6">
                    <div>
                        <Title variant="h6" className="mb-4">Action Card (Principal)</Title>
                        <div className="max-w-md">
                            <ActionCard
                                title="Solicitar Servicio"
                                description="Crea un nuevo ticket de soporte, desarrollo o activos."
                                icon={Plus}
                                onClick={() => addNotification('info', 'Click en Action Card')}
                            />
                        </div>
                    </div>

                    <div>
                        <Title variant="h6" className="mb-4">Service Card (Categoría)</Title>
                        <div className="max-w-md">
                            <ServiceCard
                                title="Soporte Hardware"
                                description="Problemas físicos: PC, laptop, impresora."
                                icon={<Monitor size={24} />}
                                onClick={() => addNotification('info', 'Click en Service Card')}
                            />
                        </div>
                    </div>
                </MaterialCard>
            </section>

            <section className="space-y-4">
                <Title variant="h4">Variantes de Material Card</Title>
                <MaterialCard className="p-6 space-y-6">
                    <div>
                        <Title variant="h6" className="mb-4">Activity / List Item (Flat)</Title>
                        <div className="text-sm text-neutral-500 mb-2">Usado en listas, bitácoras y paneles de alerta.</div>
                        <MaterialCard
                            className="p-4 border transition-colors bg-[var(--color-surface-variant)]/20 border-[var(--color-border)] hover:bg-[var(--color-surface-variant)]/30 dark:bg-[var(--color-surface-variant)]/50 dark:border-[var(--color-border)] dark:hover:bg-[var(--color-surface-variant)]"
                            elevation={0}
                            onClick={() => addNotification('success', 'Click en Item de Lista')}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <Title variant="h6" weight="bold">Título de la Actividad</Title>
                                    <div className="text-sm text-neutral-500">Descripción breve de la actividad reciente.</div>
                                </div>
                                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full uppercase">
                                    Nuevo
                                </div>
                            </div>
                        </MaterialCard>
                    </div>
                </MaterialCard>
            </section>
        </div>
    );
};

export default CardsSection;
