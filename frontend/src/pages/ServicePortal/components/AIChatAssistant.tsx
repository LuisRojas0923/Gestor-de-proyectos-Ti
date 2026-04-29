import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, X, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Button, Text, Title, Textarea } from '../../../components/atoms';
import { IAService, ChatHistoryItem, AIChatResponse } from '../../../services/IAService';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

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
    }, [isOpen]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || isSuccess) return;

        const userMessage = input.trim();
        setInput('');
        
        const newMessages: ChatHistoryItem[] = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response: AIChatResponse = await IAService.chatTicket(userMessage, messages);
            
            setMessages(prev => [...prev, { role: 'assistant', content: response.respuesta }]);
            
            if (response.ticket_id) {
                setIsSuccess(true);
                setCreatedTicketId(response.ticket_id);
                addNotification('success', `Ticket ${response.ticket_id} creado exitosamente via IA`);
                if (onTicketCreated) onTicketCreated(response.ticket_id);
            }
        } catch (error: any) {
            addNotification('error', error.message || 'Error al conectar con la IA');
        } finally {
            setIsLoading(false);
        }
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
                                    p-4 rounded-2xl shadow-sm text-sm leading-relaxed
                                    ${msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-tr-none' 
                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none text-slate-700 dark:text-slate-200'}
                                `}>
                                    {msg.content.split('\n').map((line, j) => (
                                        <Text key={j} className={line.startsWith('{') ? 'hidden' : 'mb-2 last:mb-0 block'}>
                                            {line}
                                        </Text>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    
                    {isLoading && (
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
                                <Text variant="body1" className="text-emerald-700 dark:text-emerald-300">
                                    Tu solicitud ha sido registrada con el ID: <strong className="text-xl block mt-2">{createdTicketId}</strong>
                                </Text>
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
                                className="pr-16 min-h-[80px] rounded-[1.5rem] focus:ring-emerald-500/20 border-slate-200 dark:border-slate-700"
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
                                    onClick={handleSend}
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
