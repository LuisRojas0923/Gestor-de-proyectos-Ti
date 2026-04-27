import React, { useState } from 'react';
import { Button, Input, Text, MaterialCard, Title } from '../../../../../components/atoms';
import { Plus, Trash2, Send, Search, DollarSign } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';

export interface EmbargoManualRow {
    cedula: string;
    nombre: string;
    concepto: string;
    valor: number;
}

const DEFAULT_ROWS: EmbargoManualRow[] = [
    { cedula: "8435781", nombre: "QUINTERO TAPASCO EMILCIADES", concepto: "ALIMENTOS", valor: 366709 },
];

interface EmbargosFormProps {
    onProcess: (data: EmbargoManualRow[]) => void;
    isProcessing: boolean;
}

const EmbargosForm: React.FC<EmbargosFormProps> = ({ onProcess, isProcessing }) => {
    const [rows, setRows] = useState<EmbargoManualRow[]>([...DEFAULT_ROWS]);
    const [lookupLoading, setLookupLoading] = useState<Record<number, boolean>>({});

    const handleAddRow = () => {
        setRows([...rows, { cedula: "", nombre: "", concepto: "EMBARGO", valor: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        }
    };

    const handleChange = (index: number, field: keyof EmbargoManualRow, value: any) => {
        setRows(prev => {
            const newRows = [...prev];
            newRows[index] = { ...newRows[index], [field]: value };
            return newRows;
        });
    };

    const handleLookup = async (index: number) => {
        const row = rows[index];
        const cedula = row.cedula;

        if (!cedula || cedula.length < 6) return;

        setLookupLoading(prev => ({ ...prev, [index]: true }));
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/embargos/empleado/${cedula}`);
            if (res.data && res.data.nombre) {
                setRows(prev => {
                    const newRows = [...prev];
                    newRows[index] = { ...newRows[index], nombre: res.data.nombre.toUpperCase() };
                    return newRows;
                });
            }
        } catch (err) {
            console.error('Error buscando empleado:', err);
        } finally {
            setLookupLoading(prev => ({ ...prev, [index]: false }));
        }
    };

    // Formateador de moneda para visualización
    const formatCurrencyInput = (val: number) => {
        if (!val && val !== 0) return "";
        return new Intl.NumberFormat('es-CO').format(val);
    };

    // Parser para quitar formato al guardar
    const parseCurrencyInput = (val: string) => {
        return parseFloat(val.replace(/\./g, '')) || 0;
    };

    return (
        <MaterialCard className="p-4 rounded-xl shadow-sm border-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Title variant="h6" weight="black" className="uppercase tracking-tight text-[var(--color-primary)]">Entrada de Datos</Title>
                    <Text size="xs" color="text-secondary" className="opacity-70">Edita los valores o añade nuevos asociados antes de procesar.</Text>
                </div>
                <Button 
                    variant="erp" 
                    size="xs"
                    className="h-7 px-3 rounded-lg shadow-sm"
                    onClick={handleAddRow}
                >
                    <div className="flex flex-row items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <Text as="span" className="text-[10px] uppercase tracking-wide font-bold">Asociado</Text>
                    </div>
                </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]/10">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--color-primary)] sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-center w-12 text-white font-black border-b border-white/10 text-[10px] uppercase">#</th>
                            <th className="p-3 text-center w-40 text-white font-black uppercase border-b border-white/10 text-[10px]">CEDULA</th>
                            <th className="p-3 text-center text-white font-black uppercase min-w-[300px] border-b border-white/10 text-[10px]">NOMBRE</th>
                            <th className="p-3 text-center w-60 text-white font-black uppercase border-b border-white/10 text-[10px]">CONCEPTO</th>
                            <th className="p-3 text-center w-44 text-white font-black uppercase border-b border-white/10 text-[10px]">VALOR</th>
                            <th className="p-3 text-center w-12 border-b border-white/10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/10">
                        {rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                <td className="p-2 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                                <td className="p-2">
                                    <div className="relative">
                                        <Input
                                            size="xs"
                                            value={row.cedula}
                                            onChange={(e) => handleChange(idx, 'cedula', e.target.value)}
                                            onBlur={() => handleLookup(idx)}
                                            className="h-8 !mb-0 font-mono text-center"
                                            placeholder="Cédula..."
                                        />
                                        {lookupLoading[idx] && (
                                            <div className="absolute right-2 top-2">
                                                <Search className="w-3 h-3 animate-pulse text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs"
                                        value={row.nombre}
                                        onChange={(e) => handleChange(idx, 'nombre', e.target.value)}
                                        className="h-8 !mb-0 uppercase w-full"
                                        placeholder="Nombre del asociado..."
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs"
                                        value={row.concepto}
                                        onChange={(e) => handleChange(idx, 'concepto', e.target.value)}
                                        className="h-8 !mb-0 uppercase w-full text-center"
                                        placeholder="CONCEPTO..."
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs"
                                        icon={DollarSign}
                                        value={formatCurrencyInput(row.valor)}
                                        onChange={(e) => handleChange(idx, 'valor', parseCurrencyInput(e.target.value))}
                                        className="h-8 !mb-0 text-right font-mono"
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveRow(idx)}
                                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-end">
                <Button
                    variant="primary"
                    size="sm"
                    className="h-10 px-8 flex flex-row items-center justify-center gap-2 font-black shadow-lg shadow-blue-500/20 whitespace-nowrap"
                    disabled={isProcessing}
                    onClick={() => onProcess(rows)}
                >
                    {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Text as="span" color="white" weight="black">PROCESAR</Text>
                            <Send className="w-4 h-4" />
                        </div>
                    )}
                </Button>
            </div>
        </MaterialCard>
    );
};

export default EmbargosForm;
