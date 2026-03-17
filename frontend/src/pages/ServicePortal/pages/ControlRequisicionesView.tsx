import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Search, Save, Loader2, Pencil } from 'lucide-react';
import axios from 'axios';
import { Button, Title, Text } from '../../../components/atoms';
import { API_CONFIG } from '../../../config/api';
import { generateRequisicionPDF } from '../../../utils/generateRequisicionPDF';

interface RequisicionMultiAgencia {
    id: string;
    fecha_creacion: string;
    estado: string;
    estado_rp: string;
    fecha_recibo_gh: string;
    cargo_nombre: string;
    numero_personas: number;
    ciudad_contratacion: string;
    area_destino: string;
    solicitante_nombre: string;
    orden_trabajo: string;
    nombre_proyecto: string;
    salario_asignado: number;
    auxilio_alimentacion: number;
    auxilio_movilizacion: number;
    mejora?: number;
    fecha_env_temporal?: string;
}

// Estado local editable por RP
interface LocalRpState {
    fecha_recibo_gh: string;
    estado_rp: string;
    mejora: number;
    fecha_env_temporal: string;
}

interface ControlRequisicionesViewProps {
    onBack: () => void;
}

const ControlRequisicionesView: React.FC<ControlRequisicionesViewProps> = ({ onBack }) => {
    const [requisiciones, setRequisiciones] = useState<RequisicionMultiAgencia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Estado local mutable por RP (edición libre en la tabla)
    const [localState, setLocalState] = useState<Record<string, LocalRpState>>({});

    const navigate = useNavigate();

    useEffect(() => { fetchRequisiciones(); }, []);

    const buildLocalState = useCallback((reqs: RequisicionMultiAgencia[]) => {
        const state: Record<string, LocalRpState> = {};
        reqs.forEach(req => {
            state[req.id] = {
                fecha_recibo_gh: req.fecha_recibo_gh || '',
                estado_rp: req.estado_rp || 'EN PROCESO',
                mejora: req.mejora || 0,
                fecha_env_temporal: req.fecha_env_temporal || '',
            };
        });
        return state;
    }, []);

    const fetchRequisiciones = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_CONFIG.BASE_URL}/requisiciones/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const aprobadas = (res.data as RequisicionMultiAgencia[]).filter(
                req => req.estado?.trim().toLowerCase() === 'aprobada'
            );
            setRequisiciones(aprobadas);
            setLocalState(buildLocalState(aprobadas));
        } catch (err) {
            console.error("Error al cargar requisiciones:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (rpId: string, field: keyof LocalRpState, value: string | number) => {
        setLocalState(prev => ({
            ...prev,
            [rpId]: { ...prev[rpId], [field]: value }
        }));
    };

    // Guarda todos los cambios en lote
    const handleSaveAll = async () => {
        setIsSaving(true);
        const token = localStorage.getItem('token');
        const errors: string[] = [];

        for (const req of requisiciones) {
            const local = localState[req.id];
            if (!local) continue;

            const payload: any = {
                fecha_recibo_gh: local.fecha_recibo_gh || null,
                estado_rp: local.estado_rp,
                mejora: local.mejora || 0,
            };

            // Solo incluir fechas válidas
            const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
            if (isValidDate(local.fecha_env_temporal)) payload.fecha_env_temporal = local.fecha_env_temporal;

            try {
                await axios.patch(`${API_CONFIG.BASE_URL}/requisiciones/${req.id}`, payload, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
            } catch (err: any) {
                console.error(`Error guardando ${req.id}:`, err);
                errors.push(req.id);
            }
        }

        setIsSaving(false);
        if (errors.length > 0) {
            alert(`Error al guardar: ${errors.join(', ')}. Verifica la consola.`);
        } else {
            // Refrescar datos desde el servidor para sincronizar
            await fetchRequisiciones();
        }
    };

    const hasPendingChanges = requisiciones.some(req => {
        const local = localState[req.id];
        if (!local) return false;
        return (
            local.fecha_recibo_gh !== (req.fecha_recibo_gh || '') ||
            local.estado_rp !== (req.estado_rp || 'EN PROCESO') ||
            local.mejora !== (req.mejora || 0) ||
            local.fecha_env_temporal !== (req.fecha_env_temporal || '')
        );
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount || 0);

    const filteredRequisiciones = requisiciones.filter(req =>
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.cargo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.nombre_proyecto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.solicitante_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );



    const getEstadoStyle = (estado: string) => {
        switch (estado) {
            case 'FINALIZADA': return 'bg-green-100 text-green-700 border-green-200';
            case 'CANCELADA': return 'bg-red-100 text-red-700 border-red-200';
            case 'EN PROCESO': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-neutral-100 text-neutral-600';
        }
    };

    // Helpers eliminados por centralización de campos comunes


    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0f1115] -mx-4 -mt-2 p-6 overflow-x-hidden">
            <div className="max-w-[1800px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#1a1d23] p-6 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={onBack} className="rounded-xl">
                            <ArrowLeft size={18} className="mr-2" />
                            Regresar
                        </Button>
                        <div className="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />
                        <div>
                            <Title variant="h4" weight="bold" className="text-neutral-800 dark:text-white uppercase tracking-tight">
                                Control de Temporales
                            </Title>
                            <Text variant="caption" className="text-neutral-500 font-medium tracking-wide">
                                {requisiciones.length} RP aprobadas • {requisiciones.length * 3} slots de control
                            </Text>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className="relative group flex-1 max-w-lg">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por RP, Cargo, Proyecto, Solicitante..."
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* BOTÓN GLOBAL DE GUARDAR */}
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving || !hasPendingChanges}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200
                                ${hasPendingChanges
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 animate-pulse-soft'
                                    : 'bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500 cursor-not-allowed'
                                }
                            `}
                        >
                            {isSaving
                                ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                                : <><Save size={16} /> {hasPendingChanges ? 'Guardar Cambios' : 'Sin cambios'}</>
                            }
                        </button>
                    </div>
                </div>

                {/* Indicador de cambios pendientes */}
                {hasPendingChanges && (
                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-5 py-3 rounded-xl text-sm text-amber-700 dark:text-amber-400 font-medium">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        Tienes cambios sin guardar. Haz clic en <strong className="mx-1">Guardar Cambios</strong> para persistirlos.
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-white dark:bg-[#1a1d23] rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <div className="overflow-x-auto scroller-premium">
                        <table className="w-full text-left border-collapse min-w-[2600px]">
                            <thead>
                                <tr className="bg-[#0a192f] text-white">
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black sticky left-0 z-10 bg-[#0a192f] text-center">
                                        <span className="flex items-center justify-center gap-1">
                                            <Pencil size={11} />
                                            Indicadores
                                        </span>
                                    </th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black sticky left-[100px] z-10 bg-[#0a192f]">No. RP</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black">Fecha Req.</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black text-center">Soporte</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black bg-yellow-500/10 text-yellow-400">Recibido GH</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black bg-blue-500/10 text-blue-300">Estado RP</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black w-48">Cargo Requerido</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black text-center">Cant.</th>
                                     <th className="p-4 text-[10px] font-bold uppercase border-r border-black">Ciudad</th>
                                     <th className="p-4 text-[10px] font-bold uppercase border-r border-black">Área</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black">Solicitante</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black">OT</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black">Proyecto</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black text-right text-yellow-400">Salario</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black text-right text-green-400">Aux. Alim.</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black text-right text-green-400">Aux. Mov.</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black bg-primary/10 text-primary text-right">Mejora Salarial</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-r border-black bg-primary/10 text-primary text-right">Total Salario</th>
                                    <th className="p-4 text-[10px] font-bold uppercase border-b border-black bg-primary/10 text-primary">Envío Temporal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black font-medium text-[10px]">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={18} className="p-20 text-center text-neutral-500">
                                             <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                             Cargando datos...
                                         </td>
                                     </tr>
                                 ) : filteredRequisiciones.length === 0 ? (
                                     <tr>
                                         <td colSpan={18} className="p-12 text-center text-neutral-400 text-sm">Sin requisiciones aprobadas.</td>
                                    </tr>
                                ) : filteredRequisiciones.map((req) => {
                                    const local = localState[req.id];
                                    const totalSalario = (req.salario_asignado || 0) + (local?.mejora || 0) +
                                        (req.auxilio_alimentacion || 0) + (req.auxilio_movilizacion || 0);

                                    return (
                                        <tr
                                            key={req.id}
                                            className="border-t-2 border-black hover:bg-primary/5 transition-colors"
                                        >
                                            {/* Columna Indicadores */}
                                            <td className="p-3 border-r border-black sticky left-0 z-10 bg-white dark:bg-[#1a1d23] shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center align-middle">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <span className={`inline-block w-3 h-3 rounded-full border-2 border-black ${
                                                        local?.estado_rp === 'FINALIZADA' ? 'bg-green-500' :
                                                        local?.estado_rp === 'CANCELADA' ? 'bg-red-500' :
                                                        'bg-yellow-400'
                                                    }`} />
                                                    <button
                                                        title="Ver detalle por agencia"
                                                        onClick={() => navigate(`/service-portal/requisicion-personal/control/${req.id}`)}
                                                        className="mt-1 p-1 rounded hover:bg-primary/10 text-neutral-400 hover:text-primary transition-colors"
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4 border-r border-black font-mono font-bold text-primary text-[11px]">{req.id}</td>
                                            <td className="p-4 border-r border-black font-medium">{new Date(req.fecha_creacion).toLocaleDateString()}</td>
                                            <td className="p-4 text-center border-r border-black">
                                                <button
                                                    onClick={() => generateRequisicionPDF(req as any)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded font-bold hover:bg-red-100 transition-all"
                                                >
                                                    <FileText size={12} /> PDF
                                                </button>
                                            </td>
                                            {/* Recibido GH */}
                                            <td className="p-2 border-r border-black text-center">
                                                <input type="date"
                                                    className="text-[10px] border border-black rounded-lg p-1 w-full bg-transparent focus:ring-2 focus:ring-yellow-400/30 outline-none"
                                                    value={local?.fecha_recibo_gh || ''}
                                                    onChange={e => updateField(req.id, 'fecha_recibo_gh', e.target.value)}
                                                />
                                            </td>
                                            {/* Estado RP */}
                                            <td className="p-2 border-r border-black text-center">
                                                <select
                                                    className={`text-[9px] font-black border border-black rounded-lg p-1 w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/30 ${getEstadoStyle(local?.estado_rp || 'EN PROCESO')}`}
                                                    value={local?.estado_rp || 'EN PROCESO'}
                                                    onChange={e => updateField(req.id, 'estado_rp', e.target.value)}
                                                >
                                                    <option value="EN PROCESO">EN PROCESO</option>
                                                    <option value="FINALIZADA">FINALIZADA</option>
                                                    <option value="CANCELADA">CANCELADA</option>
                                                </select>
                                            </td>
                                            <td className="p-4 font-bold uppercase border-r border-black">{req.cargo_nombre}</td>
                                            <td className="p-4 text-center font-bold text-sm border-r border-black">{req.numero_personas}</td>
                                            <td className="p-4 uppercase border-r border-black">{req.ciudad_contratacion}</td>
                                            <td className="p-4 border-r border-black font-bold uppercase text-neutral-500">{req.area_destino}</td>
                                            <td className="p-4 border-r border-black uppercase font-medium">{req.solicitante_nombre}</td>
                                            <td className="p-4 font-mono font-bold text-neutral-400 border-r border-black">{req.orden_trabajo}</td>
                                            <td className="p-4 uppercase border-r border-black">{req.nombre_proyecto}</td>
                                            <td className="p-4 font-mono text-right border-r border-black">{formatCurrency(req.salario_asignado)}</td>
                                            <td className="p-4 font-mono text-right text-green-600 border-r border-black">{formatCurrency(req.auxilio_alimentacion)}</td>
                                            <td className="p-4 font-mono text-right text-green-600 border-r border-black">{formatCurrency(req.auxilio_movilizacion)}</td>
                                            {/* Mejora Salarial */}
                                            <td className="p-2 text-right border-r border-black">
                                                <input type="number" min={0}
                                                    className="text-[10px] text-right border border-black rounded-lg p-1 w-full bg-transparent font-mono font-bold text-orange-600 focus:ring-2 focus:ring-orange-400/30 outline-none"
                                                    value={local?.mejora || 0}
                                                    onChange={e => updateField(req.id, 'mejora', parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            {/* Total Salario */}
                                            <td className="p-4 text-[11px] font-mono font-bold text-right bg-primary/20 text-primary border-r border-black">
                                                {formatCurrency(totalSalario)}
                                            </td>
                                            {/* Envío Temporal */}
                                            <td className="p-2 border-r border-black">
                                                <input type="date"
                                                    className="text-[10px] border border-black rounded-lg p-1 w-full bg-transparent focus:ring-2 focus:ring-primary/30 outline-none"
                                                    value={local?.fecha_env_temporal || ''}
                                                    onChange={e => updateField(req.id, 'fecha_env_temporal', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                .scroller-premium::-webkit-scrollbar { height: 10px; }
                .scroller-premium::-webkit-scrollbar-track { background: transparent; }
                .scroller-premium::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; border: 3px solid white; }
                .dark .scroller-premium::-webkit-scrollbar-thumb { background: #334155; border: 3px solid #1a1d23; }
                @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
                .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default ControlRequisicionesView;
