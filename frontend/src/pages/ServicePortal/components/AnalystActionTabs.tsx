import React, { useState } from 'react';
import { Title, Text, Button, Select, Textarea } from '../../../components/atoms';
import { useApi } from '../../../hooks/useApi';
import { Ticket, TicketAttachment } from '../../../hooks/useTicketDetail';
import { Settings, Plus, Briefcase, FileText, Download } from 'lucide-react';

interface AnalystActionTabsProps {
    ticket: Ticket;
    developments: any[];
    onLinkDevelopment: (devId: string) => void;
    formData: any;
    onFieldChange: (field: string, value: string) => void;
    attachments?: TicketAttachment[];
    onDownloadAttachment?: (id: number, name: string) => void;
}

const AnalystActionTabs: React.FC<AnalystActionTabsProps> = ({
    ticket,
    developments,
    onLinkDevelopment,
    formData,
    onFieldChange,
    attachments = [],
    onDownloadAttachment
}) => {
    const [activeTab, setActiveTab] = useState<'diagnostico' | 'archivos' | 'vinculos'>('diagnostico');
    const [isLinking, setIsLinking] = useState(false);
    const [analistas, setAnalistas] = useState<{ value: string, label: string }[]>([]);
    const { get } = useApi<any[]>();

    React.useEffect(() => {
        const fetchAnalistas = async () => {
            try {
                const data = await get('/auth/analistas');
                if (data) {
                    setAnalistas(data.map(a => ({ value: a.nombre, label: a.nombre })));
                }
            } catch (error) {
                console.error("Error al cargar analistas:", error);
            }
        };
        fetchAnalistas();
    }, [get]);

    const formatKey = (key: string) => {
        return key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const excludedKeys = [
        'nombre', 'area', 'sede', 'email', 'asunto', 'descripcion_detallada',
        'nivel_prioridad', 'fecha_ideal',
        'archivos_adjuntos', 'hardware_solicitado', 'especificaciones'
    ];

    return (
        <section className="col-span-12 lg:col-span-7 flex flex-col h-full bg-transparent overflow-hidden transition-colors">
            {/* Header Tarjeta */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-4 shrink-0 shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                    <Title variant="h5" weight="bold" color="text-primary">{ticket.asunto}</Title>
                    <Text
                        as="span"
                        variant="caption"
                        weight="medium"
                        className={`
                            inline-flex items-center rounded-full transition-all shadow-md hover:shadow-lg px-2 py-0.5 uppercase tracking-widest
                            ${ticket.prioridad === 'Alta' || ticket.prioridad === 'Crítica' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'}
                        `}
                    >
                        {ticket.prioridad || 'Media'}
                    </Text>
                </div>
                <div className="border-l-2 border-blue-500 pl-4 py-1">
                    <Text variant="body2" color="text-secondary" className="italic leading-relaxed">
                        "{ticket.descripcion}"
                    </Text>
                </div>
            </div>

            {/* Tabs y Contenido */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex gap-1 mb-0 z-10">
                    <Button
                        variant="custom"
                        onClick={() => setActiveTab('diagnostico')}
                        className={`
                            inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all rounded-t-xl border-t-2 px-6 py-2 h-10
                            ${activeTab === 'diagnostico'
                                ? 'bg-[var(--color-surface)] dark:bg-slate-800 border-blue-500 dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-blue-600'
                                : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent'}
                        `}
                    >
                        <Text as="span" variant="body2" weight="bold" color="inherit">Diagnóstico</Text>
                    </Button>
                    <Button
                        variant="custom"
                        onClick={() => setActiveTab('archivos')}
                        className={`
                            inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all rounded-t-xl border-t-2 px-6 py-2 h-10
                            ${activeTab === 'archivos'
                                ? 'bg-[var(--color-surface)] dark:bg-slate-800 border-blue-500 dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-blue-600'
                                : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent'}
                        `}
                    >
                        <Text as="span" variant="body2" weight="bold" color="inherit">Archivos ({attachments.length})</Text>
                    </Button>
                    <Button
                        variant="custom"
                        onClick={() => setActiveTab('vinculos')}
                        className={`
                            inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all rounded-t-xl border-t-2 px-6 py-2 h-10
                            ${activeTab === 'vinculos'
                                ? 'bg-[var(--color-surface)] dark:bg-slate-800 border-blue-500 dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-blue-600'
                                : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent'}
                        `}
                    >
                        <Text as="span" variant="body2" weight="bold" color="inherit">Vínculos</Text>
                    </Button>
                </div>

                <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-b-2xl rounded-tr-2xl p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm transition-all">

                    {/* TAB DIAGNÓSTICO */}
                    {activeTab === 'diagnostico' && (
                        <>
                            {/* Información del Formulario (Datos Extra) */}
                            {ticket.datos_extra && Object.entries(ticket.datos_extra).some(([k]) => !excludedKeys.includes(k)) && (
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-500 shadow-inner">
                                    <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-400">
                                        <Settings size={16} />
                                        <Text variant="caption" weight="bold" color="navy" className="uppercase tracking-widest leading-none">Información del Formulario</Text>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                        {Object.entries(ticket.datos_extra).map(([key, value]) => {
                                            const dynamicExcluded = [...excludedKeys];
                                            if (!ticket.solicitud_activo) {
                                                ['especificaciones', 'hardware_solicitado'].forEach(k => {
                                                    const idx = dynamicExcluded.indexOf(k);
                                                    if (idx > -1) dynamicExcluded.splice(idx, 1);
                                                });
                                            }
                                            if (dynamicExcluded.includes(key) || !value) return null;

                                            let displayLabel = formatKey(key);
                                            if (key === 'especificaciones' && ticket.categoria_id === 'compra_licencias') displayLabel = 'Producto / Licencia';

                                            return (
                                                <div key={key} className="flex flex-col gap-0.5 border-b border-slate-200/50 dark:border-slate-700/50 pb-1.5 last:border-0">
                                                    <Text as="span" variant="caption" weight="bold" color="text-secondary" className="uppercase text-[9px] tracking-wider">{displayLabel}</Text>
                                                    <Text variant="body2" weight="semibold" className="text-[13px]">{typeof value === 'object' ? JSON.stringify(value) : value.toString()}</Text>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Formulario de Acción */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="Asignar a"
                                    value={formData.asignado_a || ticket.asignado_a || ''}
                                    onChange={(e) => onFieldChange('asignado_a', e.target.value)}
                                    size="md"
                                    options={[
                                        { value: '', label: 'Sin Asignar' },
                                        ...analistas
                                    ]}
                                />
                                <Select
                                    label="Causa de la Novedad"
                                    value={formData.causa_novedad || ticket.causa_novedad || ''}
                                    onChange={(e) => onFieldChange('causa_novedad', e.target.value)}
                                    size="md"
                                    options={[
                                        { value: '', label: 'Seleccionar causa...' },
                                        { value: 'Error de Usuario / Capacitación', label: 'Error de Usuario / Capacitación' },
                                        { value: 'Falla de Software (Bug)', label: 'Falla de Software (Bug)' },
                                        { value: 'Falla de Hardware', label: 'Falla de Hardware' },
                                        { value: 'Problema de Conectividad / Red', label: 'Problema de Conectividad / Red' },
                                        { value: 'Solicitud de Cambio / Mejora', label: 'Solicitud de Cambio / Mejora' },
                                        { value: 'Error de Configuración', label: 'Error de Configuración' },
                                        { value: 'Actualización del Sistema', label: 'Actualización del Sistema' },
                                        { value: 'Otro', label: 'Otro' },
                                    ]}
                                />
                                <Select
                                    label="Estado"
                                    value={formData.estado || ticket.estado}
                                    onChange={(e) => {
                                        const nuevoEstado = e.target.value;
                                        onFieldChange('estado', nuevoEstado);
                                        // Auto-seleccionar primer sub-estado al cambiar estado
                                        const subEstados: Record<string, string[]> = {
                                            'Pendiente': ['Asignado'],
                                            'Proceso': ['Proceso', 'Pendiente Información'],
                                            'Cerrado': ['Resuelto', 'Escalado'],
                                        };
                                        const opciones = subEstados[nuevoEstado] || [];
                                        if (opciones.length > 0) {
                                            onFieldChange('sub_estado', opciones[0]);
                                        }
                                    }}
                                    size="md"
                                    options={[
                                        { value: 'Pendiente', label: 'Pendiente' },
                                        { value: 'Proceso', label: 'Proceso' },
                                        { value: 'Cerrado', label: 'Cerrado' },
                                    ]}
                                />
                                <Select
                                    label="Sub-Estado"
                                    value={formData.sub_estado || ticket.sub_estado || ''}
                                    onChange={(e) => onFieldChange('sub_estado', e.target.value)}
                                    size="md"
                                    options={
                                        (formData.estado || ticket.estado) === 'Pendiente'
                                            ? [{ value: 'Asignado', label: 'Asignado' }]
                                            : (formData.estado || ticket.estado) === 'Proceso'
                                                ? [
                                                    { value: 'Proceso', label: 'Proceso' },
                                                    { value: 'Pendiente Información', label: 'Pendiente Información' },
                                                ]
                                                : (formData.estado || ticket.estado) === 'Cerrado'
                                                    ? [
                                                        { value: 'Resuelto', label: 'Resuelto' },
                                                        { value: 'Escalado', label: 'Escalado' },
                                                    ]
                                                    : [{ value: '', label: 'Seleccione un estado primero' }]
                                    }
                                />
                            </div>

                            <div className="space-y-6">
                                <Textarea
                                    label="Notas Técnicas Internas"
                                    placeholder="Escribe el diagnóstico técnico para el equipo..."
                                    rows={4}
                                    value={formData.diagnostico || ''}
                                    onChange={(e) => onFieldChange('diagnostico', e.target.value)}
                                />

                                <Textarea
                                    label="Respuesta al Solicitante"
                                    placeholder="Este mensaje será enviado al usuario tras resolver..."
                                    rows={2}
                                    value={formData.resolucion || ''}
                                    onChange={(e) => onFieldChange('resolucion', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* TAB ARCHIVOS */}
                    {activeTab === 'archivos' && (
                        <div className="space-y-4 h-full animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-slate-400">
                                <Plus size={16} />
                                <Text variant="caption" weight="bold" color="navy" className="uppercase tracking-widest">Documentos del Ticket</Text>
                            </div>
                            {attachments.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {attachments.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <Text variant="body2" weight="bold" className="truncate block" color="text-primary">{file.nombre_archivo}</Text>
                                                    <Text variant="caption" color="text-secondary" className="opacity-60 uppercase text-[9px] font-mono tracking-tighter">
                                                        {file.tipo_mime.split('/')[1] || 'FILE'} • {new Date(file.creado_en).toLocaleDateString()}
                                                    </Text>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => onDownloadAttachment?.(file.id, file.nombre_archivo)} className="!p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 rounded-xl transition-colors" icon={Download} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                                    <FileText size={40} className="text-slate-400 mb-4 opacity-50" />
                                    <Text variant="body2" color="text-secondary" className="italic opacity-60">No hay documentos adjuntos.</Text>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB VINCULOS - Mantenemos simple por ahora, reusando lógica si fuera necesario */}
                    {activeTab === 'vinculos' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Text variant="body2" weight="bold" color="text-primary">Vínculo a Desarrollo</Text>
                                    <Text variant="caption" color="text-secondary" className="opacity-60">Asocia este ticket a un proyecto.</Text>
                                </div>
                                <Button variant="outline" size="sm" icon={isLinking ? undefined : Plus} onClick={() => setIsLinking(!isLinking)} className="text-[10px] font-black uppercase tracking-widest">
                                    {isLinking ? 'Cerrar' : ticket.desarrollo_id ? 'Cambiar Vínculo' : 'Vincular'}
                                </Button>
                            </div>
                            {ticket.desarrollo_id && !isLinking && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-4">
                                    <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20"><Briefcase size={20} /></div>
                                    <div>
                                        <Text variant="caption" weight="bold" className="uppercase text-blue-500 tracking-widest">{ticket.desarrollo_id}</Text>
                                        <Text variant="body2" weight="bold" color="text-primary">Proyecto TI Vinculado</Text>
                                    </div>
                                </div>
                            )}
                            {isLinking && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {developments.map(dev => (
                                        <Button key={dev.id} variant="custom" onClick={() => { onLinkDevelopment(dev.id); setIsLinking(false); }} className={`flex flex-col p-4 text-left rounded-2xl border-2 transition-all h-auto items-start ${ticket.desarrollo_id === dev.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 bg-white dark:bg-slate-900 shadow-sm'}`}>
                                            <Text variant="caption" weight="bold" className="uppercase text-blue-500 mb-1">{dev.id}</Text>
                                            <Text variant="caption" weight="bold" color="text-primary" className="line-clamp-1">{dev.nombre || dev.name}</Text>
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </section>
    );
};

export default AnalystActionTabs;


