import React from 'react';
import { Title, Text, Button, ProgressBar, Badge } from '../../../../components/atoms';
import { ArrowLeft, Loader2, FileText, Save, FilterX, Lock } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { TableRow } from './components/TableRow';
import { MobileItemCard } from './components/MobileItemCard';
import { FilterHeader } from './components/FilterHeader';
import { useInventarioData } from './hooks/useInventarioData';
import { useInventarioPDF } from './hooks/useInventarioPDF';

interface InventarioViewProps {
    onBack: () => void;
}

const InventarioView: React.FC<InventarioViewProps> = ({ onBack }) => {
    const { addNotification } = useNotifications();
    const {
        isLoading,
        ronda,
        conteoActivo,
        setConteoActivo,
        progresoC1,
        puedeEditarC2,
        changes,
        isSigning,
        validationErrors,
        filteredItems,
        handleInputChange,
        handleSignAll,
        handleSaveSingle,
        columnFilters,
        getUniqueValues,
        handleColumnFilterChange,
        hasActiveFilters,
        clearAllFilters,
        stats,
        numeroPareja,
        nombreCompanero,
        cedulaCompanero
    } = useInventarioData(addNotification);

    const { handleGeneratePDF } = useInventarioPDF({ filteredItems, ronda, addNotification, numeroPareja, nombreCompanero, cedulaCompanero });

    const userData = React.useMemo(() => {
        const raw = localStorage.getItem('user');
        if (!raw) return { nombre: 'Usuario', cedula: '---' };
        const parsed = JSON.parse(raw);
        return {
            nombre: (parsed.nombre || parsed.name || 'Usuario').toUpperCase(),
            cedula: parsed.cedula || parsed.nrocedula || parsed.id || '---'
        };
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-4 py-2 animate-in fade-in duration-500">
            {/* Header Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] py-2 px-6 rounded-3xl shadow-sm flex flex-col items-stretch relative overflow-hidden min-h-[64px]">
                <div className="flex flex-col md:flex-row items-center justify-start gap-4 w-full z-10">
                    <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
                        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="rounded-xl shrink-0 !p-1" />
                        <div className="flex flex-col justify-center shrink-0">
                            <Title variant="h5" weight="bold" className="leading-tight text-xs">Inventario 2026</Title>
                        </div>

                        {/* User identity */}
                        <div className="flex flex-col border-l border-neutral-200 dark:border-neutral-700 pl-3 ml-1">
                            <div className="flex items-center gap-1.5 leading-none mb-0.5">
                                <Text variant="caption" weight="bold" className="text-[10px] text-neutral-800 dark:text-neutral-200">{userData.nombre}</Text>
                                {numeroPareja && (
                                    <Badge size="sm" variant="primary" className="text-[7px] px-1 py-0 h-3 flex items-center bg-primary-500/10 text-primary-600 border border-primary-500/20 shadow-none">
                                        P{numeroPareja}
                                    </Badge>
                                )}
                            </div>
                            <Text variant="caption" className="text-[7px] text-neutral-500 uppercase font-black tracking-widest">{userData.cedula}</Text>
                        </div>

                        {/* Desktop-only Progress (Visible on md+) */}
                        <div className="hidden md:flex flex-1 items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/30 p-1.5 px-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 h-9 mx-4">
                            <div className="flex flex-col shrink-0">
                                <Text variant="caption" weight="bold" className="text-[6px] text-primary-500 uppercase tracking-tighter leading-none mb-0.5">Items</Text>
                                <div className="flex items-baseline gap-0.5">
                                    <Text variant="body2" weight="bold" className="text-[10px] leading-none text-neutral-900 dark:text-neutral-100">{stats.counted}</Text>
                                    <Text variant="caption" className="text-[8px] opacity-40 font-bold">/{stats.total}</Text>
                                </div>
                            </div>
                            <div className="flex-1 pt-0.5">
                                <ProgressBar progress={stats.percent} variant="accent" className="h-1.5 shadow-inner" />
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                <Text variant="caption" weight="bold" className="text-[7px] text-primary-500 uppercase tracking-tighter leading-none whitespace-nowrap"># E:</Text>
                                <Text variant="body2" weight="bold" className="text-[7px] leading-none text-neutral-900 dark:text-neutral-100">{stats.estantes}</Text>
                            </div>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={clearAllFilters}
                                    icon={FilterX}
                                    title="Quitar filtros"
                                    className="!p-0 !w-5 !h-5 shrink-0 ml-0.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-70 hover:opacity-100 transition-all duration-200 animate-in fade-in zoom-in-50"
                                />
                            )}
                        </div>
                    </div>

                    {/* Conteo Toggle (C1/C2) - Ahora fuera para permitir apilamiento en móvil */}
                    <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-800/50 p-1 rounded-2xl border border-[var(--color-border)] w-full md:w-auto overflow-hidden shadow-inner font-bold">
                        <Button // @audit-ok
                            onClick={() => setConteoActivo('C1')}
                            variant={conteoActivo === 'C1' ? 'primary' : 'ghost'}
                            size="xs"
                            className={`flex-1 md:flex-none px-4 py-1.5 md:py-1 rounded-xl transition-all duration-300 ${conteoActivo === 'C1' ? 'text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                            C1
                        </Button>
                        <Button // @audit-ok
                            onClick={() => {
                                if (progresoC1 < 100) {
                                    addNotification('error', `BLOQUEADO: Debes completar el Conteo 1 al 100% (Actual: ${progresoC1}%) antes de pasar al Reconteo.`);
                                    return;
                                }
                                setConteoActivo('C2');
                            }}
                            title={progresoC1 < 100 ? "Complete el Conteo 1 para habilitar" : ""}
                            variant={conteoActivo === 'C2' ? 'primary' : 'ghost'}
                            size="xs"
                            className={`flex-1 md:flex-none px-4 py-1.5 md:py-1 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${conteoActivo === 'C2' ? 'text-white shadow-md' : progresoC1 < 100 ? 'opacity-40 grayscale cursor-not-allowed text-neutral-400' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                            {progresoC1 < 100 && <Lock size={10} className="mb-0.5" />}
                            C2
                        </Button>
                    </div>

                    {/* Action Buttons (Desktop Version - Icon Only) */}
                    <div className="hidden md:flex items-center gap-2">
                        <Button
                            variant="primary"
                            onClick={handleSignAll}
                            disabled={isSigning || Object.keys(changes).length === 0}
                            className="w-10 rounded-2xl h-8 p-0 flex items-center justify-center shadow-lg shadow-primary-500/20"
                        >
                            {isSigning ? <Loader2 className="animate-spin text-white" size={12} /> : <Save size={16} />}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleGeneratePDF}
                            className="w-10 rounded-2xl flex items-center justify-center border border-primary-500/10 text-primary-600 h-8 shrink-0 bg-neutral-50/50"
                        >
                            <FileText size={16} />
                        </Button>
                    </div>
                </div>

                {/* Mobile Actions & Progress (Visible on mobile only) */}
                <div className="mt-2 flex items-center gap-2 md:hidden">
                    <div className="flex-1 flex items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/30 p-1.5 px-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 h-9">
                        <div className="flex flex-col shrink-0">
                            <Text variant="caption" weight="bold" className="text-[6px] text-primary-500 uppercase tracking-tighter leading-none mb-0.5">Items</Text>
                            <div className="flex items-baseline gap-0.5">
                                <Text variant="body2" weight="bold" className="text-[10px] leading-none text-neutral-900 dark:text-neutral-100">{stats.counted}</Text>
                                <Text variant="caption" className="text-[8px] opacity-40 font-bold">/{stats.total}</Text>
                            </div>
                        </div>
                        <div className="flex-1 pt-0.5">
                            <ProgressBar progress={stats.percent} variant="accent" className="h-1.5 shadow-inner" />
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                            <Text variant="caption" weight="bold" className="text-[7px] text-primary-500 uppercase tracking-tighter leading-none whitespace-nowrap">#. E:</Text>
                            <Text variant="body2" weight="bold" className="text-[10px] leading-none text-neutral-900 dark:text-neutral-100">{stats.estantes}</Text>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={clearAllFilters}
                                icon={FilterX}
                                title="Quitar filtros"
                                className="!p-0 !w-5 !h-5 shrink-0 ml-0.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-70 hover:opacity-100 transition-all duration-200 animate-in fade-in zoom-in-50"
                            />
                        )}
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleSignAll}
                        disabled={isSigning || Object.keys(changes).length === 0}
                        className="w-10 rounded-2xl h-9 p-0 flex items-center justify-center shadow-lg shadow-primary-500/20"
                    >
                        {isSigning ? <Loader2 className="animate-spin text-white" size={14} /> : <Save size={16} />}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleGeneratePDF}
                        className="w-10 rounded-2xl flex items-center justify-center border border-primary-500/10 text-primary-600 h-9 shrink-0 bg-neutral-50/50"
                    >
                        <FileText size={16} />
                    </Button>
                </div>
            </div>

            {/* Aviso de bloqueo C2 */}
            {conteoActivo === 'C2' && !puedeEditarC2 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 rounded-xl animate-in slide-in-from-top-2 duration-300 mx-1">
                    <div className="flex items-center gap-3">
                        <Loader2 className="text-yellow-600 dark:text-yellow-400 shrink-0" size={18} />
                        <Text variant="caption" weight="bold" className="text-yellow-800 dark:text-yellow-200 text-[10px]">
                            RECONTEO BLOQUEADO: Debes completar el Conteo 1 al 100% ({progresoC1}%) para habilitar la edición en C2.
                        </Text>
                    </div>
                </div>
            )}

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden pb-20">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                        <Text variant="caption">Cargando asignaciones...</Text>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-10 text-center bg-neutral-50 dark:bg-neutral-900/40 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                            <FileText className="text-neutral-300" size={32} />
                        </div>
                        <Title variant="h6" weight="bold" className="mb-2">¡Todo al día!</Title>
                        <Text variant="caption" color="text-secondary" className="max-w-[200px]">
                            {conteoActivo === 'C1' 
                                ? '¡Excelente! Has completado el 100% de tu Conteo 1. Ya puedes pasar al Reconteo (C2).' 
                                : 'No tienes ítems asignados para reconteo en esta zona.'}
                        </Text>
                    </div>
                ) : filteredItems.map((item) => (
                    <MobileItemCard
                        key={item.id}
                        item={item}
                        value={changes[item.id]?.cant ?? (item[`user_c${ronda}`] ? String(item[`cant_c${ronda}`] ?? '') : '')}
                        obs={changes[item.id]?.obs ?? String(item[`obs_c${ronda}`] || '')}
                        onChange={(field: 'cant' | 'obs', val: string) => handleInputChange(item.id, field, val)}
                        onSave={handleSaveSingle}
                        isSaving={isSigning}
                        isInvalid={validationErrors.has(item.id)}
                        isSaved={!!item[`user_c${ronda}`] && !changes[item.id]}
                        readOnly={conteoActivo === 'C2' && !puedeEditarC2}
                    />
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm relative overflow-auto max-h-[calc(100vh-160px)] scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                        <Text variant="caption">Cargando tabla...</Text>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                            <FileText className="text-neutral-300" size={24} />
                        </div>
                        <Text variant="body1" weight="bold" color="text-primary">No hay asignaciones pendientes</Text>
                        <Text variant="caption" color="text-secondary" className="max-w-xs text-center">
                            {conteoActivo === 'C1' 
                                ? 'Has completado el 100% de tu Conteo 1. Ya puedes alternar al Reconteo (C2).' 
                                : 'No se encontraron ítems para reconteo en tu zona.'}
                        </Text>
                    </div>
                ) : (
                    <table className="w-full text-left table-separate min-w-[750px]">
                        <thead>
                            <tr className="bg-navy border-none">
                                <FilterHeader label="BDG." col="bodega" minWidth="20px" columnFilters={columnFilters} getUniqueValues={getUniqueValues} onFilterChange={handleColumnFilterChange} />
                                <FilterHeader label="Blq." col="bloque" minWidth="20px" align="center" columnFilters={columnFilters} getUniqueValues={getUniqueValues} onFilterChange={handleColumnFilterChange} />
                                <FilterHeader label="Est." col="estante" minWidth="20px" align="center" columnFilters={columnFilters} getUniqueValues={getUniqueValues} onFilterChange={handleColumnFilterChange} />
                                <FilterHeader label="Niv." col="nivel" minWidth="20px" align="center" columnFilters={columnFilters} getUniqueValues={getUniqueValues} onFilterChange={handleColumnFilterChange} />
                                <FilterHeader label="Código" col="codigo" minWidth="45px" columnFilters={columnFilters} getUniqueValues={getUniqueValues} onFilterChange={handleColumnFilterChange} />
                                <th className="p-1 px-1 text-[12px] font-bold uppercase tracking-tighter text-white w-[180px] sticky top-0 z-20 bg-navy ios-sticky-fix">Descripción</th>
                                <th className="p-1 px-1 text-[12px] font-bold uppercase tracking-tighter text-white text-center w-[30px] sticky top-0 z-20 bg-navy ios-sticky-fix">Und.</th>
                                <FilterHeader label={`Cant`} col={`cant_c${ronda}`} minWidth="55px" align="center" columnFilters={columnFilters} getUniqueValues={getUniqueValues} onFilterChange={handleColumnFilterChange} />
                                <th className="p-1 px-1 text-[12px] font-bold uppercase tracking-tighter text-white w-[150px] sticky top-0 z-20 bg-navy ios-sticky-fix">OBSERVACIONES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                            {filteredItems.map((item) => (
                                <TableRow
                                    key={item.id}
                                    item={item}
                                    value={changes[item.id]?.cant ?? (item[`user_c${ronda}`] ? String(item[`cant_c${ronda}`] ?? '') : '')}
                                    obs={changes[item.id]?.obs ?? String(item[`obs_c${ronda}`] || '')}
                                    onChange={(field: 'cant' | 'obs', val: string) => handleInputChange(item.id, field, val)}
                                    isInvalid={validationErrors.has(item.id)}
                                    isSaved={!!item[`user_c${ronda}`] && !changes[item.id]}
                                    readOnly={conteoActivo === 'C2' && !puedeEditarC2}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default InventarioView;
