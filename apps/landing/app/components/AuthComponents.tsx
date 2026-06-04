'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { getLandingUrl } from '../lib/urls';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Contrasena',
  required = true,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/25"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-700"
        aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface FormInputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function FormInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = true,
  error,
}: FormInputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/25 ${
          error ? 'border-rose-400' : 'border-slate-200'
        }`}
      />
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function GoogleAuthButton() {
  return (
    <button
      type="button"
      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#2361d8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continuar con Google
    </button>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerText?: string;
  footerLink?: { href: string; label: string };
  brandMode?: 'default' | 'holded';
  backHref?: string;
  backLabel?: string;
  compact?: boolean;
  showSecurityCard?: boolean;
}

const THEMES = {
  default: {
    shell: 'bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fafc_46%,#ffffff_100%)]',
    border: 'border-[#2361d8]/15',
    accentText: 'text-[#2361d8]',
    accentHover: 'hover:text-[#1f55c0]',
    accentBg: 'bg-[#2361d8]',
    softBg: 'bg-[#eef5ff]',
    label: 'Isaak',
    helper: 'Asistente fiscal',
    logo: '/Isaak/isaak-avatar-verifactu.png',
    logoAlt: 'Isaak',
  },
  holded: {
    shell: 'bg-[radial-gradient(circle_at_top_left,#fff1f2_0%,#f8fafc_46%,#ffffff_100%)]',
    border: 'border-[#ff5460]/20',
    accentText: 'text-[#ff5460]',
    accentHover: 'hover:text-[#ef4654]',
    accentBg: 'bg-[#ff5460]',
    softBg: 'bg-[#fff1f2]',
    label: 'Isaak + Holded',
    helper: 'Conexion segura',
    logo: '/brand/holded/holded-diamond-logo.png',
    logoAlt: 'Holded',
  },
} as const;

export function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
  brandMode = 'default',
  backHref,
  backLabel,
  compact = false,
  showSecurityCard = true,
}: AuthLayoutProps) {
  const landingUrl = getLandingUrl();
  const theme = THEMES[brandMode];
  const resolvedBackHref = backHref || landingUrl;
  const resolvedBackLabel = backLabel || 'Volver al inicio';

  return (
    <main className={`min-h-screen px-4 py-6 text-slate-900 sm:px-6 ${theme.shell}`}>
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full items-center justify-center">
        <section className={`w-full ${compact ? 'max-w-[26rem]' : 'max-w-md'}`}>
          <div
            className={`overflow-hidden rounded-[2rem] border ${theme.border} bg-white shadow-[0_30px_90px_-56px_rgba(15,23,42,0.45)]`}
          >
            <div className={compact ? 'px-6 pb-7 pt-7' : 'px-8 pb-8 pt-8'}>
              <div className="text-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <div
                    className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ${theme.softBg} ring-1 ring-slate-200`}
                  >
                    <Image
                      src={theme.logo}
                      alt={theme.logoAlt}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-cover"
                      priority
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-950">{theme.label}</div>
                    <div className="text-xs text-slate-500">{theme.helper}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={resolvedBackHref}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${theme.accentText} ${theme.accentHover} underline-offset-4 hover:underline`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {resolvedBackLabel}
                  </Link>
                </div>

                <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
                {subtitle ? (
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 space-y-5">{children}</div>

              <div className="mt-7 text-center text-xs text-slate-500">
                {footerText && footerLink ? (
                  <p className="mb-4">
                    {footerText}{' '}
                    <Link
                      href={footerLink.href}
                      className={`font-semibold ${theme.accentText} ${theme.accentHover}`}
                    >
                      {footerLink.label}
                    </Link>
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <Link href={resolvedBackHref} className="hover:text-slate-700 hover:underline">
                    Salir
                  </Link>
                  <span className="text-slate-300">|</span>
                  <Link href="/legal/privacidad" className="hover:text-slate-700 hover:underline">
                    Privacidad
                  </Link>
                  <span className="text-slate-300">|</span>
                  <Link href="/legal/terminos" className="hover:text-slate-700 hover:underline">
                    Terminos
                  </Link>
                </div>
              </div>
            </div>

            {showSecurityCard ? (
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <ShieldCheck className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.accentText}`} />
                  <span>
                    Acceso protegido con Firebase, sesion firmada y cookies seguras entre dominios
                    de Verifactu Business.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
