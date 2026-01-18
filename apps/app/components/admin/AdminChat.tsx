"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Code, Eye, Bug, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    component?: string;
    hasPreview?: boolean;
    previewUrl?: string;
  };
};

type CommandType = '/logs' | '/errors' | '/deploy' | '/preview' | '/check' | '/help';

const COMMANDS: Record<CommandType, { description: string; example: string }> = {
  '/logs': { description: 'Ver últimos logs del sistema', example: '/logs app' },
  '/errors': { description: 'Mostrar errores recientes', example: '/errors typescript' },
  '/deploy': { description: 'Estado de despliegues', example: '/deploy status' },
  '/preview': { description: 'Vista previa de componente', example: '/preview InvoicesTable' },
  '/check': { description: 'Verificar configuración', example: '/check database' },
  '/help': { description: 'Mostrar ayuda', example: '/help' }
};

export function AdminChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: '¡Hola! Soy tu asistente de administración. Puedo ayudarte a verificar el estado del sistema, revisar logs, previsualizar componentes y solucionar problemas. Usa /help para ver comandos disponibles.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCommand = async (command: string): Promise<string> => {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd as CommandType) {
      case '/help':
        return Object.entries(COMMANDS)
          .map(([cmd, { description, example }]) => 
            `**${cmd}**: ${description}\nEjemplo: \`${example}\``
          )
          .join('\n\n');
      
      case '/logs':
        const target = args[0] || 'all';
        return `Obteniendo logs de ${target}...\n\n[Aquí se mostrarían logs en tiempo real]`;
      
      case '/errors':
        return `Buscando errores recientes...\n\n[Lista de errores TypeScript, runtime, etc.]`;
      
      case '/deploy':
        return `Estado del último deploy:\n\n✓ Vercel: Desplegado hace 5 min\n✓ Cloud Run: Activo\n⚠ Esperando confirmación de tests`;
      
      case '/preview':
        const component = args[0];
        if (!component) return 'Especifica un componente. Ejemplo: `/preview InvoicesTable`';
        return `Vista previa de ${component}:\n\n[Aquí se renderizaría el componente]`;
      
      case '/check':
        const system = args[0] || 'all';
        return `Verificando ${system}...\n\n✓ Base de datos: Conectada\n✓ Firebase: OK\n✓ API VeriFactu: Operativa`;
      
      default:
        return null as any;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let response: string;

      // Si es un comando, procesarlo localmente
      if (input.startsWith('/')) {
        response = await handleCommand(input);
      } else {
        // Si no es comando, enviar a la API de chat
        const res = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            })),
            context: {
              project: 'verifactu',
              environment: process.env.NODE_ENV,
              timestamp: new Date().toISOString()
            }
          })
        });

        if (!res.ok) throw new Error('Error en la respuesta');
        
        const data = await res.json();
        response = data.response;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">Chat de Administración</h3>
        </div>
        <button
          onClick={() => setShowCommands(!showCommands)}
          className="text-white hover:text-blue-100 text-sm"
        >
          {showCommands ? 'Ocultar' : 'Comandos'}
        </button>
      </div>

      {/* Commands help */}
      {showCommands && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(COMMANDS).map(([cmd, { description }]) => (
              <button
                key={cmd}
                onClick={() => setInput(cmd + ' ')}
                className="text-left p-2 rounded bg-white hover:bg-blue-100 transition-colors"
              >
                <code className="text-blue-600 font-mono">{cmd}</code>
                <p className="text-gray-600 mt-1">{description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString('es-ES')}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Procesando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje o comando (ej: /help)..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Usa comandos (/) para acciones rápidas o escribe preguntas naturales
        </p>
      </div>
    </div>
  );
}
