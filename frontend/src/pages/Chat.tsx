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
  const { post, loading } = useApi();

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: 'Validar FD-FT-284', action: 'validate-requirement' },
    { label: 'Generar reporte semanal', action: 'generate-report' },
    { label: 'Análizar controles pendientes', action: 'analyze-controls' },
    { label: 'Revisar SLA críticos', action: 'review-sla' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, type: 'text' | 'action' = 'text') => {
    if (!content.trim() && type === 'text') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Simulate AI response
    try {
      // Ignorar warning de respuesta no utilizada
      await post('/chat/message', {
        message: content,
        type,
        context: 'project-management'
      });

      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: getAIResponse(content, type),
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'text',
        };
        setMessages(prev => [...prev, aiMessage]);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getAIResponse = (content: string, type: string): string => {
    if (type === 'validate-requirement') {
      return 'He iniciado la validación del documento FD-FT-284. Análisis completado:\n\n✅ Estructura conforme\n✅ Campos obligatorios presentes\n⚠️ Falta especificación en sección 3.2\n\n¿Deseas que genere un correo automático con los hallazgos?';
    }

    if (type === 'generate-report') {
      return 'Generando reporte semanal...\n\n📊 **Resumen Semanal**\n- Requerimientos procesados: 45\n- Tiempo promedio de ciclo: 2.3 días\n- SLA cumplido: 89%\n- Controles ejecutados: 142\n\n¿Necesitas el desglose detallado por analista?';
    }

    if (content.toLowerCase().includes('control')) {
      return 'Los controles C003-GT, C021-GT, C004-GT y C027-GT están configurados. ¿Qué control específico necesitas revisar?';
    }

    return 'Entiendo tu consulta sobre gestión de proyectos. ¿Podrías proporcionar más detalles para poder asistirte mejor?';
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
    // Implement voice recording logic
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg">
            <Icon name={Bot} color="white" size="md" />
          </div>
          <div>
            <Title variant="h4" weight="bold">
              Asistente IA
            </Title>
            <Text variant="body2" color="text-secondary">
              Gestión inteligente de proyectos
            </Text>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={Settings}
          className="text-neutral-500 hover:text-primary-500"
        >
          {""}
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="secondary"
              size="sm"
              onClick={() => handleSendMessage(action.label, 'action')}
              className="rounded-full"
              icon={Sparkles}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              } space-x-2`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.sender === 'user'
                ? 'bg-primary-500'
                : 'bg-gradient-to-r from-primary-600 to-primary-400'
                }`}>
                {message.sender === 'user' ?
                  <Icon name={User} color="white" size="sm" /> :
                  <Icon name={Bot} color="white" size="sm" />
                }
              </div>

              <div className={`px-4 py-3 rounded-2xl ${message.sender === 'user'
                ? 'bg-primary-500 text-white ml-2 shadow-sm'
                : `${darkMode ? 'bg-neutral-800 border border-neutral-700 text-white' : 'bg-white border border-neutral-200 text-neutral-900'} mr-2 shadow-sm`
                }`}>
                {message.type === 'file' ? (
                  <div className="flex items-center space-x-2">
                    <Icon name={FileText} color="inherit" size="sm" />
                    <div>
                      <Text variant="body2" weight="medium" color="inherit">
                        {message.metadata?.fileName}
                      </Text>
                      <Text variant="caption" color="inherit" className="opacity-70">
                        {(message.metadata?.fileSize! / 1024).toFixed(1)} KB
                      </Text>
                    </div>
                  </div>
                ) : (
                  <Text variant="body2" color="inherit" className="whitespace-pre-wrap">
                    {message.content}
                  </Text>
                )}
                <Text variant="caption" color="inherit" className="mt-1 opacity-70 block">
                  {formatTimestamp(message.timestamp)}
                </Text>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-2 mr-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-primary-400 flex items-center justify-center">
                <Icon name={Bot} color="white" size="sm" />
              </div>
              <div className={`px-4 py-3 rounded-2xl ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'
                }`}>
                <Spinner size="sm" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 border-t ${darkMode ? 'border-neutral-700' : 'border-neutral-200'} bg-white dark:bg-neutral-900`}>
        <div className="flex items-center space-x-2">
          <div className={`flex-1 flex items-center space-x-2 px-4 py-1.5 rounded-2xl border transition-colors ${darkMode
            ? 'bg-neutral-800 border-neutral-700 focus-within:border-primary-500'
            : 'bg-neutral-50 border-neutral-300 focus-within:border-primary-500'
            }`}>
            {(() => {
              const inputInlineStyle = { background: 'transparent', border: 'none', padding: '0 8px' };
              return (
                <Input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
                  placeholder="Escribe tu mensaje..."
                  fullWidth={false}
                  className={`flex-1 ${darkMode ? 'text-white' : 'text-neutral-900'}`}
                  style={inputInlineStyle}
                />
              );
            })()}

            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />

            <Button
              variant="ghost"
              size="sm"
              icon={Paperclip}
              onClick={() => fileInputRef.current?.click()}
              className="text-neutral-500 hover:text-primary-500"
            >
              {""}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={Mic}
              onClick={toggleRecording}
              className={`${isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'text-neutral-500 hover:text-primary-500'
                }`}
            >
              {""}
            </Button>
          </div>

          <Button
            variant="primary"
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!inputMessage.trim() || loading}
            icon={Send}
            className="p-3 h-12 w-12 rounded-2xl"
          >
            {""}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;