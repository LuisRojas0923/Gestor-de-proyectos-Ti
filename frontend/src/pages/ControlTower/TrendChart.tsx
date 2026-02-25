import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Activity } from 'lucide-react';
import { Text } from '../../components/atoms';
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
    { key: 'cpu', name: 'CPU %', color: '#8b5cf6' },
    { key: 'usuarios', name: 'Usuarios', color: '#3b82f6' },
    { key: 'tickets', name: 'Tickets', color: '#f59e0b' },
    { key: 'ram', name: 'RAM (MB)', color: '#10b981' },
];

const formatHora = (timestamp: string) => {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-lg">
            <Text variant="caption" weight="bold" className="mb-2 block">
                {formatHora(label)}
            </Text>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <div ref={(el) => { if (el) el.style.backgroundColor = entry.color; }} className="w-2.5 h-2.5 rounded-full" />
                    <Text variant="caption">
                        {entry.name}: <strong>{typeof entry.value === 'number' ? Math.round(entry.value * 10) / 10 : entry.value}</strong>
                    </Text>
                </div>
            ))}
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
        <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatHora}
                        tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                        interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12 }}
                    />
                    {SERIES_CONFIG.map(s => (
                        <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.name}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
