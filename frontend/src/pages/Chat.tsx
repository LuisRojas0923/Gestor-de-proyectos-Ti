import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Paperclip,
  Bot,
  User,
  Sparkles,
  FileText,
  Mic,
  Settings,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { API_CONFIG } from '../config/api';
import { Spinner, Button, Input, Text, Title, Icon } from '../components/atoms';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type: 'text' | 'image' | 'file';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    imageUrl?: string;
  };
}

const Chat: React.FC = () => {
  useTranslation();
  const { state } = useAppContext();
  const { darkMode } = state;
  const { loading: apiLoading } = useApi();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: '¡Hola! Soy tu asistente de IA para gestión de proyectos. Puedo ayudarte con validaciones automáticas, generación de reportes, análisis de requerimientos y mucho más. ¿En qué puedo asistirte hoy?',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      type: 'text',
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: 'Validar FD-FT-284', action: 'validate-requirement' },
    { label: 'Generar reporte semanal', action: 'generate-report' },
    { label: 'Analizar controles pendientes', action: 'analyze-controls' },
    { label: 'Revisar SLA críticos', action: 'review-sla' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMessageId,
      content: '',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      type: 'text',
    }]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/ia/chat-ticket-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        })
      });

      if (!response.ok) throw new Error('Error en el servidor');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, content: accumulated } : msg
          ));
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId ? { ...msg, content: 'Lo siento, hubo un error al procesar tu solicitud.' } : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `He adjuntado el archivo: ${file.name}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'file',
      metadata: {
        fileName: file.name,
        fileSize: file.size,
      }
    };

    setMessages(prev => [...prev, fileMessage]);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.type === 'file') {
      return (
        <div className="flex items-center space-x-2">
          <Icon name={FileText} color="inherit" size="sm" />
          <div>
            <Text variant="body2" weight="medium" color="inherit">{message.metadata?.fileName}</Text>
            <Text variant="caption" color="inherit" className="opacity-70">
              {(message.metadata?.fileSize! / 1024).toFixed(1)} KB
            </Text>
          </div>
        </div>
      );
    }

    // Pattern for buttons: [BOTON: Label]
    const buttonRegex = /\[BOTON:\s*([^\]]+)\]/g;
    const buttons: string[] = [];
    let match;
    while ((match = buttonRegex.exec(message.content)) !== null) {
      buttons.push(match[1]);
    }

    const cleanText = message.content.replace(buttonRegex, '').trim();

    return (
      <div className="space-y-3">
        <Text variant="body2" color="inherit" className="whitespace-pre-wrap">
          {cleanText}
        </Text>
        
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {buttons.map((btnLabel, idx) => (
              <Button
                key={idx}
                variant="secondary"
                size="sm"
                onClick={() => handleSendMessage(btnLabel)}
                className={`rounded-xl border shadow-sm transition-all active:scale-95 ${
                  darkMode 
                    ? 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600 text-primary-400' 
                    : 'bg-neutral-50 hover:bg-white border-neutral-200 text-primary-600'
                } font-medium`}
              >
                {btnLabel}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg">
            <Icon name={Bot} color="white" size="md" />
          </div>
          <div>
            <Title variant="h4" weight="bold">Asistente IA</Title>
            <Text variant="body2" color="text-secondary">Gestión inteligente de proyectos</Text>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={Settings} className="text-neutral-500 hover:text-primary-500">{""}</Button>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="secondary"
              size="sm"
              onClick={() => handleSendMessage(action.label)}
              className="rounded-full shadow-sm"
              icon={Sparkles}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} space-x-2`}>
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                message.sender === 'user' ? 'bg-primary-600 ml-2' : 'bg-gradient-to-br from-primary-600 to-primary-400 mr-2'
              }`}>
                <Icon name={message.sender === 'user' ? User : Bot} color="white" size="sm" />
              </div>

              <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                message.sender === 'user'
                  ? 'bg-primary-600 text-white'
                  : `${darkMode ? 'bg-neutral-800 border border-neutral-700 text-white' : 'bg-white border border-neutral-200 text-neutral-900'}`
              }`}>
                {renderMessageContent(message)}
                <Text variant="caption" color="inherit" className="mt-2 opacity-60 block text-right">
                  {formatTimestamp(message.timestamp)}
                </Text>
              </div>
            </div>
          </div>
        ))}
        {(isStreaming || apiLoading) && (
          <div className="flex justify-start">
            <div className="flex space-x-2 mr-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center shadow-md">
                <Icon name={Bot} color="white" size="sm" />
              </div>
              <div className={`px-5 py-3 rounded-2xl ${darkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-neutral-200'}`}>
                <Spinner size="sm" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t ${darkMode ? 'border-neutral-700' : 'border-neutral-200'} bg-white dark:bg-neutral-800`}>
        <div className="max-w-4xl mx-auto flex items-center space-x-2">
          <div className={`flex-1 flex items-center space-x-2 px-4 py-2 rounded-2xl border transition-all ${
            darkMode ? 'bg-neutral-900 border-neutral-700 focus-within:border-primary-500' : 'bg-neutral-50 border-neutral-200 focus-within:border-primary-500 shadow-inner'
          }`}>
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 !bg-transparent !border-none !shadow-none focus-within:!ring-0"
              disabled={isStreaming}
            />

            <Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <Button variant="ghost" size="sm" icon={Paperclip} onClick={() => fileInputRef.current?.click()} className="text-neutral-400 hover:text-primary-500" />
            <Button variant="ghost" size="sm" icon={Mic} onClick={toggleRecording} className={`${isRecording ? 'bg-red-500 text-white' : 'text-neutral-400 hover:text-primary-500'}`} />
          </div>

          <Button
            variant="primary"
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isStreaming}
            icon={Send}
            className="h-12 w-12 rounded-2xl shadow-lg shadow-primary-500/20"
          >
            {""}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
