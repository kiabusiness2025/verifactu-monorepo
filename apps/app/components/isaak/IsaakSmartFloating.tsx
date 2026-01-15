"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader,
  Settings,
  Volume2,
  Download,
} from "lucide-react";
import { useIsaakDetection } from "@/hooks/useIsaakDetection";
import {
  getIsaakFloatingContext,
  type IsaakFloatingContext,
} from "@/lib/isaak-floating-contexts-i18n";
import { useConversationHistory, type ConversationMessage } from "@/hooks/useConversationHistory";
import { useIsaakAnalytics } from "@/hooks/useIsaakAnalytics";
import { useIsaakVoice } from "@/hooks/useIsaakVoice";
import { useIsaakPreferences } from "@/hooks/useIsaakPreferences";
import { useAuth } from "@/hooks/useAuth";
import { getUserFirstName } from "@/lib/getUserName";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function IsaakSmartFloating() {
  const detection = useIsaakDetection();
  const { startNewSession, addMessage: addToHistory } = useConversationHistory();
  const { trackEvent } = useIsaakAnalytics();
  const { speak, isSpeaking } = useIsaakVoice();
  const { preferences } = useIsaakPreferences();
  const { user: firebaseUser } = useAuth();
  const userName = getUserFirstName(firebaseUser);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  const contextKey = `${detection.context}:${detection.role}`;
  const context = getIsaakFloatingContext(
    detection.language,
    detection.context,
    detection.role
  );

  // Initialize session and messages
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = startNewSession(
        detection.context as "landing" | "dashboard" | "admin",
        detection.role as "visitor" | "user" | "admin"
      );
      setSessionId(newSessionId);

      // Load history if enabled
      if (preferences.chatHistoryEnabled) {
        // Could load previous messages here
      }
    }

    // Track chat opening
    if (isOpen) {
      trackEvent({
        type: "chat_open",
        context: detection.context as "landing" | "dashboard" | "admin",
        role: detection.role as "visitor" | "user" | "admin",
      });
    } else {
      trackEvent({
        type: "chat_close",
        context: detection.context as "landing" | "dashboard" | "admin",
        role: detection.role as "visitor" | "user" | "admin",
      });
    }
  }, [isOpen, sessionId, detection, startNewSession, trackEvent, preferences.chatHistoryEnabled]);

  // Initialize with contextual greeting + disclaimer
  useEffect(() => {
    const personalizedGreeting = context.greeting.replace('Hola', `Hola ${userName}`);
    
    const initialGreeting: Message = {
      id: "1",
      role: "assistant",
      content: personalizedGreeting,
    };

    const disclaimer: Message = {
      id: "2",
      role: "assistant",
      content: "⚠️ **Recordatorio importante:**\n\nSoy tu asistente para gestión diaria y análisis de datos, pero **NO sustituyo a tu gestor o asesor contable**.\n\n✅ Te ayudo a:\n• Ver ventas, gastos y beneficio en tiempo real\n• Organizar documentos y facturas\n• Recordar plazos fiscales\n• Interpretar datos contables\n\n¿En qué puedo ayudarte hoy?",
    };

    setMessages([initialGreeting, disclaimer]);
  }, [context.greeting, contextKey, userName]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: input,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // Add to conversation history
      if (sessionId) {
        addToHistory(
          {
            role: "user",
            content: input,
            timestamp: new Date(),
          },
          sessionId
        );
      }

      // Track message sent
      trackEvent({
        type: "message_sent",
        context: detection.context as "landing" | "dashboard" | "admin",
        role: detection.role as "visitor" | "user" | "admin",
      });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            context: {
              type: detection.context,
              role: detection.role,
              language: detection.language,
              company: detection.company,
            },
          }),
        });

        const data = await response.json();
        const assistantContent =
          data.content || "Perdón, hubo un error. Intenta de nuevo.";

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: assistantContent,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Add to conversation history
        if (sessionId) {
          addToHistory(
            {
              role: "assistant",
              content: assistantContent,
              timestamp: new Date(),
            },
            sessionId
          );
        }

        // Speak response if voice enabled
        if (preferences.voiceEnabled && !isSpeaking()) {
          speak(assistantContent, preferences.voiceLanguage);
        }
      } catch (error) {
        console.error("Error:", error);
        const errorMsg =
          "Tengo un problema temporal. Intenta de nuevo en unos segundos.";
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: errorMsg,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      input,
      isLoading,
      messages,
      sessionId,
      detection,
      trackEvent,
      addToHistory,
      speak,
      preferences.voiceEnabled,
      preferences.voiceLanguage,
      isSpeaking,
    ]
  );

  // Export conversation
  const handleExport = useCallback(() => {
    if (!sessionId) return;
    const sessionData = {
      id: sessionId,
      messages,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isaak-conversation-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionId, messages]);

  // Hide if preferences disable this context
  if (!preferences[`${detection.context}Enabled` as keyof typeof preferences]) {
    return null;
  }

  if (!preferences.chatEnabled) {
    return null;
  }

  return (
    <>
      {/* Botón flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg text-white hover:shadow-xl transition-shadow"
            aria-label="Abrir chat con Isaak"
            title="Hablemos con Isaak"
          >
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ventana de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-24 sm:right-6 z-40 sm:w-96 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[32rem]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-500 px-3 sm:px-4 py-2.5 sm:py-3 text-white flex-shrink-0">
              <div>
                <div className="font-semibold text-sm sm:text-base">Isaak</div>
                <div className="text-xs opacity-90">Tu compañero fiscal</div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="rounded-lg p-1 hover:bg-white/20 transition"
                  title="Preferencias"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExport}
                  className="rounded-lg p-1 hover:bg-white/20 transition hidden sm:block"
                  title="Descargar conversación"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 hover:bg-white/20 transition"
                  aria-label="Cerrar chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick preferences row */}
            {showPreferences && (
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <Volume2 className="w-4 h-4" />
                  <input
                    type="checkbox"
                    checked={preferences.voiceEnabled}
                    onChange={(e) => {
                      // Would call updatePreference here
                    }}
                    className="w-3 h-3"
                  />
                  <span>Voz</span>
                </label>
              </div>
            )}

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50">
              {messages.length === 1 ? (
                // Mostrar sugerencias
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 mb-3">
                    {context.greeting}
                  </p>
                  {context.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion);
                        trackEvent({
                          type: "suggestion_click",
                          messageId: suggestion.substring(0, 20),
                          context: detection.context as "landing" | "dashboard" | "admin",
                          role: detection.role as "visitor" | "user" | "admin",
                        });
                      }}
                      className="w-full text-left rounded-lg border border-gray-200 bg-white p-3 text-sm hover:bg-blue-50 hover:border-blue-300 transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="border-t border-gray-200 bg-white p-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregunta algo..."
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 transition"
                  aria-label="Enviar"
                >
                  {isLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
