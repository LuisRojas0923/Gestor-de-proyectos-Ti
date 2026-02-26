import React from 'react';
import { Title, Text, Button } from '../../../components/atoms';
import { Plus } from 'lucide-react';
import ExpenseLineItem from './ExpenseLineItem';

interface ExpenseDesktopTableProps {
    lineas: any[];
    isSearchingOT: string | null;
    ots: any[];
    updateLinea: any;
    removeLinea: any;
    handleOTSearch: any;
    selectOT: any;
    setLineas: any;
    validationErrors: any;
    isReadOnly: boolean;
    categorias: any[];
    addLinea: () => void;
}

const ExpenseDesktopTable: React.FC<ExpenseDesktopTableProps> = ({
    lineas,
    isSearchingOT,
    ots,
    updateLinea,
    removeLinea,
    handleOTSearch,
    selectOT,
    setLineas,
    validationErrors,
    isReadOnly,
    categorias,
    addLinea
}) => (
    <div className="space-y-4 mt-8">
        <div className="flex flex-row items-center justify-between px-3 sm:px-4 py-2 bg-[var(--color-surface-variant)]/40 border-b border-[var(--color-border)] gap-2 rounded-t-2xl min-h-[48px]">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full hidden sm:block"></div>
                <Title variant="h6" weight="bold" className="text-[10px] sm:text-xs tracking-tight uppercase whitespace-nowrap flex items-center gap-1">
                    ÍTEMS <Text as="span" className="hidden sm:inline">DEL REPORTE</Text>
                    <Text as="span" variant="caption" className="font-medium opacity-40 lowercase text-[9px] sm:text-[10px]">
                        ({lineas.length})
                    </Text>
                </Title>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 ml-auto">
                <Button
                    onClick={addLinea}
                    disabled={isReadOnly}
                    variant="erp" size="xs" icon={Plus}
                    className="font-bold rounded-lg px-2 sm:px-2.5 py-1 text-[var(--color-primary)] text-[9px] w-fit shadow-sm bg-white dark:bg-black/20 disabled:opacity-50"
                >
                    <Text as="span" weight="bold" color="inherit" className="hidden sm:inline uppercase">AGREGAR LINEA</Text>
                    <Text as="span" weight="bold" color="inherit" className="sm:hidden uppercase">AGREGAR</Text>
                </Button>
            </div>
        </div>

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
                                    <Text className="opacity-40 italic">No hay gastos reportados.</Text>
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
                                    errors={validationErrors[linea.id] || []}
                                    isReadOnly={isReadOnly}
                                    categorias={categorias}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

export default ExpenseDesktopTable;
