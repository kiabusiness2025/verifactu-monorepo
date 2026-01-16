"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, Trash2, Share2, Clock, ChevronRight } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  messageCount: number;
  lastActivity: string;
  createdAt: string;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  thisMonth: Conversation[];
  older: Conversation[];
}

export default function IsaakHistoryPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [grouped, setGrouped] = useState<GroupedConversations | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [search]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/isaak/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setGrouped(groupByDate(data.conversations || []));
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (convs: Conversation[]): GroupedConversations => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: GroupedConversations = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };

    convs.forEach(conv => {
      const date = new Date(conv.lastActivity);

      if (date >= today) {
        groups.today.push(conv);
      } else if (date >= yesterday) {
        groups.yesterday.push(conv);
      } else if (date >= weekAgo) {
        groups.thisWeek.push(conv);
      } else if (date >= monthAgo) {
        groups.thisMonth.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta conversación? No se puede deshacer.")) return;

    try {
      const res = await fetch(`/api/isaak/conversations/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await fetchConversations();
      } else {
        alert("Error al eliminar conversación");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Error al eliminar conversación");
    }
  };

  const handleShare = async (id: string) => {
    try {
      const res = await fetch(`/api/isaak/conversations/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours: 24 })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Copiar al portapapeles
        await navigator.clipboard.writeText(data.shareUrl);
        
        alert(`✅ Enlace copiado al portapapeles\n\nVálido por 24 horas:\n${data.shareUrl}`);
      } else {
        alert("Error al generar enlace");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Error al compartir conversación");
    }
  };

  const renderGroup = (title: string, convs: Conversation[]) => {
    if (convs.length === 0) return null;

    return (
      <div key={title} className="mb-8">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        <div className="space-y-2">
          {convs.map(conv => (
            <div
              key={conv.id}
              className="group relative flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <button
                onClick={() => router.push(`/dashboard/isaak/${conv.id}`)}
                className="flex flex-1 items-start gap-3 text-left"
              >
                <MessageSquare className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate">
                    {conv.title || "Sin título"}
                  </h4>
                  {conv.summary && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {conv.summary}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {conv.messageCount} mensajes
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(conv.lastActivity)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
              </button>
              
              <div className="ml-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(conv.id);
                  }}
                  className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
                  title="Compartir"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(conv.id);
                  }}
                  className="rounded-md p-2 text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          💬 Conversaciones con Isaak
        </h1>
        <p className="mt-2 text-slate-600">
          Historial completo de tus conversaciones. Busca, comparte o elimina.
        </p>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en conversaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            Sin conversaciones aún
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Abre el chat de Isaak y empieza a preguntar 💬
          </p>
        </div>
      )}

      {/* Grouped conversations */}
      {!loading && grouped && (
        <div>
          {renderGroup("Hoy", grouped.today)}
          {renderGroup("Ayer", grouped.yesterday)}
          {renderGroup("Esta semana", grouped.thisWeek)}
          {renderGroup("Este mes", grouped.thisMonth)}
          {renderGroup("Más antiguas", grouped.older)}
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}
