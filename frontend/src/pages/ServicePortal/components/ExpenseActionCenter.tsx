import React from 'react';
import { Save, Download, Trash2, Send } from 'lucide-react';
import { Button } from '../../../components/atoms';
import ExpenseTotals from './ExpenseTotals';
import { generateExpenseReportPDF } from '../../../utils/generateExpenseReportPDF';

interface ExpenseActionCenterProps {
    totalFacturado: number;
    totalSinFactura: number;
    totalGeneral: number;
    isLoading: boolean;
    isReadOnly: boolean;
    canDownloadPDF: boolean;
    activeReporteId: string | undefined;
    handleSaveDraft: () => void;
    handlePrepareSubmit: () => void;
    setShowDeleteReportModal: (show: boolean) => void;
    clearForm: () => void;
    onBack: () => void;
    user: any;
    lineas: any[];
}

const ExpenseActionCenter: React.FC<ExpenseActionCenterProps> = ({
    totalFacturado,
    totalSinFactura,
    totalGeneral,
    isLoading,
    isReadOnly,
    canDownloadPDF,
    activeReporteId,
    handleSaveDraft,
    handlePrepareSubmit,
    setShowDeleteReportModal,
    clearForm,
    onBack,
    user,
    lineas,
}) => (
    <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
        <div className="w-full md:w-[50%] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] py-2 px-4 shadow-sm h-[84px] flex items-center">
            <ExpenseTotals
                totalFacturado={totalFacturado}
                totalSinFactura={totalSinFactura}
                totalGeneral={totalGeneral}
            />
        </div>

        <div className="flex items-center justify-end w-full md:w-[50%] h-[84px]">
            <div className="grid grid-cols-3 gap-2 w-full h-full items-center">
                <Button
                    onClick={handleSaveDraft}
                    disabled={isLoading || isReadOnly}
                    variant="erp"
                    size="md"
                    icon={Save}
                    className="h-[68px] font-bold rounded-2xl shadow-none px-2 uppercase text-[10px] sm:text-xs flex-col gap-1 justify-center shrink-0 border-slate-200"
                >
                    GUARDAR
                </Button>
                {canDownloadPDF ? (
                    <Button
                        onClick={() => generateExpenseReportPDF(activeReporteId || '', user, lineas)}
                        variant="erp" size="md" icon={Download}
                        className="h-[68px] font-bold rounded-2xl shadow-none px-2 uppercase text-[10px] sm:text-xs flex-col gap-1 justify-center shrink-0 border-blue-200 text-blue-700 dark:text-blue-400"
                    >
                        PDF
                    </Button>
                ) : (
                    <Button
                        onClick={() => {
                            if (activeReporteId) setShowDeleteReportModal(true);
                            else { clearForm(); onBack(); }
                        }}
                        disabled={isLoading || isReadOnly}
                        variant="erp" size="md" icon={Trash2}
                        className="h-[68px] font-bold rounded-2xl shadow-none px-2 uppercase text-[10px] sm:text-xs flex-col gap-1 justify-center shrink-0 border-red-200 text-red-600 dark:text-red-400 disabled:opacity-30"
                    >
                        ELIMINAR
                    </Button>
                )}
                <Button
                    onClick={handlePrepareSubmit}
                    disabled={isLoading || isReadOnly}
                    loading={isLoading}
                    variant="erp" size="md" icon={Send}
                    className="h-[68px] font-black rounded-2xl shadow-lg shadow-[var(--color-primary)]/10 px-2 uppercase text-[11px] sm:text-sm text-[#002060] dark:text-blue-300 flex-col gap-1 justify-center shrink-0 disabled:opacity-30"
                >
                    {isLoading ? 'ENVIANDO...' : 'ENVIAR'}
                </Button>
            </div>
        </div>
    </div>
);

export default ExpenseActionCenter;
