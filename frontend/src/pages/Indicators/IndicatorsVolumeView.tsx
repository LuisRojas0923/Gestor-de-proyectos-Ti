import React from 'react';
import { Title, Text } from '../../components/atoms';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Sector
} from 'recharts';

interface Props {
    causaStats: any[];
    areaStats: any[];
    analistaStats: any[];
    matriz: any[];
    headers: string[];
    prioridadStats: Record<string, number>;
}

const renderCustomizedLabel = (props: any) => {
    const {
        cx, cy, midAngle, innerRadius, outerRadius, value, name, percent, fill, index, activeIndex, payload
    } = props;
    const RADIAN = Math.PI / 180;
    
    // Recovery of original color from data item payload (avoids losing colors when Pie is transparent)
    const color = payload?.color || fill || '#cccccc';
    
    // Check if this label is for the active/hovered slice
    const isActive = index === activeIndex;
    const offset = isActive ? 8 : 0;
    
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const dx = cos * offset;
    const dy = sin * offset;

    const radiusStart = outerRadius;
    const radiusEnd = outerRadius + 20;
    
    const sx = cx + radiusStart * cos;
    const sy = cy + radiusStart * sin;
    
    const ex = cx + radiusEnd * cos;
    const ey = cy + radiusEnd * sin;
    
    const hx = ex + (cos >= 0 ? 12 : -12);
    const hy = ey;

    const boxWidth = 76;
    const boxHeight = 38;
    const boxX = cos >= 0 ? hx : hx - boxWidth;
    const boxY = hy - boxHeight / 2;

    const percentageText = `${(percent * 100).toFixed(0)}%`;

    return (
        <g transform={`translate(${dx}, ${dy})`} style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {/* Pointer line */}
            <path
                d={`M${sx},${sy} L${ex},${ey} L${hx},${hy}`}
                stroke={color}
                strokeWidth={1.5}
                fill="none"
            />
            {/* Circle node at the start of the line */}
            <circle cx={sx} cy={sy} r={2.5} fill={color} />
            
            {/* Callout box */}
            <rect
                x={boxX}
                y={boxY}
                width={boxWidth}
                height={boxHeight}
                rx={6}
                ry={6}
                fill="var(--color-surface)"
                stroke={color}
                strokeWidth={1.5}
                filter="drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.08))"
            />
            {/* Title (name) */}
            <text
                x={boxX + boxWidth / 2}
                y={boxY + 14}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill="var(--color-text-secondary)"
                className="uppercase tracking-wider"
            >
                {name}
            </text>
            {/* Percentage */}
            <text
                x={boxX + boxWidth / 2}
                y={boxY + 30}
                textAnchor="middle"
                fontSize={14}
                fontWeight="black"
                fill="var(--color-text-primary)"
            >
                {percentageText}
            </text>
        </g>
    );
};

const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
        cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
        fill
    } = props;
    
    // Desplazamiento radial para el efecto de "levantar" o "pop-out"
    const offset = 8;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const dx = cos * offset;
    const dy = sin * offset;

    return (
        <g transform={`translate(${dx}, ${dy})`} style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 3} // Un poco más grande para enfatizar
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: 'drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.15))' }}
            />
        </g>
    );
};


const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const val = payload.value || '';
    const truncated = val.length > 25 ? `${val.substring(0, 22)}...` : val;
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={3}
                dx={-4}
                fill="var(--color-text-secondary)"
                fontSize={9}
                textAnchor="end"
            >
                {truncated}
            </text>
        </g>
    );
};

const CustomAnalistaYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const val = payload.value || '';
    const truncated = val.length > 22 ? `${val.substring(0, 19)}...` : val;
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={3}
                dx={-4}
                fill="var(--color-text-secondary)"
                fontSize={9}
                textAnchor="end"
            >
                {truncated}
            </text>
        </g>
    );
};

const IndicatorsVolumeView: React.FC<Props> = ({ causaStats, areaStats, analistaStats, matriz: _matriz, headers: _headers, prioridadStats }) => {
    const [activePriorityIndex, setActivePriorityIndex] = React.useState<number | null>(null);

    const priorityData = React.useMemo(() => {
        return [
            { name: 'Alta', value: prioridadStats?.['Alta'] || 0, color: '#f43f5e', gradientId: 'gradAlta' },
            { name: 'Media', value: prioridadStats?.['Media'] || 0, color: '#fbbf24', gradientId: 'gradMedia' },
            { name: 'Baja', value: prioridadStats?.['Baja'] || 0, color: '#10b981', gradientId: 'gradBaja' }
        ].filter(item => item.value > 0);
    }, [prioridadStats]);

    const totalTickets = React.useMemo(() => {
        return priorityData.reduce((acc, curr) => acc + curr.value, 0);
    }, [priorityData]);

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Soportes por Categoría */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Soportes por Categoría</Title>
                    <div className="h-[520px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={causaStats || []} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="causa" 
                                    type="category" 
                                    width={160} 
                                    tick={<CustomYAxisTick />}
                                />
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
                                                y={y + 30 / 2}
                                                fill="var(--color-text-primary)"
                                                fontSize={9}
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
                                        <Cell key={`cell-${index}`} opacity={1 - (index * 0.05)} />
                                    ))}
                                </Bar>
                             </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Soportes por Área */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)]">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Soportes por Área</Title>
                    <div className="h-[520px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={areaStats || []} margin={{ bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                <XAxis 
                                    dataKey="area" 
                                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} 
                                    interval={0}
                                    angle={-35}
                                    textAnchor="end"
                                    height={60}
                                />
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
                    <div className="h-[420px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={analistaStats} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={150} 
                                    tick={<CustomAnalistaYAxisTick />}
                                />
                                <Tooltip />
                                <Bar dataKey="porcentaje" fill="var(--color-primary)" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: any) => `${v}%`, fontSize: 10, fontWeight: 'bold' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Soportes por Prioridad */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-[var(--color-border)] overflow-hidden">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-4 md:mb-6 text-lg md:text-xl">Soportes por Prioridad</Title>
                    <div className="relative h-[480px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, bottom: 20, left: 30, right: 30 }}>
                                <defs>
                                    <linearGradient id="gradAlta" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" />
                                        <stop offset="100%" stopColor="#be123c" />
                                    </linearGradient>
                                    <linearGradient id="gradMedia" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fbbf24" />
                                        <stop offset="100%" stopColor="#b45309" />
                                    </linearGradient>
                                    <linearGradient id="gradBaja" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34d399" />
                                        <stop offset="100%" stopColor="#047857" />
                                    </linearGradient>
                                </defs>
                                {/* Base Pie for interactive slices and dynamic hover activeShape */}
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={130}
                                    paddingAngle={2}
                                    dataKey="value"
                                    activeIndex={activePriorityIndex !== null ? activePriorityIndex : undefined}
                                    activeShape={renderActiveShape}
                                    label={false}
                                    onMouseEnter={(_, index) => setActivePriorityIndex(index)}
                                    onMouseLeave={() => setActivePriorityIndex(null)}
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} style={{ outline: 'none' }} />
                                    ))}
                                </Pie>
                                {/* Overlay Pie purely for rendering labels of all slices at all times */}
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={130}
                                    paddingAngle={2}
                                    dataKey="value"
                                    fill="none"
                                    stroke="none"
                                    isAnimationActive={false}
                                    label={(props) => renderCustomizedLabel({ ...props, activeIndex: activePriorityIndex })}
                                    style={{ pointerEvents: 'none' }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload || payload.length === 0) return null;
                                        // Filtramos duplicados por nombre de prioridad (evita duplicados de la doble capa de Pie)
                                        const uniquePayload = payload.filter((item, idx, self) =>
                                            self.findIndex(t => t.name === item.name) === idx
                                        );
                                        const item = uniquePayload[0];
                                        if (!item) return null;
                                        const value = item.value;
                                        const pct = totalTickets ? ((Number(value) / totalTickets) * 100).toFixed(1) : 0;
                                        
                                        // Recuperamos el color original
                                        const color = item.payload?.color || item.color || '#cccccc';
                                        
                                        return (
                                            <div 
                                                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-lg text-xs font-bold text-[var(--color-text-primary)]"
                                                style={{ filter: 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.08))' }}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                    <span className="uppercase tracking-wider">{item.name}</span>
                                                </div>
                                                <div className="mt-1 text-[var(--color-text-secondary)] font-semibold">
                                                    Tickets: <span className="text-[var(--color-text-primary)] font-black">{value?.toLocaleString('es-CO')}</span> ({pct}%)
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndicatorsVolumeView;
