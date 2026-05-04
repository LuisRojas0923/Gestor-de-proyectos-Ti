import React, { useState, useEffect } from 'react';
import { Button, Input, Text, MaterialCard, Title, Badge } from '../../../../../components/atoms';
import { Plus, Trash2, Send, Search, DollarSign } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../../config/api';

export interface ManualComisionRow {
    cedula: string;
    nombre: string;
    estado: string;
    empresa: string;
    valor: number;
}

interface ComisionesFormProps {
    onProcess: (data: ManualComisionRow[]) => void;
    isProcessing: boolean;
}

const ComisionesForm: React.FC<ComisionesFormProps> = ({ onProcess, isProcessing }) => {
    const [rows, setRows] = useState<ManualComisionRow[]>([
        { cedula: "", nombre: "", estado: "", empresa: "", valor: 0 }
    ]);
    const [lookupLoading, setLookupLoading] = useState<Record<number, boolean>>({});

    const handleAddRow = () => {
        setRows([...rows, { cedula: "", nombre: "", estado: "", empresa: "", valor: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        } else {
            setRows([{ cedula: "", nombre: "", estado: "", empresa: "", valor: 0 }]);
        }
    };

    const handleChange = (index: number, field: keyof ManualComisionRow, value: any) => {
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
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/comisiones/empleado/${cedula}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setRows(prev => {
                    const newRows = [...prev];
                    newRows[index] = { 
                        ...newRows[index], 
                        nombre: (res.data.nombre || "").toUpperCase(),
                        estado: (res.data.estado || "N/A").toUpperCase(),
                        empresa: (res.data.empresa || "N/A").toUpperCase()
                    };
                    return newRows;
                });
            }
        } catch (err) {
            console.error('Error buscando empleado:', err);
        } finally {
            setLookupLoading(prev => ({ ...prev, [index]: false }));
        }
    };

    const formatCurrencyInput = (val: number) => {
        if (!val && val !== 0) return "";
        return new Intl.NumberFormat('es-CO').format(val);
    };

    const parseCurrencyInput = (val: string) => {
        return parseFloat(val.replace(/\./g, '')) || 0;
    };

    return (
        <MaterialCard className="p-4 rounded-xl shadow-sm border-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Title variant="h6" weight="black" className="uppercase tracking-tight text-[var(--color-primary)]">Entrada de Comisiones</Title>
                    <Text size="xs" color="text-secondary" className="opacity-70">Ingresa las cédulas y valores de las comisiones del periodo.</Text>
                </div>
                <Button 
                    variant="erp" 
                    size="xs"
                    className="h-7 px-3 rounded-lg shadow-sm"
                    onClick={handleAddRow}
                >
                    <div className="flex flex-row items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <Text as="span" className="text-[10px] uppercase tracking-wide font-bold">Añadir Fila</Text>
                    </div>
                </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]/10">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--color-primary)] sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-center w-12 text-white font-black border-b border-white/10 text-[10px] uppercase">#</th>
                            <th className="p-3 text-center w-40 text-white font-black uppercase border-b border-white/10 text-[10px]">CEDULA</th>
                            <th className="p-3 text-center text-white font-black uppercase min-w-[250px] border-b border-white/10 text-[10px]">NOMBRE</th>
                            <th className="p-3 text-center w-32 text-white font-black uppercase border-b border-white/10 text-[10px]">ESTADO</th>
                            <th className="p-3 text-center w-40 text-white font-black uppercase border-b border-white/10 text-[10px]">EMPRESA</th>
                            <th className="p-3 text-center w-44 text-white font-black uppercase border-b border-white/10 text-[10px]">VALOR COMISIÓN</th>
                            <th className="p-3 text-center w-24 border-b border-white/10">ACCIONES</th>
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
                                        className="h-8 !mb-0 uppercase w-full font-bold text-slate-700 bg-slate-50/50"
                                        placeholder="Nombre del asociado..."
                                        disabled={true}
                                    />
                                </td>
                                <td className="p-2">
                                    <div className="flex justify-center">
                                        {row.estado && (
                                            <Badge 
                                                variant={row.estado === 'ACTIVO' ? 'success' : 'error'} 
                                                size="xs"
                                                className="font-black"
                                            >
                                                {row.estado}
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <Text size="xs" weight="bold" color="text-secondary" className="text-center uppercase block truncate max-w-[150px]">
                                        {row.empresa || '-'}
                                    </Text>
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
                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveRow(idx)}
                                            className="h-7 w-7 text-slate-400 hover:text-red-500"
                                        >
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
                    variant="primary"
                    size="sm"
                    className="h-10 px-8 flex flex-row items-center justify-center gap-2 font-black shadow-lg shadow-blue-500/20 whitespace-nowrap"
                    disabled={isProcessing || rows.some(r => !r.cedula || r.valor <= 0)}
                    onClick={() => onProcess(rows)}
                >
                    {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                        <div className="flex items-center gap-2">
                        <Text size="xs" weight="black" className="text-white">PROCESAR COMISIONES</Text>
                        <Send className="w-4 h-4" />
                    </div>
                )}
            </Button>
        </div>
    </MaterialCard>
    );
};

export default ComisionesForm;
