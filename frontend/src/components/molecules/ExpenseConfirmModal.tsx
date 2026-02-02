import React from 'react';
import { Save, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import { Button, Title, Text } from '../atoms';

interface ExpenseConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    totalGeneral: number;
    totalFacturado: number;
    totalSinFactura: number;
}

const ExpenseConfirmModal: React.FC<ExpenseConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    totalGeneral,
    totalFacturado,
    totalSinFactura
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title={
                <div className="flex items-center gap-2">
                    <Save className="text-[var(--color-primary)]" size={20} />
                    <span>Confirmar Envío</span>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <Save size={32} className="text-[var(--color-primary)]" />
                    </div>
                    <Title variant="h4" className="text-[var(--color-primary)] font-black">¿ENVIAR REPORTE?</Title>
                    <Text className="text-slate-500 dark:text-neutral-400">
                        Estás a punto de enviar una legalización de gastos por un valor total de:
                    </Text>
                    <div className="bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 p-4 rounded-2xl border border-[var(--color-primary)]/10 w-full">
                        <Text className="text-3xl font-black text-[var(--color-primary)]">${totalGeneral.toLocaleString()}</Text>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
                        <Text variant="caption" weight="bold" className="text-slate-400 dark:text-neutral-500 uppercase text-[10px]">Con Factura</Text>
                        <Text weight="bold" className="text-slate-700 dark:text-neutral-200">${totalFacturado.toLocaleString()}</Text>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
                        <Text variant="caption" weight="bold" className="text-slate-400 dark:text-neutral-500 uppercase text-[10px]">Sin Factura</Text>
                        <Text weight="bold" className="text-slate-700 dark:text-neutral-200">${totalSinFactura.toLocaleString()}</Text>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <Text variant="caption" className="text-amber-700 dark:text-amber-300 leading-tight">
                        Al confirmar, el reporte pasará a revisión por el área administrativa. Asegúrate de que los centros de costo sean correctos.
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
                        onClick={onConfirm}
                        className="flex-1 bg-[var(--color-primary)] rounded-xl h-12 font-black shadow-lg shadow-blue-900/10"
                    >
                        CONFIRMAR Y ENVIAR
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ExpenseConfirmModal;
