import React from 'react';
import { Activity } from '../../types';
import { Button, Text } from '../../components/atoms';
import { RotateCcw, CheckCircle2, Pencil, Trash2, Plus, History } from 'lucide-react';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { DataTable, DataTableColumn } from '../../components/molecules/DataTable';

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
    const columnAccessors = React.useMemo(() => ({
        date: (a: Activity) => new Date(a.created_at).toLocaleDateString(),
        status: (a: Activity) => a.status,
    }), []);

    const {
        filteredData,
        uniqueValues,
        clearAllFilters,
        filters,
        activeFilterCount,
        setColumnFilter
    } = useColumnFilters(activities || [], columnAccessors);

    const columns: DataTableColumn<Activity>[] = [
        {
            key: 'date',
            label: 'Fecha',
            minWidth: '120px',
            filterable: true,
            render: (a) => (
                <Text variant="caption" className="text-gray-500 dark:text-gray-400">
                    {new Date(a.created_at).toLocaleDateString()}
                </Text>
            )
        },
        {
            key: 'status',
            label: 'Estado',
            minWidth: '120px',
            filterable: true,
            render: (a) => (
                <span className={`
                    inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border
                    ${a.status === 'completada' 
                        ? 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : 'text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'}
                `}>
                    {a.status}
                </span>
            )
        },
        {
            key: 'description',
            label: 'Descripción / Notas',
            flex: true,
            minWidth: '300px',
            render: (a) => (
                <div className="flex flex-col min-w-0">
                    <Text variant="caption" weight="bold" className="truncate text-gray-800 dark:text-gray-200">
                        {a.description}
                    </Text>
                    {a.notes && (
                        <Text variant="caption" color="text-secondary" className="truncate mt-0.5 italic" title={a.notes}>
                            {a.notes}
                        </Text>
                    )}
                </div>
            )
        },
        {
            key: 'dates',
            label: 'Fechas Planificadas',
            minWidth: '180px',
            render: (a) => (
                <div className="flex flex-col gap-0.5">
                    {a.start_date && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                            <span className="font-bold opacity-50 uppercase">Ini:</span> {a.start_date}
                        </div>
                    )}
                    {a.end_date && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                            <span className="font-bold opacity-50 uppercase">Fin:</span> {a.end_date}
                        </div>
                    )}
                    {!a.start_date && !a.end_date && <Text variant="caption" color="text-secondary">-</Text>}
                </div>
            )
        }
    ];

    const renderRowActions = (a: Activity) => (
        <div className="flex items-center gap-1">
            {a.status !== 'completada' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onComplete(a); }}
                    className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                    title="Marcar como completada"
                >
                    <CheckCircle2 size={16} />
                </button>
            )}
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit(a); }}
                className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                title="Editar"
            >
                <Pencil size={16} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(a); }}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                title="Eliminar"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

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

            <DataTable<Activity>
                columns={columns}
                data={filteredData}
                keyExtractor={(a) => String(a.id)}
                isLoading={loading}
                renderRowActions={renderRowActions}
                actionsMinWidth="120px"
                columnFilters={filters}
                columnOptions={uniqueValues}
                onFilterChange={setColumnFilter}
                emptyMessage="Sin historial de avances aún."
                emptyIcon={<History size={40} className="opacity-20" />}
                maxHeight="max-h-[500px]"
            />
        </div>
    );
};

export default ActivityLogTab;

export default ActivityLogTab;
