import React, { useState, useRef, useEffect } from 'react';
import { Text, Button, Textarea } from '../../../components/atoms';
import { TicketComment } from '../../../hooks/useTicketDetail';
import { Send, Globe, User as UserIcon, Clock } from 'lucide-react';

interface TicketChatSectionProps {
    comments: TicketComment[];
    onSendComment: (text: string, isInternal: boolean) => Promise<void>;
    currentUserId?: string;
    isAnalyst?: boolean;
    isSaving?: boolean;
}

const TicketChatSection: React.FC<TicketChatSectionProps> = ({
    comments,
    onSendComment,
    currentUserId,
    isAnalyst = false,
    isSaving = false,
}) => {
    const [message, setMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSend = async () => {
        if (!message.trim() || isSaving) return;
        await onSendComment(message, false);
        setMessage('');
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-CO', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
        });
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-transparent animate-in fade-in duration-500">
            {/* Mensaje Informativo sobre el chat */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center gap-3 shrink-0">
                <div className="p-2 bg-blue-500 rounded-lg text-white">
                    {isAnalyst ? <Globe size={14} /> : <UserIcon size={14} />}
                </div>
                <Text variant="caption" className="text-blue-700 dark:text-blue-300">
                    {isAnalyst 
                        ? "Tus mensajes son públicos y visibles para el usuario solicitante."
                        : "Chat directo con el analista asignado. Tus mensajes son públicos."
                    }
                </Text>
            </div>

            {/* Área de Mensajes con Scroll */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 custom-scrollbar min-h-0"
            >
                {comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
                        <Globe size={48} className="mb-2 text-slate-400" />
                        <Text variant="body2" className="italic">No hay mensajes en este ticket aún.</Text>
                    </div>
                ) : (
                    comments.filter(c => !c.es_interno).map((comment) => {
                        const isMe = currentUserId && comment.usuario_id === currentUserId;
                        
                        return (
                            <div 
                                key={comment.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}
                            >
                                {/* Burbuja de Mensaje */}
                                <div className={`
                                    max-w-[75%] p-3 px-4 rounded-2xl shadow-sm transition-all hover:shadow-md
                                    ${isMe 
                                        ? 'bg-emerald-500 text-white rounded-tr-none border-emerald-400' 
                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                    }
                                `}>
                                    <div className="flex items-center justify-between mb-1 gap-4">
                                        <div className="flex items-center gap-2">
                                            {!isMe && <UserIcon size={12} className="text-blue-500" />}
                                            <Text 
                                                variant="caption" 
                                                weight="bold" 
                                                className={`uppercase tracking-widest text-[9px] ${isMe ? 'text-emerald-100' : 'text-blue-600 dark:text-blue-400'}`}
                                            >
                                                {isMe ? 'Tú' : (comment.nombre_usuario || 'Sistema')}
                                            </Text>
                                        </div>
                                    </div>
                                    <Text 
                                        variant="body2" 
                                        className={`whitespace-pre-line leading-relaxed text-[13px] ${isMe ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        {comment.comentario}
                                    </Text>
                                    
                                    <div className={`flex items-center gap-1 mt-1 justify-end opacity-50 ${isMe ? 'text-emerald-50' : ''}`}>
                                        <Clock size={8} />
                                        <Text variant="caption" className="text-[8px]">{formatDate(comment.creado_en)}</Text>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input de Texto */}
            <div className="shrink-0 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg mt-auto">
                <div className="flex flex-col gap-3">
                    <Textarea 
                        placeholder="Escribe tu mensaje aquí..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <div className="flex justify-between items-center">
                        <Text variant="caption" className="opacity-40 italic">Shift + Enter para nueva línea</Text>
                        <Button 
                            variant="primary" 
                            size="md" 
                            onClick={handleSend}
                            disabled={!message.trim() || isSaving}
                            loading={isSaving}
                            className="px-6 rounded-xl shadow-blue-500/20 shadow-lg"
                            icon={Send}
                        >
                            Enviar Mensaje
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketChatSection;
