"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Settings,
  RefreshCw,
  Send,
  Archive,
  Trash2,
  Plus,
  ChevronDown,
} from "lucide-react";

interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  webhookSecret?: string;
}

interface ResendMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  tags?: string[];
  scheduledAt?: string;
  createdAt: string;
  status: "draft" | "scheduled" | "sent" | "delivered" | "bounced" | "failed";
  opens?: number;
  clicks?: number;
}

export default function ResendConfigPage() {
  const [activeTab, setActiveTab] = useState<"config" | "messages" | "send">("config");
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<ResendConfig>({
    apiKey: "",
    fromEmail: "soporte@verifactu.business",
    fromName: "Verifactu Business",
  });
  const [configEditing, setConfigEditing] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Messages
  const [messages, setMessages] = useState<ResendMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ResendMessage | null>(null);
  const [messageFilter, setMessageFilter] = useState<ResendMessage["status"]>("sent");

  // Compose
  const [sendTo, setSendTo] = useState("");
  const [sendCc, setSendCc] = useState("");
  const [sendBcc, setSendBcc] = useState("");
  const [sendReplyTo, setSendReplyTo] = useState("soporte@verifactu.business");
  const [sendSubject, setSendSubject] = useState("");
  const [sendText, setSendText] = useState("");
  const [sendHtml, setSendHtml] = useState("");
  const [sendTags, setSendTags] = useState("");
  const [sendScheduledAt, setSendScheduledAt] = useState("");
  const [sendSending, setSendSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("resend-config");
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  // Save config
  async function handleSaveConfig() {
    setConfigSaving(true);
    try {
      localStorage.setItem("resend-config", JSON.stringify(config));
      setConfigEditing(false);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setConfigSaving(false);
    }
  }

  // Load messages
  async function loadMessages() {
    if (!config.apiKey) {
      alert("Configura tu clave API de Resend primero");
      return;
    }
    setMessagesLoading(true);
    try {
      const response = await fetch("/api/admin/resend/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, status: messageFilter }),
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }

  // Send message
  async function handleSendMessage() {
    if (!config.apiKey || !sendTo || !sendSubject) {
      alert("Completa los campos obligatorios");
      return;
    }

    setSendSending(true);
    setSendError(null);
    try {
      const response = await fetch("/api/admin/resend/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: config.apiKey,
          from: `${config.fromName} <${config.fromEmail}>`,
          to: sendTo.split(",").map((e) => e.trim()),
          cc: sendCc ? sendCc.split(",").map((e) => e.trim()) : undefined,
          bcc: sendBcc ? sendBcc.split(",").map((e) => e.trim()) : undefined,
          replyTo: sendReplyTo,
          subject: sendSubject,
          html: sendHtml || undefined,
          text: sendText || undefined,
          tags: sendTags
            ? sendTags.split("\n").map((t) => t.trim())
            : undefined,
          scheduledAt: sendScheduledAt || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error sending message");
      }

      setConfigSuccess(true);
      setSendTo("");
      setSendCc("");
      setSendBcc("");
      setSendSubject("");
      setSendText("");
      setSendHtml("");
      setSendTags("");
      setSendScheduledAt("");
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Error sending message"
      );
    } finally {
      setSendSending(false);
    }
  }

  // Delete message
  async function handleDeleteMessage(id: string) {
    if (!config.apiKey) return;
    if (!confirm("¿Eliminar este mensaje?")) return;

    try {
      const response = await fetch("/api/admin/resend/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, messageId: id }),
      });

      if (response.ok) {
        setMessages(messages.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Configuración de Resend
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestiona tu clave API, correos y mensajes de Resend
          </p>
        </div>
        <Mail className="h-8 w-8 text-blue-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        {(["config", "messages", "send"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-0.5 ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab === "config" && "Configuración"}
            {tab === "messages" && "Mensajes"}
            {tab === "send" && "Enviar"}
          </button>
        ))}
      </div>

      {/* CONFIG TAB */}
      {activeTab === "config" && (
        <div className="space-y-4">
          {configSuccess && (
            <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-900">
                Configuración guardada correctamente
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            {!configEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Clave API de Resend
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={config.apiKey}
                      readOnly
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono bg-slate-50"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="px-3 py-2 text-slate-600 hover:text-slate-900"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(config.apiKey);
                      }}
                      className="px-3 py-2 text-slate-600 hover:text-slate-900"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Email de remitente
                    </label>
                    <input
                      type="email"
                      value={config.fromEmail}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Nombre de remitente
                    </label>
                    <input
                      type="text"
                      value={config.fromName}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setConfigEditing(true)}
                  className="flex gap-2 items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Settings className="h-4 w-4" />
                  Editar Configuración
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Clave API de Resend
                  </label>
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) =>
                      setConfig({ ...config, apiKey: e.target.value })
                    }
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Email de remitente
                    </label>
                    <input
                      type="email"
                      value={config.fromEmail}
                      onChange={(e) =>
                        setConfig({ ...config, fromEmail: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Nombre de remitente
                    </label>
                    <input
                      type="text"
                      value={config.fromName}
                      onChange={(e) =>
                        setConfig({ ...config, fromName: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveConfig}
                    disabled={configSaving}
                    className="flex gap-2 items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Guardar
                  </button>
                  <button
                    onClick={() => setConfigEditing(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Obtén tu clave API</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Ve a <strong>resend.com/api-keys</strong></li>
                  <li>Crea una nueva clave API</li>
                  <li>Pégala aquí en el campo &quot;Clave API de Resend&quot;</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <select
              value={messageFilter}
              onChange={(e) =>
                setMessageFilter(e.target.value as ResendMessage["status"])
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="sent">Enviados</option>
              <option value="delivered">Entregados</option>
              <option value="bounced">Rebotados</option>
              <option value="failed">Fallidos</option>
              <option value="draft">Borradores</option>
            </select>
            <button
              onClick={loadMessages}
              disabled={messagesLoading}
              className="flex gap-2 items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Cargar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {messages.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-slate-600">
                No hay mensajes para mostrar
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`rounded-lg border p-4 cursor-pointer transition ${
                    selectedMessage?.id === msg.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {msg.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(msg.id);
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {msg.subject}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 truncate">
                    {msg.to[0]}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {selectedMessage && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  {selectedMessage.subject}
                </h3>
                <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {selectedMessage.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">De:</p>
                  <p className="font-mono text-slate-900">{selectedMessage.from}</p>
                </div>
                <div>
                  <p className="text-slate-600">Para:</p>
                  <p className="font-mono text-slate-900">
                    {selectedMessage.to.join(", ")}
                  </p>
                </div>
              </div>

              {selectedMessage.opens || selectedMessage.clicks ? (
                <div className="flex gap-4 text-sm">
                  {selectedMessage.opens && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span>{selectedMessage.opens} aperturas</span>
                    </div>
                  )}
                  {selectedMessage.clicks && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <span>{selectedMessage.clicks} clics</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: selectedMessage.html }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEND TAB */}
      {activeTab === "send" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          {sendSuccess && (
            <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-900">Correo enviado correctamente</div>
            </div>
          )}

          {sendError && (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-900">{sendError}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Para *
              </label>
              <input
                type="email"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                CC
              </label>
              <input
                type="email"
                value={sendCc}
                onChange={(e) => setSendCc(e.target.value)}
                placeholder="cc@ejemplo.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                BCC
              </label>
              <input
                type="email"
                value={sendBcc}
                onChange={(e) => setSendBcc(e.target.value)}
                placeholder="bcc@ejemplo.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Responder a
              </label>
              <input
                type="email"
                value={sendReplyTo}
                onChange={(e) => setSendReplyTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Asunto *
            </label>
            <input
              type="text"
              value={sendSubject}
              onChange={(e) => setSendSubject(e.target.value)}
              placeholder="Asunto del correo"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Texto plano
            </label>
            <textarea
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              HTML
            </label>
            <textarea
              value={sendHtml}
              onChange={(e) => setSendHtml(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Tags (una por línea)
              </label>
              <textarea
                value={sendTags}
                onChange={(e) => setSendTags(e.target.value)}
                rows={2}
                placeholder="tag1&#10;&#10;tag2"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Programar envío (ISO 8601)
              </label>
              <input
                type="datetime-local"
                value={sendScheduledAt}
                onChange={(e) => setSendScheduledAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={sendSending || !sendTo || !sendSubject}
            className="flex gap-2 items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            <Send className="h-4 w-4" />
            {sendSending ? "Enviando..." : "Enviar Correo"}
          </button>
        </div>
      )}
    </div>
  );
}
