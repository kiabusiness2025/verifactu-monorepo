"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import BrandLogo from "./BrandLogo";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Contraseña",
  required = true,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all focus:border-[#0060F0] focus:outline-none focus:ring-2 focus:ring-[#0060F0]/20"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
        aria-label="Mostrar u ocultar contraseña"
      >
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  error,
}: FormInputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all focus:border-[#0060F0] focus:outline-none focus:ring-2 focus:ring-[#0060F0]/20 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function GoogleAuthButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-3 font-semibold text-white shadow-md transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
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
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <BrandLogo variant="auth" />
            </div>
            <div className="mb-4">
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
              >
                <span aria-hidden="true">←</span> Volver al inicio
              </a>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[#002060]">{title}</h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>

          <div className="space-y-6">{children}</div>

          {footerText && (
            <div className="mt-8 text-center text-sm text-gray-600">
              {footerText}
              {footerLink && (
                <>
                  {" "}
                  <a
                    href={footerLink.href}
                    className="font-medium text-[#0060F0] hover:text-[#0080F0]"
                  >
                    {footerLink.label}
                  </a>
                </>
              )}
              <div className="mt-4 flex flex-col items-center gap-1 text-xs text-gray-500">
                <Link
                  href="/"
                  className="underline hover:text-[#0080F0]"
                  aria-label="Volver al inicio"
                >
                  Volver al inicio
                </Link>
                <div className="flex gap-2">
                  <Link
                    href="/legal/privacidad"
                    className="underline hover:text-[#0080F0]"
                    aria-label="Leer politica de privacidad"
                  >
                    Política de privacidad
                  </Link>
                  <span>|</span>
                  <Link
                    href="/legal/terminos"
                    className="underline hover:text-[#0080F0]"
                    aria-label="Leer terminos y condiciones"
                  >
                    Términos y condiciones
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-center text-xs text-gray-600">
          <p>
            <strong>Tu informacion siempre esta segura.</strong> Guardamos tus datos con cifrado y control de acceso.
          </p>
        </div>
      </div>
    </div>
  );
}
