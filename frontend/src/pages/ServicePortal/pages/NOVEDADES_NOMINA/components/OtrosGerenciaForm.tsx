import React, { useState, useEffect } from 'react';
import { Button, Input, Text, MaterialCard, Title, Badge } from '../../../../../components/atoms';
import { Plus, Trash2, Send, Search, DollarSign, Filter } from 'lucide-react';
import { FilterDropdown } from '../../../../../components/molecules/FilterDropdown';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';

export interface ManualRow {
    id: string;
    cedula: string;
    nombre: string;
    empresa: string;
    fondo_comun: number;
    descuento_empleadas: number;
    pago_empleadas: number;
}

const DEFAULT_ROWS: ManualRow[] = [
    { id: '1', cedula: "31231202", nombre: "AGUDELO DE TORRES GLORIA", empresa: "REFRIDCOL", fondo_comun: 250000, descuento_empleadas: 0, pago_empleadas: 0 },
    { id: '2', cedula: "16794276", nombre: "TORRES AGUDELO ALEXANDER", empresa: "REFRIDCOL", fondo_comun: 250000, descuento_empleadas: 0, pago_empleadas: 0 },
    { id: '3', cedula: "94534454", nombre: "TORRES AGUDELO HECTOR FABIO", empresa: "REFRIDCOL", fondo_comun: 500000, descuento_empleadas: 429600, pago_empleadas: 0 },
    { id: '4', cedula: "66903320", nombre: "TORRES AGUDELO MARIBELL", empresa: "REFRIDCOL", fondo_comun: 250000, descuento_empleadas: 212617, pago_empleadas: 0 },
    { id: '5', cedula: "14965953", nombre: "TORRES ALEGRIAS GUILLERMO", empresa: "REFRIDCOL", fondo_comun: 250000, descuento_empleadas: 0, pago_empleadas: 0 },
];

interface OtrosGerenciaFormProps {
    onProcess: (data: ManualRow[]) => void;
    isProcessing: boolean;
}

const OtrosGerenciaForm: React.FC<OtrosGerenciaFormProps> = ({ onProcess, isProcessing }) => {
    const [rows, setRows] = useState<ManualRow[]>([...DEFAULT_ROWS]);
    const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});

    // Estados de Filtros
    const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({});
    const [openFilter, setOpenFilter] = useState<{ key: string; rect: any } | null>(null);
    const [filterSearch, setFilterSearch] = useState('');

    const handleAddRow = () => {
        setRows([...rows, { id: crypto.randomUUID(), cedula: "", nombre: "", empresa: "", fondo_comun: 0, descuento_empleadas: 0, pago_empleadas: 0 }]);
    };

    const handleRemoveRow = (id: string) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        } else {
            setRows([{ id: crypto.randomUUID(), cedula: "", nombre: "", empresa: "", fondo_comun: 0, descuento_empleadas: 0, pago_empleadas: 0 }]);
        }
    };

    const handleChange = (id: string, field: keyof ManualRow, value: any) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleLookup = async (id: string) => {
        const row = rows.find(r => r.id === id);
        if (!row) return;
        const cedula = row.cedula;
        if (!cedula || cedula.length < 6) return;

        setLookupLoading(prev => ({ ...prev, [id]: true }));
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/otros_gerencia/empleado/${cedula}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setRows(prev => prev.map(r => r.id === id ? { 
                    ...r, 
                    nombre: (res.data.nombre || "").toUpperCase(),
                    empresa: (res.data.empresa || "N/A").toUpperCase()
                } : r));
            }
        } catch (err) {
            console.error('Error buscando empleado Gerencia:', err);
        } finally {
            setLookupLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    const formatCurrencyInput = (val: number) => {
        if (!val && val !== 0) return "";
        return new Intl.NumberFormat('es-CO').format(val);
    };

    const parseCurrencyInput = (val: string) => {
        return parseFloat(val.replace(/\./g, '')) || 0;
    };

    // Lógica de Filtrado
    const filteredRows = React.useMemo(() => {
        return rows.filter(row => {
            for (const [key, selected] of Object.entries(activeFilters)) {
                if (selected.size === 0) continue;
                const val = String((row as any)[key] ?? '').toUpperCase();
                if (!selected.has(val)) return false;
            }
            return true;
        });
    }, [rows, activeFilters]);

    const getUniqueValues = (key: string) => {
        const values = rows.map(r => String((r as any)[key] ?? '').toUpperCase());
        return [...new Set(values)].sort().map(v => ({ value: v, label: v || '(Vacío)' }));
    };

    const toggleFilter = (e: React.MouseEvent, key: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setOpenFilter({ key, rect });
        setFilterSearch('');
    };

    const handleToggleOption = (key: string, value: string) => {
        setActiveFilters(prev => {
            const next = { ...prev };
            const current = new Set(next[key] || []);
            if (current.has(value)) current.delete(value);
            else current.add(value);
            next[key] = current;
            return next;
        });
    };

    const handleSelectAll = (key: string) => {
        const unique = getUniqueValues(key).map(v => v.value);
        const current = activeFilters[key] || new Set();
        if (current.size === unique.length) {
            setActiveFilters(prev => ({ ...prev, [key]: new Set() }));
        } else {
            setActiveFilters(prev => ({ ...prev, [key]: new Set(unique) }));
        }
    };

    return (
        <MaterialCard className="p-4 rounded-xl shadow-sm border-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Title variant="h6" weight="black" className="uppercase tracking-tight text-[var(--color-primary-500)]">Entrada de Gerencia</Title>
                    <Text size="xs" color="text-secondary" className="opacity-70">Ingresa datos manuales o busca asociados por cédula.</Text>
                </div>
                <Button variant="erp" size="xs" className="h-7 px-3 rounded-lg shadow-sm" onClick={handleAddRow}>
                    <div className="flex flex-row items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <Text as="span" className="text-[10px] uppercase tracking-wide font-bold">Añadir Fila</Text>
                    </div>
                </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--color-primary-500)] sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-center w-12 text-white font-black border-b border-white/10 text-[10px] uppercase tracking-wider">#</th>
                            <th className="p-3 text-center w-32 text-white font-black uppercase border-b border-white/10 text-[10px] tracking-wider relative">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>CEDULA</span>
                                    <button onClick={(e) => toggleFilter(e, 'cedula')} className={`p-1 rounded hover:bg-white/20 transition-colors ${(activeFilters['cedula']?.size ?? 0) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                                        <Filter size={10} />
                                    </button>
                                </div>
                            </th>
                            <th className="p-3 text-center w-[232px] text-white font-black uppercase border-b border-white/10 text-[10px] tracking-wider relative">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>NOMBRE</span>
                                    <button onClick={(e) => toggleFilter(e, 'nombre')} className={`p-1 rounded hover:bg-white/20 transition-colors ${(activeFilters['nombre']?.size ?? 0) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                                        <Filter size={10} />
                                    </button>
                                </div>
                            </th>
                            <th className="p-3 text-center w-36 text-white font-black uppercase border-b border-white/10 text-[10px] tracking-wider relative">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>FONDO COMÚN</span>
                                    <button onClick={(e) => toggleFilter(e, 'fondo_comun')} className={`p-1 rounded hover:bg-white/20 transition-colors ${(activeFilters['fondo_comun']?.size ?? 0) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                                        <Filter size={10} />
                                    </button>
                                </div>
                            </th>
                            <th className="p-3 text-center w-36 text-white font-black uppercase border-b border-white/10 text-[10px] tracking-wider relative">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>DESC. EMPLEADAS</span>
                                    <button onClick={(e) => toggleFilter(e, 'descuento_empleadas')} className={`p-1 rounded hover:bg-white/20 transition-colors ${(activeFilters['descuento_empleadas']?.size ?? 0) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                                        <Filter size={10} />
                                    </button>
                                </div>
                            </th>
                            <th className="p-3 text-center w-36 text-white font-black uppercase border-b border-white/10 text-[10px] tracking-wider relative">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>PAGO EMPLEADAS</span>
                                    <button onClick={(e) => toggleFilter(e, 'pago_empleadas')} className={`p-1 rounded hover:bg-white/20 transition-colors ${(activeFilters['pago_empleadas']?.size ?? 0) > 0 ? 'text-yellow-400' : 'text-white/40'}`}>
                                        <Filter size={10} />
                                    </button>
                                </div>
                            </th>
                            <th className="p-3 text-center w-24 border-b border-white/10 text-[10px] text-white uppercase tracking-wider">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredRows.map((row, fIdx) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                <td className="p-2 text-center text-slate-400 font-mono text-xs">{fIdx + 1}</td>
                                <td className="p-2">
                                    <div className="relative">
                                        <Input
                                            size="xs" value={row.cedula}
                                            onChange={(e) => handleChange(row.id, 'cedula', e.target.value)}
                                            onBlur={() => handleLookup(row.id)}
                                            className="h-8 !mb-0 font-mono text-center shadow-none border-slate-200" placeholder="Cédula..."
                                        />
                                        {lookupLoading[row.id] && <div className="absolute right-2 top-2"><Search className="w-3 h-3 animate-pulse text-[var(--color-primary-500)]" /></div>}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs" value={row.nombre} disabled
                                        className="h-8 !mb-0 uppercase w-full font-bold text-slate-700 bg-slate-50/50 border-none shadow-none text-center"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs" icon={DollarSign}
                                        value={formatCurrencyInput(row.fondo_comun)}
                                        onChange={(e) => handleChange(row.id, 'fondo_comun', parseCurrencyInput(e.target.value))}
                                        className="h-8 !mb-0 text-right font-mono border-slate-200"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs" icon={DollarSign}
                                        value={formatCurrencyInput(row.descuento_empleadas)}
                                        onChange={(e) => handleChange(row.id, 'descuento_empleadas', parseCurrencyInput(e.target.value))}
                                        className="h-8 !mb-0 text-right font-mono border-slate-200"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs" icon={DollarSign}
                                        value={formatCurrencyInput(row.pago_empleadas)}
                                        onChange={(e) => handleChange(row.id, 'pago_empleadas', parseCurrencyInput(e.target.value))}
                                        className="h-8 !mb-0 text-right font-mono border-slate-200"
                                    />
                                </td>
                                <td className="p-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-end">
                <Button
                    variant="primary" size="sm" className="h-10 px-8 font-black shadow-lg shadow-indigo-500/20 rounded-xl"
                    disabled={isProcessing || rows.some(r => !r.cedula)}
                    onClick={() => onProcess(rows)}
                >
                    {isProcessing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <div className="flex items-center gap-2">PROCESAR <Send className="w-4 h-4" /></div>}
                </Button>
            </div>

            {openFilter && (
                <FilterDropdown
                    isOpen={!!openFilter}
                    onClose={() => setOpenFilter(null)}
                    anchorRect={openFilter.rect}
                    title={openFilter.key.toUpperCase()}
                    searchTerm={filterSearch}
                    onSearchChange={setFilterSearch}
                    options={getUniqueValues(openFilter.key).filter(o => o.label.toLowerCase().includes(filterSearch.toLowerCase()))}
                    tempValue={Array.from(activeFilters[openFilter.key] || [])}
                    onToggleOption={(val) => handleToggleOption(openFilter.key, val)}
                    onSelectAll={() => handleSelectAll(openFilter.key)}
                    isAllSelected={(activeFilters[openFilter.key]?.size ?? 0) === getUniqueValues(openFilter.key).length}
                    onApply={() => setOpenFilter(null)}
                />
            )}
        </MaterialCard>
    );
};

export default OtrosGerenciaForm;
