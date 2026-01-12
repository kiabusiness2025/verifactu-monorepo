"use client";

import React, { useEffect, useRef, useState } from "react";
import { useChat } from 'ai/react';
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";

type Message = {
  from: string;
  text: string;
};

export function IsaakDrawer() {
  const { company, isDrawerOpen, closeDrawer } = useIsaakUI();
  const { title, suggestions } = useIsaakContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: '¡Hola! Soy Isaak. ¿En qué puedo ayudarte hoy?',
      }
    ],
  });

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

  const chips = suggestions.slice(0, 3);
  
  const onChipClick = (label: string) => {
    handleInputChange({
      target: { value: label }
    } as React.ChangeEvent<HTMLInputElement>);
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
              {title} · {company}
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
                {m.role === "assistant" ? "Isaak" : "Tú"}
              </span>
              <span className="block mt-1 whitespace-pre-wrap">{m.content}</span>
            </div>
          ))}
          {isLoading && (
            <div className="self-start max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-slate-50">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] opacity-70 text-slate-700">
                Isaak
              </span>
              <div className="flex gap-1 mt-2">
                <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
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
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              disabled={isLoading}
              placeholder="Escribe o pega una instrucción"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Enviar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
