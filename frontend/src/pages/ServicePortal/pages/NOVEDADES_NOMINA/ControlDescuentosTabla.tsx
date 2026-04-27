import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Table2, Database, Plus, PlusCircle, Settings2 } from 'lucide-react';
import { NominaTable, ColumnDef } from '../../../../components/organisms/NominaTable';
import SubcategorySummaryCard from './components/SubcategorySummaryCard';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface TablaQuincenalRow {
    indice: number;
    cedula: string;
    nombre: string;
    empresa: string;
    valor: number;
    concepto: string;
}

interface TablaQuincenalResponse {
    filas: TablaQuincenalRow[];
    summary: {
        total_registros: number;
        total_valor: number;
        por_empresa: Record<string, number>;
        anio: number;
        mes: number;
        quincena: string;
    };
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const QUINCENAS = [
    { value: '1', label: 'Q1 – Primera quincena (día 15)' },
    { value: '2', label: 'Q2 – Segunda quincena (fin de mes)' },
];

// ── Componente principal ──────────────────────────────────────────────────────

const ControlDescuentosTabla: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [anio, setAnio] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [quincena, setQuincena] = useState<1 | 2>(1);

    const [data, setData] = useState<TablaQuincenalResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    // ── Fetch al cambiar filtros ──────────────────────────────────────────────

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setData(null);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/control_descuentos/tabla-quincenal`,
                    { params: { anio, mes, quincena } }
                );
                setData(res.data);
            } catch (err) {
                console.error('Error cargando tabla quincenal:', err);
                addNotification('error', 'No se pudo cargar la tabla quincenal.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [anio, mes, quincena, addNotification]);

    // ── Formateo ──────────────────────────────────────────────────────────────

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(val);

    // ── Columnas de la tabla ──────────────────────────────────────────────────

    const columns = useMemo<ColumnDef<TablaQuincenalRow>[]>(() => [
        { header: 'CÉDULA', accessorKey: 'cedula' },
        { header: 'NOMBRE', accessorKey: 'nombre' },
        {
            header: 'EMPRESA',
            accessorKey: 'empresa',
            cell: (row: TablaQuincenalRow) => (
                <Badge variant={row.empresa === 'CONTRATISTA' ? 'warning' : 'info'} size="sm">
                    {row.empresa || 'REFRIDCOL'}
                </Badge>
            ),
        },
        {
            header: 'VALOR',
            accessorKey: 'valor',
            align: 'right',
            cell: (row: TablaQuincenalRow) => (
                <Text size="sm" className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.valor)}
                </Text>
            ),
        },
        {
            header: 'CONCEPTO',
            accessorKey: 'concepto',
            cell: (row: TablaQuincenalRow) => (
                <Badge variant={row.concepto.includes('Q1') ? 'info' : 'success'} size="sm">
                    {row.concepto}
                </Badge>
            ),
        },
    ], []);

    // ── Summary cards ────────────────────────────────────────────────────────

    const porEmpresa = data?.summary.por_empresa ?? {};

    const porConcepto = useMemo(() => {
        if (!data || !data.filas) return {};
        const acc: Record<string, number> = {};
        data.filas.forEach(f => {
            acc[f.concepto] = (acc[f.concepto] || 0) + f.valor;
        });
        return acc;
    }, [data]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-170px)] flex flex-col animate-in fade-in duration-500 overflow-hidden px-1">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex-none space-y-2 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate('/service-portal/novedades-nomina')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <Title variant="h5" weight="bold" className="flex items-center gap-2">
                                <Table2 className="w-5 h-5 text-purple-500" />
                                Control de Descuentos - TABLA QUINCENAL
                            </Title>
                            <Text color="text-secondary" className="text-[10px] leading-none uppercase tracking-widest opacity-70">
                                DESCUENTOS / CONTROL DE DESCUENTOS
                            </Text>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="primary"
                            className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[var(--color-primary)] text-white transition-all duration-300 shadow-sm h-auto py-1 px-2.5 min-w-[100px]"
                            onClick={() => navigate('/service-portal/novedades-nomina/DESCUENTOS/CONTROL DE DESCUENTOS/registro')}
                        >
                            <Plus className="w-3.5 h-3.5 mx-auto text-white" />
                            <Text as="span" color="inherit" weight="black" className="text-[8px] uppercase tracking-wider text-center w-full">Registrar Descuento</Text>
                        </Button>
                    </div>
                </div>

                {/* ── Selector de filtros ───────────────────────────────────── */}
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap items-end gap-3">
                        {/* Año */}
                        <div className="w-20">
                            <Input
                                label="Año"
                                size="xs"
                                type="number"
                                className="!mb-0"
                                value={anio.toString()}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setAnio(parseInt(e.target.value) || new Date().getFullYear())
                                }
                            />
                        </div>

                        {/* Mes */}
                        <div className="w-32">
                            <Select
                                label="Mes"
                                size="xs"
                                className="!mb-0"
                                value={mes.toString()}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setMes(parseInt(e.target.value))
                                }
                                options={MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                            />
                        </div>

                        {/* Quincena */}
                        <div className="w-56">
                            <Select
                                label="Quincena"
                                size="xs"
                                className="!mb-0"
                                value={quincena.toString()}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setQuincena(parseInt(e.target.value) as 1 | 2)
                                }
                                options={QUINCENAS}
                            />
                        </div>

                        <div className="flex-1 flex items-center justify-end">
                            <Text size="xs" color="text-tertiary" className="italic">
                                {data
                                    ? `${data.summary.total_registros} registro(s) · ${MESES[mes - 1]} ${anio} · ${data.summary.quincena}`
                                    : 'Selecciona período para ver los datos.'
                                }
                            </Text>
                        </div>
                    </div>
                </div>

                {/* ── Summary cards ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 flex-none">
                    <div className="lg:col-span-2">
                        <SubcategorySummaryCard
                            label="Registros"
                            value={data?.summary?.total_registros ?? '-'}
                            isCentered
                        />
                    </div>
                    <div className="lg:col-span-4">
                        <SubcategorySummaryCard
                            label="Valor por Empresa"
                            details={porEmpresa}
                            isTabulated
                            formatAsCurrency
                        />
                    </div>
                    <div className="lg:col-span-4">
                        <SubcategorySummaryCard
                            label="Valor por Concepto"
                            details={porConcepto}
                            isTabulated
                            formatAsCurrency
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <SubcategorySummaryCard
                            label="Valor Total"
                            value={data ? formatCurrency(data.summary.total_valor) : '-'}
                            isCentered
                        />
                    </div>
                </div>
            </div>

            {/* ── Loading ───────────────────────────────────────────────────── */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
                    <Text className="ml-3" color="text-secondary">Cargando tabla quincenal...</Text>
                </div>
            )}

            {/* ── Results ───────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
                {data && data.filas.length > 0 && !isLoading && (
                    <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <NominaTable
                            data={data.filas}
                            columns={columns}
                            hideSearch // Propiedad para ocultar el buscador global
                            globalFilterText={searchText}
                            onGlobalFilterChange={setSearchText}
                            customSort={(a, b) => (a.nombre || '').localeCompare(b.nombre || '')}
                            fullHeight
                        />
                    </div>
                )}

                {data && data.filas.length === 0 && !isLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mx-1">
                        <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                        <Text variant="h4" weight="bold" color="text-secondary" className="mb-1">
                            Sin registros para este período
                        </Text>
                        <Text size="sm" color="text-tertiary">
                            No hay descuentos con fecha de inicio en {MESES[mes - 1]} {anio} –{' '}
                            {quincena === 1 ? 'Q1 (día 15)' : 'Q2 (fin de mes)'}.
                        </Text>
                    </div>
                )}

                {!data && !isLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mx-1">
                        <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                        <Text variant="h4" weight="bold" color="text-secondary" className="mb-1">
                            Sin datos disponibles
                        </Text>
                        <Text size="sm" color="text-tertiary">
                            Selecciona un período para cargar la tabla quincenal.
                        </Text>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControlDescuentosTabla;
