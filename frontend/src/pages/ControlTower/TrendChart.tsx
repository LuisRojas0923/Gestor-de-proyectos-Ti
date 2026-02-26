import React, { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { Activity, Cpu, MemoryStick, Ticket, Users } from 'lucide-react';
import { Text, MaterialCard as Card } from '../../components/atoms';
import { useApi } from '../../hooks/useApi';

interface MetricaHistorial {
    timestamp: string;
    cpu: number;
    ram: number;
    usuarios: number;
    tickets: number;
}

interface TrendChartProps {
    autoRefresh?: boolean;
}

const SERIES_CONFIG = [
    { key: 'cpu', name: 'CPU', unit: '%', color: '#8b5cf6', gradient: 'url(#gradCpu)', icon: Cpu },
    { key: 'ram', name: 'RAM', unit: 'MB', color: '#10b981', gradient: 'url(#gradRam)', icon: MemoryStick },
    { key: 'tickets', name: 'Tickets', unit: '', color: '#f59e0b', gradient: 'url(#gradTickets)', icon: Ticket },
    { key: 'usuarios', name: 'Usuarios', unit: '', color: '#3b82f6', gradient: 'url(#gradUsuarios)', icon: Users },
];

const formatHora = (timestamp: string) => {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const MiniTooltip = ({ active, payload, label, unit }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg">
            <Text variant="caption" color="text-secondary" className="block">{formatHora(label)}</Text>
            <Text variant="caption" weight="bold">
                {typeof payload[0].value === 'number' ? Math.round(payload[0].value * 10) / 10 : payload[0].value}
                {unit ? ` ${unit}` : ''}
            </Text>
        </div>
    );
};

const TrendChart: React.FC<TrendChartProps> = ({ autoRefresh = true }) => {
    const { get } = useApi();
    const [data, setData] = useState<MetricaHistorial[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistorial = async () => {
        try {
            const result = await get('/panel-control/torre-control/historial?horas=24');
            if (Array.isArray(result)) {
                setData(result);
            }
        } catch (err) {
            console.warn('Error cargando historial de métricas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistorial();
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchHistorial, 60000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Activity size={32} className="text-[var(--color-primary)] animate-pulse" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-background)]">
                <div className="text-center">
                    <Activity size={48} className="mx-auto text-[var(--color-text-secondary)] mb-4 animate-pulse opacity-40" />
                    <Text variant="body2" color="text-secondary">
                        El recolector está compilando datos...
                    </Text>
                    <Text variant="caption" color="text-secondary">
                        Los gráficos aparecerán cuando se acumulen métricas (cada 15 min).
                    </Text>
                </div>
            </div>
        );
    }


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERIES_CONFIG.map((s) => {
                const Icon = s.icon;

                return (
                    <Card key={s.key} className="p-4 overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="p-1.5 rounded-lg"
                                style={{ backgroundColor: `${s.color}15` }}
                            >
                                <Icon size={14} style={{ color: s.color }} />
                            </div>
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider">{s.name}</Text>
                        </div>
                        <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                                            <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} vertical={false} />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={formatHora}
                                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }}
                                        interval="preserveStartEnd"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<MiniTooltip unit={s.unit} />} />
                                    <Area
                                        type="monotone"
                                        dataKey={s.key}
                                        name={s.name}
                                        stroke={s.color}
                                        strokeWidth={2}
                                        fill={`url(#grad-${s.key})`}
                                        dot={false}
                                        activeDot={{ r: 3, strokeWidth: 0, fill: s.color }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default TrendChart;
