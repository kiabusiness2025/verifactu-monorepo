"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@verifactu/ui";
import { useIsaakContext } from "@/hooks/useIsaakContext";
import { useAuth } from "@/hooks/useAuth";
import { getUserFirstName } from "@/lib/getUserName";
import { useUserProfile } from "@/hooks/useUserProfile";

export function IsaakGreetingCard() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const resolveUserName = () => {
    if (profile?.name) return profile.name.trim().split(" ")[0];
    if (profile?.email) {
      const emailName = profile.email.split("@")[0] || "";
      return emailName
        ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
        : "Usuario";
    }
    return getUserFirstName(user);
  };
  const userName = resolveUserName();
  const { greeting, title, suggestions, sabiasQue } = useIsaakContext(userName);
  const primary = suggestions[0];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#002060]">{greeting}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Estas en: {title}
          </p>
          {sabiasQue && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Sabias que? {sabiasQue}
            </p>
          )}
        </div>
        {primary && (
          <Link href={primary.href ?? "#"} className="w-full sm:w-auto sm:self-end">
            <Button
              size="sm"
              className="w-full rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-2 text-xs font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB] sm:w-auto"
            >
              {primary.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
