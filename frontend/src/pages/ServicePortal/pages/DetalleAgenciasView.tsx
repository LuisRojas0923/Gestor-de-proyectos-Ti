import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Button, Title, Text } from '../../../components/atoms';
import { API_CONFIG } from '../../../config/api';
import { generateRequisicionPDF } from '../../../utils/generateRequisicionPDF';

const AGENCIAS = ['SUMMAR', 'MULTIEMPLEOS', 'DIRECTO'] as const;
type Agencia = typeof AGENCIAS[number];

interface RequisicionAgenciaDetalleRead extends AgenciaLocalState {
    id: number;
    requisicion_id: string;
}

interface RequisicionDetalle {
    id: string;
    fecha_creacion: string;
    estado: string;
    estado_rp: string;
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
    fecha_recibo_gh?: string;
    mejora?: number;
    fecha_env_temporal?: string;
    detalles_agencias: RequisicionAgenciaDetalleRead[];
}

interface AgenciaLocalState {
    id?: number;
    fecha_envio_hv: string;
    na: number; a: number;
    cancel_tiempo: number; cancel_referido: number; cancel_mov: number;
    nc_exp: number; nc_em: number; nc_entrev: number; nc_antcd: number; nc_vial: number;
    salario_final: number; tiempo: number; tipo_contrato: string;
    tema_personal: number; no_asistio_entrev: number; contratado: number;
    obs: string;
    agencia?: string;
}

const getAgenciaStyle = (a: string) => {
    if (a === 'SUMMAR') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (a === 'MULTIEMPLEOS') return 'bg-purple-100 text-purple-800 border-purple-300';
    return 'bg-green-100 text-green-800 border-green-300';
};

const formatCurrency = (v?: number) =>
    v ? `$ ${v.toLocaleString('es-CO')}` : '$ 0';

const DetalleAgenciasView: React.FC = () => {
    const { rpId } = useParams<{ rpId: string }>();
    const navigate = useNavigate();

    const [req, setReq] = useState<RequisicionDetalle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Estado global del RP
    const [fechaRecibo, setFechaRecibo] = useState('');
    const [estadoRp, setEstadoRp] = useState('EN PROCESO');
    const [mejora, setMejora] = useState(0);
    const [fechaEnvTemporal, setFechaEnvTemporal] = useState('');

    // Estado por agencia (ahora array por agencia)
    const emptyState = (agencia: string): AgenciaLocalState => ({
        agencia,
        fecha_envio_hv: '', na: 0, a: 0, cancel_tiempo: 0, cancel_referido: 0, cancel_mov: 0,
        nc_exp: 0, nc_em: 0, nc_entrev: 0, nc_antcd: 0, nc_vial: 0,
        salario_final: 0, tiempo: 0, tipo_contrato: '', tema_personal: 0, no_asistio_entrev: 0, contratado: 0,
        obs: '',
    });

    const [agenciaState, setAgenciaState] = useState<Record<Agencia, AgenciaLocalState[]>>({
        SUMMAR: [emptyState('SUMMAR')], 
        MULTIEMPLEOS: [emptyState('MULTIEMPLEOS')], 
        DIRECTO: [emptyState('DIRECTO')],
    });

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchReq = useCallback(async () => {
        if (!rpId) return;
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}/requisiciones/${rpId}`, { headers });
            const data: RequisicionDetalle = res.data as RequisicionDetalle;
            setReq(data);
            setFechaRecibo(data.fecha_recibo_gh || '');
            setEstadoRp(data.estado_rp || 'EN PROCESO');
            setMejora(data.mejora || 0);
            setFechaEnvTemporal(data.fecha_env_temporal || '');
            
            const newState: Record<Agencia, AgenciaLocalState[]> = {
                SUMMAR: [], MULTIEMPLEOS: [], DIRECTO: [],
            };

            // Agrupar detalles por agencia
            if (data.detalles_agencias && data.detalles_agencias.length > 0) {
                data.detalles_agencias.forEach(det => {
                    const ag = det.agencia as Agencia;
                    if (newState[ag]) newState[ag].push(det);
                });
            }

            // Asegurar que haya al menos una fila por agencia
            AGENCIAS.forEach(ag => {
                if (newState[ag].length === 0) newState[ag].push(emptyState(ag));
            });

            setAgenciaState(newState);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [rpId]);

    useEffect(() => { fetchReq(); }, [fetchReq]);

    const handleSave = async () => {
        if (!rpId) return;
        setIsSaving(true);
        const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
        const payload: Record<string, any> = {
            estado_rp: estadoRp,
            mejora,
        };
        if (isValidDate(fechaRecibo)) payload.fecha_recibo_gh = fechaRecibo;
        if (isValidDate(fechaEnvTemporal)) payload.fecha_env_temporal = fechaEnvTemporal;

        // Aplanar todos los detalles para enviarlos en una sola lista
        const detalles_agencias = Object.values(agenciaState).flat().map(d => {
            const cleaned: any = { ...d };
            if (!isValidDate(cleaned.fecha_envio_hv)) delete cleaned.fecha_envio_hv;
            return cleaned;
        });

        payload.detalles_agencias = detalles_agencias;

        try {
            await axios.patch(`${API_CONFIG.BASE_URL}/requisiciones/${rpId}`, payload, { headers });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const totalSalario = (req?.salario_asignado || 0) + mejora +
        (req?.auxilio_alimentacion || 0) + (req?.auxilio_movilizacion || 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-primary" size={36} />
            </div>
        );
    }

    if (!req) {
        return <div className="p-8 text-center text-neutral-500">Requisición no encontrada.</div>;
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0f1115] -mx-4 -mt-2 p-6">
            {/* Header */}
            <div className="max-w-[1400px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-xl border border-black hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <Title className="text-xl font-black">Detalle por Agencia</Title>
                            <Text className="text-xs text-neutral-500 font-mono">{req.id}</Text>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => generateRequisicionPDF(req as any)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                        >
                            <FileText size={14} /> PDF
                        </button>
                        <Button
                            onClick={handleSave}
                            loading={isSaving}
                            icon={Save}
                            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-black rounded-xl border border-black transition-all whitespace-nowrap ${saved ? 'bg-green-500 text-white' : 'bg-[#0a192f] text-white hover:bg-[#1a3a5c]'
                                }`}
                        >
                            {saved ? '¡Guardado!' : 'Guardar'}
                        </Button>
                    </div>
                </div>

                {/* Info card del RP */}
                <div className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-black p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Cargo</span><span className="font-semibold uppercase">{req.cargo_nombre}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Solicitante</span><span className="font-semibold">{req.solicitante_nombre}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Área</span><span className="font-semibold">{req.area_destino}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Ciudad</span><span className="font-semibold">{req.ciudad_contratacion}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">OT</span><span className="font-mono font-semibold">{req.orden_trabajo}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Proyecto</span><span className="font-semibold">{req.nombre_proyecto}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Vacantes</span><span className="font-semibold">{req.numero_personas}</span></div>
                    <div><span className="text-[10px] uppercase text-neutral-400 font-bold block">Fecha Req.</span><span className="font-semibold">{new Date(req.fecha_creacion).toLocaleDateString('es-CO')}</span></div>
                </div>

                {/* Campos comunes del RP */}
                <div className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-black p-5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-4">Campos Comunes del RP</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Estado RP</label>
                            <select
                                value={estadoRp}
                                onChange={e => setEstadoRp(e.target.value)}
                                className="w-full border border-black rounded-lg p-2 text-sm font-bold bg-transparent"
                            >
                                <option value="EN PROCESO">EN PROCESO</option>
                                <option value="FINALIZADA">FINALIZADA</option>
                                <option value="CANCELADA">CANCELADA</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Recibido GH</label>
                            <input type="date" value={fechaRecibo} onChange={e => setFechaRecibo(e.target.value)}
                                className="w-full border border-black rounded-lg p-2 text-sm bg-transparent" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Mejora Salarial</label>
                            <input type="number" min={0} value={mejora} onChange={e => setMejora(parseInt(e.target.value) || 0)}
                                className="w-full border border-black rounded-lg p-2 text-sm bg-transparent font-mono" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Envío Temporal</label>
                            <input type="date" value={fechaEnvTemporal} onChange={e => setFechaEnvTemporal(e.target.value)}
                                className="w-full border border-black rounded-lg p-2 text-sm bg-transparent" />
                        </div>
                    </div>
                    {/* Resumen salarial */}
                    <div className="mt-4 flex flex-wrap gap-4 text-[11px]">
                        <span><span className="text-neutral-500">Salario Base:</span> <span className="font-mono font-bold">{formatCurrency(req.salario_asignado)}</span></span>
                        <span><span className="text-neutral-500">Aux. Alimentación:</span> <span className="font-mono font-bold text-green-700">{formatCurrency(req.auxilio_alimentacion)}</span></span>
                        <span><span className="text-neutral-500">Aux. Movilización:</span> <span className="font-mono font-bold text-green-700">{formatCurrency(req.auxilio_movilizacion)}</span></span>
                        <span className="ml-auto"><span className="text-neutral-500">Total Salario:</span> <span className="font-mono font-black text-primary text-sm">{formatCurrency(totalSalario)}</span></span>
                    </div>
                </div>

                {/* Tabla por agencia */}
                <div className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-black overflow-hidden">
                    <div className="px-5 py-4 border-b border-black">
                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Detalle por Agencia</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <div style={{ width: '1730px' }}>
                            {/* Label DESISTE alineado externamente */}
                            <div className="flex border-b border-black">
                                <div style={{ width: '240px' }} className="flex-shrink-0" /> {/* Margen: Agencia (100) + Fecha (140) */}
                                <div
                                    style={{ width: '750px' }} // 10 columnas * 75px
                                    className="bg-[#0a192f] text-white text-center py-1.5 uppercase font-black text-[11px] tracking-[0.4em] border-x border-black border-t border-t-black rounded-t-lg"
                                >
                                    DESISTE
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse text-[12px] table-fixed">
                                <thead>
                                    <tr className="bg-[#0a192f] text-white">
                                        <th style={{ width: '100px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Agencia</th>
                                        <th style={{ width: '140px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center text-blue-300">Fecha Envio HV por Empresa</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">N/A</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">A</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Cancelada O.Tiempo</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Cancelada por Referido</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Cancelada por Mov.Inter</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">N.C.EXP.</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">N.C.E.M</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">N.C.ENTREV</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">N.C.ANTCD</th>
                                        <th style={{ width: '75px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">N.C.VIAL</th>
                                        <th style={{ width: '110px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center text-yellow-300">Salario Final</th>
                                        <th style={{ width: '80px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Tiempo</th>
                                        <th style={{ width: '140px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Tipo Contrato</th>
                                        <th style={{ width: '80px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Tema Personal</th>
                                        <th style={{ width: '80px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">No Asistio Entrevista</th>
                                        <th style={{ width: '80px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center text-green-400">Contratado</th>
                                    <th style={{ width: '220px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Observaciones</th>
                                    <th style={{ width: '60px' }} className="p-3 border border-black font-bold uppercase text-[9px] text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {AGENCIAS.map((agencia) => (
                                        <React.Fragment key={agencia}>
                                            {agenciaState[agencia].map((fila, idx) => (
                                                <tr key={`${agencia}-${idx}`} className={`border-t border-black hover:bg-primary/5 transition-colors ${idx === 0 ? 'border-t-2' : ''}`}>
                                                    {idx === 0 && (
                                                        <td rowSpan={agenciaState[agencia].length} className="p-3 border border-black vertical-middle bg-neutral-50 dark:bg-neutral-900/50">
                                                            <div className="flex flex-col gap-2 items-center">
                                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border block text-center w-full ${getAgenciaStyle(agencia)}`}>
                                                                    {agencia}
                                                                </span>
                                                                <button 
                                                                    onClick={() => setAgenciaState(prev => ({ 
                                                                        ...prev, [agencia]: [...prev[agencia], emptyState(agencia)] 
                                                                    }))}
                                                                    className="p-1 px-2 bg-primary text-white rounded-md flex items-center gap-1 text-[9px] font-bold hover:scale-105 transition-transform"
                                                                >
                                                                    <Plus size={10} /> Nueva
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="p-2 border border-black">
                                                        <input type="date"
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] bg-transparent"
                                                            value={fila.fecha_envio_hv}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].fecha_envio_hv = e.target.value;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    {/* Métricas numéricas */}
                                                    {([
                                                        ['na', 'N/A'], ['a', 'A'], ['cancel_tiempo', 'O.T.'], ['cancel_referido', 'Ref.'],
                                                        ['cancel_mov', 'Mov.'], ['nc_exp', 'EXP'], ['nc_em', 'EM'],
                                                        ['nc_entrev', 'Ent.'], ['nc_antcd', 'Ant.'], ['nc_vial', 'Vial']
                                                    ] as const).map(([field]) => (
                                                        <td key={field} className="p-2 border border-black w-[75px]">
                                                            <input type="number" min={0}
                                                                className="w-full border border-black rounded-lg p-2 text-[13px] text-center bg-transparent font-bold"
                                                                value={fila[field as keyof AgenciaLocalState] as number}
                                                                onChange={e => {
                                                                    const newRows = [...agenciaState[agencia]];
                                                                    (newRows[idx] as any)[field] = parseInt(e.target.value) || 0;
                                                                    setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                                }}
                                                            />
                                                        </td>
                                                    ))}
                                                    {/* 6 campos adicionales */}
                                                    <td className="p-2 border border-black">
                                                        <input type="number" min={0}
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] text-center bg-transparent font-bold text-yellow-600"
                                                            value={fila.salario_final}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].salario_final = parseInt(e.target.value) || 0;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black">
                                                        <input type="number" min={0}
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] text-center bg-transparent font-bold"
                                                            value={fila.tiempo}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].tiempo = parseInt(e.target.value) || 0;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black">
                                                        <input type="text" placeholder="Término fijo..."
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] bg-transparent min-w-[110px]"
                                                            value={fila.tipo_contrato}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].tipo_contrato = e.target.value;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black">
                                                        <input type="number" min={0}
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] text-center bg-transparent font-bold"
                                                            value={fila.tema_personal}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].tema_personal = parseInt(e.target.value) || 0;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black">
                                                        <input type="number" min={0}
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] text-center bg-transparent font-bold"
                                                            value={fila.no_asistio_entrev}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].no_asistio_entrev = parseInt(e.target.value) || 0;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black">
                                                        <input type="number" min={0}
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] text-center bg-transparent font-bold text-green-700"
                                                            value={fila.contratado}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].contratado = parseInt(e.target.value) || 0;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black">
                                                        <textarea
                                                            placeholder="Observaciones..."
                                                            rows={2}
                                                            className="w-full border border-black rounded-lg p-1.5 text-[11px] bg-transparent resize-none min-w-[180px]"
                                                            value={fila.obs}
                                                            onChange={e => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                newRows[idx].obs = e.target.value;
                                                                setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 border border-black text-center">
                                                        <button 
                                                            onClick={() => {
                                                                const newRows = [...agenciaState[agencia]];
                                                                if (newRows.length > 1 || fila.id) {
                                                                    newRows.splice(idx, 1);
                                                                    if (newRows.length === 0) newRows.push(emptyState(agencia));
                                                                    setAgenciaState(prev => ({ ...prev, [agencia]: newRows }));
                                                                }
                                                            }}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar fila"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetalleAgenciasView;
