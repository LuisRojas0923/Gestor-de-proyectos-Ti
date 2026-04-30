import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, X, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Text, Title, Textarea } from '../../../components/atoms';
import { ChatHistoryItem } from '../../../services/IAService';
import { useNotifications } from '../../../components/notifications/NotificationsContext';
import { API_CONFIG } from '../../../config/api';

interface AIChatAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onTicketCreated?: (ticketId: string) => void;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ isOpen, onClose, onTicketCreated }) => {
    const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
    const [ticketInfo, setTicketInfo] = useState<{
        asunto?: string, 
        prioridad?: string, 
        categoria?: string,
        impacto?: string,
        cuando?: string,
        justificacion?: string
    } | null>(null);
    const { addNotification } = useNotifications();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Saludo inicial
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                { 
                    role: 'assistant', 
                    content: '¡Hola! Soy tu asistente inteligente de Refridcol. Cuéntame qué problema tienes o qué necesitas, y yo me encargaré de crear el ticket por ti.' 
                }
            ]);
        }
    }, [isOpen, messages.length]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (contentOverride?: string) => {
        // Combinar texto del input con el del botón si ambos existen
        let messageText = '';
        
        if (contentOverride && input.trim()) {
            messageText = `${input.trim()} (Categoría: ${contentOverride})`;
        } else {
            messageText = contentOverride || input;
        }

        if (!messageText.trim() || isLoading || isSuccess) return;

        // Limpiar input siempre al enviar
        setInput('');
        
        const currentMessages = [...messages, { role: 'user' as const, content: messageText }];
        setMessages(currentMessages);
        setIsLoading(true);

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_CONFIG.BASE_URL}/ia/chat-ticket-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    mensaje: messageText,
                    historial: messages.map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                })
            });

            if (!response.ok) throw new Error('Error al conectar con la IA');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    accumulated += chunk;
                    
                    // Detectar ID de ticket al final del stream
                    if (accumulated.includes('__TICKET_ID__:')) {
                        const parts = accumulated.split('__TICKET_ID__:');
                        const ticketId = parts[1].trim();
                        const chatTextRaw = parts[0].trim();
                        
                        // Extraer JSON de datos si existe
                        let info = {};
                        try {
                            const jsonMatch = chatTextRaw.match(/\{"ticket_data":\s*(\{.*?\})\}/);
                            if (jsonMatch) {
                                const data = JSON.parse(jsonMatch[1]);
                                info = {
                                    asunto: data.asunto,
                                    prioridad: data.prioridad,
                                    categoria: data.categoria_id,
                                    impacto: data.impacto,
                                    cuando: data.cuando,
                                    justificacion: data.justificacion
                                };
                            }
                        } catch (e) { console.error("Error parsing JSON for card", e); }

                        const chatTextClean = chatTextRaw.replace(/\{"ticket_data":\s*\{.*?\}\}/g, '').trim();

                        setMessages(prev => {
                            const newMessages = [...prev];
                            newMessages[newMessages.length - 1] = { role: 'assistant', content: chatTextClean };
                            return newMessages;
                        });
                        
                        setTicketInfo(info);
                        setCreatedTicketId(ticketId);
                        setIsSuccess(true);
                        addNotification('success', `Ticket ${ticketId} creado exitosamente`);
                        if (onTicketCreated) onTicketCreated(ticketId);
                        break; 
                    }

                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            const newMessages = [...prev];
                            newMessages[newMessages.length - 1] = { ...lastMsg, content: accumulated };
                            return newMessages;
                        }
                        return prev;
                    });
                }

                // Check for ticket creation in the final JSON if present
                try {
                    const jsonMatch = accumulated.match(/\{"ticket_data":\s*(\{.*?\})\}/);
                    if (jsonMatch) {
                        const ticketData = JSON.parse(jsonMatch[1]);
                        // Aquí se podría disparar la creación real del ticket si el backend no lo hizo ya
                        // Por ahora asumimos que el backend retorna el ID si lo crea.
                    }
                } catch (e) {
                    console.error("Error parsing final JSON", e);
                }
            }
        } catch (error: any) {
            addNotification('error', error.message || 'Error al conectar con la IA');
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { 
                    role: 'assistant', 
                    content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.' 
                };
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessageContent = (content: string) => {
        // Pattern antiguo: [BOTON: Opcion1, Opcion2]
        const oldButtonRegex = /\[BOTON:\s*([^\]]+)\]/g;
        // Pattern nuevo: <ActionButton type="..." label="..." />
        const actionButtonRegex = /<ActionButton\s+[^>]*label="([^"]+)"[^>]*\/>/g;

        const oldMatches = Array.from(content.matchAll(oldButtonRegex));
        const actionMatches = Array.from(content.matchAll(actionButtonRegex));
        
        // Limpiamos el texto de etiquetas técnicas y JSON
        let cleanText = content
            .replace(oldButtonRegex, '')
            .replace(actionButtonRegex, '')
            .replace(/\{"ticket_data":\s*\{.*?\}\}/g, '')
            .trim();

        const buttons: string[] = [];
        
        // Procesar antiguos
        oldMatches.forEach(match => {
            const btnLabels = match[1].split(',').map(s => s.trim());
            buttons.push(...btnLabels);
        });

        // Procesar nuevos
        actionMatches.forEach(match => {
            buttons.push(match[1]);
        });

        return (
            <div className="space-y-3">
                {cleanText.split('\n').map((line, i) => (
                    <Text key={i} className="mb-1 last:mb-0 block text-base font-normal">
                        {line}
                    </Text>
                ))}
                
                {buttons.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        {buttons.map((label, idx) => (
                            <Button
                                key={idx}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSend(label)}
                                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 transition-all active:scale-95"
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[var(--color-surface)] w-full max-w-2xl h-[80vh] rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col relative"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-900 to-blue-900 p-6 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <Bot className="text-emerald-400" size={28} />
                        </div>
                        <div>
                            <Title variant="h4" color="white" className="leading-tight">Asistente IA</Title>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <Text variant="caption" className="text-emerald-100/70">En línea | Generación de Tickets</Text>
                            </div>
                        </div>
                    </div>
                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white border-none"
                    >
                        <X size={24} />
                    </Button>
                </div>

                {/* Messages Area */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--color-background)]/50"
                >
                    {messages.map((msg, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`p-2 rounded-xl shrink-0 h-fit ${msg.role === 'user' ? 'bg-blue-500' : 'bg-emerald-500'} text-white shadow-lg`}>
                                    {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                                </div>
                                <div className={`
                                    p-4 rounded-2xl shadow-sm leading-relaxed
                                    ${msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none text-slate-700 dark:text-slate-200'}
                                `}>
                                    {renderMessageContent(msg.content)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    
                    {isLoading && messages[messages.length-1]?.content === '' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                <Loader2 className="animate-spin text-emerald-500" size={18} />
                                <Text variant="body2" className="italic opacity-60">IA está procesando...</Text>
                            </div>
                        </motion.div>
                    )}

                    {isSuccess && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-[2rem] text-center space-y-4 my-4"
                        >
                            <div className="mx-auto w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <CheckCircle2 size={32} />
                            </div>
                            <div>
                                <Title variant="h4" className="text-emerald-800 dark:text-emerald-400">¡Ticket Creado!</Title>
                                <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-left space-y-2">
                                    <div className="flex justify-between">
                                        <Text variant="caption" className="opacity-50">Ticket ID:</Text>
                                        <Text variant="body2" weight="bold" className="text-emerald-600">{createdTicketId}</Text>
                                    </div>
                                    <div className="border-t border-emerald-100/50 dark:border-emerald-800/20 pt-2">
                                        <Text variant="caption" className="opacity-50 block">Asunto:</Text>
                                        <Text variant="body2" weight="medium">{ticketInfo?.asunto || 'N/A'}</Text>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-t border-emerald-100/50 dark:border-emerald-800/20 pt-2">
                                        <div>
                                            <Text variant="caption" className="opacity-50 block">Categoría:</Text>
                                            <Text variant="body2" weight="medium" className="capitalize">{ticketInfo?.categoria?.replace(/_/g, ' ') || 'N/A'}</Text>
                                        </div>
                                        <div>
                                            <Text variant="caption" className="opacity-50 block">Prioridad:</Text>
                                            <Text variant="body2" weight="medium" className={`capitalize ${
                                                ticketInfo?.prioridad?.toLowerCase() === 'alta' ? 'text-red-500' : 
                                                ticketInfo?.prioridad?.toLowerCase() === 'media' ? 'text-orange-500' : 'text-emerald-500'
                                            }`}>{ticketInfo?.prioridad || 'N/A'}</Text>
                                        </div>
                                    </div>
                                    {(ticketInfo?.impacto || ticketInfo?.cuando) && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-emerald-100/50 dark:border-emerald-800/20 pt-2">
                                            <div>
                                                <Text variant="caption" className="opacity-50 block">Impacto:</Text>
                                                <Text variant="body2" className="text-xs">{ticketInfo?.impacto || 'N/A'}</Text>
                                            </div>
                                            <div>
                                                <Text variant="caption" className="opacity-50 block">Ocurrió:</Text>
                                                <Text variant="body2" className="text-xs">{ticketInfo?.cuando || 'N/A'}</Text>
                                            </div>
                                        </div>
                                    )}
                                    {ticketInfo?.justificacion && (
                                        <div className="border-t border-emerald-100/50 dark:border-emerald-800/20 pt-2">
                                            <Text variant="caption" className="opacity-50 block">Justificación:</Text>
                                            <Text variant="body2" className="text-xs italic leading-tight">{ticketInfo?.justificacion}</Text>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button 
                                variant="primary" 
                                className="bg-emerald-600 hover:bg-emerald-700 border-none"
                                onClick={onClose}
                            >
                                Entendido
                            </Button>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[var(--color-surface)] border-t border-[var(--color-border)] shrink-0">
                    {!isSuccess ? (
                        <div className="relative group">
                            <Textarea 
                                placeholder="Escribe tu mensaje aquí... (Ej: No puedo abrir mi correo)"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="pr-16 min-h-[80px] rounded-[1.5rem] focus:ring-emerald-500/20 border-slate-200 dark:border-slate-700 text-[12px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <div className="absolute right-3 bottom-3">
                                <Button 
                                    variant="primary"
                                    size="md"
                                    className="rounded-xl h-10 w-10 p-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                >
                                    <Send size={18} />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Text variant="caption" className="opacity-50 italic">Conversación finalizada</Text>
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-center gap-2 opacity-40">
                        <Sparkles size={12} />
                        <Text variant="caption" className="text-[10px] uppercase tracking-[0.2em]">Powered by Nvidia NIM & Refridcol AI</Text>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AIChatAssistant;
