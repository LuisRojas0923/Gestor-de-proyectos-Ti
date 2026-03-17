import React from 'react';
import { X, Pencil } from 'lucide-react';

interface RequisicionInfo {
    id: string;
    cargo_nombre: string;
    solicitante_nombre: string;
    ciudad_contratacion: string;
    numero_personas: number;
    area_destino: string;
    nombre_proyecto: string;
    orden_trabajo: string;
    salario_asignado: number;
    auxilio_alimentacion: number;
    auxilio_movilizacion: number;
    mejora?: number;
    fecha_env_temporal?: string;
    fecha_recibo_gh?: string;
    estado_rp?: string;
}

interface IndicadoresModalProps {
    req: RequisicionInfo | null;
    onClose: () => void;
}

const AGENCIAS = ['SUMMAR', 'MULTIEMPLEOS', 'DIRECTO'] as const;

const getAgenciaStyle = (agencia: string) => {
    switch (agencia) {
        case 'SUMMAR': return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'MULTIEMPLEOS': return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'DIRECTO': return 'bg-green-100 text-green-800 border-green-300';
        default: return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
};

const getEstadoStyle = (estado: string) => {
    switch (estado) {
        case 'FINALIZADA': return 'bg-green-500 text-white';
        case 'CANCELADA': return 'bg-red-500 text-white';
        default: return 'bg-yellow-400 text-black';
    }
};

const formatCurrency = (val?: number) => {
    if (!val) return '$ 0';
    return `$ ${val.toLocaleString('es-CO')}`;
};

const IndicadoresModal: React.FC<IndicadoresModalProps> = ({ req, onClose }) => {
    if (!req) return null;

    const totalSalario = (req.salario_asignado || 0) + (req.mejora || 0) +
        (req.auxilio_alimentacion || 0) + (req.auxilio_movilizacion || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1a1d23] rounded-2xl shadow-2xl border border-black w-full max-w-5xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#0a192f] text-white">
                    <div className="flex items-center gap-3">
                        <Pencil size={16} className="text-primary" />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Indicadores por agencia</p>
                            <h2 className="text-sm font-bold font-mono">{req.id}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${getEstadoStyle(req.estado_rp || 'EN PROCESO')}`}>
                            {req.estado_rp || 'EN PROCESO'}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Info resumen del RP */}
                <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-black bg-neutral-50 dark:bg-[#0f1115] text-[10px]">
                    <div><span className="text-neutral-500 uppercase font-bold">Cargo:</span> <span className="font-semibold">{req.cargo_nombre}</span></div>
                    <div><span className="text-neutral-500 uppercase font-bold">Solicitante:</span> <span className="font-semibold">{req.solicitante_nombre}</span></div>
                    <div><span className="text-neutral-500 uppercase font-bold">Ciudad:</span> <span className="font-semibold">{req.ciudad_contratacion}</span></div>
                    <div><span className="text-neutral-500 uppercase font-bold">Proyecto:</span> <span className="font-semibold">{req.nombre_proyecto}</span></div>
                </div>

                {/* Tabla de agencias */}
                <div className="overflow-x-auto p-6">
                    <table className="w-full text-left border-collapse border border-black text-[11px]">
                        <thead>
                            <tr className="bg-[#0a192f] text-white">
                                <th className="p-3 border border-black font-bold uppercase">No. RP</th>
                                <th className="p-3 border border-black font-bold uppercase">Agencia</th>
                                <th className="p-3 border border-black font-bold uppercase">Salario Base</th>
                                <th className="p-3 border border-black font-bold uppercase text-green-400">Aux. Alimentación</th>
                                <th className="p-3 border border-black font-bold uppercase text-green-400">Aux. Movilización</th>
                                <th className="p-3 border border-black font-bold uppercase text-orange-400">Mejora Salarial</th>
                                <th className="p-3 border border-black font-bold uppercase text-primary">Total Salario</th>
                                <th className="p-3 border border-black font-bold uppercase text-yellow-400">Recibido GH</th>
                                <th className="p-3 border border-black font-bold uppercase text-blue-300">Envío Temporal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {AGENCIAS.map((agencia) => (
                                <tr key={agencia} className="border-t border-black hover:bg-primary/5 transition-colors">
                                    {/* No. RP */}
                                    <td className="p-3 border border-black font-mono font-bold text-primary">
                                        {req.id}
                                    </td>
                                    {/* Agencia */}
                                    <td className="p-3 border border-black">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border block text-center w-fit ${getAgenciaStyle(agencia)}`}>
                                            {agencia}
                                        </span>
                                    </td>
                                    {/* Salario Base */}
                                    <td className="p-3 border border-black font-mono text-right">
                                        {formatCurrency(req.salario_asignado)}
                                    </td>
                                    {/* Aux. Alimentación */}
                                    <td className="p-3 border border-black font-mono text-right text-green-700">
                                        {formatCurrency(req.auxilio_alimentacion)}
                                    </td>
                                    {/* Aux. Movilización */}
                                    <td className="p-3 border border-black font-mono text-right text-green-700">
                                        {formatCurrency(req.auxilio_movilizacion)}
                                    </td>
                                    {/* Mejora Salarial (común, igual para todas) */}
                                    <td className="p-3 border border-black font-mono text-right text-orange-600 font-bold">
                                        {formatCurrency(req.mejora)}
                                    </td>
                                    {/* Total */}
                                    <td className="p-3 border border-black font-mono text-right bg-primary/10 text-primary font-bold">
                                        {formatCurrency(totalSalario)}
                                    </td>
                                    {/* Recibido GH */}
                                    <td className="p-3 border border-black text-center text-neutral-600">
                                        {req.fecha_recibo_gh
                                            ? new Date(req.fecha_recibo_gh).toLocaleDateString('es-CO')
                                            : <span className="text-neutral-400 italic">—</span>}
                                    </td>
                                    {/* Envío Temporal */}
                                    <td className="p-3 border border-black text-center text-neutral-600">
                                        {req.fecha_env_temporal
                                            ? new Date(req.fecha_env_temporal).toLocaleDateString('es-CO')
                                            : <span className="text-neutral-400 italic">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-3 border-t border-black">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-[11px] font-bold border border-black rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IndicadoresModal;
