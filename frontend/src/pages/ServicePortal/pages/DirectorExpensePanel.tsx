import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Eye, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { Button, Text, Title, Input, Select, Badge, MaterialCard as Card } from '../../../components/atoms';
import { useApi } from '../../../hooks/useApi';

interface Legalizacion {
    codigo: number;
    codigolegalizacion: string;
    fecha: string;
    hora: string;
    empleado: string;
    nombreempleado: string;
    area: string;
    valortotal: number;
    estado: string;
    observaciones: string;
    centrocosto: string;
    cargo: string;
    ciudad: string;
    reporte_id: string;
    total_lineas: number;
}

interface LineaDetalle {
    id: number;
    categoria: string;
    fecha_gasto: string;
    ot: string;
    cc: string;
    scc: string;
    valor_con_factura: number;
    valor_sin_factura: number;
    observaciones_linea: string;
}

interface DirectorExpensePanelProps {
    onBack: () => void;
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
};

const getStatusVariant = (estado: string): 'success' | 'warning' | 'info' | 'error' => {
    const e = (estado || '').toUpperCase();
    if (e === 'PROCESADO' || e === 'APROBADO') return 'success';
    if (e === 'PENDIENTE') return 'warning';
    if (e === 'RECHAZADO') return 'error';
    return 'info';
};

const DirectorExpensePanel: React.FC<DirectorExpensePanelProps> = ({ onBack }) => {
    const { get } = useApi();
    const [legalizaciones, setLegalizaciones] = useState<Legalizacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [detalles, setDetalles] = useState<Record<string, LineaDetalle[]>>({});
    const [loadingDetalle, setLoadingDetalle] = useState<string | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterArea, setFilterArea] = useState('');

    const fetchLegalizaciones = useCallback(async () => {
        try {
            setLoading(true);
            const data = await get('/viaticos/director/legalizaciones');
            if (Array.isArray(data)) setLegalizaciones(data);
        } catch (err) {
            console.error('Error cargando legalizaciones:', err);
        } finally {
            setLoading(false);
        }
    }, [get]);

    useEffect(() => { fetchLegalizaciones(); }, []);

    const toggleDetalle = async (reporteId: string) => {
        if (expandedId === reporteId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(reporteId);

        if (!detalles[reporteId]) {
            setLoadingDetalle(reporteId);
            try {
                const data = await get(`/viaticos/reporte/${reporteId}/detalle`);
                if (Array.isArray(data)) {
                    setDetalles(prev => ({ ...prev, [reporteId]: data }));
                }
            } catch (err) {
                console.error('Error cargando detalle:', err);
            } finally {
                setLoadingDetalle(null);
            }
        }
    };

    // Áreas únicas para filtro
    const areasUnicas = [...new Set(legalizaciones.map(l => l.area).filter(Boolean))].sort();

    // Filtrado
    const filtered = legalizaciones.filter(l => {
        const matchSearch = !searchTerm ||
            (l.nombreempleado || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.codigolegalizacion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.empleado || '').includes(searchTerm);
        const matchEstado = !filterEstado || l.estado === filterEstado;
        const matchArea = !filterArea || l.area === filterArea;
        return matchSearch && matchEstado && matchArea;
    });

    // Totales
    const totalValor = filtered.reduce((sum, l) => sum + (l.valortotal || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="hidden sm:inline">Volver</Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary" className="uppercase tracking-tight">
                    Panel de Legalizaciones
                </Title>
                <div className="w-20"></div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">Total Reportes</Text>
                    <Title variant="h3" weight="bold" color="text-primary">{filtered.length}</Title>
                </Card>
                <Card className="p-4 text-center">
                    <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">Valor Total</Text>
                    <Title variant="h5" weight="bold" color="text-primary">{formatCurrency(totalValor)}</Title>
                </Card>
                <Card className="p-4 text-center">
                    <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">Empleados</Text>
                    <Title variant="h3" weight="bold" color="text-primary">{new Set(filtered.map(l => l.empleado)).size}</Title>
                </Card>
                <Card className="p-4 text-center">
                    <Text variant="caption" color="text-secondary" weight="bold" className="uppercase tracking-wider">Áreas</Text>
                    <Title variant="h3" weight="bold" color="text-primary">{new Set(filtered.map(l => l.area).filter(Boolean)).size}</Title>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <Text variant="caption" weight="bold" color="text-secondary" className="mb-1 block uppercase tracking-wider">
                            <Search size={12} className="inline mr-1" />Buscar
                        </Text>
                        <Input
                            type="text"
                            placeholder="Nombre, cédula o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="sm"
                            fullWidth
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Text variant="caption" weight="bold" color="text-secondary" className="mb-1 block uppercase tracking-wider">
                            <Filter size={12} className="inline mr-1" />Estado
                        </Text>
                        <Select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            size="sm"
                            options={[
                                { value: '', label: 'Todos' },
                                { value: 'INICIAL', label: 'Inicial' },
                                { value: 'PROCESADO', label: 'Procesado' },
                                { value: 'PENDIENTE', label: 'Pendiente' },
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Text variant="caption" weight="bold" color="text-secondary" className="mb-1 block uppercase tracking-wider">Área</Text>
                        <Select
                            value={filterArea}
                            onChange={(e) => setFilterArea(e.target.value)}
                            size="sm"
                            options={[
                                { value: '', label: 'Todas' },
                                ...areasUnicas.map(a => ({ value: a, label: a }))
                            ]}
                        />
                    </div>
                </div>
            </Card>

            {/* Tabla */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-primary)] rounded-full" role="status"></div>
                    <Text variant="body2" color="text-secondary" className="mt-4 block">Cargando legalizaciones...</Text>
                </div>
            ) : filtered.length === 0 ? (
                <Card className="py-16 text-center">
                    <Eye size={40} className="mx-auto text-[var(--color-text-secondary)] opacity-30 mb-4" />
                    <Title variant="h5" color="text-secondary">No hay legalizaciones</Title>
                    <Text variant="body2" color="text-secondary">No se encontraron reportes con los filtros aplicados.</Text>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((leg) => (
                        <Card key={leg.reporte_id || leg.codigo} className="overflow-hidden transition-all duration-300">
                            {/* Fila principal - compacta */}
                            <div
                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--color-surface-variant)]/30 transition-colors"
                                onClick={() => toggleDetalle(leg.reporte_id)}
                            >
                                {expandedId === leg.reporte_id ? <ChevronUp size={14} className="text-[var(--color-primary)] shrink-0" /> : <ChevronDown size={14} className="text-[var(--color-text-secondary)] shrink-0" />}
                                <Text variant="caption" weight="bold" className="font-mono w-24 shrink-0">{leg.codigolegalizacion || leg.reporte_id}</Text>
                                <Text variant="caption" weight="medium" className="w-24 shrink-0 hidden md:block">{formatDate(leg.fecha)}</Text>
                                <Text variant="caption" weight="bold" className="flex-1 min-w-0 truncate">{leg.nombreempleado}</Text>
                                <Text variant="caption" weight="medium" className="w-32 shrink-0 hidden lg:block truncate">{leg.area || '—'}</Text>
                                <Text variant="caption" weight="bold" className="w-28 shrink-0 text-right">{formatCurrency(leg.valortotal)}</Text>
                                <div className="w-24 shrink-0 text-center">
                                    <Badge variant={getStatusVariant(leg.estado)}>{leg.estado}</Badge>
                                </div>
                                <Text variant="caption" color="text-secondary" className="w-16 shrink-0 text-right hidden sm:block">{leg.total_lineas} ítems</Text>
                            </div>

                            {/* Detalle expandible */}
                            {expandedId === leg.reporte_id && (
                                <div className="border-t border-[var(--color-border)] bg-[var(--color-background)] p-4">
                                    {/* Info extra */}
                                    <div className="flex flex-wrap gap-4 mb-4">
                                        <Text variant="caption" color="text-secondary"><strong>Ciudad:</strong> {leg.ciudad || '—'}</Text>
                                        <Text variant="caption" color="text-secondary"><strong>Cargo:</strong> {leg.cargo || '—'}</Text>
                                        <Text variant="caption" color="text-secondary"><strong>C. Costo:</strong> {leg.centrocosto || '—'}</Text>
                                        {leg.observaciones && (
                                            <Text variant="caption" color="text-secondary"><strong>Obs:</strong> {leg.observaciones}</Text>
                                        )}
                                    </div>

                                    {loadingDetalle === leg.reporte_id ? (
                                        <div className="py-6 text-center">
                                            <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-[var(--color-primary)] rounded-full" role="status"></div>
                                        </div>
                                    ) : detalles[leg.reporte_id] && detalles[leg.reporte_id].length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-[var(--color-surface-variant)]/50">
                                                        <th className="px-3 py-2"><Text variant="caption" weight="bold" color="text-secondary">#</Text></th>
                                                        <th className="px-3 py-2"><Text variant="caption" weight="bold" color="text-secondary">Categoría</Text></th>
                                                        <th className="px-3 py-2"><Text variant="caption" weight="bold" color="text-secondary">Fecha</Text></th>
                                                        <th className="px-3 py-2"><Text variant="caption" weight="bold" color="text-secondary">OT</Text></th>
                                                        <th className="px-3 py-2"><Text variant="caption" weight="bold" color="text-secondary">CC/SCC</Text></th>
                                                        <th className="px-3 py-2 text-right"><Text variant="caption" weight="bold" color="text-secondary">Con Factura</Text></th>
                                                        <th className="px-3 py-2 text-right"><Text variant="caption" weight="bold" color="text-secondary">Sin Factura</Text></th>
                                                        <th className="px-3 py-2"><Text variant="caption" weight="bold" color="text-secondary">Obs.</Text></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detalles[leg.reporte_id].map((linea, idx) => (
                                                        <tr key={linea.id || idx} className="border-t border-[var(--color-border)]/50 hover:bg-[var(--color-surface-variant)]/20 transition-colors">
                                                            <td className="px-3 py-2"><Text variant="caption" weight="bold">{idx + 1}</Text></td>
                                                            <td className="px-3 py-2"><Text variant="caption">{linea.categoria || '—'}</Text></td>
                                                            <td className="px-3 py-2"><Text variant="caption">{formatDate(linea.fecha_gasto || (linea as any).fecharealgasto)}</Text></td>
                                                            <td className="px-3 py-2"><Text variant="caption" weight="bold" className="font-mono">{linea.ot || '—'}</Text></td>
                                                            <td className="px-3 py-2"><Text variant="caption">{linea.cc || (linea as any).centrocosto || '—'}/{linea.scc || (linea as any).subcentrocosto || '—'}</Text></td>
                                                            <td className="px-3 py-2 text-right"><Text variant="caption" weight="bold">{formatCurrency((linea as any).valorconfactura ?? linea.valor_con_factura ?? 0)}</Text></td>
                                                            <td className="px-3 py-2 text-right"><Text variant="caption">{formatCurrency((linea as any).valorsinfactura ?? linea.valor_sin_factura ?? 0)}</Text></td>
                                                            <td className="px-3 py-2"><Text variant="caption" color="text-secondary" className="max-w-[200px] truncate block">{linea.observaciones_linea || (linea as any).observaciones || '—'}</Text></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <Text variant="caption" color="text-secondary" className="italic text-center block py-4">Sin líneas de detalle.</Text>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DirectorExpensePanel;
