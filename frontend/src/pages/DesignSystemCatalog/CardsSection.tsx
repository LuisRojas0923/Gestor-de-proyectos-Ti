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
        </div>
    );
};

export default CardsSection;
