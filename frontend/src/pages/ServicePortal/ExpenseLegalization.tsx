import React, { useState } from 'react';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { Button, Text, Title, Spinner, Textarea } from '../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';
import { useNotifications } from '../../components/notifications/NotificationsContext';
import { useExpenseForm } from './hooks/useExpenseForm';
import UserSummaryCard from './components/UserSummaryCard';
import ExpenseLineItem from './components/ExpenseLineItem';
import ExpenseTotals from './components/ExpenseTotals';

import { ExpenseConfirmModal } from '../../components/molecules';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface ExpenseLegalizationProps {
    user: any;
    onBack: () => void;
    onSuccess: () => void;
}

const ExpenseLegalization: React.FC<ExpenseLegalizationProps> = ({ user, onBack, onSuccess }) => {
    const {
        lineas,
        setLineas,
        observacionesGral,
        setObservacionesGral,
        ots,
        isSearchingOT,
        addLinea,
        removeLinea,
        updateLinea,
        handleOTSearch,
        selectOT,
        totalFacturado,
        totalSinFactura,
        totalGeneral,
        clearForm
    } = useExpenseForm();

    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { addNotification } = useNotifications();

    const handlePrepareSubmit = () => {
        const tieneLineasIncompletas = lineas.some(l =>
            !l.categoria || !l.ot || !l.cc || !l.scc ||
            (Number(l.valorConFactura) === 0 && Number(l.valorSinFactura) === 0)
        );

        if (lineas.length === 0) {
            addNotification('error', 'Debe reportar al menos un gasto.');
            return;
        }

        if (tieneLineasIncompletas) {
            addNotification('error', 'Por favor complete todos los campos obligatorios.');
            return;
        }

        setShowConfirmModal(true);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setShowConfirmModal(false);
        try {
            const payload = {
                empleado_cedula: user.cedula || user.id,
                empleado_nombre: user.name,
                area: user.area || 'N/A',
                cargo: user.cargo || 'N/A',
                ciudad: user.sede || 'N/A',
                observaciones_gral: observacionesGral,
                usuario_id: user.cedula || user.id,
                gastos: lineas.map(l => ({
                    categoria: l.categoria,
                    fecha: l.fecha,
                    ot: l.ot,
                    cc: l.cc,
                    scc: l.scc,
                    valorConFactura: Number(l.valorConFactura),
                    valorSinFactura: Number(l.valorSinFactura),
                    observaciones: l.observaciones
                }))
            };

            await axios.post(`${API_BASE_URL}/viaticos/enviar`, payload);
            // ELIMINADO: addNotification('success', 'Reporte de gastos enviado correctamente.');
            // Se asume que el contenedor principal maneja la notificación de éxito al disparar onSuccess()
            // o que la notificación duplicada venía de aquí y de onSuccess.
            clearForm();
            onSuccess();
        } catch (err: any) {
            console.error("Error enviando reporte:", err);
            addNotification('error', err.response?.data?.detail || 'Error al enviar el reporte.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-1 pb-28 max-w-[1300px] mx-auto">
            {/* Header / Nav */}
            <div className="md:sticky top-16 z-40 bg-[var(--color-background)]/80 backdrop-blur-md py-1.5 flex items-center justify-between transition-all">
                <Button variant="ghost" onClick={onBack} size="sm" className="flex items-center gap-2">
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="hidden sm:inline">Volver</Text>
                </Button>
                <Title variant="h5" weight="bold" color="text-primary" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap md:text-xl">
                    REPORTE DE GASTOS
                </Title>
                <div className="w-10 md:w-20"></div>
            </div>

            {/* Info Tarjeta Azul */}
            <UserSummaryCard user={user} />

            <div className="space-y-1 md:space-y-2">
                {/* Cabecera Sección Gastos */}
                <div className="md:sticky top-[180px] z-20 bg-[var(--color-background)]/80 backdrop-blur-md py-1 flex justify-between items-center px-1">
                    <Title variant="h6" weight="bold" className="text-slate-800">DETALLE DE GASTOS</Title>
                    <Button
                        onClick={addLinea}
                        variant="erp"
                        size="sm"
                        className="px-4 h-9 rounded-xl text-[11px] font-bold shadow-sm"
                        icon={Plus}
                    >
                        Agregar Gasto
                    </Button>
                </div>

                {/* Lista de Líneas */}
                <div className="space-y-4">
                    {lineas.map((linea, index) => (
                        <ExpenseLineItem
                            key={linea.id}
                            linea={linea}
                            index={index}
                            isSearchingOT={isSearchingOT}
                            ots={ots}
                            updateLinea={updateLinea}
                            removeLinea={removeLinea}
                            handleOTSearch={handleOTSearch}
                            selectOT={selectOT}
                            setLineas={setLineas}
                        />
                    ))}
                </div>
            </div>

            {/* Observaciones y Totales */}
            <div className="space-y-6 max-w-[1300px] mx-auto mt-6 px-1">
                <div className="space-y-2">
                    <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 uppercase tracking-tight block px-1">Observaciones Generales</Text>
                    <Textarea
                        placeholder="Escribe aquí cualquier observación..."
                        value={observacionesGral}
                        onChange={(e) => setObservacionesGral(e.target.value)}
                        rows={4}
                        className="w-full bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                    />
                </div>

                <ExpenseTotals
                    totalFacturado={totalFacturado}
                    totalSinFactura={totalSinFactura}
                    totalGeneral={totalGeneral}
                />
            </div>

            {/* Modal de Confirmación */}
            <ExpenseConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleSubmit}
                totalGeneral={totalGeneral}
                totalFacturado={totalFacturado}
                totalSinFactura={totalSinFactura}
            />

            {/* Botón Flotante Enviar */}
            <div className="fixed bottom-0 left-0 w-full bg-[var(--color-surface)]/80 backdrop-blur-xl border-t border-[var(--color-border)] p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <div className="max-w-[1300px] mx-auto flex items-center justify-center">
                    <Button
                        onClick={handlePrepareSubmit}
                        disabled={isLoading}
                        variant="erp"
                        className="px-20 h-14 rounded-2xl flex items-center gap-3 shadow-xl font-bold text-lg active:scale-95 transition-all"
                    >
                        {isLoading ? <Spinner size="sm" /> : <Save size={24} />}
                        {isLoading ? 'Procesando...' : 'Enviar Reporte'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseLegalization;
