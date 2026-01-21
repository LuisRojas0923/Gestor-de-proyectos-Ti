import React, { useState } from 'react';
import { MaterialCard, Title, Text, Button } from '../../components/atoms';
import { Modal, DeleteConfirmModal } from '../../components/molecules';
import { useNotifications } from '../../components/notifications/NotificationsContext';

const ModalsSection: React.FC = () => {
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { addNotification } = useNotifications();

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <Title variant="h4">Modales del Sistema</Title>
                <MaterialCard className="p-6 space-y-4">
                    <Title variant="h6" weight="medium">Modales Globales</Title>
                    <div className="flex flex-wrap gap-4">
                        <Button onClick={() => setShowDemoModal(true)}>
                            Modal Genérico
                        </Button>
                        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                            Modal de Confirmación
                        </Button>
                    </div>
                </MaterialCard>

                <MaterialCard className="p-6 space-y-4">
                    <Title variant="h6" weight="medium">Modales de Actividad (Organismos)</Title>
                    <Text>
                        Los modales de actividad son organismos complejos que gestionan flujos de múltiples pasos.
                        Se importan desde <code>components/organisms/activities</code>.
                    </Text>
                    <div className="flex flex-wrap gap-4">
                        <Button variant="secondary" disabled>
                            Ver ActivityCreateModal (Requiere Contexto)
                        </Button>
                    </div>
                </MaterialCard>
            </section>

            {/* Demo Modals */}
            <Modal
                isOpen={showDemoModal}
                onClose={() => setShowDemoModal(false)}
                title="Modal de Ejemplo"
                showCloseButton
            >
                <div className="space-y-4">
                    <Text>Este es un modal genérico del sistema de diseño.</Text>
                    <div className="flex justify-end pt-4">
                        <Button variant="primary" onClick={() => setShowDemoModal(false)}>Entendido</Button>
                    </div>
                </div>
            </Modal>

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                development={{ id: 'DEMO-001', name: 'Desarrollo de Prueba', current_status: 'Pendiente' } as any}
                onConfirm={() => {
                    addNotification('success', 'Eliminado correctamente');
                    setShowDeleteModal(false);
                }}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
};

export default ModalsSection;
