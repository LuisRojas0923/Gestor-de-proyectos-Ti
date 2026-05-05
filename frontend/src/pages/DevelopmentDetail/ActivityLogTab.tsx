import React, { useRef } from 'react';
import { Activity } from '../../types';
import { Button, Text } from '../../components/atoms';
import { Filter, RotateCcw, CheckCircle2, Pencil, Trash2, Plus } from 'lucide-react';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { ColumnFilterPopover } from '../../components/molecules/ColumnFilterPopover';

interface ActivityLogTabProps {
    activities: Activity[];
    loading: boolean;
    darkMode: boolean;
    hideCompleted: boolean;
    onHideCompletedChange: (hide: boolean) => void;
    onCreateOpen: () => void;
    onComplete: (activity: Activity) => void;
    onEdit: (activity: Activity) => void;
    onDelete: (activity: Activity) => void;
}

const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
    activities,
    loading,
    onCreateOpen,
    onComplete,
    onEdit,
    onDelete
}) => {
    const columnAccessors = {
        date: (a: Activity) => new Date(a.created_at).toLocaleDateString(),
        status: (a: Activity) => a.status,
    };

    const {
        filteredData,
        uniqueValues,
        activePopover,
        setActivePopover,
        hasActiveFilter,
        toggleOption,
        selectAll,
        clearColumnFilter,
        clearAllFilters,
        filters,
        activeFilterCount
    } = useColumnFilters(activities || [], columnAccessors);

    const anchorRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const columns = [
        { key: 'date', label: 'Fecha' },
        { key: 'status', label: 'Estado' },
        { key: 'description', label: 'Descripción / Notas', noFilter: true },
        { key: 'dates', label: 'Fechas Planificadas', noFilter: true },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <Text variant="body2" weight="bold" className="text-neutral-500 uppercase tracking-widest">
                        Historial de Avances
                    </Text>
                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
                    <div className="flex items-center gap-2">
                        <Text variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50">
                            {filteredData.length} Registros
                        </Text>
                        {activeFilterCount > 0 && (
                            <button 
                                onClick={clearAllFilters}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20"
                            >
                                <RotateCcw size={12} />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={onCreateOpen}
                >
                    Nuevo Avance
                </Button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                <div className="overflow-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-20 bg-[var(--deep-navy)] text-white">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`
                                            px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b border-[var(--deep-navy)]
                                            ${col.key === 'date' ? 'w-[120px]' : ''}
                                            ${col.key === 'status' ? 'w-[120px]' : ''}
                                            ${col.key === 'dates' ? 'w-[180px]' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{col.label}</span>
                                            {!col.noFilter && (
                                                <button
                                                    ref={(el) => (anchorRefs.current[col.key] = el)}
                                                    onClick={() => setActivePopover(activePopover === col.key ? null : col.key)}
                                                    className={`
                                                        p-1 rounded-md transition-all hover:bg-white/20
                                                        ${hasActiveFilter(col.key) ? 'text-yellow-400' : 'text-white/40 hover:text-white'}
                                                    `}
                                                >
                                                    <Filter size={12} fill={hasActiveFilter(col.key) ? 'currentColor' : 'none'} />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest w-[120px] text-center">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {loading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">Cargando historial…</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-gray-400 dark:text-gray-500 italic text-sm">No hay registros con los filtros aplicados.</td></tr>
                            ) : (
                                filteredData.map((a) => (
                                    <tr key={a.id} className="group hover:bg-[var(--color-surface-variant)] transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(a.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`
                                                inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border
                                                ${a.status === 'completada' 
                                                    ? 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400' 
                                                    : 'text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400'}
                                            `}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{a.description}</span>
                                                {a.notes && (
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 italic mt-0.5 line-clamp-2" title={a.notes}>
                                                        {a.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                {a.start_date && (
                                                    <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                                                        <span className="font-bold opacity-50">INI:</span> {a.start_date}
                                                    </div>
                                                )}
                                                {a.end_date && (
                                                    <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                                                        <span className="font-bold opacity-50">FIN:</span> {a.end_date}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {a.status !== 'completada' && (
                                                    <button 
                                                        onClick={() => onComplete(a)}
                                                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                                                        title="Marcar como completada"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => onEdit(a)}
                                                    className="p-1.5 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(a)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Popovers de Filtro */}
            {Object.keys(columnAccessors).map((key) => (
                activePopover === key && (
                    <ColumnFilterPopover
                        key={key}
                        columnKey={key}
                        title={columns.find(c => c.key === key)?.label || key}
                        options={uniqueValues[key] || []}
                        selectedValues={filters[key] || new Set()}
                        onToggleOption={toggleOption}
                        onSelectAll={selectAll}
                        onClear={clearColumnFilter}
                        onClose={() => setActivePopover(null)}
                        anchorRef={{ current: anchorRefs.current[key] }}
                    />
                )
            ))}
        </div>
    );
};

export default ActivityLogTab;
