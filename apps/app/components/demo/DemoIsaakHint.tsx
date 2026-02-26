"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

type DemoIsaakHintProps = {
  title: string;
  description: string;
  bullets: string[];
  ctaLabel?: string;
  ctaHref?: string;
  hint?: string;
};

export function DemoIsaakHint({
  title,
  description,
  bullets,
  ctaLabel = "Ver consejos de Isaak",
  ctaHref = "/demo/isaak",
  hint,
}: DemoIsaakHintProps) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
        <MessageCircle className="h-4 w-4" />
        Isaak te guia
      </div>
      <h3 className="mt-2 text-sm font-semibold text-blue-900">{title}</h3>
      <p className="mt-1 text-xs text-blue-800">{description}</p>
      <ul className="mt-3 grid gap-1 text-xs text-blue-900">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          {ctaLabel}
        </Link>
        {hint ? <span className="text-[11px] text-blue-700">{hint}</span> : null}
      </div>
    </div>
  );
}
