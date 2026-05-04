import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { FilePicker } from '../../../../components/molecules';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, History, Database, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import SubcategorySummaryCard from './components/SubcategorySummaryCard';
import { FilterDropdown } from '../../../../components/molecules/FilterDropdown';

interface RetencionesRow {
    cedula: string;
    nombre_asociado: string;
    valor: number;
    empresa: string;
    concepto: string;
    estado_erp?: string;
    observaciones?: string;
}

interface WarningDetalle {
    cedula: string;
    nombre: string;
    motivo: string;
}

interface RetencionesResponse {
    rows: RetencionesRow[];
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

    // Filtros por columna (Excel style)
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // ── Cargar datos guardados al montar o cambiar periodo ──
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            setData(null);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/retenciones/datos`,
                    { params: { mes, anio } }
                );
                if (res.data.rows && res.data.rows.length > 0) {
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

    const filteredRows = useMemo(() => {
        if (!data || !data.rows) return [];
        return data.rows
            .filter(r => {
                // Filtro de búsqueda global
                const matchGlobal = searchText === ''
                    || r.cedula.toLowerCase().includes(searchText.toLowerCase())
                    || r.nombre_asociado.toLowerCase().includes(searchText.toLowerCase());
                
                if (!matchGlobal) return false;

                // Filtros por columna
                for (const [key, values] of Object.entries(activeFilters)) {
                    if (values.length === 0) continue;
                    const rowValue = String((r as any)[key] || '').toUpperCase();
                    if (!values.includes(rowValue)) return false;
                }

                return true;
            })
            .sort((a, b) => a.nombre_asociado.localeCompare(b.nombre_asociado));
    }, [data, searchText, activeFilters]);

    const getColumnOptions = (key: keyof RetencionesRow) => {
        if (!data || !data.rows) return [];
        const uniqueValues = Array.from(new Set(data.rows.map(r => String(r[key] || '').toUpperCase())));
        return uniqueValues.sort().map(v => ({ label: v, value: v }));
    };

    // ── Cálculos de resumen adicionales ──
    const summaryCalculated = useMemo(() => {
        if (!data || !data.rows) return { porEmpresa: {}, porConcepto: {} };
        const porEmpresa: Record<string, number> = {};
        const porConcepto: Record<string, number> = {};

        data.rows.forEach(row => {
            const emp = row.empresa || 'N/A';
            const con = row.concepto || 'N/A';
            porEmpresa[emp] = (porEmpresa[emp] || 0) + row.valor;
            porConcepto[con] = (porConcepto[con] || 0) + row.valor;
        });

        return { porEmpresa, porConcepto };
    }, [data]);

    const getBadgeVariantForEmpresa = (empresa: string) => {
        const emp = empresa?.toUpperCase() || '';
        if (emp.includes('REFRIDCOL')) return 'info';
        if (emp.includes('REDES HUMANAS')) return 'success';
        if (emp.includes('CONTRATISTA')) return 'warning';
        if (emp.includes('SERDAN') || emp.includes('TEMPO')) return 'primary';
        return 'default';
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

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
                        <div className="flex items-center gap-1">
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider text-slate-500">
                                RETENCIONES / HISTORIAL
                            </Text>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
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
                        <div className="flex-none p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 gap-4">
                            <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-slate-400" />
                                <Text variant="caption" weight="bold" className="uppercase tracking-wider text-slate-500">
                                    REGISTROS CARGADOS
                                </Text>
                            </div>
                            
                            <div className="flex-1 max-w-sm">
                                <Input
                                    size="xs"
                                    type="text"
                                    placeholder="Filtrar por cédula o nombre..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    icon={Search}
                                    className="!h-8"
                                />
                            </div>

                            <Text size="xs" color="text-secondary" className="text-[10px] font-bold">
                                {filteredRows.length} REGISTROS
                            </Text>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-[11px] border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-[var(--color-primary-900)] text-white shadow-md">
                                        <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-12 border-b border-white/5 border-r border-white/5 first:rounded-tl-xl">#</th>
                                        <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-32 border-b border-white/5 border-r border-white/5">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>CEDULA</span>
                                                <FilterDropdown 
                                                    options={getColumnOptions('cedula')}
                                                    selectedOptions={activeFilters['cedula'] || []}
                                                    onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, cedula: vals }))}
                                                    dark
                                                />
                                            </div>
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-[232px] border-b border-white/5 border-r border-white/5">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>NOMBRE</span>
                                                <FilterDropdown 
                                                    options={getColumnOptions('nombre_asociado')}
                                                    selectedOptions={activeFilters['nombre_asociado'] || []}
                                                    onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, nombre_asociado: vals }))}
                                                    dark
                                                />
                                            </div>
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-36 border-b border-white/5 border-r border-white/5">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>EMPRESA</span>
                                                <FilterDropdown 
                                                    options={getColumnOptions('empresa')}
                                                    selectedOptions={activeFilters['empresa'] || []}
                                                    onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, empresa: vals }))}
                                                    dark
                                                />
                                            </div>
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-36 border-b border-white/5 border-r border-white/5">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>VALOR</span>
                                            </div>
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-36 border-b border-white/5 last:rounded-tr-xl">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>CONCEPTO</span>
                                                <FilterDropdown 
                                                    options={getColumnOptions('concepto')}
                                                    selectedOptions={activeFilters['concepto'] || []}
                                                    onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, concepto: vals }))}
                                                    dark
                                                />
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-2 text-slate-400 font-mono w-12 border-r border-slate-50 text-center">{i + 1}</td>
                                            <td className="p-2 font-mono border-r border-slate-50 text-center">{row.cedula}</td>
                                            <td className="p-2 border-r border-slate-50 text-center">{row.nombre_asociado}</td>
                                            <td className="p-2 border-r border-slate-50 text-center">
                                                <Badge variant={getBadgeVariantForEmpresa(row.empresa)} size="xs">{row.empresa || 'REFRIDCOL'}</Badge>
                                            </td>
                                            <td className="p-2 text-right font-mono font-bold text-[var(--color-primary)] border-r border-slate-50">
                                                {formatCurrency(row.valor)}
                                            </td>
                                            <td className="p-2 text-center font-bold text-slate-600 dark:text-slate-400">
                                                {row.concepto}
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
