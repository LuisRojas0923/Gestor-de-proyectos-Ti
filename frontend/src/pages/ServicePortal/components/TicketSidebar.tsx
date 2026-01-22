import React from 'react';
import { User, Briefcase, History as HistoryIcon, MapPin, Link as LinkIcon, FileText, Plus } from 'lucide-react';
import { Title, Text } from '../../../components/atoms';
import { Ticket, TicketHistory, TicketAttachment } from '../../../hooks/useTicketDetail';

interface TicketSidebarProps {
    ticket: Ticket;
    history: TicketHistory[];
    attachments: TicketAttachment[];
    onDownloadAttachment: (id: number, filename: string) => void;
}

const TicketSidebar: React.FC<TicketSidebarProps> = ({ ticket, history, attachments, onDownloadAttachment }) => {
    return (
        <div className="space-y-8">
            {/* Información del Solicitante */}
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <User size={20} className="text-[var(--color-text-secondary)]" />
                        <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">Solicitante</Text>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center space-x-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-neutral-800 dark:to-neutral-700 rounded-[1.5rem] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-2xl shadow-inner">
                            {ticket.nombre_creador ? ticket.nombre_creador[0] : 'U'}
                        </div>
                        <div>
                            <Title variant="h5" weight="bold" color="text-primary" className="leading-tight">{ticket.nombre_creador}</Title>
                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter mt-1">ID: {ticket.creador_id}</Text>
                        </div>
                    </div>
                    <div className="space-y-4 pt-6 border-t border-neutral-50 dark:border-neutral-800">
                        <InfoItem icon={<Briefcase size={16} />} label="Área" value={ticket.area_creador} />
                        <InfoItem icon={<HistoryIcon size={16} />} label="Cargo" value={ticket.cargo_creador || 'No especificado'} />
                        <InfoItem icon={<MapPin size={16} />} label="Sede" value={ticket.sede_creador || 'No especificado'} />
                        <div className="pt-2">
                            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40 mb-1">Contacto</Text>
                            <Text variant="body2" weight="bold" color="primary" className="truncate">{ticket.correo_creador}</Text>
                        </div>
                    </div>
                </div>
            </div>

            {/* Galería de Adjuntos */}
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-6">
                <div className="flex items-center space-x-3">
                    <LinkIcon size={20} className="text-blue-500" />
                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">Documentación Adjunta</Text>
                </div>
                <div className="space-y-4">
                    {attachments.length > 0 ? (
                        attachments.map((file) => (
                            <div
                                key={file.id}
                                onClick={() => onDownloadAttachment(file.id, file.nombre_archivo)}
                                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700 rounded-2xl cursor-pointer hover:border-blue-500 transition-all group"
                            >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <Text variant="body2" weight="bold" className="truncate block">{file.nombre_archivo}</Text>
                                        <Text variant="caption" color="text-secondary" className="opacity-60">{new Date(file.creado_en).toLocaleDateString()}</Text>
                                    </div>
                                </div>
                                <Plus size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))
                    ) : (
                        <div className="p-6 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-3xl text-center">
                            <Text variant="caption" className="text-neutral-400 italic">No hay archivos adjuntos</Text>
                        </div>
                    )}
                </div>
            </div>

            {/* Registro de Actividad */}
            <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-8 overflow-hidden relative">
                <div className="flex items-center space-x-3 relative z-10">
                    <HistoryIcon size={20} className="text-blue-400" />
                    <Text variant="caption" weight="bold" color="primary" className="text-blue-300 uppercase tracking-widest">Actividad Reciente</Text>
                </div>
                <div className="space-y-8 relative z-10">
                    {history.length > 0 ? (
                        history.map((item, idx) => (
                            <div key={item.id} className="flex items-start space-x-4 border-l-2 border-neutral-800 pl-6 relative">
                                <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${idx === 0 ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-neutral-600'}`}></div>
                                <div className="space-y-1">
                                    <Text variant="body2" weight="bold" color="white">{item.accion}</Text>
                                    <Text variant="caption" color="text-secondary" className="block leading-tight">{item.detalle}</Text>
                                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter opacity-50">{new Date(item.creado_en).toLocaleString()}</Text>
                                </div>
                            </div>
                        ))
                    ) : (
                        <Text variant="caption" color="inherit" className="text-neutral-500 italic">Sin actividad registrada.</Text>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between text-sm group">
        <Text variant="caption" weight="bold" color="text-secondary" className="group-hover:text-[var(--color-primary)] flex items-center transition-colors">
            {icon} <Text as="span" className="ml-3 uppercase tracking-wider">{label}</Text>
        </Text>
        <Text variant="body2" weight="bold" color="text-primary">{value}</Text>
    </div>
);

export default TicketSidebar;
