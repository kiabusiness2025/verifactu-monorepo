'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bot, CheckCircle2, ChevronRight, Loader2, Sparkles } from 'lucide-react';

type RoleValue = 'autonomo' | 'administrador' | 'gerente' | 'financiero' | 'otro';

type GoalValue =
  | 'Entender mi contabilidad'
  | 'Resolver dudas fiscales'
  | 'Emitir facturas facilmente'
  | 'Controlar ingresos y gastos'
  | 'Entender balances y resultados'
  | 'Llevar mejor la gestion diaria';

type InitialData = {
  preferredName: string;
  companyName: string;
  roleInCompany: RoleValue | null;
  roleInCompanyOther: string;
  businessSector: string;
  teamSize: string;
  website: string;
  phone: string;
  mainGoals: GoalValue[];
};

type Props = {
  nextUrl: string;
  initialData: InitialData;
  detectedContext: {
    companyName: string;
    website: string;
    phone: string;
  };
};

const ROLE_OPTIONS: Array<{ value: RoleValue; label: string }> = [
  { value: 'autonomo', label: 'Autonomo' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'financiero', label: 'Financiero' },
  { value: 'otro', label: 'Otro' },
];

const GOAL_OPTIONS: GoalValue[] = [
  'Entender mi contabilidad',
  'Resolver dudas fiscales',
  'Emitir facturas facilmente',
  'Controlar ingresos y gastos',
  'Entender balances y resultados',
  'Llevar mejor la gestion diaria',
];

const SECTOR_OPTIONS = [
  'Servicios profesionales',
  'Comercio',
  'Tecnologia',
  'Construccion',
  'Hosteleria',
  'Salud',
  'Otro',
];

const TEAM_OPTIONS = ['Solo yo', '2-5 personas', '6-20 personas', 'Mas de 20'];

const TOTAL_STEPS = 8;

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function encodeHandoffPayload(value: unknown) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export default function HoldedConversationalOnboardingClient({
  nextUrl,
  initialData,
  detectedContext,
}: Props) {
  const [introReady, setIntroReady] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState(initialData);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroReady(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const preferredName = useMemo(
    () => normalizeName(form.preferredName || 'hola'),
    [form.preferredName]
  );

  const persistDraft = async (overrides?: Partial<InitialData>) => {
    const payload = { ...form, ...overrides };
    try {
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'draft',
          ...payload,
        }),
      });
    } catch {
      // draft persistence is best effort
    }
  };

  const goNext = async (nextStep: number, overrides?: Partial<InitialData>) => {
    const payload = { ...form, ...overrides };
    setForm(payload);
    setStep(nextStep);
    void persistDraft(payload);
  };

  const complete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'complete',
          ...form,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No he podido guardar tu configuracion inicial.');
      }

      setDone(true);
      window.setTimeout(() => {
        const target = new URL(nextUrl);
        if (data?.profile) {
          target.searchParams.set(
            'handoff',
            encodeHandoffPayload({
              profile: {
                ...data.profile,
                website: null,
                phone: null,
              },
              instructions: data?.instructions ?? null,
            })
          );
        }
        window.location.assign(target.toString());
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No he podido guardar tu configuracion inicial.'
      );
      setSaving(false);
    }
  };

  const toggleGoal = (goal: GoalValue) => {
    setForm((current) => {
      const selected = current.mainGoals.includes(goal);
      if (selected) {
        return { ...current, mainGoals: current.mainGoals.filter((item) => item !== goal) };
      }
      if (current.mainGoals.length >= 3) return current;
      return { ...current, mainGoals: [...current.mainGoals, goal] };
    });
  };

  const progress = Math.min(step + 1, TOTAL_STEPS);

  const card = (content: ReactNode, optional = false) => (
    <div className="w-full max-w-3xl rounded-[2.25rem] border border-slate-200 bg-white/95 p-6 shadow-[0_35px_110px_-58px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2361d8]">
          <Bot className="h-3.5 w-3.5" />
          Voy a adaptar Isaak a tu empresa
        </div>
        <div className="text-xs font-medium text-slate-400">
          {progress} de {TOTAL_STEPS}
          {optional ? ' · opcional' : ''}
        </div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2361d8,#ff5460)] transition-all duration-300"
          style={{ width: `${(progress / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <div className="mt-6">{content}</div>
      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
    </div>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4f5_0%,#fffdf8_42%,#ffffff_76%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex justify-center lg:justify-start">
            <div className="relative h-[320px] w-[250px] sm:h-[390px] sm:w-[310px]">
              <Image
                src="/Isaak/isaak-medio-cuerpo-holded.png"
                alt="Isaak"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 280px, 320px"
                priority
              />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            {!introReady
              ? card(
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Preparando tu espacio
                    </div>
                    <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                      Antes de empezar...
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:180ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:360ms]" />
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-600">
                      Quiero conocerte un poco mejor para ayudarte de forma mas util desde el primer
                      momento.
                    </p>
                  </div>
                )
              : done
                ? card(
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4" />
                        Perfecto
                      </div>
                      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                        Ya tengo lo necesario para ayudarte mejor con tu empresa
                      </h1>
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        Enseguida te llevo al chat principal de Isaak con tu contexto inicial
                        preparado.
                      </p>
                    </div>
                  )
                : step === 0
                  ? card(
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Empezamos
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                          Antes de empezar, quiero conocerte un poco mejor
                        </h1>
                        <p className="mt-4 text-sm leading-7 text-slate-600">
                          Ya tengo tu conexion con Holded lista. Ahora voy a adaptar Isaak a tu
                          empresa para que te ayude mejor desde el principio.
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Continuar
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  : step === 1
                    ? card(
                        <div>
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                            Como prefieres que te llame?
                          </div>
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => goNext(2, { preferredName })}
                              className="rounded-full border border-[#ff5460]/20 bg-[#fff1f2] px-4 py-2.5 text-sm font-semibold text-[#b42332] transition hover:border-[#ff5460]/35"
                            >
                              {preferredName}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) => ({ ...current, preferredName: '' }))
                              }
                              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                              Otro nombre
                            </button>
                          </div>
                          <div className="mt-5">
                            <input
                              value={form.preferredName}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  preferredName: event.target.value,
                                }))
                              }
                              placeholder="Escribe aqui como quieres que te llame"
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2361d8]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => goNext(2)}
                            disabled={!normalizeName(form.preferredName)}
                            className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Continuar
                          </button>
                        </div>
                      )
                    : step === 2
                      ? card(
                          <div>
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                              Como se llama tu empresa?
                            </div>
                            <p className="mt-4 text-sm leading-7 text-slate-600">
                              He detectado el nombre desde Holded. Puedes dejarlo tal cual o
                              corregirlo si hace falta.
                            </p>
                            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                              Detectado:{' '}
                              {detectedContext.companyName || 'No he podido detectarlo todavia'}
                            </div>
                            <div className="mt-5">
                              <input
                                value={form.companyName}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    companyName: event.target.value,
                                  }))
                                }
                                placeholder="Nombre de la empresa"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2361d8]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => goNext(3)}
                              disabled={!normalizeName(form.companyName)}
                              className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              Continuar
                            </button>
                          </div>
                        )
                      : step === 3
                        ? card(
                            <div>
                              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                                Cual es tu rol en la empresa?
                              </div>
                              <div className="mt-5 flex flex-wrap gap-3">
                                {ROLE_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setForm((current) => ({
                                        ...current,
                                        roleInCompany: option.value,
                                      }))
                                    }
                                    className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                                      form.roleInCompany === option.value
                                        ? 'border-[#ff5460]/25 bg-[#fff1f2] text-[#b42332]'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                              {form.roleInCompany === 'otro' ? (
                                <div className="mt-5">
                                  <input
                                    value={form.roleInCompanyOther}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        roleInCompanyOther: event.target.value,
                                      }))
                                    }
                                    placeholder="Si quieres, concreta tu rol"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2361d8]"
                                  />
                                </div>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => goNext(4)}
                                disabled={!form.roleInCompany}
                                className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                Continuar
                              </button>
                            </div>
                          )
                        : step === 4
                          ? card(
                              <div>
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                                  En que quieres que te ayude principalmente?
                                </div>
                                <p className="mt-4 text-sm leading-7 text-slate-600">
                                  Elige hasta 3 prioridades. Asi podre orientarte mejor desde el
                                  primer chat.
                                </p>
                                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {form.mainGoals.length} de 3 seleccionadas
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3">
                                  {GOAL_OPTIONS.map((goal) => {
                                    const selected = form.mainGoals.includes(goal);
                                    return (
                                      <button
                                        key={goal}
                                        type="button"
                                        onClick={() => toggleGoal(goal)}
                                        className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                                          selected
                                            ? 'border-[#ff5460]/25 bg-[#fff1f2] text-[#b42332]'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                      >
                                        {goal}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => goNext(5)}
                                  disabled={form.mainGoals.length === 0}
                                  className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  Continuar
                                </button>
                              </div>
                            )
                          : step === 5
                            ? card(
                                <div>
                                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                                    A que os dedicais principalmente?
                                  </div>
                                  <div className="mt-5 flex flex-wrap gap-3">
                                    {SECTOR_OPTIONS.map((option) => (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() =>
                                          setForm((current) => ({
                                            ...current,
                                            businessSector:
                                              option === 'Otro' ? current.businessSector : option,
                                          }))
                                        }
                                        className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                                          form.businessSector === option
                                            ? 'border-[#ff5460]/25 bg-[#fff1f2] text-[#b42332]'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="mt-5">
                                    <input
                                      value={form.businessSector}
                                      onChange={(event) =>
                                        setForm((current) => ({
                                          ...current,
                                          businessSector: event.target.value,
                                        }))
                                      }
                                      placeholder="Actividad principal"
                                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2361d8]"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => goNext(6)}
                                    disabled={!normalizeName(form.businessSector)}
                                    className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                  >
                                    Continuar
                                  </button>
                                </div>
                              )
                            : step === 6
                              ? card(
                                  <div>
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                                      Cuantas personas sois en el equipo?
                                    </div>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                      {TEAM_OPTIONS.map((option) => (
                                        <button
                                          key={option}
                                          type="button"
                                          onClick={() =>
                                            setForm((current) => ({ ...current, teamSize: option }))
                                          }
                                          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                                            form.teamSize === option
                                              ? 'border-[#ff5460]/25 bg-[#fff1f2] text-[#b42332]'
                                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                          }`}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-5 flex gap-3">
                                      <button
                                        type="button"
                                        onClick={() => goNext(7)}
                                        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                      >
                                        Continuar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => goNext(7, { teamSize: '' })}
                                        className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                      >
                                        Omitir
                                      </button>
                                    </div>
                                  </div>,
                                  true
                                )
                              : step === 7
                                ? card(
                                    <div>
                                      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-8 text-slate-900">
                                        Ya he detectado algunos datos utiles
                                      </div>
                                      <div className="mt-5 space-y-4">
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                            Web
                                          </div>
                                          <input
                                            value={form.website}
                                            onChange={(event) =>
                                              setForm((current) => ({
                                                ...current,
                                                website: event.target.value,
                                              }))
                                            }
                                            placeholder={
                                              detectedContext.website ||
                                              'Puedes dejarla vacia si no teneis web'
                                            }
                                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2361d8]"
                                          />
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                            Telefono
                                          </div>
                                          <input
                                            value={form.phone}
                                            onChange={(event) =>
                                              setForm((current) => ({
                                                ...current,
                                                phone: event.target.value,
                                              }))
                                            }
                                            placeholder={
                                              detectedContext.phone ||
                                              'Puedes dejarlo vacio si prefieres'
                                            }
                                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2361d8]"
                                          />
                                        </div>
                                      </div>
                                      <div className="mt-5 flex gap-3">
                                        <button
                                          type="button"
                                          onClick={() => goNext(8)}
                                          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                        >
                                          Continuar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => goNext(8, { website: '', phone: '' })}
                                          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                        >
                                          Omitir
                                        </button>
                                      </div>
                                    </div>,
                                    true
                                  )
                                : card(
                                    <div>
                                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        <Sparkles className="h-4 w-4 text-[#2361d8]" />
                                        Ya esta todo listo
                                      </div>
                                      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                                        Perfecto
                                      </h1>
                                      <p className="mt-4 text-sm leading-7 text-slate-600">
                                        Voy a centrarme en ayudarte con:
                                      </p>
                                      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                                        <div>
                                          - {form.mainGoals[0] || 'entender mejor tu negocio'}
                                        </div>
                                        <div>
                                          -{' '}
                                          {form.mainGoals[1] ||
                                            'tomar decisiones mas claras en el dia a dia'}
                                        </div>
                                      </div>
                                      <p className="mt-4 text-sm leading-7 text-slate-600">
                                        Vamos a empezar.
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => void complete()}
                                        disabled={saving}
                                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:bg-slate-300"
                                      >
                                        {saving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : null}
                                        Entrar en Isaak
                                        <ChevronRight className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
          </div>
        </div>
      </div>
    </main>
  );
}
