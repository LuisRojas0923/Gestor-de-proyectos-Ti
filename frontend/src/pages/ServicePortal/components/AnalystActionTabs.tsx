import React, { useState } from 'react';
import { Briefcase, Plus, Settings, ShieldCheck, ClipboardList } from 'lucide-react';
import { Title, Text, Button, Select, Textarea, Badge } from '../../../components/atoms';
import { useApi } from '../../../hooks/useApi';
import { Ticket, TicketAttachment } from '../../../hooks/useTicketDetail';
import { FileText, Download } from 'lucide-react';

interface AnalystActionTabsProps {
    ticket: Ticket;
    developments: any[];
    onLinkDevelopment: (devId: string) => void;
    // Props para el formulario
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
        <section className="col-span-12 lg:col-span-7 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-4 overflow-hidden transition-colors">
            {/* Detalle Ticket Principal */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-4 shrink-0 shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                    <Title variant="h5" weight="bold" color="text-primary">{ticket.asunto}</Title>
                    <Badge
                        variant={ticket.prioridad === 'Alta' || ticket.prioridad === 'Crítica' ? 'error' : 'info'}
                        size="sm"
                        className="uppercase tracking-widest"
                    >
                        {ticket.prioridad || 'Media'}
                    </Badge>
                </div>
                <div className="border-l-2 border-blue-500 pl-4 py-1">
                    <Text variant="body2" color="text-secondary" className="italic leading-relaxed">
                        "{ticket.descripcion}"
                    </Text>
                </div>
            </div>

            {/* Tabs de Acción */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex gap-1 mb-0 z-10">
                    <TabButton
                        active={activeTab === 'diagnostico'}
                        onClick={() => setActiveTab('diagnostico')}
                        label="Diagnóstico"
                    />
                    <TabButton
                        active={activeTab === 'archivos'}
                        onClick={() => setActiveTab('archivos')}
                        label={`Archivos (${attachments.length})`}
                    />
                    <TabButton
                        active={activeTab === 'vinculos'}
                        onClick={() => setActiveTab('vinculos')}
                        label="Vínculos"
                    />
                </div>

                <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-b-2xl rounded-tr-2xl p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm transition-all">
                    {activeTab === 'diagnostico' && (
                        <>
                            {ticket.solicitud_activo && (
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                                        <Plus size={16} />
                                        <Text variant="caption" weight="bold" className="uppercase tracking-widest">Detalles del Activo Solicitado</Text>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex justify-between items-start border-b border-blue-100/50 dark:border-blue-800/50 pb-2">
                                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-60">Producto</Text>
                                            <Text variant="body2" weight="bold" className="text-blue-800 dark:text-blue-200">{ticket.solicitud_activo.item_solicitado}</Text>
                                        </div>
                                        {ticket.solicitud_activo.especificaciones && (
                                            <div className="flex flex-col gap-1 pt-1">
                                                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-60">Especificaciones</Text>
                                                <Text variant="body2" className="text-slate-600 dark:text-slate-300 italic whitespace-pre-line bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                    {ticket.solicitud_activo.especificaciones}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN DE DATOS DINÁMICOS (datos_extra) - V2 Consola */}
                            {ticket.datos_extra && Object.entries(ticket.datos_extra).some(([k]) => !excludedKeys.includes(k)) && (
                                <div className="bg-slate-100/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-500 shadow-inner">
                                    <div className="flex items-center gap-2 mb-4 text-slate-600 dark:text-slate-400">
                                        <Settings size={16} />
                                        <Text variant="caption" weight="bold" className="uppercase tracking-widest leading-none">Información del Formulario</Text>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                        {Object.entries(ticket.datos_extra).map(([key, value]) => {
                                            const dynamicExcluded = [...excludedKeys];

                                            // Si no hay objeto de activo vinculado, permitimos que hardware y especificaciones se vean aquí
                                            if (!ticket.solicitud_activo) {
                                                ['especificaciones', 'hardware_solicitado'].forEach(k => {
                                                    const idx = dynamicExcluded.indexOf(k);
                                                    if (idx > -1) dynamicExcluded.splice(idx, 1);
                                                });
                                            }

                                            if (dynamicExcluded.includes(key) || !value) return null;

                                            // Traducción amable para llaves específicas
                                            let displayLabel = formatKey(key);
                                            if (key === 'especificaciones' && ticket.categoria_id === 'compra_licencias') {
                                                displayLabel = 'Producto / Licencia';
                                            }

                                            return (
                                                <div key={key} className="flex flex-col gap-0.5 border-b border-slate-200/50 dark:border-slate-700/50 pb-1.5 last:border-0">
                                                    <Text variant="caption" weight="bold" className="text-slate-500 dark:text-slate-500 uppercase text-[9px] tracking-wider">{displayLabel}</Text>
                                                    <Text variant="body2" color="text-primary" className="font-semibold text-[13px]">
                                                        {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                                                    </Text>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {ticket.solicitud_desarrollo && (
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                                        <ClipboardList size={16} />
                                        <Text variant="caption" weight="bold" className="uppercase tracking-widest leading-none">Detalles del Desarrollo</Text>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-60 block mb-1">Necesidad Técnica / Que necesita</Text>
                                            <Text variant="body2" className="text-emerald-900 dark:text-emerald-100 italic bg-white/40 dark:bg-black/20 p-3 rounded-lg border border-emerald-100/50">
                                                {ticket.solicitud_desarrollo.que_necesita}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {ticket.control_cambios && (
                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-800 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
                                        <ShieldCheck size={16} />
                                        <Text variant="caption" weight="bold" className="uppercase tracking-widest leading-none">Control de Cambios</Text>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-60 text-[10px]">Acción</Text>
                                            <Text variant="body2" weight="bold" className="text-amber-900 dark:text-amber-100">{ticket.control_cambios.accion_requerida}</Text>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-60 text-[10px]">Impacto</Text>
                                            <Text variant="body2" weight="bold" className="text-amber-900 dark:text-amber-100">{ticket.control_cambios.impacto_operativo}</Text>
                                        </div>
                                        <div className="col-span-2 pt-2 border-t border-amber-100/50 dark:border-amber-800/50">
                                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase opacity-60 text-[10px] block mb-1">Justificación Técnica</Text>
                                            <Text variant="body2" className="italic bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-amber-100/50">
                                                {ticket.control_cambios.justificacion}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Select
                                        label="Cambiar Estado"
                                        value={formData.estado || ticket.estado}
                                        onChange={(e) => onFieldChange('estado', e.target.value)}
                                        options={[
                                            { value: 'Asignado', label: 'Asignado' },
                                            { value: 'En Proceso', label: 'En Proceso' },
                                            { value: 'Pendiente Info', label: 'Pendiente Info' },
                                            { value: 'Escalado', label: 'Escalado' },
                                            { value: 'Resuelto', label: 'Resuelto' },
                                            { value: 'Cerrado', label: 'Cerrado' },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Select
                                        label="Causa de la Novedad"
                                        value={formData.causa_novedad || ticket.causa_novedad || ''}
                                        onChange={(e) => onFieldChange('causa_novedad', e.target.value)}
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
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <Select
                                        label="Asignar a"
                                        value={formData.asignado_a || ticket.asignado_a || ''}
                                        onChange={(e) => onFieldChange('asignado_a', e.target.value)}
                                        options={[
                                            { value: '', label: 'Sin Asignar' },
                                            ...analistas
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col space-y-1.5">
                                <Textarea
                                    label="Notas Técnicas Internas"
                                    placeholder="Escribe el diagnóstico técnico para el equipo..."
                                    value={formData.diagnostico || ''}
                                    onChange={(e) => onFieldChange('diagnostico', e.target.value)}
                                    rows={4}
                                    className="flex-1"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Textarea
                                    label="Respuesta al Solicitante"
                                    rows={2}
                                    placeholder="Este mensaje será enviado al usuario tras resolver..."
                                    value={formData.resolucion || ''}
                                    onChange={(e) => onFieldChange('resolucion', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'vinculos' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Text variant="body2" weight="bold" color="text-primary">Vínculo a Desarrollo</Text>
                                    <Text variant="caption" color="text-secondary" className="opacity-60">Asocia este ticket a un proyecto o módulo de desarrollo pasivo.</Text>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={isLinking ? undefined : Plus}
                                    onClick={() => setIsLinking(!isLinking)}
                                    className="text-[10px] font-black uppercase tracking-widest"
                                >
                                    {isLinking ? 'Cerrar' : ticket.desarrollo_id ? 'Cambiar Vínculo' : 'Vincular Proyecto'}
                                </Button>
                            </div>

                            {ticket.desarrollo_id && !isLinking && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-4">
                                    <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <Text variant="caption" weight="bold" className="uppercase text-blue-500 tracking-widest">{ticket.desarrollo_id}</Text>
                                        <Text variant="body2" weight="bold" color="text-primary">Proyecto TI Vinculado</Text>
                                    </div>
                                </div>
                            )}

                            {isLinking && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                    {developments.length > 0 ? developments.map(dev => (
                                        <Button
                                            key={dev.id}
                                            variant="custom"
                                            onClick={() => {
                                                onLinkDevelopment(dev.id);
                                                setIsLinking(false);
                                            }}
                                            className={`flex flex-col p-4 text-left rounded-2xl border-2 transition-all h-auto items-start ${ticket.desarrollo_id === dev.id
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md'
                                                : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 bg-white dark:bg-slate-900 shadow-sm'
                                                }`}
                                        >
                                            <Text variant="caption" weight="bold" className="uppercase text-blue-500 mb-1">{dev.id}</Text>
                                            <Text variant="caption" weight="bold" color="text-primary" className="line-clamp-1 text-left">{dev.nombre || dev.name}</Text>
                                        </Button>
                                    )) : (
                                        <div className="col-span-2 p-10 text-center opacity-40 italic">No hay desarrollos disponibles.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'archivos' && (
                        <div className="space-y-4 h-full animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-slate-400">
                                <Plus size={16} />
                                <Text variant="caption" weight="bold" className="uppercase tracking-widest">Documentos del Ticket</Text>
                            </div>

                            {attachments.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {attachments.map((file) => (
                                        <div key={file.id}
                                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                                        >
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDownloadAttachment?.(file.id, file.nombre_archivo)}
                                                className="!p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 rounded-xl transition-colors"
                                                icon={Download}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 mb-4 opacity-50">
                                        <FileText size={40} />
                                    </div>
                                    <Text variant="body2" color="text-secondary" className="italic opacity-60">No hay documentos adjuntos en esta solicitud.</Text>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
    <Button
        variant="custom"
        onClick={onClick}
        className={`px-4 py-2 uppercase tracking-wider transition-all rounded-t-lg border-t-2 ${active
            ? 'bg-[var(--color-surface)] dark:bg-slate-800 border-blue-500 dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'
            : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent'
            }`}
    >
        <Text variant="caption" weight="bold" color="inherit">{label}</Text>
    </Button>
);

export default AnalystActionTabs;
