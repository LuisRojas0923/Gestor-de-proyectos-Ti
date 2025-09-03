import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Paperclip,
  Bot,
  User,
  Sparkles,
  FileText,
  Image,
  Mic,
  Settings,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
  const { t } = useTranslation();
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
      const response = await post('/chat/message', {
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
          <div className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Asistente IA
            </h1>
            <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Gestión inteligente de proyectos
            </p>
          </div>
        </div>
        <button className={`p-2 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
        }`}>
          <Settings size={20} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(action.label, 'action')}
              className={`px-3 py-2 text-sm rounded-full transition-colors ${
                darkMode
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <Sparkles size={14} className="inline mr-1" />
              {action.label}
            </button>
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
            <div className={`flex max-w-xs lg:max-w-md ${
              message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            } space-x-2`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-primary-500' 
                  : 'bg-gradient-to-r from-secondary-500 to-primary-500'
              }`}>
                {message.sender === 'user' ? 
                  <User className="text-white" size={16} /> : 
                  <Bot className="text-white" size={16} />
                }
              </div>
              
              <div className={`px-4 py-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-primary-500 text-white ml-2'
                  : `${darkMode ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-900'} mr-2`
              }`}>
                {message.type === 'file' ? (
                  <div className="flex items-center space-x-2">
                    <FileText size={16} />
                    <div>
                      <p className="text-sm font-medium">{message.metadata?.fileName}</p>
                      <p className="text-xs opacity-70">
                        {(message.metadata?.fileSize! / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                <p className={`text-xs mt-1 opacity-70`}>
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-2 mr-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-secondary-500 to-primary-500 flex items-center justify-center">
                <Bot className="text-white" size={16} />
              </div>
              <div className={`px-4 py-3 rounded-2xl ${
                darkMode ? 'bg-neutral-700' : 'bg-neutral-100'
              }`}>
                <LoadingSpinner size="sm" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${darkMode ? 'border-neutral-700' : 'border-neutral-200'}`}>
        <div className="flex items-center space-x-2">
          <div className={`flex-1 flex items-center space-x-2 px-4 py-3 rounded-2xl border ${
            darkMode 
              ? 'bg-neutral-800 border-neutral-600' 
              : 'bg-neutral-50 border-neutral-300'
          }`}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
              placeholder="Escribe tu mensaje..."
              className={`flex-1 bg-transparent outline-none ${
                darkMode ? 'text-white placeholder-neutral-400' : 'text-neutral-900 placeholder-neutral-500'
              }`}
            />
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              <Paperclip size={18} />
            </button>
            
            <button
              onClick={toggleRecording}
              className={`p-1 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-500 text-white' 
                  : darkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              <Mic size={18} />
            </button>
          </div>
          
          <button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!inputMessage.trim() || loading}
            className="p-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;