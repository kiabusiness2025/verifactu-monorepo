"use client";

import GridShape from "@/components/common/GridShape";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    // Reportar 404 a Isaak para análisis
    fetch('/api/monitor/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errors: [{
          type: 'not_found',
          details: {
            path: window.location.pathname,
            referrer: document.referrer
          },
          url: window.location.href,
          timestamp: new Date().toISOString()
        }],
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      })
    }).catch(console.error);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1">
      <GridShape />
      <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
        <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
          NO ENCONTRADO
        </h1>

        <Image
          src="/images/error/404.svg"
          alt="404"
          className="dark:hidden"
          width={472}
          height={152}
        />
        <Image
          src="/images/error/404-dark.svg"
          alt="404"
          className="hidden dark:block"
          width={472}
          height={152}
        />

        <p className="mt-10 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
          No hemos encontrado la página que buscas.
        </p>

        <p className="mb-6 text-sm text-gray-500 dark:text-gray-500">
          Isaak ha sido notificado y está analizando este error.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          Volver al Inicio
        </Link>
      </div>
      {/* <!-- Footer --> */}
      <p className="absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400">
        &copy; {new Date().getFullYear()} - Verifactu.business
      </p>
    </div>
  );
}
