"use client";

import React, { useEffect, useRef, useState } from "react";
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function IsaakDrawer() {
  const { company, isDrawerOpen, closeDrawer } = useIsaakUI();
  const { title, suggestions } = useIsaakContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Solo mostrar mensaje de bienvenida si es Empresa Demo SL
  const isDemoCompany = company && company.toLowerCase().includes("demo");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isDemoCompany || messages.length > 0) return;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hola! Soy Isaak. Estas en Empresa Demo SL. Explora los datos de ejemplo o crea tu empresa desde Configuracion > Empresa.",
      },
    ]);
  }, [isDemoCompany, messages.length]);

  useEffect(() => {
    if (isDrawerOpen) inputRef.current?.focus();
  }, [isDrawerOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeDrawer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send to chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Chat error");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (done) break;

          const chunk = decoder.decode(result.value);
          assistantContent += chunk;
        }
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: assistantContent || "No pude procesar tu solicitud.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "Disculpa, ocurrio un error. Intenta de nuevo.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const chips = suggestions.slice(0, 3);

  const onChipClick = (label: string) => {
    setInput(label);
    inputRef.current?.focus();
  };

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Isaak drawer"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Isaak</p>
            <p className="text-xs text-slate-500">
              {title} - {company}
            </p>
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>

        <div className="flex h-[calc(100%-140px)] flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                m.role === "assistant"
                  ? "self-start bg-slate-50 text-slate-700"
                  : "self-end bg-blue-600 text-white"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] opacity-70">
                {m.role === "assistant" ? "Isaak" : "Tu"}
              </span>
              <span className="mt-1 block whitespace-pre-wrap">{m.content}</span>
            </div>
          ))}
          {isLoading && (
            <div className="self-start max-w-[85%] rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-700 opacity-70">
                Isaak
              </span>
              <div className="mt-2 flex gap-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                <div
                  className="h-2 w-2 animate-pulse rounded-full bg-slate-400"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="h-2 w-2 animate-pulse rounded-full bg-slate-400"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex flex-wrap gap-2 pb-3">
            {chips.map((c) => (
              <button
                key={c.label}
                onClick={() => onChipClick(c.label)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-200"
              >
                {c.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Escribe o pega una instruccion"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Enviar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
