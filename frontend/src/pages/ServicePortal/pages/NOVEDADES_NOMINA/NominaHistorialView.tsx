import React, { useState, useEffect } from 'react';
import { Title, Text, Button, Badge, Select, Input } from '../../../../components/atoms';
import { MaterialCard } from '../../../../components/atoms';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { ArrowLeft, History, Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Tipos ──────────────────────────────────────
interface ArchivoHistorial {
    id: number;
    nombre_archivo: string;
    subcategoria: string;
    categoria: string;
    mes_fact: number;
    año_fact: number;
    estado: string;
    creado_en: string | null;
    tamaño_bytes: number;
    tipo_archivo: string;
    total_registros: number;
}

// ── Constantes ─────────────────────────────────
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ESTADO_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    'Procesado': 'success',
    'Cargado': 'warning',
    'Procesando': 'neutral',
    'Error': 'danger',
};

const PAGE_SIZE = 15;

// ── Helpers ────────────────────────────────────
const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFecha = (iso: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

// ── Componente principal ───────────────────────
const NominaHistorialView: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const now = new Date();

    const [archivos, setArchivos] = useState<ArchivoHistorial[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Filtros — subcategoria puede venir por query param
    const [mesFiltro, setMesFiltro] = useState<number | ''>('');
    const [añoFiltro, setAñoFiltro] = useState<number>(now.getFullYear());
    const [subcategoriaFiltro, setSubcategoriaFiltro] = useState<string>(searchParams.get('subcategoria') || '');

    // Paginación
    const [page, setPage] = useState(0);

    useEffect(() => {
        fetchHistorial();
    }, [mesFiltro, añoFiltro, subcategoriaFiltro, page]);

    const fetchHistorial = async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string | number> = {
                skip: page * PAGE_SIZE,
                limit: PAGE_SIZE,
            };
            if (mesFiltro !== '') params.mes = mesFiltro;
            if (añoFiltro) params['año'] = añoFiltro;
            if (subcategoriaFiltro) params.subcategoria = subcategoriaFiltro;

            const res = await axios.get(`${API_CONFIG.BASE_URL}/novedades-nomina/historial`, { params });
            setArchivos(res.data.archivos);
            setTotal(res.data.total);
        } catch (err) {
            console.error('Error fetching historial:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Generar opciones de años (últimos 5)
    const currentYear = now.getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <History className="w-7 h-7 text-[var(--color-primary)]" />
                    <div>
                        <Title variant="h4" weight="bold">
                            {subcategoriaFiltro ? `Histórico — ${subcategoriaFiltro}` : 'Histórico de Cargas'}
                        </Title>
                        <Text color="text-secondary">Consulta todas las cargas de archivos realizadas</Text>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <MaterialCard className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <Select
                        label="Mes"
                        value={mesFiltro.toString()}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setMesFiltro(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
                        options={[
                            { value: '', label: 'Todos los meses' },
                            ...MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))
                        ]}
                        className="flex-1 min-w-[160px]"
                    />
                    <Select
                        label="Año"
                        value={añoFiltro.toString()}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setAñoFiltro(Number(e.target.value)); setPage(0); }}
                        options={yearOptions.map((y) => ({ value: y.toString(), label: y.toString() }))}
                        className="flex-1 min-w-[120px]"
                    />
                    {!searchParams.get('subcategoria') && (
                        <Input
                            label="Subcategoría"
                            placeholder="Filtrar por subcategoría..."
                            value={subcategoriaFiltro}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSubcategoriaFiltro(e.target.value); setPage(0); }}
                            className="flex-1 min-w-[160px]"
                        />
                    )}
                    <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="px-3 py-1.5">
                            {total} {total === 1 ? 'archivo' : 'archivos'}
                        </Badge>
                    </div>
                </div>
            </MaterialCard>

            {/* Tabla */}
            {isLoading ? (
                <div className="flex justify-center p-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
                </div>
            ) : archivos.length === 0 ? (
                <MaterialCard className="p-16 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-40" />
                    <Title variant="h5" weight="medium">No se encontraron archivos</Title>
                    <Text color="text-secondary" className="mt-2">
                        Ajusta los filtros o carga tu primer archivo desde el dashboard.
                    </Text>
                </MaterialCard>
            ) : (
                <MaterialCard className="overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px]">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-[var(--color-surface)] shadow-sm">
                                <tr className="border-b border-[var(--color-border)]">
                                    {['Archivo', 'Subcategoría', 'Período', 'Registros', 'Tamaño', 'Estado', 'Fecha de Carga', ''].map((h) => (
                                        <th key={h} className="px-5 py-4 text-left bg-inherit">
                                            <Text weight="bold" className="text-xs uppercase tracking-wider opacity-60">{h}</Text>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {archivos.map((a) => (
                                    <tr key={a.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <Text weight="medium" className="truncate max-w-[200px] block">{a.nombre_archivo}</Text>
                                                    <Text className="text-xs opacity-50">{a.tipo_archivo.toUpperCase()}</Text>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant="neutral" className="text-xs">{a.subcategoria}</Badge>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Text>{MESES[a.mes_fact - 1]} {a.año_fact}</Text>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Text weight="bold">{a.total_registros.toLocaleString()}</Text>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Text className="text-sm opacity-70">{formatBytes(a.tamaño_bytes)}</Text>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant={ESTADO_BADGE[a.estado] || 'neutral'}>{a.estado}</Badge>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Text className="text-sm">{formatFecha(a.creado_en)}</Text>
                                        </td>
                                        <td className="px-5 py-4">
                                            {a.estado === 'Procesado' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/service-portal/novedades-nomina/preview/${a.id}`)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-[var(--color-border)]/50">
                        {archivos.map((a) => (
                            <div key={a.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                                        <Text weight="medium" className="truncate">{a.nombre_archivo}</Text>
                                    </div>
                                    <Badge variant={ESTADO_BADGE[a.estado] || 'neutral'} className="flex-shrink-0">{a.estado}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <Badge variant="neutral" className="text-xs">{a.subcategoria}</Badge>
                                    <Text className="opacity-60">{MESES[a.mes_fact - 1]} {a.año_fact}</Text>
                                    <Text className="opacity-60">·</Text>
                                    <Text weight="bold">{a.total_registros} registros</Text>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Text className="text-xs opacity-50">{formatFecha(a.creado_en)} · {formatBytes(a.tamaño_bytes)}</Text>
                                    {a.estado === 'Procesado' && (
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/service-portal/novedades-nomina/preview/${a.id}`)}>
                                            <Eye className="w-4 h-4 mr-1" /> Ver
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </MaterialCard>
            )}

            {/* Paginación */}
            {total > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Text weight="medium">
                        Página {page + 1} de {totalPages}
                    </Text>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page + 1 >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default NominaHistorialView;
