import React from 'react';
import { MaterialCard, Text, Tooltip } from '../../components/atoms';

interface Props {
    data: {
        total: number;
        resueltos: number;
        pendientes: number;
        avg_mes: number;
        total_horas: number;
        total_minutos: number;
        avg_atender_global: number;
        avg_atencion_global: number;
        avg_resolucion_global?: number;
        sla_compliance?: number;
    };
}

const formatMinutesToHumanReadable = (mins: number) => {
    if (!mins) return "0 min";
    if (mins >= 1440) {
        const days = mins / 1440;
        return `${days.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`;
    }
    if (mins >= 60) {
        const hours = mins / 60;
        return `${hours.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
    }
    return `${Math.round(mins).toLocaleString('es-CO')} min`;
};

const IndicatorsSummary: React.FC<Props> = ({ data }) => {
    const metrics = [
        {
            title: "AVG Tickets Ult. Año",
            value: (data?.avg_mes || 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
            description: "Promedio mensual de tickets recibidos durante el último año (12 meses móviles)."
        },
        {
            title: "Total Soportes",
            value: (data?.total || 0).toLocaleString('es-CO'),
            description: "Cantidad total de tickets de soporte registrados en el período seleccionado."
        },
        {
            title: "Soportes Resueltos",
            value: (data?.resueltos || 0).toLocaleString('es-CO'),
            description: "Cantidad de tickets de soporte que han sido completados y cerrados satisfactoriamente."
        },
        {
            title: "Soportes Pendientes",
            value: (data?.pendientes || 0).toLocaleString('es-CO'),
            isAlert: (data?.pendientes || 0) > 0,
            alertColor: 'text-red-500 dark:text-red-400',
            description: "Cantidad de tickets de soporte que se encuentran actualmente abiertos, en proceso o asignados esperando resolución."
        },
        {
            title: "Cumplimiento SLA",
            value: (data?.sla_compliance ?? 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + "%",
            isAlert: (data?.sla_compliance ?? 100) < 80,
            alertColor: 'text-red-500 dark:text-red-400',
            description: "Porcentaje de tickets resueltos dentro del tiempo comprometido en el Acuerdo de Nivel de Servicio (SLA)."
        },
        {
            title: "Horas Totales",
            value: Math.round(data?.total_horas || 0).toLocaleString('es-CO') + " h",
            description: "Suma acumulada de horas invertidas en la atención activa de todos los tickets."
        },
        {
            title: "Prom. Tiempo en Atender",
            value: formatMinutesToHumanReadable(data?.avg_atender_global || 0),
            description: "Tiempo promedio transcurrido desde que se registra el ticket hasta que el analista inicia su atención (tiempo en cola)."
        },
        {
            title: "Prom. Atención Activa",
            value: formatMinutesToHumanReadable(data?.avg_atencion_global || 0),
            description: "Tiempo promedio dedicado por el analista para resolver el ticket una vez iniciada su gestión (excluye tiempo en cola)."
        },
        {
            title: "Tiempo de Resolución",
            value: formatMinutesToHumanReadable(data?.avg_resolucion_global || 0),
            description: "Tiempo promedio total transcurrido desde la creación del ticket hasta su resolución final (incluye tiempo en cola)."
        }
    ];

    return (
        <MaterialCard elevation={2} className="p-3 md:p-4 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-9 gap-y-3 xl:gap-y-0 xl:divide-x divide-[var(--color-border)]">
                {metrics.map((m, idx) => {
                    const align = idx === 0 ? 'left' : idx === metrics.length - 1 ? 'right' : 'center';
                    return (
                        <Tooltip 
                            key={idx} 
                            content={m.description} 
                            align={align}
                            className="w-full flex flex-col items-center justify-center text-center px-2 py-1"
                        >
                            <Text
                                variant="caption"
                                weight="medium"
                                color="text-secondary"
                                className="uppercase tracking-wider text-[9px] leading-tight mb-1"
                            >
                                {m.title}
                            </Text>
                            <Text
                                as="span"
                                className={`text-sm md:text-base font-black tracking-tight ${
                                    m.isAlert ? m.alertColor : 'text-[var(--color-text-primary)]'
                                }`}
                            >
                                {m.value}
                            </Text>
                        </Tooltip>
                    );
                })}
            </div>
        </MaterialCard>
    );
};

export default IndicatorsSummary;
