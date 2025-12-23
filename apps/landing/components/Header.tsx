"use client";
import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Header() {
  return (
    <header className="border-b border-[var(--line)]">
      <div className="container py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          {SITE.name}
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/docs" className="hover:underline">Documentación</Link>
          <Link href="/verify" className="hover:underline">Verificador</Link>
          <a href={process.env.NEXT_PUBLIC_APP_URL || "https://robotcontable.com"} className="hover:underline">App</a>
        </nav>
      </div>
    </header>
  );
}
