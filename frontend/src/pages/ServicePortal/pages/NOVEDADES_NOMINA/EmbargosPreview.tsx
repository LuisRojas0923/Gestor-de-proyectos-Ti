import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, AlertTriangle, Search, History } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

interface EmbargosRow {
    cedula: string;
    nombre: string;
    valor: number;
    empresa: string;
    concepto: string;
}

interface WarningDetalle {
    cedula: string;
    nombre: string;
    motivo: string;
}

interface EmbargosResponse {
    filas: EmbargosRow[];
    summary: {
        total_asociados: number;
        total_filas: number;
        total_valor: number;
    };
    warnings: string[];
    warnings_detalle: WarningDetalle[];
}

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const EmbargosPreview: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<EmbargosResponse | null>(null);

    // Filtros
    const [searchText, setSearchText] = useState('');
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // ── Cargar datos guardados al montar o cambiar periodo ──
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/embargos/datos`,
                    { params: { mes, anio } }
                );
                if (res.data.filas && res.data.filas.length > 0) {
                    setData(res.data);
                    setWarningsDetalle(res.data.warnings_detalle || []);
                } else {
                    setData(null);
                    setWarningsDetalle([]);
                }
            } catch (err) {
                console.error('Error cargando datos EMBARGOS:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSaved();
    }, [mes, anio]);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleProcess = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        try {
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            formData.append('mes', mes.toString());
            formData.append('anio', anio.toString());

            const res = await axios.post(
                `${API_CONFIG.BASE_URL}/novedades-nomina/embargos/preview`,
                formData,
            );
            setData(res.data);
            setWarningsDetalle(res.data.warnings_detalle || []);
            addNotification('success', `Procesados ${res.data.summary.total_asociados} asociados.`);
        } catch (err) {
            console.error(err);
            addNotification('error', 'Error al procesar los archivos.');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredRows = useMemo(() => {
        if (!data) return [];
        return data.filas
            .filter(r => {
                const matchText = searchText === ''
                    || r.cedula.toLowerCase().includes(searchText.toLowerCase())
                    || (r.nombre && r.nombre.toLowerCase().includes(searchText.toLowerCase()));
                return matchText;
            })
            .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    }, [data, searchText]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <Title variant="h4" weight="bold">EMBARGOS – Preview</Title>
                    <Text color="text-secondary">EMBARGOS</Text>
                </div>
            </div>

            {/* Historial */}
            <div
                onClick={() => navigate('/service-portal/novedades-nomina/historial?subcategoria=EMBARGOS')}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:shadow-lg transition-all cursor-pointer"
            >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                    <Text weight="bold">Histórico de cargas</Text>
                    <Text size="sm" color="text-secondary">Ver archivos cargados anteriormente para EMBARGOS</Text>
                </div>
                <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)] rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Upload Section */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select
                        label="Mes"
                        value={mes.toString()}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                        options={MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                    />
                    <Input
                        label="Año"
                        type="number"
                        value={anio.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnio(parseInt(e.target.value))}
                    />
                    <div className="space-y-2">
                        <Text as="label" variant="body2" weight="medium" color="text-primary" className="mb-1 block">
                            Archivos Excel ({files.length} seleccionados)
                        </Text>
                        <div className="relative group">
                            <input
                                id="file-upload"
                                type="file"
                                accept=".xlsx,.xls,.xlsm"
                                multiple
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleFilesChange}
                            />
                            <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 group-hover:border-[var(--color-primary)] transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50">
                                <Upload className="w-5 h-5 text-slate-400 group-hover:text-[var(--color-primary)]" />
                                <Text size="sm" color="text-secondary">
                                    {files.length > 0
                                        ? files.map(f => f.name).join(', ')
                                        : 'Seleccionar Excels...'}
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="px-8 py-3 rounded-xl font-bold shadow-lg"
                    disabled={files.length === 0 || isProcessing}
                    onClick={handleProcess}
                >
                    {isProcessing ? (
                        <Text as="span" color="inherit" className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Procesando...
                        </Text>
                    ) : (
                        <Text as="span" color="inherit" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Procesar Excels
                        </Text>
                    )}
                </Button>
            </div>

            {/* Loading saved data */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
                    <Text className="ml-3" color="text-secondary">Cargando datos guardados...</Text>
                </div>
            )}

            {/* Results */}
            {data && !isLoading && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <SummaryCard label="Asociados" value={data.summary.total_asociados} />
                        <SummaryCard label="Filas" value={data.summary.total_filas} />
                        <SummaryCard label="Valor Total" value={formatCurrency(data.summary.total_valor)} />
                    </div>

                    {/* Warnings Text */}
                    {data.warnings && data.warnings.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <Text weight="bold" className="text-amber-800 dark:text-amber-300">
                                    Advertencias del Proceso ({data.warnings.length})
                                </Text>
                            </div>
                            <ul className="space-y-1 ml-7 list-disc">
                                {data.warnings.map((w: string, i: number) => (
                                    <li key={i}>
                                        <Text size="sm" className="text-amber-700 dark:text-amber-400">{w}</Text>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Warnings ERP Detalle */}
                    {warningsDetalle.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <Text weight="bold" className="text-red-800 dark:text-red-300">
                                        Cédulas con problemas ({warningsDetalle.length})
                                    </Text>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowWarnings(!showWarnings)}
                                >
                                    <Text as="span" color="inherit" size="sm">
                                        {showWarnings ? 'Ocultar detalle' : 'Ver detalle'}
                                    </Text>
                                </Button>
                            </div>
                            {showWarnings && (
                                <div className="overflow-x-auto rounded-xl border border-red-200 dark:border-red-700">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-red-100 dark:bg-red-900/30">
                                                <th className="text-left p-3 font-semibold text-red-800 dark:text-red-300">CÉDULA</th>
                                                <th className="text-left p-3 font-semibold text-red-800 dark:text-red-300">NOMBRE</th>
                                                <th className="text-left p-3 font-semibold text-red-800 dark:text-red-300">MOTIVO</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-red-100 dark:divide-red-800">
                                            {warningsDetalle.map((w: WarningDetalle, i: number) => (
                                                <tr key={i} className="hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <td className="p-3 font-mono">{w.cedula}</td>
                                                    <td className="p-3">{w.nombre}</td>
                                                    <td className="p-3">
                                                        <Badge variant="error" size="sm">{w.motivo}</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Buscar por cédula o nombre..."
                                className="pl-10"
                                value={searchText}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                    <tr>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 bg-inherit w-12">#</th>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 bg-inherit">CEDULA</th>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 bg-inherit">NOMBRE</th>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 bg-inherit">EMPRESA</th>
                                        <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300 bg-inherit">VALOR MENSUAL</th>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 bg-inherit">CONCEPTO</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4 text-slate-400 font-mono w-12">{i + 1}</td>
                                            <td className="p-4 font-mono">{row.cedula}</td>
                                            <td className="p-4">{row.nombre}</td>
                                            <td className="p-4">{row.empresa}</td>
                                            <td className="p-4 text-right font-mono font-semibold text-[var(--color-primary)]">
                                                {formatCurrency(row.valor)}
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="default" size="sm">
                                                    {row.concepto}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-right bg-white dark:bg-slate-800 relative z-20">
                            <Text size="sm" color="text-secondary">
                                Mostrando {filteredRows.length} de {data.filas.length} filas
                            </Text>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/* ---- Sub-components ---- */

const SummaryCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border border-slate-200 dark:border-slate-700 text-center">
        <Text size="sm" color="text-secondary">{label}</Text>
        <Title variant="h5" weight="bold" className="mt-1">{String(value)}</Title>
    </div>
);

export default EmbargosPreview;
