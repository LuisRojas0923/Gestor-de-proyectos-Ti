import React, { useState, useMemo } from 'react';
import { Title, Text, Button, Badge, Select, MaterialCard } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Download, Table2, Search } from 'lucide-react';
import { NominaTable, ColumnDef } from '../../../../components/organisms/NominaTable';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

/* ───────── Types ───────── */

interface TablaMaestraRow {
    CEDULA: string;
    NOMBRE: string;
    EMPRESA: string;
    "VALOR QUINCENAL": number;
    HORAS: number | null;
    DIAS: number | null;
    CONCEPTO: string;
}

interface ValidationResult {
    completo: boolean;
    disponibles: string[];
    faltantes: string[];
    total_requeridas: number;
    total_disponibles: number;
    total_faltantes: number;
}

interface TablaMaestraSummary {
    total_registros: number;
    total_asociados: number;
    total_valor_quincenal: number;
    total_horas: number;
    total_dias: number;
    subcategorias_incluidas: string[];
    mes: number;
    anio: number;
    quincena: string;
}

/* ───────── Constants ───────── */

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 3 + i);

/* ───────── Helpers ───────── */

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

/* ───────── Component ───────── */

const TablaMaestraView: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    // Parámetros
    const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
    const [anio, setAnio] = useState<number>(CURRENT_YEAR);
    const [quincena, setQuincena] = useState<string>("Q1");

    // Estado
    const [isValidating, setIsValidating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [showValidation, setShowValidation] = useState(true);
    const [filas, setFilas] = useState<TablaMaestraRow[]>([]);
    const [summary, setSummary] = useState<TablaMaestraSummary | null>(null);
    const [searchText, setSearchText] = useState('');

    /* ─── Validación ─── */
    const handleValidar = async () => {
        setIsValidating(true);
        setValidation(null);
        setShowValidation(true);
        setFilas([]);
        setSummary(null);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/tabla-maestra/validar`, {
                params: { mes, anio, quincena, _t: Date.now() }
            });
            setValidation(res.data);
            if (res.data.completo) {
                addNotification('success', 'Todas las subcategorías están disponibles. Puede generar la tabla maestra.');
            } else {
                addNotification('warning', `Faltan ${res.data.total_faltantes} subcategoría(s) por cargar.`);
            }
        } catch (err) {
            addNotification('error', 'Error al validar la disponibilidad.');
        } finally {
            setIsValidating(false);
        }
    };

    /* ─── Generación ─── */
    const handleGenerar = async () => {
        setIsGenerating(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/tabla-maestra/generar`, {
                params: { mes, anio, quincena, _t: Date.now() }
            });
            if (res.data.error) {
                addNotification('error', res.data.mensaje);
                return;
            }
            setFilas(res.data.filas);
            setSummary(res.data.summary);
            setShowValidation(false); // Colapsar al generar la tabla
            addNotification('success', `Tabla maestra generada: ${res.data.filas.length} registros.`);
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            if (detail?.faltantes) {
                addNotification('error', `Faltan subcategorías: ${detail.faltantes.join(', ')}`);
            } else {
                addNotification('error', 'Error al generar la tabla maestra.');
            }
        } finally {
            setIsGenerating(false);
        }
    };



    /* ─── Columnas tabla ─── */
    const columns: ColumnDef<TablaMaestraRow>[] = useMemo(() => [
        { header: 'CÉDULA', accessorKey: 'CEDULA', align: 'center' as const, enableColumnFilter: true },
        { header: 'NOMBRE', accessorKey: 'NOMBRE', align: 'left' as const, enableColumnFilter: true },
        { header: 'EMPRESA', accessorKey: 'EMPRESA', align: 'center' as const, enableColumnFilter: true },
        {
            header: 'VALOR QUINCENAL',
            accessorKey: 'VALOR QUINCENAL',
            align: 'right' as const,
            cell: (row: TablaMaestraRow) => formatCurrency(row["VALOR QUINCENAL"])
        },
        {
            header: 'HORAS',
            accessorKey: 'HORAS',
            align: 'center' as const,
            cell: (row: TablaMaestraRow) => row.HORAS != null ? row.HORAS : ''
        },
        {
            header: 'DIAS',
            accessorKey: 'DIAS',
            align: 'center' as const,
            cell: (row: TablaMaestraRow) => row.DIAS != null ? row.DIAS : ''
        },
        { header: 'CONCEPTO', accessorKey: 'CONCEPTO', align: 'center' as const, enableColumnFilter: true },
    ], []);

    /* ─── Render ─── */
    return (
        <div className="flex flex-col h-[calc(100vh-70px)] overflow-hidden bg-[var(--color-background)] p-3 md:p-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header */}
            <div className="flex-none flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-[var(--color-surface-hover)]"
                    onClick={() => navigate('/service-portal/novedades-nomina')}
                >
                    <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </Button>
                <div>
                    <Title variant="h4" weight="black" className="text-[var(--color-primary)] uppercase tracking-tight">
                        Tabla Descuentos Nómina
                    </Title>
                    <Text size="xs" color="text-secondary" className="opacity-70">
                        Consolidación de todas las subcategorías de nómina
                    </Text>
                </div>
            </div>

            {/* Parámetros */}
            <MaterialCard className="flex-none p-4 rounded-xl shadow-sm border-none">
                <Title variant="h6" weight="black" className="uppercase tracking-tight text-[var(--color-primary)] mb-3">
                    Parámetros de Consulta
                </Title>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full md:w-40">
                        <Text size="xs" weight="bold" className="mb-1 uppercase tracking-wide text-[var(--color-text-secondary)]">Mes</Text>
                        <Select
                            value={String(mes)}
                            options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))}
                            onChange={(e) => { setMes(Number(e.target.value)); setValidation(null); setFilas([]); }}
                        />
                    </div>
                    <div className="w-full md:w-28">
                        <Text size="xs" weight="bold" className="mb-1 uppercase tracking-wide text-[var(--color-text-secondary)]">Año</Text>
                        <Select
                            value={String(anio)}
                            options={YEARS.map(y => ({ value: String(y), label: String(y) }))}
                            onChange={(e) => { setAnio(Number(e.target.value)); setValidation(null); setFilas([]); }}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <Text size="xs" weight="bold" className="mb-1 uppercase tracking-wide text-[var(--color-text-secondary)]">Quincena</Text>
                        <Select
                            value={quincena}
                            options={[
                                { value: "Q1", label: "Q1 — Primera quincena" },
                                { value: "Q2", label: "Q2 — Segunda quincena" }
                            ]}
                            onChange={(e) => { setQuincena(e.target.value); setValidation(null); setFilas([]); }}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <Button
                            variant="erp"
                            className="h-[38px] w-full md:w-auto px-5 font-bold shadow-sm rounded-lg transition-all active:scale-95"
                            onClick={handleValidar}
                            disabled={isValidating}
                        >
                            <div className="flex items-center justify-center gap-3 w-full text-slate-700">
                                {isValidating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
                                <Text as="span" className="leading-none text-slate-700 mt-0.5 uppercase tracking-wide" size="sm" weight="bold">Validar</Text>
                            </div>
                        </Button>
                    </div>
                </div>
            </MaterialCard>

            {/* Resultado de validación */}
            {validation && (
                <MaterialCard className="flex-none p-4 rounded-xl shadow-sm border-none animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                        <Title variant="h6" weight="black" className="uppercase tracking-tight text-[var(--color-primary)]">
                            Estado de Subcategorías
                        </Title>
                        <div className="flex items-center gap-3">
                            <Badge
                                variant={validation.completo ? 'success' : 'error'}
                                size="sm"
                            >
                                {validation.completo
                                    ? `${validation.total_disponibles}/${validation.total_requeridas} COMPLETO`
                                    : `${validation.total_disponibles}/${validation.total_requeridas} INCOMPLETO`
                                }
                            </Badge>
                            <Button
                                variant="outline"
                                size="xs"
                                className="h-7 text-[10px]"
                                onClick={() => setShowValidation(!showValidation)}
                            >
                                <div className="flex items-center gap-1">
                                    <Text as="span" size="xs" weight="bold" className="uppercase tracking-wide">
                                        {showValidation ? 'Ocultar' : 'Mostrar'} Detalles
                                    </Text>
                                </div>
                            </Button>
                        </div>
                    </div>

                    {showValidation && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                {validation.disponibles.map((s) => (
                                    <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <Text size="xs" weight="semibold" className="text-emerald-700 dark:text-emerald-300 truncate">{s}</Text>
                                    </div>
                                ))}
                                {validation.faltantes.map((s) => (
                                    <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-700/30">
                                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <Text size="xs" weight="semibold" className="text-red-700 dark:text-red-300 truncate">{s}</Text>
                                    </div>
                                ))}
                            </div>

                            {validation.completo && (
                                <div className="mt-3 flex justify-end">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="h-9 px-6 shadow-lg shadow-blue-500/20"
                                        onClick={handleGenerar}
                                        disabled={isGenerating}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isGenerating ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            ) : (
                                                <Table2 className="w-4 h-4 text-white" />
                                            )}
                                            <Text as="span" size="xs" weight="black" className="text-white uppercase tracking-wide">
                                                Generar Tabla
                                            </Text>
                                        </div>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </MaterialCard>
            )}

            {/* Tabla Maestra */}
            {filas.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0 p-3 rounded-xl shadow-sm border border-[var(--color-border)] bg-[var(--color-surface)] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex-none flex items-center justify-between mb-2">
                        <div>
                            <Title variant="h6" weight="black" className="uppercase tracking-tight text-[var(--color-primary)]">
                                Tabla Descuentos Nómina — {MESES[mes - 1]} {anio} ({quincena})
                            </Title>
                            <Text size="xs" color="text-secondary" className="opacity-70">
                                {filas.length} registros consolidados de {summary?.subcategorias_incluidas.length || 0} subcategorías
                            </Text>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 bg-white rounded-lg overflow-hidden border border-slate-200">
                        <NominaTable
                            data={filas}
                            columns={columns}
                            globalFilterText={searchText}
                            onGlobalFilterChange={setSearchText}
                            fullHeight
                            exportFileName={`TABLA_MAESTRA_${MESES[mes - 1]}_${anio}_${quincena}.csv`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TablaMaestraView;
