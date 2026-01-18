"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, LogIn, Trash2, Building2, CreditCard, Activity, MessageSquare, Users, Clock, Settings } from "lucide-react";

interface UserDetails {
  user: {
    id: string;
    email: string;
    name: string;
    created_at: string;
    preferred_tenant_id: string | null;
    isaak_tone: string;
    has_seen_welcome: boolean;
    has_completed_onboarding: boolean;
  };
  memberships: Array<{
    id: string;
    tenant_id: string;
    role: string;
    status: string;
    created_at: string;
    tenant_name: string;
    tenant_legal_name: string | null;
    tenant_nif: string | null;
    is_demo: boolean;
  }>;
  subscriptions: Array<{
    id: string;
    tenant_id: string;
    status: string;
    plan_name: string;
    plan_code: string;
    fixed_monthly: number;
    trial_ends_at: string | null;
    current_period_end: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    number: string;
    customer_name: string;
    amount_gross: number;
    status: string;
    created_at: string;
    tenant_name: string;
  }>;
  conversationsCount: number;
  conversations: Array<{
    id: string;
    title: string;
    context: string | null;
    message_count: number;
    last_activity: string;
    created_at: string;
  }>;
  userMessagesCount: number;
  loginActivity: Array<{
    login_date: string;
    actions_count: number;
  }>;
  profileChanges: {
    preferred_tenant_id: string | null;
    isaak_tone: string;
    updated_at: string;
  } | null;
  collaborators: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    tenant_name: string;
    created_at: string;
  }>;
  expensesActivity: Array<{
    id: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    tenant_name: string;
    created_at: string;
  }>;
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [params.id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${params.id}`);
      if (res.ok) {
        const userData = await res.json();
        setData(userData);
      } else {
        alert('Error al cargar usuario');
        router.push('/dashboard/admin/users');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      alert('Error al cargar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!confirm(`¿Entrar al dashboard como ${data?.user.email}?\n\nPodrás ver y gestionar su cuenta como si fueras ese usuario.`)) {
      return;
    }

    try {
      setIsImpersonating(true);
      const res = await fetch(`/api/admin/users/${params.id}/impersonate`, {
        method: 'POST'
      });

      if (res.ok) {
        const result = await res.json();
        // Redirigir al dashboard del usuario
        window.location.href = result.redirectTo || '/dashboard';
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      alert('Error al intentar entrar como usuario');
    } finally {
      setIsImpersonating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { user, memberships, subscriptions, recentActivity, conversationsCount, conversations, userMessagesCount, loginActivity, profileChanges, collaborators, expensesActivity } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/admin/users')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a usuarios
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => alert('Funcionalidad de edición próximamente')}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={handleImpersonate}
            disabled={isImpersonating}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
          >
            <LogIn className="h-4 w-4" />
            {isImpersonating ? 'Entrando...' : 'Entrar como usuario'}
          </button>
        </div>
      </div>

      {/* Info Principal */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.name || 'Sin nombre'}</h1>
            <p className="mt-1 text-slate-600">{user.email}</p>
            <p className="mt-2 text-sm text-slate-500">
              ID: <code className="rounded bg-slate-100 px-2 py-1 text-xs">{user.id}</code>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Registrado: {new Date(user.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Activo
            </span>
            {user.has_completed_onboarding && (
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Onboarding ✓
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Empresas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{memberships.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Conversaciones Isaak</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{conversationsCount}</p>
            <p className="text-xs text-slate-500">{userMessagesCount} mensajes</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Tono Isaak</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-700">{user.isaak_tone || 'friendly'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Facturas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{recentActivity.length}</p>
            <p className="text-xs text-slate-500">{expensesActivity.length} gastos</p>
          </div>
        </div>
      </div>

      {/* Empresas/Memberships */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Building2 className="h-5 w-5" />
          Empresas ({memberships.length})
        </h2>

        {memberships.length === 0 ? (
          <p className="text-sm text-slate-500">Sin empresas asociadas</p>
        ) : (
          <div className="space-y-3">
            {memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{m.tenant_name}</p>
                  {m.tenant_legal_name && (
                    <p className="text-sm text-slate-600">{m.tenant_legal_name}</p>
                  )}
                  {m.tenant_nif && (
                    <p className="text-xs text-slate-500">NIF: {m.tenant_nif}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Miembro desde {new Date(m.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    m.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {m.role === 'owner' ? 'Propietario' : 'Miembro'}
                  </span>
                  {m.is_demo && (
                    <span className="ml-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      DEMO
                    </span>
                  )}
                  <p className="mt-1 text-xs text-slate-500">{m.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suscripciones */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CreditCard className="h-5 w-5" />
          Suscripciones ({subscriptions.length})
        </h2>

        {subscriptions.length === 0 ? (
          <p className="text-sm text-slate-500">Sin suscripciones activas</p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{s.plan_name}</p>
                  <p className="text-sm text-slate-600">Código: {s.plan_code}</p>
                  {s.trial_ends_at && (
                    <p className="mt-1 text-xs text-amber-600">
                      Trial hasta {new Date(s.trial_ends_at).toLocaleDateString('es-ES')}
                    </p>
                  )}
                  {s.current_period_end && (
                    <p className="mt-1 text-xs text-slate-500">
                      Próxima renovación: {new Date(s.current_period_end).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">€{s.fixed_monthly}/mes</p>
                  <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actividad Reciente */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Activity className="h-5 w-5" />
          Facturas Recientes
        </h2>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">Sin actividad reciente</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <div>
                  <p className="font-medium text-slate-900">{item.number}</p>
                  <p className="text-sm text-slate-600">{item.customer_name}</p>
                  <p className="text-xs text-slate-500">{item.tenant_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">€{item.amount_gross.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversaciones con Isaak */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MessageSquare className="h-5 w-5" />
          Conversaciones con Isaak ({conversationsCount})
        </h2>

        {conversations.length === 0 ? (
          <p className="text-sm text-slate-500">Sin conversaciones con Isaak</p>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div key={conv.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{conv.title || 'Sin título'}</p>
                  {conv.context && (
                    <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {conv.context}
                    </span>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {conv.message_count} mensajes • Última actividad: {new Date(conv.last_activity).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Creado: {new Date(conv.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
            {conversationsCount > 10 && (
              <p className="pt-2 text-center text-sm text-slate-500">
                Mostrando 10 de {conversationsCount} conversaciones
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actividad de Login */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Clock className="h-5 w-5" />
          Actividad de Acceso (últimos 10 días con actividad)
        </h2>

        {loginActivity.length === 0 ? (
          <p className="text-sm text-slate-500">Sin actividad registrada</p>
        ) : (
          <div className="space-y-2">
            {loginActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <p className="text-sm text-slate-700">
                  {new Date(activity.login_date).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {activity.actions_count} acciones
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gastos Recientes */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CreditCard className="h-5 w-5" />
          Gastos Recientes
        </h2>

        {expensesActivity.length === 0 ? (
          <p className="text-sm text-slate-500">Sin gastos registrados</p>
        ) : (
          <div className="space-y-2">
            {expensesActivity.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                <div>
                  <p className="font-medium text-slate-900">{expense.description}</p>
                  <p className="text-sm text-slate-600">{expense.category}</p>
                  <p className="text-xs text-slate-500">{expense.tenant_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">€{expense.amount.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(expense.date).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Colaboradores */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Users className="h-5 w-5" />
          Colaboradores en sus Empresas ({collaborators.length})
        </h2>

        {collaborators.length === 0 ? (
          <p className="text-sm text-slate-500">No comparte empresas con otros usuarios</p>
        ) : (
          <div className="space-y-3">
            {collaborators.map((collab) => (
              <div key={collab.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{collab.name || 'Sin nombre'}</p>
                  <p className="text-sm text-slate-600">{collab.email}</p>
                  <p className="text-xs text-slate-500">{collab.tenant_name}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    collab.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {collab.role}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{collab.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cambios de Perfil */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Settings className="h-5 w-5" />
          Configuración de Perfil
        </h2>

        {profileChanges ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-sm font-medium text-slate-700">Empresa Preferida</p>
              <p className="text-sm text-slate-900">
                {profileChanges.preferred_tenant_id || 'No configurada'}
              </p>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-sm font-medium text-slate-700">Tono de Isaak</p>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                {profileChanges.isaak_tone || 'friendly'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-sm font-medium text-slate-700">Onboarding Completado</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.has_completed_onboarding 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {user.has_completed_onboarding ? 'Sí' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Última Actualización</p>
              <p className="text-xs text-slate-500">
                {new Date(profileChanges.updated_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Sin configuración de perfil</p>
        )}
      </div>
    </div>
  );
}
