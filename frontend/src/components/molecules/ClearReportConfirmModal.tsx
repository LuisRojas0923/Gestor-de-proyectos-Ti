import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { Button, Title, Text } from '../atoms';

interface ClearReportConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ClearReportConfirmModal: React.FC<ClearReportConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            closeOnOverlayClick={false}
            showCloseButton={false}
            className="!bg-slate-100 dark:!bg-neutral-900"
            title={
                <div className="flex items-center gap-2 text-red-600">
                    <Trash2 size={20} />
                    <span>Limpiar Reporte</span>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <Trash2 size={32} className="text-red-600" />
                    </div>
                    <Title variant="h4" className="text-red-600 font-black uppercase tracking-tight">¿LIMPIAR TODO EL REPORTE?</Title>
                    <Text className="text-slate-500 dark:text-neutral-400 max-w-xs">
                        Estás a punto de borrar todas las líneas de gasto ingresadas en este reporte.
                    </Text>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                    <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <Text variant="caption" className="text-amber-700 dark:text-amber-300 font-medium">
                        Esta acción no se puede deshacer. Todos los datos que no hayan sido enviados a tránsito se perderán permanentemente.
                    </Text>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 rounded-xl h-12 font-bold"
                    >
                        CANCELAR
                    </Button>
                    <Button
                        variant="erp"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-12 font-black shadow-lg shadow-red-900/5"
                    >
                        SÍ, LIMPIAR TODO
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ClearReportConfirmModal;
