import React from 'react';
import { Text } from '../../../components/atoms';
import ExpenseMobileCard from './ExpenseMobileCard';

interface ExpenseMobileViewProps {
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
}

const ExpenseMobileView: React.FC<ExpenseMobileViewProps> = ({
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
}) => (
    <div className="md:hidden space-y-4 mt-4">
        {lineas.length === 0 ? (
            <div className="p-10 text-center bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] border-dashed">
                <Text className="opacity-40 italic">No hay gastos reportados.</Text>
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
                    errors={validationErrors[linea.id] || []}
                    isReadOnly={isReadOnly}
                    categorias={categorias}
                />
            ))
        )}
    </div>
);

export default ExpenseMobileView;
