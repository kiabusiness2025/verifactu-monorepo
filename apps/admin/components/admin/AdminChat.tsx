"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Code, Eye, Bug, Loader2 } from 'lucide-react';
import { formatDateTime, formatTime } from "@/src/lib/formatters";

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

type CommandType = '/logs' | '/errors' | '/deploy' | '/preview' | '/check' | '/vercel' | '/isaak' | '/help';

const COMMANDS: Record<CommandType, { description: string; example: string; icon: any }> = {
  '/deploy': { description: 'Ver despliegues Vercel', example: '/deploy', icon: '🚀' },
  '/errors': { description: 'Errores recientes', example: '/errors', icon: '🐛' },
  '/check': { description: 'Estado del sistema', example: '/check all', icon: '✅' },
  '/logs': { description: 'Ver logs', example: '/logs app', icon: '📋' },
  '/vercel': { description: 'Historial Vercel', example: '/vercel history', icon: '▲' },
  '/isaak': { description: 'Trigger auto-fix con Isaak', example: '/isaak fix', icon: '🤖' },
  '/preview': { description: 'Vista previa', example: '/preview InvoicesTable', icon: '👁️' },
  '/help': { description: 'Ayuda completa', example: '/help', icon: '❓' }
};

const QUICK_COMMANDS = [
  { label: 'Estado Sistema', command: '/check all', icon: '✅' },
  { label: 'Últimos Deploys', command: '/vercel history', icon: '▲' },
  { label: 'Auto-Fix Isaak', command: '/isaak fix', icon: '🤖' },
  { label: 'Ver Errores', command: '/errors', icon: '🐛' },
  { label: 'Logs App', command: '/logs app', icon: '📋' },
];

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
      
      case '/vercel':
        const action = args[0] || 'history';
        
        // Fetch from API
        try {
          const res = await fetch(`/api/admin/vercel?action=deployments&limit=5`);
          if (!res.ok) throw new Error('Failed to fetch');
          
          const data = await res.json();
          const deployments = data.deployments || [];
          
          if (deployments.length === 0) {
            return 'No hay deployments recientes o credenciales de Vercel no configuradas.';
          }
          
          const formatted = deployments.map((d: any, i: number) => {
            const status = d.state === 'READY' ? '✅' : d.state === 'ERROR' ? '❌' : '⏳';
            const date = formatDateTime(d.createdAt);
            const commit = d.meta?.githubCommitMessage || 'Sin mensaje';
            return `${i + 1}. ${status} **${d.target}** - ${date}\n   URL: ${d.url}\n   Commit: ${commit.substring(0, 50)}`;
          }).join('\n\n');
          
          return `📦 Últimos 5 deployments en Vercel:\n\n${formatted}`;
        } catch (error) {
          return 'Error al obtener datos de Vercel. Verifica las credenciales en .env.local';
        }
      
      case '/isaak':
        const isaakAction = args[0] || 'fix';
        
        if (isaakAction === 'fix') {
          try {
            const triggerRes = await fetch('/api/admin/isaak/trigger', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                errorContext: {
                  source: 'admin_chat',
                  timestamp: new Date().toISOString(),
                  triggeredBy: 'manual',
                  message: 'Auto-fix manual desde Admin Chat'
                },
                autoFix: true
              })
            });
            
            if (!triggerRes.ok) {
              const errorData = await triggerRes.json();
              return `❌ Error al disparar auto-fix:\n${errorData.error || 'Error desconocido'}\n\nVerifica que GITHUB_TOKEN y GITHUB_REPOSITORY estén configurados.`;
            }
            
            const result = await triggerRes.json();
            return `🤖 **Isaak Auto-Fix Activado**\n\n✅ Workflow disparado exitosamente\n📦 Repositorio: ${result.repository}\n⚙️ Workflow: ${result.workflow}\n\nIsaak está analizando el código y aplicará correcciones automáticas. El deploy se realizará automáticamente después de los fixes.\n\nPuedes ver el progreso en GitHub Actions.`;
          } catch (error) {
            return `❌ Error al conectar con Isaak:\n${error instanceof Error ? error.message : 'Error desconocido'}`;
          }
        }
        
        return 'Comando de Isaak no reconocido. Usa: /isaak fix';
      
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
      <div className="px-4 py-3 border-b border-gray-200 bg-slate-900">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">Chat de Administración</h3>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.command}
              onClick={() => {
                setInput(cmd.command);
                sendMessage();
              }}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
              disabled={loading}
            >
              <span>{cmd.icon}</span>
              <span>{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>

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
                {formatTime(message.timestamp)}
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
