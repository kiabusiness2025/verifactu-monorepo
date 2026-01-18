"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Bot, Edit2, Save, X, Share2, Download } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  messageCount: number;
  lastActivity: string;
  messages: Message[];
}

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLast, setEditingLast] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    fetchConversation();
  }, [params.id]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/isaak/conversations/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
      } else {
        alert("Conversación no encontrada");
        router.push("/dashboard/isaak");
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const res = await fetch(`/api/isaak/conversations/${params.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours: 24 })
      });

      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.shareUrl);
        alert(`✅ Enlace copiado\n\nVálido por 24 horas:\n${data.shareUrl}`);
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Error al compartir");
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implementar descarga PDF
    alert("Próximamente: descarga PDF de la conversación");
  };

  const handleEditLastMessage = () => {
    if (!conversation || conversation.messages.length === 0) return;
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage.role !== "user") {
      alert("Solo puedes editar tus propios mensajes");
      return;
    }

    setEditedContent(lastMessage.content);
    setEditingLast(true);
  };

  const handleSaveEdit = async () => {
    // TODO: Implementar edición de mensaje
    alert("Próximamente: edición de mensajes");
    setEditingLast(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard/isaak")}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {conversation.title || "Sin título"}
        </h1>
        {conversation.summary && (
          <p className="mt-2 text-slate-600">{conversation.summary}</p>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span>{conversation.messageCount} mensajes</span>
          <span>•</span>
          <span>
            Última actividad:{" "}
            {formatShortDate(conversation.lastActivity)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {conversation.messages.map((message, index) => {
          const isUser = message.role === "user";
          const isLast = index === conversation.messages.length - 1;

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  isUser ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>

              {/* Message bubble */}
              <div
                className={`flex-1 rounded-lg px-4 py-3 ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {editingLast && isLast && isUser ? (
                  <div>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full rounded border border-slate-300 p-2 text-sm text-slate-900"
                      rows={4}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Save className="h-3 w-3" />
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingLast(false)}
                        className="flex items-center gap-1 rounded bg-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-400"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <div
                      className={`mt-2 flex items-center justify-between text-xs ${
                        isUser ? "text-blue-200" : "text-slate-500"
                      }`}
                    >
                      <span>
                        {formatTime(message.createdAt)}
                      </span>
                      {isLast && isUser && !editingLast && (
                        <button
                          onClick={handleEditLastMessage}
                          className={`flex items-center gap-1 ${
                            isUser
                              ? "text-blue-200 hover:text-white"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          <Edit2 className="h-3 w-3" />
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-600">
        💡 Esta conversación está archivada. Para continuar preguntándole a Isaak,
        abre el chat desde el botón flotante.
      </div>
    </div>
  );
}
