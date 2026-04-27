import React, { useState } from 'react';
import { Button, Input, Text, MaterialCard, Title } from '../../../../../components/atoms';
import { Plus, Trash2, Send, Search, DollarSign } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';

export interface ManualRow {
    cedula: string;
    nombre: string;
    fondo_comun: number;
    descuento_empleadas: number;
    pago_empleadas: number;
}

const DEFAULT_ROWS: ManualRow[] = [
    { cedula: "31231202", nombre: "AGUDELO DE TORRES GLORIA", fondo_comun: 250000, descuento_empleadas: 0, pago_empleadas: 0 },
    { cedula: "16794276", nombre: "TORRES AGUDELO ALEXANDER", fondo_comun: 250000, descuento_empleadas: 0, pago_empleadas: 0 },
    { cedula: "94534454", nombre: "TORRES AGUDELO HECTOR FABIO", fondo_comun: 250000, descuento_empleadas: 425233, pago_empleadas: 0 },
    { cedula: "66903320", nombre: "TORRES AGUDELO MARIBELL", fondo_comun: 250000, descuento_empleadas: 212617, pago_empleadas: 0 },
    { cedula: "14965953", nombre: "TORRES ALEGRIAS GUILLERMO", fondo_comun: 250000, descuento_empleadas: 0, pago_empleadas: 0 },
];

interface OtrosGerenciaFormProps {
    onProcess: (data: ManualRow[]) => void;
    isProcessing: boolean;
}

const OtrosGerenciaForm: React.FC<OtrosGerenciaFormProps> = ({ onProcess, isProcessing }) => {
    const [rows, setRows] = useState<ManualRow[]>([...DEFAULT_ROWS]);
    const [lookupLoading, setLookupLoading] = useState<Record<number, boolean>>({});

    const handleAddRow = () => {
        setRows([...rows, { cedula: "", nombre: "", fondo_comun: 0, descuento_empleadas: 0, pago_empleadas: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        }
    };

    const handleChange = (index: number, field: keyof ManualRow, value: any) => {
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
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/otros_gerencia/empleado/${cedula}`);
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
                            <th className="p-3 text-center w-40 text-white font-black uppercase border-b border-white/10 text-[10px]">FONDO COMÚN</th>
                            <th className="p-3 text-center w-40 text-white font-black uppercase border-b border-white/10 text-[10px]">DESCUENTO EMPLEADAS</th>
                            <th className="p-3 text-center w-40 text-white font-black uppercase border-b border-white/10 text-[10px]">PAGO EMPLEADAS</th>
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
                                        icon={DollarSign}
                                        value={formatCurrencyInput(row.fondo_comun)}
                                        onChange={(e) => handleChange(idx, 'fondo_comun', parseCurrencyInput(e.target.value))}
                                        className="h-8 !mb-0 text-right font-mono"
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs"
                                        icon={DollarSign}
                                        value={formatCurrencyInput(row.descuento_empleadas)}
                                        onChange={(e) => handleChange(idx, 'descuento_empleadas', parseCurrencyInput(e.target.value))}
                                        className="h-8 !mb-0 text-right font-mono"
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2">
                                    <Input
                                        size="xs"
                                        icon={DollarSign}
                                        value={formatCurrencyInput(row.pago_empleadas)}
                                        onChange={(e) => handleChange(idx, 'pago_empleadas', parseCurrencyInput(e.target.value))}
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
                        <Text size="xs" weight="black" className="text-white">PROCESAR</Text>
                        <Send className="w-4 h-4" />
                    </div>
                )}
            </Button>
        </div>
    </MaterialCard>
    );
};

export default OtrosGerenciaForm;
