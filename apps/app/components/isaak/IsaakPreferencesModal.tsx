"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bell,
  Volume2,
  MessageSquare,
  Settings,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";
import { useIsaakPreferences } from "@/hooks/useIsaakPreferences";
import { useIsaakVoice } from "@/hooks/useIsaakVoice";

interface IsaakPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IsaakPreferencesModal({
  isOpen,
  onClose,
}: IsaakPreferencesModalProps) {
  const { preferences, updatePreference, updatePreferences, resetToDefaults, exportPreferences, importPreferences } =
    useIsaakPreferences();
  const { speak } = useIsaakVoice();
  const [activeTab, setActiveTab] = useState<
    "bubbles" | "chat" | "voice" | "notifications" | "privacy"
  >("bubbles");
  const [testMessage, setTestMessage] = useState(
    "Hola, soy Isaak. Esta es una prueba de voz."
  );

  const tabs = [
    { id: "bubbles", label: "Burbujas", icon: Bell },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "voice", label: "Voz", icon: Volume2 },
    { id: "notifications", label: "Notificaciones", icon: Bell },
    { id: "privacy", label: "Privacidad", icon: Settings },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Preferencias de Isaak
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 sm:gap-2 p-2 sm:p-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(
                        tab.id as
                          | "bubbles"
                          | "chat"
                          | "voice"
                          | "notifications"
                          | "privacy"
                      )
                    }
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg whitespace-nowrap transition text-sm ${
                      activeTab === tab.id
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {/* Bubbles Tab */}
              {activeTab === "bubbles" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Habilitar burbujas
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrar notificaciones proactivas
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.bubblesEnabled}
                      onChange={(e) =>
                        updatePreference("bubblesEnabled", e.target.checked)
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Frecuencia de burbujas
                    </label>
                    <select
                      value={preferences.bubbleFrequency}
                      onChange={(e) =>
                        updatePreference(
                          "bubbleFrequency",
                          e.target.value as "always" | "daily" | "weekly" | "never"
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="always">Siempre</option>
                      <option value="daily">Una vez al día</option>
                      <option value="weekly">Una vez a la semana</option>
                      <option value="never">Nunca</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Posición de burbujas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["bottom-right", "bottom-left", "top-right", "top-left"].map(
                        (pos) => (
                          <button
                            key={pos}
                            onClick={() =>
                              updatePreference(
                                "bubblePosition",
                                pos as
                                  | "bottom-right"
                                  | "bottom-left"
                                  | "top-right"
                                  | "top-left"
                              )
                            }
                            className={`p-2 border rounded-lg transition ${
                              preferences.bubblePosition === pos
                                ? "bg-blue-500 text-white border-blue-500"
                                : "border-slate-300 dark:border-slate-600 hover:border-blue-500"
                            }`}
                          >
                            {pos.split("-").join(" ")}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Habilitar chat
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Mostrar botón flotante de chat
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.chatEnabled}
                      onChange={(e) =>
                        updatePreference("chatEnabled", e.target.checked)
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Tema del chat
                    </label>
                    <select
                      value={preferences.chatTheme}
                      onChange={(e) =>
                        updatePreference(
                          "chatTheme",
                          e.target.value as "light" | "dark" | "auto"
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <option value="auto">Automático</option>
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Guardar historial
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Mantener conversaciones anteriores
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.chatHistoryEnabled}
                      onChange={(e) =>
                        updatePreference(
                          "chatHistoryEnabled",
                          e.target.checked
                        )
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>
                </div>
              )}

              {/* Voice Tab */}
              {activeTab === "voice" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Habilitar voz
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Isaak hablará sus respuestas
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.voiceEnabled}
                      onChange={(e) =>
                        updatePreference("voiceEnabled", e.target.checked)
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Velocidad: {preferences.voiceRate.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={preferences.voiceRate}
                      onChange={(e) =>
                        updatePreference("voiceRate", parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Tono: {preferences.voicePitch.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={preferences.voicePitch}
                      onChange={(e) =>
                        updatePreference("voicePitch", parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Idioma de voz
                    </label>
                    <select
                      value={preferences.voiceLanguage}
                      onChange={(e) =>
                        updatePreference("voiceLanguage", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 mb-3"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-900 dark:text-white">
                      Prueba de voz
                    </label>
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    />
                    <button
                      onClick={() => speak(testMessage, preferences.voiceLanguage)}
                      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                    >
                      Escuchar prueba
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Notificaciones de deadlines
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Alertas para vencimientos fiscales
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.deadlineNotificationsEnabled}
                      onChange={(e) =>
                        updatePreference(
                          "deadlineNotificationsEnabled",
                          e.target.checked
                        )
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Notificaciones por correo
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Recibir alertas en tu email
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotificationsEnabled}
                      onChange={(e) =>
                        updatePreference(
                          "emailNotificationsEnabled",
                          e.target.checked
                        )
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Permitir analytics
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ayudarnos a mejorar Isaak
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.analyticsEnabled}
                      onChange={(e) =>
                        updatePreference("analyticsEnabled", e.target.checked)
                      }
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Contextos habilitados
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: "landingEnabled", label: "Landing" },
                        { key: "dashboardEnabled", label: "Dashboard" },
                        { key: "adminEnabled", label: "Administración" },
                      ].map((ctx) => (
                        <div
                          key={ctx.key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {ctx.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={
                              preferences[
                                ctx.key as keyof typeof preferences
                              ] as boolean
                            }
                            onChange={(e) =>
                              updatePreference(
                                ctx.key as keyof typeof preferences,
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-3">
                    <button
                      onClick={exportPreferences}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Download className="w-4 h-4" />
                      Exportar preferencias
                    </button>
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".json";
                        input.onchange = (e: any) => {
                          importPreferences(e.target.files[0]);
                        };
                        input.click();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Upload className="w-4 h-4" />
                      Importar preferencias
                    </button>
                    <button
                      onClick={resetToDefaults}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restaurar valores por defecto
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium text-sm sm:text-base"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
