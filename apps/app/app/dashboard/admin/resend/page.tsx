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
  FileText,
  Info,
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

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function ResendConfigPage() {
  const [activeTab, setActiveTab] = useState<"config" | "messages" | "send" | "templates" | "test">("config");
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

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

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

  // Test
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("resend-config");
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  // Load users when tab changes to send
  useEffect(() => {
    if (activeTab === "send") {
      loadUsers();
    }
  }, [activeTab]);

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

  // Load users
  async function loadUsers() {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/users/list?search=${userSearch}&limit=100`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setUsersLoading(false);
    }
  }

  // Toggle user selection
  function toggleUserSelection(email: string) {
    if (selectedUsers.includes(email)) {
      setSelectedUsers(selectedUsers.filter((e) => e !== email));
    } else {
      setSelectedUsers([...selectedUsers, email]);
    }
  }

  // Apply selected users to send field
  function applySelectedUsers() {
    if (selectedUsers.length > 0) {
      setSendTo(selectedUsers.join(", "));
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
        {(["config", "messages", "send", "templates", "test"] as const).map((tab) => (
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
            {tab === "templates" && "Plantillas"}
            {tab === "test" && "Pruebas"}
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
        <div className="space-y-4">
          {/* User Selection Panel */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Seleccionar destinatarios</h3>
              <button
                onClick={loadUsers}
                disabled={usersLoading}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {usersLoading ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            <div>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                placeholder="Buscar por email o nombre..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay usuarios disponibles
                </p>
              ) : (
                users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.email)}
                      onChange={() => toggleUserSelection(user.email)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {user.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-slate-600">{user.email}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </label>
                ))
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  {selectedUsers.length} usuario(s) seleccionado(s)
                </p>
                <button
                  onClick={applySelectedUsers}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Aplicar al campo &quot;Para&quot;
                </button>
              </div>
            )}
          </div>

          {/* Compose Form */}
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
                  placeholder="correo@ejemplo.com (separados por coma)"
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
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Plantillas de Correo Disponibles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Invoice Ready Template */}
              <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-600 transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Factura Lista</h4>
                    <p className="text-xs text-slate-600">InvoiceReadyEmail</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Notifica al usuario cuando su factura está lista para descargar.
                </p>
                <div className="text-xs text-slate-500">
                  <strong>Props:</strong> userName, invoiceNumber, invoiceAmount, invoiceDate, downloadLink
                </div>
              </div>

              {/* Payment Reminder Template */}
              <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-600 transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Recordatorio de Pago</h4>
                    <p className="text-xs text-slate-600">PaymentReminderEmail</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Recordatorio amistoso de pago pendiente.
                </p>
                <div className="text-xs text-slate-500">
                  <strong>Props:</strong> userName, companyName, invoiceNumber, invoiceAmount, dueDate, paymentLink
                </div>
              </div>

              {/* Monthly Report Template */}
              <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-600 transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Reporte Mensual</h4>
                    <p className="text-xs text-slate-600">MonthlyReportEmail</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Resumen mensual de actividad financiera.
                </p>
                <div className="text-xs text-slate-500">
                  <strong>Props:</strong> userName, month, year, totalInvoices, totalRevenue, totalExpenses, netProfit, dashboardLink
                </div>
              </div>

              {/* Support Ticket Template */}
              <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-600 transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Ticket de Soporte</h4>
                    <p className="text-xs text-slate-600">SupportTicketEmail</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Actualización de estado de ticket de soporte.
                </p>
                <div className="text-xs text-slate-500">
                  <strong>Props:</strong> userName, ticketNumber, ticketSubject, ticketStatus, ticketLink, message?
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Cómo usar las plantillas</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Importa la plantilla en tu código: <code className="bg-blue-100 px-1 rounded">import &#123; InvoiceReadyEmailTemplate &#125; from &apos;@/emails&apos;</code></li>
                  <li>Renderiza con React: <code className="bg-blue-100 px-1 rounded">ReactDOMServer.renderToString(&lt;InvoiceReadyEmailTemplate /&gt;)</code></li>
                  <li>Envía con Resend usando el HTML renderizado</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* TEST TAB */}
      {activeTab === "test" && (
        <div className="space-y-4">
          {testSuccess && (
            <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-900">Correo de prueba enviado correctamente</div>
            </div>
          )}

          {testError && (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-900">{testError}</div>
            </div>
          )}

          {/* Send Test Email */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Enviar Correo de Prueba</h3>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Envía un correo de prueba con datos de ejemplo para verificar que la configuración funciona correctamente.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email de destino
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu-email@ejemplo.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={async () => {
                if (!testEmail) {
                  setTestError("Por favor ingresa un email de destino");
                  return;
                }
                if (!config.apiKey) {
                  setTestError("Por favor configura tu API Key primero");
                  return;
                }

                setTestSending(true);
                setTestError(null);
                setTestSuccess(false);

                try {
                  const response = await fetch("/api/admin/resend/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      apiKey: config.apiKey,
                      from: `${config.fromName} <${config.fromEmail}>`,
                      to: testEmail,
                      subject: "🧪 Correo de Prueba - Verifactu",
                      html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                          <h1 style="color: #2563eb;">¡Prueba Exitosa!</h1>
                          <p>Este es un correo de prueba de Verifactu Business.</p>
                          <p>Si recibes este mensaje, tu configuración de Resend está funcionando correctamente.</p>
                          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
                          <p style="color: #64748b; font-size: 14px;">
                            Enviado desde el panel de administración de Verifactu<br />
                            ${new Date().toLocaleString()}
                          </p>
                        </div>
                      `,
                      text: "¡Prueba Exitosa! Este es un correo de prueba de Verifactu Business. Si recibes este mensaje, tu configuración de Resend está funcionando correctamente.",
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || "Error enviando correo de prueba");
                  }

                  setTestSuccess(true);
                  setTimeout(() => setTestSuccess(false), 5000);
                } catch (error) {
                  setTestError(
                    error instanceof Error ? error.message : "Error enviando correo de prueba"
                  );
                } finally {
                  setTestSending(false);
                }
              }}
              disabled={testSending || !testEmail || !config.apiKey}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSending ? "Enviando..." : "Enviar Correo de Prueba"}
            </button>
          </div>

          {/* Test with Template */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-purple-600" />
              <h3 className="font-semibold text-slate-900">Probar Plantilla</h3>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Envía un correo usando una de las plantillas disponibles con datos de ejemplo.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  if (!testEmail) {
                    setTestError("Por favor ingresa un email de destino");
                    return;
                  }
                  if (!config.apiKey) {
                    setTestError("Por favor configura tu API Key primero");
                    return;
                  }

                  setTestSending(true);
                  setTestError(null);
                  setTestSuccess(false);

                  try {
                    const response = await fetch("/api/admin/resend/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        apiKey: config.apiKey,
                        from: `${config.fromName} <${config.fromEmail}>`,
                        to: testEmail,
                        subject: "Tu factura está lista",
                        html: `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                            <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                              <h1 style="color: #1e293b; margin-bottom: 16px;">¡Hola Juan Pérez!</h1>
                              <p style="color: #475569; margin-bottom: 24px;">Tu factura #INV-2024-001 está lista para descargar.</p>
                              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #64748b;"><strong>Número:</strong> INV-2024-001</p>
                                <p style="margin: 8px 0; color: #64748b;"><strong>Monto:</strong> €1,234.56</p>
                                <p style="margin: 0; color: #64748b;"><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                              </div>
                              <a href="https://app.verifactu.business/dashboard/invoices" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                                Descargar Factura
                              </a>
                            </div>
                          </div>
                        `,
                      }),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.message || "Error enviando correo");
                    }

                    setTestSuccess(true);
                    setTimeout(() => setTestSuccess(false), 5000);
                  } catch (error) {
                    setTestError(
                      error instanceof Error ? error.message : "Error enviando correo"
                    );
                  } finally {
                    setTestSending(false);
                  }
                }}
                disabled={testSending || !testEmail || !config.apiKey}
                className="border-2 border-blue-200 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                📄 Factura Lista
              </button>

              <button
                onClick={async () => {
                  if (!testEmail) {
                    setTestError("Por favor ingresa un email de destino");
                    return;
                  }
                  if (!config.apiKey) {
                    setTestError("Por favor configura tu API Key primero");
                    return;
                  }

                  setTestSending(true);
                  setTestError(null);
                  setTestSuccess(false);

                  try {
                    const response = await fetch("/api/admin/resend/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        apiKey: config.apiKey,
                        from: `${config.fromName} <${config.fromEmail}>`,
                        to: testEmail,
                        subject: "Recordatorio de pago pendiente",
                        html: `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fef3c7;">
                            <div style="background: white; border-radius: 8px; padding: 32px; border-left: 4px solid #f59e0b;">
                              <h1 style="color: #92400e; margin-bottom: 16px;">Recordatorio de Pago</h1>
                              <p style="color: #78350f; margin-bottom: 24px;">Tu factura #INV-2024-002 tiene un pago pendiente.</p>
                              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #92400e;"><strong>Número:</strong> INV-2024-002</p>
                                <p style="margin: 8px 0; color: #92400e;"><strong>Monto:</strong> €850.00</p>
                                <p style="margin: 0; color: #92400e;"><strong>Vencimiento:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                              </div>
                              <a href="https://app.verifactu.business/dashboard/payments" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                                Realizar Pago
                              </a>
                            </div>
                          </div>
                        `,
                      }),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.message || "Error enviando correo");
                    }

                    setTestSuccess(true);
                    setTimeout(() => setTestSuccess(false), 5000);
                  } catch (error) {
                    setTestError(
                      error instanceof Error ? error.message : "Error enviando correo"
                    );
                  } finally {
                    setTestSending(false);
                  }
                }}
                disabled={testSending || !testEmail || !config.apiKey}
                className="border-2 border-yellow-200 bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                ⚠️ Recordatorio Pago
              </button>

              <button
                onClick={async () => {
                  if (!testEmail) {
                    setTestError("Por favor ingresa un email de destino");
                    return;
                  }
                  if (!config.apiKey) {
                    setTestError("Por favor configura tu API Key primero");
                    return;
                  }

                  setTestSending(true);
                  setTestError(null);
                  setTestSuccess(false);

                  try {
                    const response = await fetch("/api/admin/resend/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        apiKey: config.apiKey,
                        from: `${config.fromName} <${config.fromEmail}>`,
                        to: testEmail,
                        subject: "Tu reporte mensual está disponible",
                        html: `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ecfdf5;">
                            <div style="background: white; border-radius: 8px; padding: 32px; border-left: 4px solid #10b981;">
                              <h1 style="color: #065f46; margin-bottom: 16px;">Reporte Mensual - Enero 2024</h1>
                              <p style="color: #047857; margin-bottom: 24px;">Resumen de tus actividades financieras del mes.</p>
                              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                                <div style="background: #d1fae5; border-radius: 8px; padding: 16px; text-align: center;">
                                  <p style="margin: 0; color: #065f46; font-size: 24px; font-weight: bold;">€12,450</p>
                                  <p style="margin: 8px 0 0; color: #047857; font-size: 12px;">Ingresos</p>
                                </div>
                                <div style="background: #fef3c7; border-radius: 8px; padding: 16px; text-align: center;">
                                  <p style="margin: 0; color: #92400e; font-size: 24px; font-weight: bold;">€8,320</p>
                                  <p style="margin: 8px 0 0; color: #78350f; font-size: 12px;">Gastos</p>
                                </div>
                                <div style="background: #dbeafe; border-radius: 8px; padding: 16px; text-align: center;">
                                  <p style="margin: 0; color: #1e40af; font-size: 24px; font-weight: bold;">€4,130</p>
                                  <p style="margin: 8px 0 0; color: #1e3a8a; font-size: 12px;">Beneficio</p>
                                </div>
                              </div>
                              <a href="https://app.verifactu.business/dashboard/reports" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                                Ver Reporte Completo
                              </a>
                            </div>
                          </div>
                        `,
                      }),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.message || "Error enviando correo");
                    }

                    setTestSuccess(true);
                    setTimeout(() => setTestSuccess(false), 5000);
                  } catch (error) {
                    setTestError(
                      error instanceof Error ? error.message : "Error enviando correo"
                    );
                  } finally {
                    setTestSending(false);
                  }
                }}
                disabled={testSending || !testEmail || !config.apiKey}
                className="border-2 border-green-200 bg-green-50 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                📊 Reporte Mensual
              </button>

              <button
                onClick={async () => {
                  if (!testEmail) {
                    setTestError("Por favor ingresa un email de destino");
                    return;
                  }
                  if (!config.apiKey) {
                    setTestError("Por favor configura tu API Key primero");
                    return;
                  }

                  setTestSending(true);
                  setTestError(null);
                  setTestSuccess(false);

                  try {
                    const response = await fetch("/api/admin/resend/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        apiKey: config.apiKey,
                        from: `${config.fromName} <${config.fromEmail}>`,
                        to: testEmail,
                        subject: "Actualización de tu ticket de soporte #1234",
                        html: `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                            <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                              <h1 style="color: #1e293b; margin-bottom: 16px;">Tu Ticket ha sido Actualizado</h1>
                              <p style="color: #475569; margin-bottom: 24px;">Hola Juan Pérez, tu ticket de soporte #1234 tiene una actualización.</p>
                              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #64748b;"><strong>Ticket:</strong> #1234</p>
                                <p style="margin: 8px 0; color: #64748b;"><strong>Asunto:</strong> Problema con facturación</p>
                                <p style="margin: 8px 0; color: #64748b;"><strong>Estado:</strong> <span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Resuelto</span></p>
                                <p style="margin: 0; color: #64748b;"><strong>Respuesta:</strong> Hemos solucionado el problema con tu facturación. Ya puedes acceder a tu cuenta sin problemas.</p>
                              </div>
                              <a href="https://app.verifactu.business/dashboard/support" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                                Ver Ticket
                              </a>
                            </div>
                          </div>
                        `,
                      }),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.message || "Error enviando correo");
                    }

                    setTestSuccess(true);
                    setTimeout(() => setTestSuccess(false), 5000);
                  } catch (error) {
                    setTestError(
                      error instanceof Error ? error.message : "Error enviando correo"
                    );
                  } finally {
                    setTestSending(false);
                  }
                }}
                disabled={testSending || !testEmail || !config.apiKey}
                className="border-2 border-purple-200 bg-purple-50 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                🎫 Ticket Soporte
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-2">Cómo probar el envío y recepción de correos:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Asegúrate de tener configurada tu API Key de Resend</li>
                  <li>Ingresa tu email personal en el campo de destino</li>
                  <li>Haz clic en cualquier botón de prueba para enviar un correo</li>
                  <li>Revisa tu bandeja de entrada (puede tardar unos segundos)</li>
                  <li>Ve a la pestaña &quot;Mensajes&quot; para ver los correos enviados</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}    </div>
  );
}
