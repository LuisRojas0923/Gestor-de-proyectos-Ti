import React from 'react';
import { Title, Text } from '../../components/atoms';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { Clock, Zap } from 'lucide-react';

interface Props {
    areaStats: any[];
    timeline: any[];
    causaStats: any[];
}

const IndicatorsTimeView: React.FC<Props> = ({ areaStats, timeline, causaStats }) => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Minutos de Atención por Área (Barra Simple) */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Minutos de Atención por Área</Title>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={areaStats || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="area" tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="var(--deep-navy)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Minutos Promedio en Atender y de Atención (Cards) */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Minutos Promedio: Atender vs Atención</Title>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {(causaStats || []).map((stat, i) => (
                            <div key={i} className="bg-[var(--color-surface-variant)] p-4 rounded-3xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
                                <Text variant="body2" weight="bold" color="text-primary" className="mb-3 block line-clamp-1">
                                    {stat.causa}
                                </Text>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2.5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                                <Clock size={14} />
                                            </div>
                                            <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60 !text-[9px]">Atender</Text>
                                        </div>
                                        <Text variant="body2" weight="bold">{stat.avg_atender}m</Text>
                                    </div>
                                    <div className="flex justify-between items-center p-2.5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                                <Zap size={14} />
                                            </div>
                                            <Text variant="caption" weight="bold" className="uppercase tracking-wider opacity-60 !text-[9px]">Atención</Text>
                                        </div>
                                        <Text variant="body2" weight="bold">{stat.avg_atencion}m</Text>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Solicitudes por Fecha (Línea) */}
            <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Solicitudes por Fecha</Title>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={timeline || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="cantidad" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tiempo de Solicitud por Fecha (Línea) */}
            <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Tiempo de Solicitud por Fecha (Min)</Title>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={timeline || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="avg_tiempo" stroke="var(--color-primary-light)" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default IndicatorsTimeView;
