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
        <g transform={`translate(${dx}, ${dy})`} style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} /* [CONTROLADO] */ >
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
        <g transform={`translate(${dx}, ${dy})`} style={{ transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} /* [CONTROLADO] */ >
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 3} // Un poco más grande para enfatizar
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: 'drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.15))' }} // [CONTROLADO]
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
    const [analystFilter, setAnalystFilter] = React.useState<'active' | 'all'>('active');
    const [categoryFilter, setCategoryFilter] = React.useState<'top6' | 'all'>('top6');
    const [areaFilter, setAreaFilter] = React.useState<'top6' | 'all'>('top6');

    const filteredAnalistaStats = React.useMemo(() => {
        if (!analistaStats) return [];
        if (analystFilter === 'active') {
            return analistaStats.filter((a) => a.esta_activo !== false);
        }
        return analistaStats;
    }, [analistaStats, analystFilter]);

    const filteredCausaStats = React.useMemo(() => {
        if (!causaStats) return [];
        if (categoryFilter === 'top6') {
            return causaStats.slice(0, 6);
        }
        return causaStats;
    }, [causaStats, categoryFilter]);

    const filteredAreaStats = React.useMemo(() => {
        if (!areaStats) return [];
        if (areaFilter === 'top6') {
            return areaStats.slice(0, 6);
        }
        return areaStats;
    }, [areaStats, areaFilter]);

    const categoryHeight = React.useMemo(() => {
        if (categoryFilter === 'top6') return 250;
        return Math.max(250, (causaStats?.length || 0) * 35);
    }, [causaStats, categoryFilter]);

    const areaHeight = React.useMemo(() => {
        return areaFilter === 'top6' ? 250 : 400;
    }, [areaFilter]);

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
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Soportes por Categoría */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-4 shadow-xl border border-[var(--color-border)] flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                        <Title variant="h4" weight="bold" color="text-primary" className="text-lg md:text-xl">Soportes por Categoría</Title>
                        <div className="flex items-center bg-[var(--color-surface-hover)] md:bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm text-xs">
                            <button // [CONTROLADO]
                                onClick={() => setCategoryFilter('top6')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    categoryFilter === 'top6'
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Top 6
                            </button>
                            <button // [CONTROLADO]
                                onClick={() => setCategoryFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    categoryFilter === 'all'
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Todos
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center w-full">
                        <div className="w-full transition-all duration-300 ease-in-out" style={{ height: `${categoryHeight}px` }} /* [CONTROLADO] */ >
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={filteredCausaStats} layout="vertical" margin={{ left: 10, right: 30 }}>
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
                                        {filteredCausaStats.map((_, index) => (
                                            <Cell key={`cell-${index}`} opacity={1 - (index * 0.05)} />
                                        ))}
                                    </Bar>
                                 </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Soportes por Área */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-4 shadow-xl border border-[var(--color-border)] flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                        <Title variant="h4" weight="bold" color="text-primary" className="text-lg md:text-xl">Soportes por Área</Title>
                        <div className="flex items-center bg-[var(--color-surface-hover)] md:bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm text-xs">
                            <button // [CONTROLADO]
                                onClick={() => setAreaFilter('top6')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    areaFilter === 'top6'
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Top 6
                            </button>
                            <button // [CONTROLADO]
                                onClick={() => setAreaFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                    areaFilter === 'all'
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Todos
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center w-full">
                        <div className="w-full transition-all duration-300 ease-in-out" style={{ height: `${areaHeight}px` }} /* [CONTROLADO] */ >
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={filteredAreaStats} margin={{ bottom: 25 }}>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Porcentaje por Analista */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-4 shadow-xl border border-[var(--color-border)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
                        <Title variant="h4" weight="bold" color="text-primary" className="text-lg md:text-xl">Porcentaje de Carga por Analista</Title>
                        <div className="flex items-center bg-[var(--color-surface-hover)] md:bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm text-xs">
                            <button // [CONTROLADO]
                                onClick={() => setAnalystFilter('active')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    analystFilter === 'active'
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Activos
                            </button>
                            <button // [CONTROLADO]
                                onClick={() => setAnalystFilter('all')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    analystFilter === 'all'
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Todos
                            </button>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={filteredAnalistaStats} layout="vertical" margin={{ left: 10, right: 30 }}>
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
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-4 shadow-xl border border-[var(--color-border)] overflow-hidden">
                    <Title variant="h4" weight="bold" color="text-primary" className="mb-3 text-lg md:text-xl">Soportes por Prioridad</Title>
                    <div className="relative h-[350px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                                    outerRadius={115}
                                    paddingAngle={2}
                                    dataKey="value"
                                    activeIndex={activePriorityIndex !== null ? activePriorityIndex : undefined}
                                    activeShape={renderActiveShape}
                                    label={false}
                                    onMouseEnter={(_, index) => setActivePriorityIndex(index)}
                                    onMouseLeave={() => setActivePriorityIndex(null)}
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} style={{ outline: 'none' }} /* [CONTROLADO] */ />
                                    ))}
                                </Pie>
                                {/* Overlay Pie purely for rendering labels of all slices at all times */}
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={115}
                                    paddingAngle={2}
                                    dataKey="value"
                                    fill="none"
                                    stroke="none"
                                    isAnimationActive={false}
                                    label={(props) => renderCustomizedLabel({ ...props, activeIndex: activePriorityIndex })}
                                    style={{ pointerEvents: 'none' }} // [CONTROLADO]
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
                                                style={{ filter: 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.08))' }} /* [CONTROLADO] */
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Text as="span" className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /* [CONTROLADO] */ />
                                                    <Text as="span" className="uppercase tracking-wider">{item.name}</Text>
                                                </div>
                                                <div className="mt-1 text-[var(--color-text-secondary)] font-semibold">
                                                    Tickets: <Text as="span" className="text-[var(--color-text-primary)] font-black">{value?.toLocaleString('es-CO')}</Text> ({pct}%)
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
