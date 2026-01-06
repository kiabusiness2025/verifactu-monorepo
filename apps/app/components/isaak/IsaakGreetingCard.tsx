"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@verifactu/ui";
import { useIsaakContext } from "@/hooks/useIsaakContext";

type Props = {
  userName?: string;
};

export function IsaakGreetingCard({ userName = "Ksenia" }: Props) {
  const { greeting, title, suggestions, sabiasQue } = useIsaakContext(userName);
  const primary = suggestions[0];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">👋 {greeting}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Estás en: {title}
          </p>
          {sabiasQue && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              ¿Sabías que…? {sabiasQue}
            </p>
          )}
        </div>
        {primary && (
          <Link href={primary.href ?? "#"} className="w-full sm:w-auto sm:self-end">
            <Button
              size="sm"
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:w-auto"
            >
              {primary.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
