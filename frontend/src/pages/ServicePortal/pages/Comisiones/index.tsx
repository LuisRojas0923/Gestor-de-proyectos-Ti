import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Database, LayoutGrid, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { NominaTable, ColumnDef } from '../../../../components/organisms/NominaTable';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import SubcategorySummaryCard from '../NOVEDADES_NOMINA/components/SubcategorySummaryCard';
import ComisionesForm, { ManualComisionRow } from './components/ComisionesForm';

interface ComisionRow {
    cedula: string;
    nombre_asociado: string;
    valor: number;
    empresa: string;
    concepto: string;
    is_favorite?: boolean;
}

interface WarningDetalle {
    cedula: string;
    nombre: string;
    motivo: string;
}

interface ComisionesResponse {
    rows: ComisionRow[];
    summary: {
        total_asociados: number;
        total_filas: number;
        total_valor: number;
        mes: number;
        anio: number;
    };
    warnings: string[];
    warnings_detalle: WarningDetalle[];
}

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const ComisionesView: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<ComisionesResponse | null>(null);

    // Filtros
    const [searchText, setSearchText] = useState('');
    const [showForm, setShowForm] = useState(true);
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // Cargar datos guardados
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            setData(null);
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/comisiones/datos`,
                    { 
                        params: { mes, anio },
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                if (res.data.rows && res.data.rows.length > 0) {
                    setData({ 
                        rows: res.data.rows, 
                        summary: res.data.summary, 
                        warnings: [], 
                        warnings_detalle: res.data.warnings_detalle || [] 
                    });
                    setWarningsDetalle(res.data.warnings_detalle || []);
                } else {
                    setData(null);
                    setWarningsDetalle([]);
                }
            } catch (err) {
                console.error('Error cargando datos COMISIONES:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSaved();
    }, [mes, anio]);

    const handleManualProcess = async (manualData: ManualComisionRow[]) => {
        setIsProcessing(true);
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(
                `${API_CONFIG.BASE_URL}/novedades-nomina/comisiones/procesar-manual`,
                {
                    mes,
                    anio,
                    data: manualData
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setData(res.data);
            setWarningsDetalle(res.data.warnings_detalle || []);
            addNotification('success', `Comisiones procesadas: ${res.data.summary.total_asociados} asociados.`);
            setShowForm(false); 
        } catch (err) {
            console.error(err);
            addNotification('error', 'Error al procesar comisiones.');
        } finally {
            setIsProcessing(false);
        }
    };

    const summaryCalculated = useMemo(() => {
        if (data && data.rows) {
            data.rows.forEach(row => {
                const emp = row.empresa || 'N/A';
                porEmpresa[emp] = (porEmpresa[emp] || 0) + row.valor;
            });
        }

        return { porEmpresa };
    }, [data]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const columns = useMemo<ColumnDef<ComisionRow>[]>(() => [
        { header: 'CÉDULA', accessorKey: 'cedula' },
        { header: 'NOMBRE', accessorKey: 'nombre_asociado' },
        { header: 'EMPRESA', accessorKey: 'empresa' },
        { header: 'VALOR', accessorKey: 'valor', align: 'right', cell: (row: ComisionRow) => formatCurrency(row.valor) },
    ], []);

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-170px)] flex flex-col animate-in fade-in duration-500 overflow-hidden px-1">
            <div className="flex-none space-y-2 pb-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/service-portal/inicio')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <Title variant="h5" weight="bold">Gestión de Comisiones</Title>
                                <Text color="text-secondary" className="text-[10px] leading-none uppercase tracking-widest">Novedades / Comisiones</Text>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant={showForm ? 'primary' : 'outline'} 
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-300 shadow-sm h-auto py-1 px-2.5 min-w-[80px] ${showForm ? 'bg-[var(--color-primary)] text-white' : 'border-slate-200 text-slate-600'}`}
                            onClick={() => setShowForm(true)}
                        >
                            <Plus className={`w-3.5 h-3.5 mx-auto ${showForm ? 'text-white' : 'text-blue-600'}`} />
                            <Text as="span" color="inherit" weight="black" className="text-[8px] uppercase tracking-wider text-center w-full">Ingresar Datos</Text>
                        </Button>
                        <Button 
                            variant={!showForm ? 'primary' : 'outline'} 
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-300 shadow-sm h-auto py-1 px-2.5 min-w-[80px] ${!showForm ? 'bg-[var(--color-primary)] text-white' : 'border-slate-200 text-slate-600'}`}
                            disabled={!data}
                            onClick={() => setShowForm(false)}
                        >
                            <LayoutGrid className={`w-3.5 h-3.5 mx-auto ${!showForm ? 'text-white' : 'text-blue-600'}`} />
                            <Text as="span" color="inherit" weight="black" className="text-[8px] uppercase tracking-wider text-center w-full">Ver Resultados</Text>
                        </Button>

                        <Button 
                            variant="outline" 
                            className="flex flex-col items-center justify-center gap-0.5 rounded-xl border-slate-200 dark:border-slate-700 font-semibold h-auto py-1 px-2.5 min-w-[80px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm"
                            onClick={() => navigate('/service-portal/novedades-nomina/historial?subcategoria=COMISIONES')}
                        >
                            <History className="w-3.5 h-3.5 text-[var(--color-primary)] mx-auto" />
                            <Text size="xs" weight="black" className="text-[8px] text-center text-slate-600 dark:text-slate-300 uppercase">Historial</Text>
                        </Button>
                    </div>
                </div>

                {/* Control Section */}
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-24">
                            <Input
                                label="Año"
                                size="xs"
                                type="number"
                                className="!mb-0"
                                value={anio.toString()}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnio(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="w-32">
                            <Select
                                label="Mes"
                                size="xs"
                                className="!mb-0"
                                value={mes.toString()}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                                options={MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                            />
                        </div>
                        
                        <div className="flex-1 flex items-center justify-end px-2">
                            <Text size="xs" color="text-secondary" className="italic">
                                {showForm ? 'Ingresa los datos en el formulario inferior para procesar.' : 'Datos cargados para este periodo.'}
                            </Text>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 flex-none mb-3 px-1">
                <div className="lg:col-span-3">
                    <SubcategorySummaryCard
                        label="Asociados con Comisión"
                        value={data?.summary?.total_asociados ?? '-'}
                        isCentered
                    />
                </div>
                <div className="lg:col-span-6">
                    <SubcategorySummaryCard
                        label="Comisiones por Empresa"
                        details={summaryCalculated.porEmpresa}
                        isTabulated
                        formatAsCurrency={true}
                    />
                </div>
                <div className="lg:col-span-3">
                    <SubcategorySummaryCard
                        label="Total Comisiones"
                        value={data ? formatCurrency(data.summary.total_valor) : '-'}
                        isCentered
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-y-auto pr-1">
                {showForm ? (
                    <div className="flex-none">
                        <ComisionesForm 
                            onProcess={handleManualProcess}
                            isProcessing={isProcessing}
                        />
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
                                <Text className="ml-3" color="text-secondary">Cargando datos guardados...</Text>
                            </div>
                        )}

                        {data && !isLoading && (
                            <>
                                {warningsDetalle.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 space-y-3 flex-none">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                <Text weight="bold" size="sm" className="text-red-800 dark:text-red-300">
                                                    Cédulas con novedades ({warningsDetalle.length})
                                                </Text>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-3 rounded-lg"
                                                onClick={() => setShowWarnings(!showWarnings)}
                                            >
                                                <Text as="span" color="inherit" size="xs">
                                                    {showWarnings ? 'Ocultar' : 'Ver'}
                                                </Text>
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
                                                        {warningsDetalle.map((w: WarningDetalle, i: number) => (
                                                            <tr key={i} className="hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                                                <td className="p-2"><Text size="xs" className="font-mono uppercase">{w.cedula}</Text></td>
                                                                <td className="p-2"><Text size="xs" className="uppercase">{w.nombre}</Text></td>
                                                                <td className="p-2">
                                                                    <Badge variant="error" size="xs">{w.motivo}</Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <NominaTable
                                        data={data.rows}
                                        columns={columns}
                                        globalFilterText={searchText}
                                        onGlobalFilterChange={setSearchText}
                                        customSort={(a, b) => (a.nombre_asociado || "").localeCompare(b.nombre_asociado || "")}
                                        fullHeight
                                    />
                                </div>
                            </>
                        )}

                        {!data && !isLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mx-1">
                                <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                                <Text variant="h4" weight="bold" color="text-secondary" className="mb-1">No hay registros guardados</Text>
                                <Text size="sm" color="text-tertiary">Ingresa datos en el formulario para procesar comisiones del periodo ({MESES[mes - 1]} {anio}).</Text>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ComisionesView;
