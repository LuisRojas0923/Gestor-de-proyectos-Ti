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
import { FilterDropdown } from '../../../../components/molecules/FilterDropdown';

interface PlanillaRow {
    cedula: string;
    nombre: string;
    empresa: string;
    horas: number;
    dias: number;
    concepto: string;
}

interface WarningDetalle {
    cedula: string;
    nombre: string;
    motivo: string;
}

interface PlanillaResponse {
    filas: PlanillaRow[];
    summary: {
        total_asociados: number;
        total_filas: number;
        total_horas: number;
        total_dias: number;
    };
    warnings: string[];
    warnings_detalle: WarningDetalle[];
}

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const PlanillasRegionales1QPreview: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PlanillaResponse | null>(null);

    // Filtros
    const [searchText, setSearchText] = useState('');

    // Filtros por columna (Excel style)
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // Cargar datos guardados
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            setData(null);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/planillas_regionales_1q/datos`,
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
                console.error('Error cargando datos PLANILLAS REGIONALES 1Q:', err);
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
                `${API_CONFIG.BASE_URL}/novedades-nomina/planillas_regionales_1q/preview`,
                formData,
            );
            if (res.data.error) {
                 addNotification('error', `Error procesando: ${res.data.error}`);
            } else {
                setData(res.data);
                setWarningsDetalle(res.data.warnings_detalle || []);
                addNotification('success', `Procesados ${res.data.summary.total_asociados} asociados.`);
                setFiles([]);
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
        if (!data || !data.filas) return [];
        return data.filas
            .filter(r => {
                // Filtro de búsqueda global
                const matchGlobal = searchText === ''
                    || r.cedula.toLowerCase().includes(searchText.toLowerCase())
                    || r.nombre.toLowerCase().includes(searchText.toLowerCase());
                
                if (!matchGlobal) return false;

                // Filtros por columna
                for (const [key, values] of Object.entries(activeFilters)) {
                    if (values.length === 0) continue;
                    const rowValue = String((r as any)[key] || '').toUpperCase();
                    if (!values.includes(rowValue)) return false;
                }

                return true;
            })
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [data, searchText, activeFilters]);

    const getColumnOptions = (key: keyof PlanillaRow) => {
        if (!data || !data.filas) return [];
        const uniqueValues = Array.from(new Set(data.filas.map(r => String(r[key] || '').toUpperCase())));
        return uniqueValues.sort().map(v => ({ label: v, value: v }));
    };

    const summaryCalculated = useMemo(() => {
        if (!data || !data.filas) return { porEmpresa: {}, porNovedad: {}, horasPorConcepto: {}, diasPorConcepto: {} };
        const asociadosEmpresa = new Map<string, string>(); // Cedula -> Empresa
        const porNovedad: Record<string, number> = {};
        const horasPorConcepto: Record<string, number> = {};
        const diasPorConcepto: Record<string, number> = {};
 
        data.filas.forEach(row => {
            const cedula = row.cedula?.toString() || '';
            const emp = row.empresa || 'REFRIDCOL';
            const nov = row.concepto || 'N/A';
            
            // Track entity -> company for unique associate counts
            if (cedula && !asociadosEmpresa.has(cedula)) {
                asociadosEmpresa.set(cedula, emp);
            }
            
            porNovedad[nov] = (porNovedad[nov] || 0) + 1;
            horasPorConcepto[nov] = (horasPorConcepto[nov] || 0) + (row.horas || 0);
            diasPorConcepto[nov] = (diasPorConcepto[nov] || 0) + (row.dias || 0);
        });

        // Count associates per company
        const porEmpresa: Record<string, number> = {};
        asociadosEmpresa.forEach((empresa) => {
            porEmpresa[empresa] = (porEmpresa[empresa] || 0) + 1;
        });
 
        // Add Totals
        horasPorConcepto['TOTAL'] = data.summary.total_horas;
        diasPorConcepto['TOTAL'] = data.summary.total_dias;
 
        return { porEmpresa, porNovedad, horasPorConcepto, diasPorConcepto };
    }, [data]);

    const columns = useMemo<ColumnDef<PlanillaRow>[]>(() => [
        { header: 'CÉDULA', accessorKey: 'cedula' },
        { header: 'NOMBRE', accessorKey: 'nombre' },
        { 
            header: 'EMPRESA', 
            accessorKey: 'empresa', 
            cell: (row: PlanillaRow) => <Badge variant={row.empresa === 'CONTRATISTA' ? 'warning' : 'info'} size="sm">{row.empresa || 'REFRIDCOL'}</Badge> 
        },
        { 
            header: 'HORAS', 
            accessorKey: 'horas', 
            align: 'right',
            cell: (row: PlanillaRow) => <Text weight="bold">{row.horas}</Text>
        },
        { 
            header: 'DIAS', 
            accessorKey: 'dias', 
            align: 'right',
            cell: (row: PlanillaRow) => <Text weight="bold">{row.dias}</Text>
        },
        { 
            header: 'CONCEPTO', 
            accessorKey: 'concepto', 
            cell: (row: PlanillaRow) => <Badge variant="default" size="sm">{row.concepto}</Badge> 
        }
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
                            <Title variant="h4" weight="bold">PLANILLAS REGIONALES 1Q – Preview</Title>
                            <Text color="text-secondary">NOVEDADES / PLANILLAS REGIONALES 1Q</Text>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="flex flex-col items-end gap-0.5 h-auto py-1 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        onClick={() => navigate('/service-portal/novedades-nomina/historial?subcategoria=PLANILLAS REGIONALES 1Q')}
                    >
                        <div className="flex items-center gap-2">
                            <Title variant="h5" weight="bold" className="text-slate-800 dark:text-slate-200">Ver Histórico</Title>
                            <History className="w-4 h-4 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            <Text as="span" size="xs" color="inherit" className="font-bold">PLANILLAS REGIONALES 1Q / HISTORIAL</Text>
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
                            Archivo .xlsm ({files.length} seleccionado)
                        </Text>
                        <div className="relative group">
                            <FilePicker
                                files={files}
                                onChange={handleFilesChange}
                                placeholder="Seleccionar Planilla (.xlsm)..."
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
            <div className="flex-1 min-h-0 flex flex-col space-y-1.5 overflow-hidden">
                {/* Summary Cards Grid - Always visible */}
                {!isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-none mb-1.5">
                        <SubcategorySummaryCard
                            label="Asociados"
                            value={data?.summary?.total_asociados ?? 0}
                            tooltipDetail={summaryCalculated.porEmpresa}
                            isCentered
                            formatAsCurrency={false}
                        />
                        <SubcategorySummaryCard
                            label="Registros"
                            value={data?.summary?.total_filas ?? 0}
                            isCentered
                            formatAsCurrency={false}
                        />
                        <SubcategorySummaryCard
                            label="Horas Totales"
                            value={summaryCalculated.horasPorConcepto['TOTAL'] ?? 0}
                            tooltipDetail={summaryCalculated.horasPorConcepto}
                            formatAsCurrency={false}
                            isCentered
                        />
                        <SubcategorySummaryCard
                            label="Días Totales"
                            value={summaryCalculated.diasPorConcepto['TOTAL'] ?? 0}
                            tooltipDetail={summaryCalculated.diasPorConcepto}
                            formatAsCurrency={false}
                            isCentered
                        />
                    </div>
                )}

                {data && !isLoading && (
                    <>
                        {/* Results Body */}

                        {/* Warnings */}
                        {data?.warnings && data.warnings.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-2 space-y-1 flex-none">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <Text weight="bold" size="xs" className="text-amber-800 dark:text-amber-300">Advertencias</Text>
                                </div>
                                <ul className="space-y-0.5 ml-5 list-disc">
                                    {data.warnings.map((w, i) => (
                                        <li key={i}><Text size="xs" className="text-amber-700 dark:text-amber-400 text-[10px]">{w}</Text></li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warnings ERP Detalle */}
                        {warningsDetalle.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 space-y-3 flex-none">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <Text weight="bold" size="sm" className="text-amber-800 dark:text-amber-300">
                                            Cédulas con novedades ({warningsDetalle.length})
                                        </Text>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 px-3 rounded-lg" onClick={() => setShowWarnings(!showWarnings)}>
                                        <Text as="span" color="inherit" size="xs">{showWarnings ? 'Ocultar' : 'Ver Detalles'}</Text>
                                    </Button>
                                </div>
                                {showWarnings && (
                                    <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-700 max-h-40 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-amber-100 dark:bg-amber-900/30">
                                                <tr>
                                                    <th className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">CÉDULA</th>
                                                    <th className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">NOMBRE</th>
                                                    <th className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300">MOTIVO</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-amber-100 dark:divide-amber-800">
                                                {warningsDetalle.map((w, i) => (
                                                    <tr key={i} className="hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                                        <td className="p-2"><Text size="xs" className="font-mono uppercase">{w.cedula}</Text></td>
                                                        <td className="p-2"><Text size="xs" className="uppercase">{w.nombre}</Text></td>
                                                        <td className="p-2"><Badge variant={w.motivo.includes('EXCEPCION') ? 'warning' : 'error'} size="xs">{w.motivo}</Badge></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="h-full overflow-auto">
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
                                                        options={getColumnOptions('nombre')}
                                                        selectedOptions={activeFilters['nombre'] || []}
                                                        onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, nombre: vals }))}
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
                                            <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-32 border-b border-white/5 border-r border-white/5">HORAS</th>
                                            <th className="text-center py-3 px-4 font-bold uppercase tracking-wider w-32 border-b border-white/5 border-r border-white/5">DIAS</th>
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
                                                <td className="p-2 border-r border-slate-50 text-center">{row.nombre}</td>
                                                <td className="p-2 border-r border-slate-50 text-center">
                                                    <Badge variant={row.empresa === 'CONTRATISTA' ? 'warning' : 'info'} size="xs">{row.empresa || 'REFRIDCOL'}</Badge>
                                                </td>
                                                <td className="p-2 text-center font-mono font-bold border-r border-slate-50">{row.horas}</td>
                                                <td className="p-2 text-center font-mono font-bold border-r border-slate-50">{row.dias}</td>
                                                <td className="p-2 text-center">
                                                    <Badge variant="default" size="xs">{row.concepto}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {!data && !isLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mx-1">
                        <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                        <Title variant="h4" weight="bold" color="text-secondary" className="mb-1">Sin datos para este periodo</Title>
                        <Text size="sm" color="text-tertiary">Sube un archivo .xlsm para procesar las Planillas Regionales de {MESES[mes - 1]} {anio}.</Text>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanillasRegionales1QPreview;
