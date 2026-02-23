import React, { useState } from 'react';
import { MaterialCard, Title, Text, Button } from '../../components/atoms';
import { Modal, DeleteConfirmModal, ExpenseConfirmModal, ClearReportConfirmModal, DeleteReportConfirmModal, ReportLockedModal } from '../../components/molecules';
import ViaticosAuthModal from '../ServicePortal/components/ViaticosAuthModal';
import { useNotifications } from '../../components/notifications/NotificationsContext';

const ModalsSection: React.FC = () => {
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
    const [showLockedModal, setShowLockedModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
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
                            Confirmación Borrado
                        </Button>
                        <Button variant="erp" onClick={() => setShowExpenseModal(true)}>
                            Confirmación de Envío (ERP)
                        </Button>
                        <Button variant="ghost" className="text-red-600 border-red-200" onClick={() => setShowClearModal(true)}>
                            Limpiar Reporte (Borrador)
                        </Button>
                        <Button variant="primary" onClick={() => setShowAuthModal(true)}>
                            Autenticación de Viáticos (Marina)
                        </Button>
                        <Button variant="danger" onClick={() => setShowDeleteReportModal(true)}>
                            Eliminar Reporte (Permanente)
                        </Button>
                        <Button className="!bg-amber-500 hover:!bg-amber-600 text-white" onClick={() => setShowLockedModal(true)}>
                            Reporte Bloqueado
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

            <ExpenseConfirmModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onConfirm={() => {
                    addNotification('success', 'Simulación de envío completada');
                    setShowExpenseModal(false);
                }}
                totalGeneral={150000}
                totalFacturado={100000}
                totalSinFactura={50000}
            />

            <ClearReportConfirmModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={() => {
                    addNotification('info', 'Reporte simulado como limpio');
                    setShowClearModal(false);
                }}
            />

            <DeleteReportConfirmModal
                isOpen={showDeleteReportModal}
                onClose={() => setShowDeleteReportModal(false)}
                onConfirm={() => {
                    addNotification('success', 'Reporte eliminado correctamente');
                    setShowDeleteReportModal(false);
                }}
                reportCode="WEB-L0012"
            />

            <ReportLockedModal
                isOpen={showLockedModal}
                onClose={() => setShowLockedModal(false)}
                reportId="WEB-L0004"
            />

            {showAuthModal && (
                <ViaticosAuthModal
                    cedula="12345678"
                    onVerified={(nombre) => {
                        addNotification('success', `Verificado como: ${nombre}`);
                        setShowAuthModal(false);
                    }}
                    onBack={() => setShowAuthModal(false)}
                />
            )}
        </div>
    );
};

export default ModalsSection;
