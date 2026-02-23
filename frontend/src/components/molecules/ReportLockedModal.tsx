import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import Modal from './Modal';
import { Button, Title, Text } from '../atoms';

interface ReportLockedModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportId?: string;
}

const ReportLockedModal: React.FC<ReportLockedModalProps> = ({
    isOpen,
    onClose,
    reportId
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
                <div className="flex items-center gap-2">
                    <Lock className="text-amber-500" size={20} />
                    <Text as="span" weight="bold">Reporte Bloqueado</Text>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                        <Lock size={40} className="text-amber-500" />
                    </div>

                    <div className="space-y-2">
                        <Title variant="h4" className="text-amber-600 dark:text-amber-500 font-extrabold uppercase">
                            ACCESO RESTRINGIDO
                        </Title>
                        <div className="flex justify-center">
                            <div className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                <Text weight="bold" className="text-amber-700 dark:text-amber-300 font-mono text-xs">
                                    {reportId || 'ID DESCONOCIDO'}
                                </Text>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-sm">
                        <Text className="text-slate-600 dark:text-neutral-300 leading-relaxed">
                            Este reporte ya se encuentra en estado <Text as="span" weight="bold" color="text-primary">PROCESADO</Text> o en revisión. Por seguridad, el sistema ha bloqueado nuevas modificaciones o guardado de datos.
                        </Text>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 flex gap-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-lg shrink-0 h-fit">
                        <ArrowLeft size={16} className="text-blue-600 dark:text-blue-300" />
                    </div>
                    <Text variant="caption" className="text-blue-700 dark:text-blue-300 text-left">
                        Si necesitas realizar un cambio urgente, por favor contacta al área administrativa o crea un nuevo reporte de legalización.
                    </Text>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="erp"
                        onClick={onClose}
                        className="flex-1 bg-slate-200 dark:bg-neutral-800 !text-slate-700 dark:!text-neutral-200 rounded-xl h-12 font-bold border-none shadow-none hover:bg-slate-300 dark:hover:bg-neutral-700 transition-colors"
                    >
                        ENTENDIDO
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ReportLockedModal;
