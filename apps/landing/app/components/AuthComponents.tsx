"use client";

import Image from "next/image";
import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { getLandingUrl } from "../lib/urls";

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
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
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
        className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all focus:border-[#2361d8] focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20 ${
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
      className="flex w-full items-center justify-center gap-3 rounded-full bg-[#2361d8] px-4 py-3 font-semibold text-white shadow-md transition hover:bg-[#1f55c0]"
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
  brandMode?: "default" | "holded";
  backHref?: string;
  backLabel?: string;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
  brandMode = "default",
  backHref,
  backLabel,
}: AuthLayoutProps) {
  const landingUrl = getLandingUrl();
  const isHolded = brandMode === "holded";
  const resolvedBackHref = backHref || landingUrl;
  const resolvedBackLabel = backLabel || "Volver al inicio";

  return (
    <div
      className={`min-h-screen px-4 py-10 ${
        isHolded ? "bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#ffffff_100%)]" : "bg-[#2361d8]/5"
      }`}
    >
      <div className="mx-auto w-full max-w-md">
        <div className={`rounded-2xl border bg-white p-8 shadow-lg ${isHolded ? "border-[#ff5460]/15" : "border-slate-200"}`}>
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              {isHolded ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    <Image
                      src="/brand/holded/holded-diamond-logo.png"
                      alt="Isaak para Holded"
                      width={52}
                      height={52}
                      className="h-[52px] w-[52px] object-contain"
                      priority
                    />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff5460]">
                    Isaak para Holded
                  </div>
                </div>
              ) : (
                <BrandLogo variant="auth" />
              )}
            </div>
            <div className="mb-4">
              <a
                href={resolvedBackHref}
                className={`inline-flex items-center gap-2 text-sm font-semibold ${
                  isHolded ? "text-[#ff5460] hover:text-[#ef4654]" : "text-[#2361d8] hover:text-[#2361d8]"
                }`}
              >
                <span aria-hidden="true">&larr;</span> {resolvedBackLabel}
              </a>
            </div>
            <h1 className={`mb-2 text-2xl font-bold ${isHolded ? "text-slate-950" : "text-[#011c67]"}`}>{title}</h1>
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
                    className={`font-medium ${
                      isHolded ? "text-[#ff5460] hover:text-[#ef4654]" : "text-[#2361d8] hover:text-[#2361d8]"
                    }`}
                  >
                    {footerLink.label}
                  </a>
                </>
              )}
              <div className="mt-4 flex flex-col items-center gap-1 text-xs text-gray-500">
                <Link
                  href={resolvedBackHref}
                  className={`underline ${isHolded ? "hover:text-[#ff5460]" : "hover:text-[#2361d8]"}`}
                  aria-label="Volver al inicio"
                >
                  {resolvedBackLabel}
                </Link>
                <div className="flex gap-2">
                  <Link
                    href="/legal/privacidad"
                    className={`underline ${isHolded ? "hover:text-[#ff5460]" : "hover:text-[#2361d8]"}`}
                    aria-label="Leer politica de privacidad"
                  >
                    Política de privacidad
                  </Link>
                  <span>|</span>
                  <Link
                    href="/legal/terminos"
                    className={`underline ${isHolded ? "hover:text-[#ff5460]" : "hover:text-[#2361d8]"}`}
                    aria-label="Leer terminos y condiciones"
                  >
                    Términos y condiciones
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`mt-6 rounded-lg border bg-white p-4 text-center text-xs text-gray-600 ${isHolded ? "border-[#ff5460]/15" : "border-slate-200"}`}>
          <p>
            <strong>Tu información siempre está segura.</strong> Guardamos tus datos con cifrado y control de acceso.
          </p>
        </div>
      </div>
    </div>
  );
}



