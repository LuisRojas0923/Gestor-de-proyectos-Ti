import React from 'react';
import { useLocation } from 'react-router-dom';
import { Textarea, Text } from '../../../components/atoms';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { useExpenseSubmission } from '../hooks/useExpenseSubmission';
import UserSummaryCard from '../components/UserSummaryCard';
import ExpenseHeader from '../components/ExpenseHeader';
import ExpenseActionCenter from '../components/ExpenseActionCenter';
import ExpenseDesktopTable from '../components/ExpenseDesktopTable';
import ExpenseMobileView from '../components/ExpenseMobileView';
import { ExpenseConfirmModal, DeleteReportConfirmModal, ReportLockedModal } from '../../../components/molecules';

interface ExpenseLegalizationProps {
    user: any;
    onBack: () => void;
    onSuccess: () => void;
    initialLineas?: any[];
    initialObservaciones?: string;
}

const ExpenseLegalization: React.FC<ExpenseLegalizationProps> = ({
    user,
    onBack,
    onSuccess,
    initialLineas,
    initialObservaciones
}) => {
    const location = useLocation();
    const state = location.state as any;

    const {
        lineas, setLineas, observacionesGral, setObservacionesGral,
        activeReporteId, setActiveReporteId, currentEstado, setCurrentEstado,
        ots, isSearchingOT, addLinea, removeLinea, updateLinea,
        handleOTSearch, selectOT, totalFacturado, totalSinFactura,
        totalGeneral, clearForm, loadLineas, validationErrors,
        setValidationErrors, logMarina
    } = useExpenseForm();

    const {
        isLoading, isDeletingReport, categorias, showConfirmModal, setShowConfirmModal,
        showDeleteReportModal, setShowDeleteReportModal, showLockedModal, setShowLockedModal,
        handlePrepareSubmit, handleSubmit, handleDeleteReport
    } = useExpenseSubmission({
        user, lineas, observacionesGral, activeReporteId, setActiveReporteId,
        setCurrentEstado, clearForm, onSuccess, onBack, setValidationErrors, logMarina
    });

    const isReadOnly = currentEstado !== undefined && currentEstado !== 'BORRADOR' && currentEstado !== 'INICIAL';
    const canDownloadPDF = currentEstado === 'INICIAL' || currentEstado === 'PROCESADO';
    const hasLoadedInitial = React.useRef(false);

    React.useEffect(() => {
        if (hasLoadedInitial.current) return;
        if (state?.newReport) {
            clearForm();
        } else {
            const lineasACargar = initialLineas || state?.lineas;
            const obsACargar = initialObservaciones || state?.observaciones;
            if (lineasACargar?.length) {
                loadLineas(lineasACargar, obsACargar);
                const repId = state?.reporte_id || lineasACargar[0]?.reporte_id;
                if (repId) setActiveReporteId(repId);
                if (state?.estado) setCurrentEstado(state.estado);
            }
        }
        hasLoadedInitial.current = true;
    }, [initialLineas, initialObservaciones, state, loadLineas, clearForm, setActiveReporteId, setCurrentEstado]);

    return (
        <div className="space-y-1 pb-28 max-w-[1300px] mx-auto">
            <ExpenseHeader onBack={onBack} />
            <UserSummaryCard user={user} reporteId={activeReporteId} />
            <ExpenseActionCenter
                totalFacturado={totalFacturado} totalSinFactura={totalSinFactura} totalGeneral={totalGeneral}
                isLoading={isLoading} isReadOnly={isReadOnly} canDownloadPDF={canDownloadPDF}
                activeReporteId={activeReporteId} handleSaveDraft={() => handleSubmit('BORRADOR')}
                handlePrepareSubmit={handlePrepareSubmit} setShowDeleteReportModal={setShowDeleteReportModal}
                clearForm={clearForm} onBack={onBack} user={user} lineas={lineas}
            />

            <ExpenseDesktopTable
                lineas={lineas} isSearchingOT={isSearchingOT} ots={ots} updateLinea={updateLinea}
                removeLinea={removeLinea} handleOTSearch={handleOTSearch} selectOT={selectOT}
                setLineas={setLineas} validationErrors={validationErrors} isReadOnly={isReadOnly}
                categorias={categorias} addLinea={addLinea}
            />

            <ExpenseMobileView
                lineas={lineas} isSearchingOT={isSearchingOT} ots={ots} updateLinea={updateLinea}
                removeLinea={removeLinea} handleOTSearch={handleOTSearch} selectOT={selectOT}
                setLineas={setLineas} validationErrors={validationErrors} isReadOnly={isReadOnly}
                categorias={categorias}
            />

            <div className="space-y-2 mt-6 px-1">
                <Text as="label" variant="caption" weight="bold" className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest opacity-70 px-1">
                    Observaciones Generales
                </Text>
                <Textarea
                    placeholder="Escribe aquí cualquier observación adicional..." value={observacionesGral}
                    onChange={(e) => setObservacionesGral(e.target.value)} rows={4} disabled={isReadOnly}
                    className="w-full bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all text-sm shadow-sm disabled:opacity-50"
                />
            </div>

            <ExpenseConfirmModal
                isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}
                onConfirm={() => handleSubmit('INICIAL')} totalGeneral={totalGeneral}
                totalFacturado={totalFacturado} totalSinFactura={totalSinFactura}
            />
            <DeleteReportConfirmModal
                isOpen={showDeleteReportModal} onClose={() => setShowDeleteReportModal(false)}
                onConfirm={handleDeleteReport} reportCode={activeReporteId} isLoading={isDeletingReport}
            />
            <ReportLockedModal
                isOpen={showLockedModal} onClose={() => setShowLockedModal(false)} reportId={activeReporteId || undefined}
            />
        </div>
    );
};

export default ExpenseLegalization;
