import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { FilePicker } from '../../../../components/molecules';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, History, Database, ChevronRight } from 'lucide-react';
import { NominaTable, ColumnDef } from '../../../../components/organisms/NominaTable';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import SubcategorySummaryCard from './components/SubcategorySummaryCard';

interface RetencionesRow {
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

interface RetencionesResponse {
    filas: RetencionesRow[];
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

const RetencionesPreview: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<RetencionesResponse | null>(null);

    // Filtros
    const [searchText, setSearchText] = useState('');
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // â”€â”€ Cargar datos guardados al montar o cambiar periodo â”€â”€
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            setData(null);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/retenciones/datos`,
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
                console.error('Error cargando datos RETENCIONES:', err);
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
            files.forEach((f: File) => formData.append('files', f));
            formData.append('mes', mes.toString());
            formData.append('anio', anio.toString());

            const res = await axios.post(
                `${API_CONFIG.BASE_URL}/novedades-nomina/retenciones/preview`,
                formData,
            );
            if (res.data.error) {
                 addNotification('error', `Error procesando: ${res.data.error}`);
            } else {
                setData(res.data);
                setWarningsDetalle(res.data.warnings_detalle || []);
                addNotification('success', `Procesados ${res.data.summary.total_asociados} asociados.`);
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.detail || 'Error al procesar los archivos.';
            addNotification('error', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // â”€â”€ Cálculos de resumen adicionales â”€â”€
    const summaryCalculated = useMemo(() => {
        if (!data || !data.filas) return { porEmpresa: {}, porConcepto: {} };
        const porEmpresa: Record<string, number> = {};
        const porConcepto: Record<string, number> = {};

        data.filas.forEach(row => {
            const emp = row.empresa || 'N/A';
            const con = row.concepto || 'N/A';
            porEmpresa[emp] = (porEmpresa[emp] || 0) + row.valor;
            porConcepto[con] = (porConcepto[con] || 0) + row.valor;
        });

        return { porEmpresa, porConcepto };
    }, [data]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const columns = useMemo<ColumnDef<RetencionesRow>[]>(() => [
        { header: 'CÉDULA', accessorKey: 'cedula' },
        { header: 'NOMBRE', accessorKey: 'nombre' },
        { header: 'EMPRESA', accessorKey: 'empresa', cell: (row: RetencionesRow) => <Badge variant={row.empresa === 'CONTRATISTA' ? 'warning' : 'info'} size="sm">{row.empresa || 'REFRIDCOL'}</Badge> },
        { header: 'VALOR', accessorKey: 'valor', align: 'right', cell: (row: RetencionesRow) => formatCurrency(row.valor) },
        { header: 'CONCEPTO', accessorKey: 'concepto', cell: (row: RetencionesRow) => <Badge variant="default" size="sm">{row.concepto}</Badge> }
    ], []);

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-170px)] flex flex-col animate-in fade-in duration-500 overflow-hidden px-1 space-y-2">
            {/* Header - Reduced space */}
            <div className="flex-none pb-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <Title variant="h4" weight="bold">RETENCIONES – Preview</Title>
                            <Text color="text-secondary">OTROS / RETENCIONES</Text>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="flex flex-col items-end gap-0.5 h-auto py-1 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        onClick={() => navigate('/service-portal/novedades-nomina/historial?subcategoria=RETENCIONES')}
                    >
                        <div className="flex items-center gap-2">
                            <Title variant="h5" weight="bold" className="text-slate-800 dark:text-slate-200">Ver Histórico</Title>
                            <History className="w-4 h-4 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            <span>RETENCIONES / HISTORIAL</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    </Button>
                </div>
            </div>

            {/* Upload Section - More compact */}
            <div className="flex-none bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-40">
                        <Select
                            label="Mes"
                            value={mes.toString()}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                            options={MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                            className="[&_select]:h-[42px]"
                        />
                    </div>
                    <div className="w-full md:w-28">
                        <Input
                            label="Año"
                            type="number"
                            value={anio.toString()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnio(parseInt(e.target.value))}
                            className="[&_input]:h-[42px]"
                        />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                        <Text as="label" variant="body2" weight="medium" color="text-primary" className="block">
                            Archivos Excel ({files.length} seleccionados)
                        </Text>
                        <div className="relative group">
                            <FilePicker
                                files={files}
                                onChange={handleFilesChange}
                                placeholder="Seleccionar Excels..."
                            />
                        </div>
                    </div>
                    <div className="shrink-0">
                        <Button
                            variant="primary"
                            className="px-6 h-[42px] rounded-xl font-bold shadow-lg flex items-center justify-center"
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
                                    <FileText className="w-4 h-4" /> Procesar
                                </Text>
                            )}
                        </Button>
                    </div>
                </div>
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
                <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                    {/* Summary Cards - Always Visible and tighter */}
                    <div className="flex-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <SubcategorySummaryCard 
                            label="Asociados" 
                            value={data.summary.total_asociados} 
                            isCentered
                        />
                        <SubcategorySummaryCard 
                            label="Valor x Empresa" 
                            details={summaryCalculated.porEmpresa} 
                            isTabulated
                            formatAsCurrency
                        />
                        <SubcategorySummaryCard 
                            label="Valor x Concepto" 
                            details={summaryCalculated.porConcepto} 
                            isTabulated
                            formatAsCurrency
                        />
                        <SubcategorySummaryCard 
                            label="Valor Total" 
                            value={data.summary.total_valor} 
                            isCentered
                            formatAsCurrency
                        />
                    </div>

                    {/* Warnings Text - Compact */}
                    {data.warnings && data.warnings.length > 0 && (
                        <div className="flex-none bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <Text weight="bold" size="xs" className="text-amber-800 dark:text-amber-300">
                                    Advertencias ({data.warnings.length})
                                </Text>
                            </div>
                            <ul className="space-y-0.5 ml-6 list-disc">
                                {data.warnings.map((w: string, i: number) => (
                                    <li key={i}>
                                        <Text size="xs" className="text-amber-700 dark:text-amber-400 text-[10px]">{w}</Text>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Warnings ERP Detalle - Compact */}
                    {warningsDetalle.length > 0 && (
                        <div className="flex-none bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <Text weight="bold" size="xs" className="text-amber-800 dark:text-amber-300">
                                        Cédulas con novedades ({warningsDetalle.length})
                                    </Text>
                                    <Button variant="ghost" size="xs" onClick={() => setShowWarnings(!showWarnings)}>
                                        <Text as="span" color="inherit" size="xs">{showWarnings ? 'Ocultar' : 'Ver detalle'}</Text>
                                    </Button>
                                </div>
                            </div>
                            {showWarnings && (
                                <div className="mt-2 overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-700 max-h-32">
                                    <table className="w-full text-[10px]">
                                        <thead className="sticky top-0 bg-amber-100 dark:bg-amber-900/30">
                                            <tr>
                                                <th className="text-left p-2 font-bold text-amber-800">CÉDULA</th>
                                                <th className="text-left p-2 font-bold text-amber-800">NOMBRE</th>
                                                <th className="text-left p-2 font-bold text-amber-800">MOTIVO</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-amber-100">
                                            {warningsDetalle.map((w: WarningDetalle, i: number) => (
                                                <tr key={i} className="hover:bg-amber-50">
                                                    <td className="p-1.5 font-mono">{w.cedula}</td>
                                                    <td className="p-1.5">{w.nombre}</td>
                                                    <td className="p-1.5">
                                                        <Badge variant={w.motivo.includes('EXCEPCION') ? 'warning' : 'error'} size="xs">{w.motivo}</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table - Self scrolling */}
                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        <div className="flex-none p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REGISTROS CARGADOS</span>
                            </div>
                            <Text size="xs" color="text-secondary" className="text-[10px] font-bold">
                                {data.filas.length} REGISTROS
                            </Text>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-[11px] border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-sm border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="text-left p-2 font-bold text-slate-500 uppercase tracking-wider w-10">#</th>
                                        <th className="text-left p-2 font-bold text-slate-500 uppercase tracking-wider">CEDULA</th>
                                        <th className="text-left p-2 font-bold text-slate-500 uppercase tracking-wider">NOMBRE</th>
                                        <th className="text-left p-2 font-bold text-slate-500 uppercase tracking-wider">EMPRESA</th>
                                        <th className="text-right p-2 font-bold text-slate-500 uppercase tracking-wider">VALOR</th>
                                        <th className="text-left p-2 font-bold text-slate-500 uppercase tracking-wider">CONCEPTO</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {data.filas.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-2 text-slate-400 font-mono w-10">{i + 1}</td>
                                            <td className="p-2 font-mono">{row.cedula}</td>
                                            <td className="p-2">{row.nombre}</td>
                                            <td className="p-2">
                                                <Badge variant={row.empresa === 'CONTRATISTA' ? 'warning' : 'info'} size="xs">{row.empresa || 'REFRIDCOL'}</Badge>
                                            </td>
                                            <td className="p-2 text-right font-mono font-bold text-[var(--color-primary)]">
                                                {formatCurrency(row.valor)}
                                            </td>
                                            <td className="p-2">
                                                <Badge variant="default" size="xs">{row.concepto}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State - Compact */}
            {!data && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <Database className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                    </div>
                    <Title variant="h5" weight="bold" className="text-slate-400 dark:text-slate-700 mb-1 uppercase tracking-widest text-xs">Sin datos procesados</Title>
                    <Text size="xs" className="text-slate-400 dark:text-slate-600 max-w-xs">
                        Selecciona y procesa archivo Excel para ver registros de {MESES[mes-1]} {anio}.
                    </Text>
                </div>
            )}
        </div>
    );
};

export default RetencionesPreview;


