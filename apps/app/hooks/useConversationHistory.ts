/**
 * useConversationHistory - Save and retrieve Isaak chat conversations
 * Stores full conversation threads with metadata for historical reference
 */

import { useCallback, useState, useEffect } from "react";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ConversationSession {
  id: string;
  title: string;
  context: "landing" | "dashboard" | "admin";
  role: "visitor" | "user" | "admin";
  startTime: Date;
  endTime: Date;
  messages: ConversationMessage[];
  messageCount: number;
}

const HISTORY_STORAGE_KEY = "isaak_conversation_history";
const MAX_SESSIONS = 50; // Keep last 50 conversations

export function useConversationHistory() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize a new conversation session
  const startNewSession = useCallback(
    (context: "landing" | "dashboard" | "admin", role: "visitor" | "user" | "admin") => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessions = getSessionHistory();

      const newSession: ConversationSession = {
        id: sessionId,
        title: generateSessionTitle(context, role),
        context,
        role,
        startTime: new Date(),
        endTime: new Date(),
        messages: [],
        messageCount: 0,
      };

      sessions.push(newSession);
      if (sessions.length > MAX_SESSIONS) {
        sessions.shift(); // Remove oldest
      }

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessions));
      setCurrentSessionId(sessionId);
      return sessionId;
    },
    []
  );

  // Get all conversation sessions
  const getSessionHistory = useCallback((): ConversationSession[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  // Add message to current session
  const addMessage = useCallback(
    (message: ConversationMessage, sessionId?: string) => {
      const targetId = sessionId || currentSessionId;
      if (!targetId) return;

      const sessions = getSessionHistory();
      const sessionIndex = sessions.findIndex((s) => s.id === targetId);

      if (sessionIndex !== -1) {
        const session = sessions[sessionIndex];
        session.messages.push({
          ...message,
          timestamp: new Date(message.timestamp),
        });
        session.messageCount = session.messages.length;
        session.endTime = new Date();

        // Auto-update title based on first user message
        if (
          session.messageCount === 1 &&
          message.role === "user"
        ) {
          session.title = message.content.substring(0, 50) + "...";
        }

        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sessions));
      }
    },
    [currentSessionId, getSessionHistory]
  );

  // Get specific session
  const getSession = useCallback(
    (sessionId: string): ConversationSession | undefined => {
      const sessions = getSessionHistory();
      return sessions.find((s) => s.id === sessionId);
    },
    [getSessionHistory]
  );

  // Get recent sessions (last N)
  const getRecentSessions = useCallback(
    (count: number = 10) => {
      const sessions = getSessionHistory();
      return sessions.slice(-count).reverse();
    },
    [getSessionHistory]
  );

  // Search sessions by title/content
  const searchSessions = useCallback(
    (query: string): ConversationSession[] => {
      const sessions = getSessionHistory();
      const lowerQuery = query.toLowerCase();

      return sessions.filter((session) => {
        const titleMatch = session.title.toLowerCase().includes(lowerQuery);
        const contentMatch = session.messages.some((msg) =>
          msg.content.toLowerCase().includes(lowerQuery)
        );
        return titleMatch || contentMatch;
      });
    },
    [getSessionHistory]
  );

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string) => {
      const sessions = getSessionHistory();
      const filtered = sessions.filter((s) => s.id !== sessionId);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    },
    [currentSessionId, getSessionHistory]
  );

  // Export session as JSON
  const exportSession = useCallback(
    (sessionId: string) => {
      const session = getSession(sessionId);
      if (!session) return;

      const data = JSON.stringify(session, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `isaak-conversation-${sessionId}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    [getSession]
  );

  // Get statistics about conversation history
  const getHistoryStats = useCallback(() => {
    const sessions = getSessionHistory();
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const avgMessagesPerSession =
      sessions.length > 0 ? Math.round(totalMessages / sessions.length) : 0;
    const oldestSession = sessions[0];
    const newestSession = sessions[sessions.length - 1];

    return {
      totalSessions: sessions.length,
      totalMessages,
      avgMessagesPerSession,
      oldestSession: oldestSession?.startTime,
      newestSession: newestSession?.startTime,
    };
  }, [getSessionHistory]);

  return {
    currentSessionId,
    setCurrentSessionId,
    startNewSession,
    getSessionHistory,
    addMessage,
    getSession,
    getRecentSessions,
    searchSessions,
    deleteSession,
    exportSession,
    getHistoryStats,
  };
}

function generateSessionTitle(
  context: string,
  role: string
): string {
  const contextLabel = {
    landing: "Información",
    dashboard: "Dashboard",
    admin: "Administración",
  }[context] || context;

  return `${contextLabel} - ${new Date().toLocaleDateString()}`;
}
