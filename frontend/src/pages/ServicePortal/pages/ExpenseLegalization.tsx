import React, { useState } from 'react';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { Button, Text, Title, Textarea } from '../../../components/atoms';
import axios from 'axios';
import { API_CONFIG } from '../../../config/api';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { useExpenseForm } from '../hooks/useExpenseForm';
import UserSummaryCard from '../components/UserSummaryCard';
import ExpenseLineItem from '../components/ExpenseLineItem';
import ExpenseMobileCard from '../components/ExpenseMobileCard';
import ExpenseTotals from '../components/ExpenseTotals';

import { ExpenseConfirmModal } from '../../../components/molecules';

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
                    ot_id: l.ot_id, // Ensure ot_id is included if it exists in the line item
                    cc: l.cc,
                    scc: l.scc,
                    valorConFactura: Number(l.valorConFactura),
                    valorSinFactura: Number(l.valorSinFactura),
                    observaciones: l.observaciones,
                    adjuntos: l.adjuntos || [] // Include adjuntos property, default to empty array if not present
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

            {/* Command Center: Totales y Acciones Principales */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-3 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Totales */}
                    <div className="flex-1 w-full">
                        <ExpenseTotals
                            totalFacturado={totalFacturado}
                            totalSinFactura={totalSinFactura}
                            totalGeneral={totalGeneral}
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Button
                            onClick={handlePrepareSubmit}
                            disabled={isLoading}
                            loading={isLoading}
                            variant="erp"
                            size="md"
                            icon={Save}
                            className="h-10 font-black rounded-xl shadow-lg shadow-[var(--color-primary)]/10 px-6"
                        >
                            {isLoading ? 'ENVIANDO...' : 'ENVIAR REPORTE'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-4 mt-8">
                {/* Cabecera de Tabla */}
                <div className="flex items-center justify-between px-2">
                    <Title variant="h6" weight="bold" className="text-sm tracking-tight flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-[var(--color-primary)] rounded-full"></span>
                        ÍTEMS DEL REPORTE
                        <Text as="span" variant="caption" className="ml-2 font-medium opacity-40 lowercase">
                            ({lineas.length} registros)
                        </Text>
                    </Title>
                    <Button
                        onClick={addLinea}
                        variant="erp"
                        size="xs"
                        icon={Plus}
                        className="font-bold rounded-xl px-4"
                    >
                        AGREGAR GASTO
                    </Button>
                </div>

                {/* VISTA DESKTOP (Tabla con Scroll Interno) */}
                <div className={`hidden md:block bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm ${isSearchingOT ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <div className={`max-h-[470px] scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent ${isSearchingOT ? 'overflow-visible' : 'overflow-auto'}`}>
                        <table className="w-full border-separate border-spacing-0">
                            <thead className="bg-[#002060] sticky top-0 z-[40] shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-10 border-b border-white/10">#</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white min-w-[150px] border-b border-white/10">Categoría</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-40 border-b border-white/10">Fecha</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white min-w-[120px] border-b border-white/10">OT / OS</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-32 border-b border-white/10">C. Costo</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white w-32 border-b border-white/10">Subcentro</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white w-36 border-b border-white/10">Val. Factura</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white w-36 border-b border-white/10">Val. Sin Fac.</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white border-b border-white/10">Observaciones</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-12 border-b border-white/10">Adj.</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-white w-16 border-b border-white/10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent">
                                {lineas.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center">
                                            <Text className="opacity-40 italic">No hay gastos reportados. Haz clic en "Agregar Gasto".</Text>
                                        </td>
                                    </tr>
                                ) : (
                                    lineas.map((linea, index) => (
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* VISTA MÓVIL (Tarjetas con Scroll Natural) */}
                <div className="md:hidden space-y-4">
                    {lineas.length === 0 ? (
                        <div className="p-10 text-center bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] border-dashed">
                            <Text className="opacity-40 italic">No hay gastos reportados. Haz clic en "Agregar Gasto".</Text>
                        </div>
                    ) : (
                        lineas.map((linea, index) => (
                            <ExpenseMobileCard
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
                        ))
                    )}
                </div>
            </div>

            {/* Observaciones Generales Inferior */}
            <div className="space-y-2 mt-6 px-1">
                <Text as="label" variant="caption" weight="bold" className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest opacity-70 px-1">
                    Observaciones Generales
                </Text>
                <Textarea
                    placeholder="Escribe aquí cualquier observación adicional..."
                    value={observacionesGral}
                    onChange={(e) => setObservacionesGral(e.target.value)}
                    rows={4}
                    className="w-full bg-[var(--color-surface)] border-[var(--color-border)] rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all text-sm shadow-sm"
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
        </div>
    );
};

export default ExpenseLegalization;
