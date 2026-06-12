import React from 'react';
import { MaterialCard, Text } from '../../components/atoms';

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
        sla_compliance?: number;
    };
}

const IndicatorsSummary: React.FC<Props> = ({ data }) => {
    const metrics = [
        {
            title: "Prom. Móvil 12 Meses",
            value: (data?.avg_mes || 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        },
        {
            title: "Total Soportes",
            value: (data?.total || 0).toLocaleString('es-CO')
        },
        {
            title: "Soportes Resueltos",
            value: (data?.resueltos || 0).toLocaleString('es-CO')
        },
        {
            title: "Soportes Pendientes",
            value: (data?.pendientes || 0).toLocaleString('es-CO'),
            isAlert: (data?.pendientes || 0) > 0,
            alertColor: 'text-red-500 dark:text-red-400'
        },
        {
            title: "Cumplimiento SLA",
            value: (data?.sla_compliance ?? 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + "%",
            isAlert: (data?.sla_compliance ?? 100) < 80,
            alertColor: 'text-red-500 dark:text-red-400'
        },
        {
            title: "Horas Totales",
            value: Math.round(data?.total_horas || 0).toLocaleString('es-CO') + " h"
        },
        {
            title: "Prom. Tiempo en Atender",
            value: Math.round(data?.avg_atender_global || 0).toLocaleString('es-CO') + " min"
        },
        {
            title: "Promedio de Atención",
            value: Math.round(data?.avg_atencion_global || 0).toLocaleString('es-CO') + " min"
        }
    ];

    return (
        <MaterialCard elevation={2} className="p-3 md:p-4 w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-y-3 xl:gap-y-0 xl:divide-x divide-[var(--color-border)]">
                {metrics.map((m, idx) => (
                    <div 
                        key={idx} 
                        className="flex flex-col items-center justify-center text-center px-2 py-1"
                    >
                        <Text
                            variant="caption"
                            weight="medium"
                            color="text-secondary"
                            className="uppercase tracking-wider text-[9px] leading-tight mb-1"
                        >
                            {m.title}
                        </Text>
                        <span 
                            className={`text-sm md:text-base font-black tracking-tight ${
                                m.isAlert ? m.alertColor : 'text-[var(--color-text-primary)]'
                            }`}
                        >
                            {m.value}
                        </span>
                    </div>
                ))}
            </div>
        </MaterialCard>
    );
};

export default IndicatorsSummary;
