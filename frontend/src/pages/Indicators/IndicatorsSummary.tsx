import React from 'react';
import { MetricCard } from '../../components/molecules';
import { CheckCircle, Clock, TrendingUp, AlertCircle, Calendar, Hash, Zap } from 'lucide-react';

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
    };
}

const IndicatorsSummary: React.FC<Props> = ({ data }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-4">
            <MetricCard
                title="Solicitudes por Mes"
                value={(data?.avg_mes || 0).toString()}
                icon={Calendar}
                color="blue"
            />
            <MetricCard
                title="Total Soportes Recibidos"
                value={(data?.total || 0).toString()}
                icon={Hash}
                color="blue"
            />
            <MetricCard
                title="Solicitudes Resueltas"
                value={(data?.resueltos || 0).toString()}
                icon={CheckCircle}
                color="green"
            />
            <MetricCard
                title="Solicitudes Pendientes"
                value={(data?.pendientes || 0).toString()}
                icon={AlertCircle}
                color="red"
            />
            <MetricCard
                title="Minutos Totales"
                value={(data?.total_minutos || 0).toString() + "m"}
                icon={TrendingUp}
                color="blue"
            />
            <MetricCard
                title="Horas Totales"
                value={(data?.total_horas || 0).toString() + "h"}
                icon={Clock}
                color="blue"
            />
            <MetricCard
                title="Prom. Tiempo en Atender"
                value={(data?.avg_atender_global || 0).toString() + "m"}
                icon={Clock}
                color="yellow"
            />
            <MetricCard
                title="Promedio de Atención"
                value={(data?.avg_atencion_global || 0).toString() + "m"}
                icon={Zap}
                color="yellow"
            />
        </div>
    );
};

export default IndicatorsSummary;
