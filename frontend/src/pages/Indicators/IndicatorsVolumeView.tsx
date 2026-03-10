import React from 'react';
import { Title, Text } from '../../components/atoms';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface Props {
    causaStats: any[];
    areaStats: any[];
    analistaStats: any[];
    matriz: any[];
    headers: string[];
    prioridadStats: Record<string, number>;
}

const IndicatorsVolumeView: React.FC<Props> = ({ causaStats, areaStats, analistaStats, matriz: _matriz, headers: _headers, prioridadStats }) => {
    const pData = [
        { label: 'Media', color: 'bg-blue-900', key: 'Media' },
        { label: 'Alta', color: 'bg-blue-800', key: 'Alta' },
        { label: 'Baja', color: 'bg-blue-400', key: 'Baja' }
    ];

    const maxVal = Math.max(...pData.map(p => prioridadStats?.[p.key] || 0), 1);
    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Soportes por Categoría (Barra Horizontal o Vertical) */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Soportes por Categoría</Title>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={causaStats || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="causa" type="category" width={100} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(value, _, props: any) => [`${value} (${props.payload.porcentaje}%)`, 'Cantidad']} />
                                <Bar
                                    dataKey="cantidad"
                                    fill="var(--deep-navy)"
                                    radius={[0, 4, 4, 0]}
                                    label={(props: any) => {
                                        const { x, y, width, value, payload } = props;
                                        const porcentaje = payload?.porcentaje;
                                        return (
                                            <text
                                                x={x + width + 5}
                                                y={y + 40 / 2}
                                                fill="var(--color-text-primary)"
                                                fontSize={10}
                                                fontWeight="bold"
                                                textAnchor="start"
                                                dominantBaseline="middle"
                                            >
                                                {porcentaje ? `${value} (${porcentaje}%)` : value}
                                            </text>
                                        );
                                    }}
                                >
                                    {(causaStats || []).map((_, index) => (
                                        <Cell key={`cell-${index}`} opacity={1 - (index * 0.1)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Soportes por Área */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Soportes por Área</Title>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={areaStats || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis dataKey="area" tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="cantidad" fill="var(--deep-navy)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Porcentaje por Analista */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Porcentaje de Carga por Analista</Title>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={analistaStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="porcentaje" fill="var(--color-primary)" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: any) => `${v}%`, fontSize: 10, fontWeight: 'bold' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Soportes por Prioridad (Imagen 2 abajo derecha) */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)] overflow-hidden">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Soportes por Prioridad</Title>
                    {/* Reutilizando diseño de barras con etiquetas de imagen */}
                    <div className="flex justify-around items-end h-[200px] px-2 md:px-10">
                        {pData.map((p, i) => {
                            const val = prioridadStats?.[p.key] || 0;
                            const height = (val / maxVal) * 150 + 20;
                            return (
                                <div key={i} className="flex flex-col items-center w-20">
                                    <Text weight="bold" className="mb-2 text-blue-900 dark:text-blue-300">{val}</Text>
                                    <div
                                        className={`${p.color} w-full rounded-t-lg transition-all hover:opacity-80`}
                                    >
                                        <div ref={(el) => { if (el) el.style.height = `${Math.max(height, 20)}px`; }} className="w-full" />
                                    </div>
                                    <Text weight="bold" color="white" className="bg-blue-900 dark:bg-blue-800 w-full text-center py-1 text-[10px] tracking-tight mt-1 rounded-b-sm block uppercase">
                                        {p.label}
                                    </Text>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndicatorsVolumeView;
